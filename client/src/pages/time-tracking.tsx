import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Search, LogIn, LogOut, Timer, Calendar } from "lucide-react";
import type { Employee, TimeEntry, Schedule } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export default function TimeTracking() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  // Si es empleado, mostrar vista específica
  if (user?.role === "employee") {
    return <EmployeeTimeTracking />;
  }

  // Vista de administrador (existente)
  return <AdminTimeTracking searchTerm={searchTerm} setSearchTerm={setSearchTerm} selectedDate={selectedDate} setSelectedDate={setSelectedDate} toast={toast} />;
}

// Componente para empleados
function EmployeeTimeTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: schedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-entries/clock-in", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Entrada registrada",
        description: "Has fichado la entrada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al fichar entrada",
        description: error.message || "No se pudo registrar la entrada.",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/time-entries/clock-out", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Salida registrada",
        description: "Has fichado la salida exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al fichar salida",
        description: error.message || "No se pudo registrar la salida.",
        variant: "destructive",
      });
    },
  });

  const getTodayTimeEntry = () => {
    return timeEntries?.find(entry => entry.date === selectedDate);
  };

  const getCurrentDayOfWeek = () => {
    return new Date().getDay();
  };

  const getTodaySchedules = () => {
    const today = getCurrentDayOfWeek();
    return schedules?.filter(schedule => 
      schedule.dayOfWeek === today && schedule.isActive
    ) || [];
  };

  const getWeekSchedules = () => {
    const weekSchedules = schedules?.filter(schedule => schedule.isActive) || [];
    // Agrupar por día de la semana y ordenar
    return weekSchedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  };

  const getScheduleStatus = (dayOfWeek: number) => {
    const today = getCurrentDayOfWeek();
    const targetDate = getDateForDayOfWeek(dayOfWeek);
    const entry = timeEntries?.find(entry => entry.date === targetDate);
    
    if (dayOfWeek < today) return { status: "completed", color: "bg-blue-500/10 text-blue-700" };
    if (dayOfWeek === today) {
      if (!entry) return { status: "pending", color: "bg-yellow-500/10 text-yellow-700" };
      if (entry.clockIn && !entry.clockOut) return { status: "in_progress", color: "bg-green-500/10 text-green-700" };
      if (entry.clockOut) return { status: "completed", color: "bg-blue-500/10 text-blue-700" };
    }
    return { status: "upcoming", color: "bg-gray-500/10 text-gray-700" };
  };

  const getDateForDayOfWeek = (dayOfWeek: number) => {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const diff = dayOfWeek - todayDayOfWeek;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.toISOString().split('T')[0];
  };

  const formatTime = (time: string) => {
    return time;
  };

  const formatTimeFromDate = (date: Date | string | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatus = () => {
    const entry = getTodayTimeEntry();
    if (!entry) return { status: "not_started", label: "Sin fichar", color: "bg-gray-500/10 text-gray-700" };
    if (entry.clockIn && !entry.clockOut) return { status: "clocked_in", label: "Presente", color: "bg-green-500/10 text-green-700" };
    if (entry.clockOut) return { status: "completed", label: "Completado", color: "bg-blue-500/10 text-blue-700" };
    return { status: "not_started", label: "Sin fichar", color: "bg-gray-500/10 text-gray-700" };
  };

  const isLoading = schedulesLoading || timeEntriesLoading;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Mi Control Horario</h2>
          <p className="text-muted-foreground">Gestiona tus fichajes de entrada y salida</p>
        </div>
        <div className="animate-pulse space-y-4">
          <Card><CardContent className="p-6"><div className="h-32 bg-muted rounded"></div></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-32 bg-muted rounded"></div></CardContent></Card>
        </div>
      </div>
    );
  }

  const todaySchedules = getTodaySchedules();
  const todayEntry = getTodayTimeEntry();
  const status = getStatus();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Mi Control Horario</h2>
        <p className="text-muted-foreground">Gestiona tus fichajes de entrada y salida</p>
      </div>

      {/* Selector de fecha */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Fecha:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
                data-testid="input-select-date"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Estado actual */}
      <Card>
        <CardHeader>
          <CardTitle>Estado Actual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Tu estado de hoy</p>
              <Badge className={status.color} data-testid="status-badge">
                {status.label}
              </Badge>
            </div>
            <div className="flex space-x-2">
              {status.status === "not_started" && (
                <Button 
                  onClick={() => clockInMutation.mutate()}
                  disabled={clockInMutation.isPending}
                  data-testid="button-clock-in"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Fichar Entrada
                </Button>
              )}
              
              {status.status === "clocked_in" && (
                <Button 
                  onClick={() => clockOutMutation.mutate()}
                  disabled={clockOutMutation.isPending}
                  variant="outline"
                  data-testid="button-clock-out"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Fichar Salida
                </Button>
              )}
              
              {status.status === "completed" && (
                <Badge variant="outline" className="px-4 py-2">
                  Jornada Completada
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Entrada</p>
              <p className="font-medium" data-testid="time-clock-in">{formatTimeFromDate(todayEntry?.clockIn || null)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Salida</p>
              <p className="font-medium" data-testid="time-clock-out">{formatTimeFromDate(todayEntry?.clockOut || null)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tiempo trabajado</p>
              <p className="font-medium" data-testid="time-worked">{formatDuration(todayEntry?.totalHours || null)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Horarios de hoy */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Horarios de Hoy</CardTitle>
          <p className="text-sm text-muted-foreground">
            {daysOfWeek[getCurrentDayOfWeek()].label}
          </p>
        </CardHeader>
        <CardContent>
          {todaySchedules.length > 0 ? (
            <div className="space-y-4">
              {todaySchedules.map((schedule) => (
                <Card key={schedule.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">
                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Turno programado
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {status.status === "not_started" && (
                          <Button 
                            onClick={() => clockInMutation.mutate()}
                            disabled={clockInMutation.isPending}
                            size="sm"
                            data-testid={`button-clock-in-schedule-${schedule.id}`}
                          >
                            <LogIn className="w-4 h-4 mr-1" />
                            Fichar Entrada
                          </Button>
                        )}
                        
                        {status.status === "clocked_in" && (
                          <Button 
                            onClick={() => clockOutMutation.mutate()}
                            disabled={clockOutMutation.isPending}
                            variant="outline"
                            size="sm"
                            data-testid={`button-clock-out-schedule-${schedule.id}`}
                          >
                            <LogOut className="w-4 h-4 mr-1" />
                            Fichar Salida
                          </Button>
                        )}
                        
                        {status.status === "completed" && (
                          <Badge variant="outline" className="text-xs">
                            Completado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tienes horarios asignados para hoy</h3>
              <p className="text-muted-foreground">
                Contacta con tu supervisor para configurar tus horarios de trabajo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turnos de la Semana */}
      <Card>
        <CardHeader>
          <CardTitle>Mis Turnos de la Semana</CardTitle>
          <p className="text-sm text-muted-foreground">
            Estado de todos tus turnos programados
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Día</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horario</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {getWeekSchedules().map((schedule) => {
                  const scheduleStatus = getScheduleStatus(schedule.dayOfWeek);
                  const scheduleDate = getDateForDayOfWeek(schedule.dayOfWeek);
                  const dayLabel = daysOfWeek[schedule.dayOfWeek].label;
                  
                  return (
                    <tr key={schedule.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4 text-foreground font-medium">{dayLabel}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(scheduleDate).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={scheduleStatus.color}>
                          {scheduleStatus.status === "completed" ? "Completado" :
                           scheduleStatus.status === "in_progress" ? "En Progreso" :
                           scheduleStatus.status === "pending" ? "Pendiente" :
                           "Próximo"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {getWeekSchedules().length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No tienes turnos programados para esta semana
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para administradores (vista existente)
function AdminTimeTracking({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  toast
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  toast: any;
}) {

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const clockInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("POST", "/api/time-entries/clock-in", { employeeId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Entrada registrada",
        description: "El empleado ha fichado la entrada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al fichar entrada",
        description: error.message || "No se pudo registrar la entrada.",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("POST", "/api/time-entries/clock-out", { employeeId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({
        title: "Salida registrada",
        description: "El empleado ha fichado la salida exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al fichar salida",
        description: error.message || "No se pudo registrar la salida.",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && employee.isActive;
  }) || [];

  const getEmployeeTimeEntry = (employeeId: string) => {
    return timeEntries?.find(entry => 
      entry.employeeId === employeeId && 
      entry.date === selectedDate
    );
  };

  const getEmployeeStatus = (employee: Employee) => {
    const entry = getEmployeeTimeEntry(employee.id);
    if (!entry) return { status: "not_started", label: "Sin fichar", color: "bg-gray-500/10 text-gray-700" };
    if (entry.clockIn && !entry.clockOut) return { status: "clocked_in", label: "Presente", color: "bg-green-500/10 text-green-700" };
    if (entry.clockOut) return { status: "completed", label: "Completado", color: "bg-blue-500/10 text-blue-700" };
    return { status: "not_started", label: "Sin fichar", color: "bg-gray-500/10 text-gray-700" };
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes: number | null) => {
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

  const isLoading = employeesLoading || timeEntriesLoading;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Control Horario</h2>
          <p className="text-muted-foreground">Gestiona los fichajes de entrada y salida</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded"></div>
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
        <h2 className="text-2xl font-bold text-foreground">Control Horario</h2>
        <p className="text-muted-foreground">Gestiona los fichajes de entrada y salida</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar empleados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-employees"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Fecha:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
                data-testid="input-select-date"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Resumen del día */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
                <p className="text-2xl font-bold">{filteredEmployees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <LogIn className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Presentes</p>
                <p className="text-2xl font-bold">
                  {filteredEmployees.filter(emp => 
                    getEmployeeStatus(emp).status === "clocked_in"
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <LogOut className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completados</p>
                <p className="text-2xl font-bold">
                  {filteredEmployees.filter(emp => 
                    getEmployeeStatus(emp).status === "completed"
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sin Fichar</p>
                <p className="text-2xl font-bold">
                  {filteredEmployees.filter(emp => 
                    getEmployeeStatus(emp).status === "not_started"
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de empleados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEmployees.map((employee) => {
          const entry = getEmployeeTimeEntry(employee.id);
          const status = getEmployeeStatus(employee);
          
          return (
            <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`employee-time-card-${employee.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(employee.firstName)} text-white font-semibold`}>
                        {getInitials(employee.firstName, employee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{employee.employeeNumber}</p>
                      <p className="text-sm text-muted-foreground">{employee.department}</p>
                    </div>
                  </div>
                  <Badge className={status.color}>
                    {status.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Entrada</p>
                    <p className="font-medium">{formatTime(entry?.clockIn || null)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salida</p>
                    <p className="font-medium">{formatTime(entry?.clockOut || null)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Tiempo trabajado</p>
                  <p className="font-medium">{formatDuration(entry?.totalHours || null)}</p>
                </div>

                <div className="flex space-x-2">
                  {status.status === "not_started" && (
                    <Button 
                      onClick={() => clockInMutation.mutate(employee.id)}
                      disabled={clockInMutation.isPending}
                      className="flex-1"
                      data-testid={`button-clock-in-${employee.id}`}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Fichar Entrada
                    </Button>
                  )}
                  
                  {status.status === "clocked_in" && (
                    <Button 
                      onClick={() => clockOutMutation.mutate(employee.id)}
                      disabled={clockOutMutation.isPending}
                      variant="outline"
                      className="flex-1"
                      data-testid={`button-clock-out-${employee.id}`}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Fichar Salida
                    </Button>
                  )}
                  
                  {status.status === "completed" && (
                    <Badge variant="outline" className="flex-1 justify-center py-2">
                      Jornada Completada
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <h3 className="text-lg font-semibold mb-2">No se encontraron empleados</h3>
              <p>Intenta modificar los filtros de búsqueda</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
