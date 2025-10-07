import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Clock, Users, TrendingUp, AlertTriangle, Eye, Calendar, Plus } from "lucide-react";
import type { Employee, TimeEntry, InsertIncident, InsertScheduledShift, Department } from "@shared/schema";
import { insertIncidentSchema, insertScheduledShiftSchema } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalEmployees?: number;
  presentToday?: number;
  hoursWorked: number;
  incidents: number;
  isEmployee?: boolean;
  isClockedIn?: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEmployee = user?.role === "employee";
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<Employee | null>(null);
  const [selectedEmployeeSchedule, setSelectedEmployeeSchedule] = useState<Employee | null>(null);
  const [selectedEmployeeIncident, setSelectedEmployeeIncident] = useState<Employee | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filtros
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Solo cargar empleados si es admin
  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    enabled: !isEmployee, // Solo cargar si no es empleado
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    enabled: !isEmployee,
  });

  // Forms for dialogs
  const incidentForm = useForm<InsertIncident>({
    resolver: zodResolver(insertIncidentSchema),
    defaultValues: {
      userId: "",
      incidentType: "late",
      description: "",
      status: "pending",
    },
  });

  const scheduleForm = useForm<InsertScheduledShift>({
    resolver: zodResolver(insertScheduledShiftSchema),
    defaultValues: {
      employeeId: "",
      date: new Date().toISOString().split('T')[0], // today
      expectedStartTime: "09:00",
      expectedEndTime: "17:00",
      shiftType: "morning",
      status: "scheduled",
    },
  });

  // Mutations
  const createIncidentMutation = useMutation({
    mutationFn: (data: InsertIncident) => apiRequest("/api/incidents", "POST", data),
    onSuccess: () => {
      toast({
        title: "Incidencia reportada",
        description: "La incidencia ha sido reportada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsIncidentDialogOpen(false);
      incidentForm.reset();
      setSelectedEmployeeIncident(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al reportar la incidencia.",
        variant: "destructive",
      });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: InsertScheduledShift) => apiRequest("/api/scheduled-shifts", "POST", data),
    onSuccess: () => {
      toast({
        title: "Horario creado",
        description: "El horario ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/date-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsScheduleDialogOpen(false);
      scheduleForm.reset();
      setSelectedEmployeeSchedule(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el horario.",
        variant: "destructive",
      });
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = timeEntries?.filter(entry => entry.date === today) || [];

  // Para empleados, filtrar solo sus entradas de tiempo
  const userTimeEntries = isEmployee 
    ? timeEntries?.filter(entry => entry.employeeId === user?.id) || []
    : timeEntries || [];

  // Últimas 7 entradas para empleados
  const recentUserEntries = isEmployee 
    ? userTimeEntries
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7)
    : [];

  const getEmployeeStatus = (employee: Employee) => {
    const entry = todayEntries.find(e => e.employeeId === employee.id);
    if (!entry) return { status: "absent", color: "bg-red-500/10 text-red-700" };
    if (entry.clockIn && !entry.clockOut) return { status: "present", color: "bg-green-500/10 text-green-700" };
    if (entry.clockOut) return { status: "completed", color: "bg-blue-500/10 text-blue-700" };
    return { status: "absent", color: "bg-red-500/10 text-red-700" };
  };

  // Filtrar empleados
  const filteredEmployees = employees?.filter(employee => {
    // Filtro por departamento
    if (selectedDepartment !== "all" && employee.department !== selectedDepartment) {
      return false;
    }
    
    // Filtro por estado
    if (selectedStatus !== "all") {
      const status = getEmployeeStatus(employee).status;
      if (status !== selectedStatus) {
        return false;
      }
    }
    
    return true;
  }) || [];

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatHours = (minutes: number | null) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-purple-600",
      "from-green-500 to-teal-600", 
      "from-orange-500 to-red-600",
      "from-purple-500 to-pink-600",
      "from-yellow-500 to-orange-600",
    ];
    return colors[name.length % colors.length];
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployeeDetails(employee);
    setIsDetailsDialogOpen(true);
  };

  const handleEditSchedule = (employee: Employee) => {
    setSelectedEmployeeSchedule(employee);
    scheduleForm.reset({
      employeeId: employee.id,
      date: new Date().toISOString().split('T')[0], // today
      expectedStartTime: "09:00",
      expectedEndTime: "17:00",
      shiftType: "morning",
      status: "scheduled",
    });
    setIsScheduleDialogOpen(true);
  };

  const handleReportIncident = (employee: Employee) => {
    setSelectedEmployeeIncident(employee);
    incidentForm.reset({
      userId: employee.id,
      incidentType: "late",
      description: "",
      status: "pending",
    });
    setIsIncidentDialogOpen(true);
  };

  const onIncidentSubmit = (data: InsertIncident) => {
    createIncidentMutation.mutate(data);
  };

  const onScheduleSubmit = (data: InsertScheduledShift) => {
    createScheduleMutation.mutate(data);
  };

  if (statsLoading || employeesLoading || timeEntriesLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Resumen general del sistema</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground">Resumen general del sistema</p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Empleados</p>
                <p className="text-3xl font-bold text-foreground" data-testid="stat-total-employees">
                  {stats?.totalEmployees || 0}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="text-primary w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-500 w-4 h-4 mr-1" />
              <span className="text-green-500 font-medium">+5</span>
              <span className="text-muted-foreground ml-1">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Presentes Hoy</p>
                <p className="text-3xl font-bold text-foreground" data-testid="stat-present-today">
                  {stats?.presentToday || 0}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Users className="text-green-500 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">Asistencia:</span>
              <span className="font-medium ml-1 text-foreground">
                {stats?.totalEmployees && stats.presentToday ? 
                  Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Horas Trabajadas</p>
                <p className="text-3xl font-bold text-foreground" data-testid="stat-hours-worked">
                  {stats?.hoursWorked || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Clock className="text-blue-500 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">Esta semana</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Incidencias</p>
                <p className="text-3xl font-bold text-foreground" data-testid="stat-incidents">
                  {stats?.incidents || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <AlertTriangle className="text-yellow-500 w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="text-green-500 w-4 h-4 mr-1 rotate-180" />
              <span className="text-green-500 font-medium">-3</span>
              <span className="text-muted-foreground ml-1">vs semana anterior</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenido específico por rol */}
      {!isEmployee ? (
        // Vista de Admin: Control de Fichaje Rápido
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Control de Fichaje Rápido</CardTitle>
              <div className="flex gap-4">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[200px]" data-testid="select-department-filter">
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {departments?.map(dept => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="present">Presente</SelectItem>
                    <SelectItem value="absent">Ausente</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Empleado</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Departamento</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Entrada</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Salida</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horas</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((employee) => {
                  const entry = todayEntries.find(e => e.employeeId === employee.id);
                  const status = getEmployeeStatus(employee);
                  
                  return (
                    <tr key={employee.id} className="hover:bg-muted/50" data-testid={`employee-row-${employee.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(employee.firstName)} text-white text-sm font-semibold`}>
                              {getInitials(employee.firstName, employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{employee.employeeNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{employee.department}</td>
                      <td className="py-3 px-4">
                        <Badge className={status.color}>
                          <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                          {status.status === "present" ? "Presente" : 
                           status.status === "completed" ? "Completado" : "Ausente"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {entry?.clockIn ? formatTime(entry.clockIn) : "--:--"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {entry?.clockOut ? formatTime(entry.clockOut) : "--:--"}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatHours(entry?.totalHours || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Ver detalles" 
                            onClick={() => handleViewDetails(employee)}
                            data-testid={`button-view-${employee.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Crear horario" 
                            onClick={() => handleEditSchedule(employee)}
                            data-testid={`button-schedule-${employee.id}`}
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Reportar incidencia" 
                            onClick={() => handleReportIncident(employee)}
                            data-testid={`button-incident-${employee.id}`}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, employees?.length || 0)} - {Math.min(currentPage * itemsPerPage, employees?.length || 0)} de {employees?.length || 0} empleados
            </p>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                data-testid="button-previous-page"
              >
                Anterior
              </Button>
              {Array.from({ length: Math.ceil(filteredEmployees.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded ${
                    currentPage === page 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {page}
                </button>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil((employees?.length || 0) / itemsPerPage), prev + 1))}
                disabled={currentPage >= Math.ceil((employees?.length || 0) / itemsPerPage)}
                data-testid="button-next-page"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
      ) : (
        // Vista de Empleado: Mis Turnos Trabajados
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mis Turnos Trabajados</CardTitle>
              <Badge variant="outline" className="px-3 py-1">
                {stats?.isClockedIn ? "Presente" : "No Presente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Entrada</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Salida</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horas Trabajadas</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentUserEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/50">
                      <td className="py-3 px-4 text-foreground">
                        {new Date(entry.date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {entry.clockIn ? formatTime(entry.clockIn) : "--:--"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {entry.clockOut ? formatTime(entry.clockOut) : "--:--"}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatHours(entry.totalHours || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={entry.clockOut ? "bg-green-500/10 text-green-700" : "bg-blue-500/10 text-blue-700"}>
                          {entry.clockOut ? "Completado" : "En progreso"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {recentUserEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay turnos trabajados registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de detalles del empleado */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Empleado</DialogTitle>
          </DialogHeader>
          {selectedEmployeeDetails && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(selectedEmployeeDetails.firstName)} text-white text-lg font-semibold`}>
                    {getInitials(selectedEmployeeDetails.firstName, selectedEmployeeDetails.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedEmployeeDetails.firstName} {selectedEmployeeDetails.lastName}
                  </h3>
                  <p className="text-muted-foreground">{selectedEmployeeDetails.employeeNumber}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedEmployeeDetails.email}</p>
                </div>
                <div>
                  <Label className="font-medium">Departamento</Label>
                  <p className="text-sm text-muted-foreground">{selectedEmployeeDetails.department}</p>
                </div>
                <div>
                  <Label className="font-medium">Posición</Label>
                  <p className="text-sm text-muted-foreground">{selectedEmployeeDetails.position}</p>
                </div>
                <div>
                  <Label className="font-medium">Fecha de Contratación</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedEmployeeDetails.hireDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div>
                  <Label className="font-medium">Estado</Label>
                  <Badge className={selectedEmployeeDetails.isActive ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-700"}>
                    {selectedEmployeeDetails.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="font-medium">Registros de Tiempo de Hoy</Label>
                <div className="bg-secondary/30 p-4 rounded-lg">
                  {(() => {
                    const todayEntry = todayEntries.find(e => e.employeeId === selectedEmployeeDetails.id);
                    if (!todayEntry) {
                      return <p className="text-sm text-muted-foreground">No hay registros para hoy</p>;
                    }
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Entrada:</span>
                          <span className="text-sm">{todayEntry.clockIn ? formatTime(todayEntry.clockIn) : "--:--"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Salida:</span>
                          <span className="text-sm">{todayEntry.clockOut ? formatTime(todayEntry.clockOut) : "--:--"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Horas Trabajadas:</span>
                          <span className="text-sm">{formatHours(todayEntry.totalHours || 0)}</span>
                        </div>
                      </div>
                    );
                  })()
                  }
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de editar horario */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={(open) => {
        setIsScheduleDialogOpen(open);
        if (!open) {
          setSelectedEmployeeSchedule(null);
          scheduleForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Horario</DialogTitle>
          </DialogHeader>
          {selectedEmployeeSchedule && (
            <div className="space-y-4">
              <div>
                <Label>Empleado</Label>
                <p className="text-sm font-medium">
                  {selectedEmployeeSchedule.firstName} {selectedEmployeeSchedule.lastName}
                </p>
              </div>
              
              <Form {...scheduleForm}>
                <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                  <FormField
                    control={scheduleForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-schedule-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={scheduleForm.control}
                      name="expectedStartTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de inicio</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              data-testid="input-start-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={scheduleForm.control}
                      name="expectedEndTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de fin</FormLabel>
                          <FormControl>
                            <Input 
                              type="time" 
                              {...field}
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setIsScheduleDialogOpen(false)}
                      data-testid="button-cancel-schedule"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createScheduleMutation.isPending}
                      data-testid="button-save-schedule"
                    >
                      {createScheduleMutation.isPending ? "Guardando..." : "Guardar Horario"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de reportar incidencia */}
      <Dialog open={isIncidentDialogOpen} onOpenChange={(open) => {
        setIsIncidentDialogOpen(open);
        if (!open) {
          setSelectedEmployeeIncident(null);
          incidentForm.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Incidencia</DialogTitle>
          </DialogHeader>
          {selectedEmployeeIncident && (
            <div className="space-y-4">
              <div>
                <Label>Empleado</Label>
                <p className="text-sm font-medium">
                  {selectedEmployeeIncident.firstName} {selectedEmployeeIncident.lastName}
                </p>
              </div>
              
              <Form {...incidentForm}>
                <form onSubmit={incidentForm.handleSubmit(onIncidentSubmit)} className="space-y-4">
                  <FormField
                    control={incidentForm.control}
                    name="incidentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de incidencia</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-incident-type">
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="late">Tardanza</SelectItem>
                            <SelectItem value="absence">Ausencia</SelectItem>
                            <SelectItem value="sick_leave">Baja médica</SelectItem>
                            <SelectItem value="vacation">Vacaciones</SelectItem>
                            <SelectItem value="forgot_clock_in">Olvido fichar entrada</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={incidentForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="Describe la incidencia..." 
                            className="min-h-[100px]"
                            data-testid="textarea-incident-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setIsIncidentDialogOpen(false)}
                      data-testid="button-cancel-incident"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createIncidentMutation.isPending}
                      data-testid="button-save-incident"
                    >
                      {createIncidentMutation.isPending ? "Reportando..." : "Reportar Incidencia"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
