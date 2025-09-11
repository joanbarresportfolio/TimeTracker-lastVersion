import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, TrendingUp, AlertTriangle, Eye, Calendar, Plus } from "lucide-react";
import type { Employee, TimeEntry } from "@shared/schema";
import { useAuth } from "@/contexts/AuthContext";

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
  const isEmployee = user?.role === "employee";

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
            <div className="flex items-center justify-between">
              <CardTitle>Control de Fichaje Rápido</CardTitle>
              <Button data-testid="button-add-employee">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Empleado
              </Button>
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
                {employees?.slice(0, 5).map((employee) => {
                  const entry = todayEntries.find(e => e.employeeId === employee.id);
                  const status = getEmployeeStatus(employee);
                  
                  return (
                    <tr key={employee.id} className="hover:bg-muted/50" data-testid={`employee-row-${employee.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold">
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
                          <Button variant="ghost" size="icon" title="Ver detalles" data-testid={`button-view-${employee.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Editar horario" data-testid={`button-schedule-${employee.id}`}>
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Reportar incidencia" data-testid={`button-incident-${employee.id}`}>
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
              Mostrando {Math.min(5, employees?.length || 0)} de {employees?.length || 0} empleados
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" data-testid="button-previous-page">
                Anterior
              </Button>
              <span className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded">1</span>
              <span className="px-3 py-1 text-sm text-muted-foreground">2</span>
              <span className="px-3 py-1 text-sm text-muted-foreground">3</span>
              <Button variant="outline" size="sm" data-testid="button-next-page">
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

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          className="h-auto p-6 justify-start hover-elevate"
          data-testid="button-export-reports"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 rounded-full">
              <i className="fas fa-download text-blue-500 text-xl"></i>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">Exportar Reportes</h4>
              <p className="text-sm text-muted-foreground">Generar informes en PDF o Excel</p>
            </div>
          </div>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-auto p-6 justify-start hover-elevate"
          data-testid="button-manage-schedules"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-500/10 rounded-full">
              <i className="fas fa-calendar-plus text-green-500 text-xl"></i>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">Gestionar Horarios</h4>
              <p className="text-sm text-muted-foreground">Configurar turnos y horarios</p>
            </div>
          </div>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-auto p-6 justify-start hover-elevate"
          data-testid="button-view-incidents"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-500/10 rounded-full">
              <i className="fas fa-exclamation-circle text-yellow-500 text-xl"></i>
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">Ver Incidencias</h4>
              <p className="text-sm text-muted-foreground">Revisar reportes y ausencias</p>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}
