import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Clock, Search, LogIn, LogOut, Timer, Calendar, AlertCircle, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Employee, TimeEntry, DateSchedule, DailyWorkday, Department } from "@shared/schema";
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

type WorkdayResponse = {
  workday: DailyWorkday | null;
  hasClockEntries: boolean;
  canEdit: boolean;
};

const workdayFormSchema = z.object({
  employeeId: z.string().min(1, "Debe seleccionar un empleado"),
  date: z.string().min(1, "Debe seleccionar una fecha"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Debe ser formato HH:MM"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Debe ser formato HH:MM"),
  breakMinutes: z.number().int().min(0, "No puede ser negativo"),
}).refine((data) => data.startTime < data.endTime, {
  message: "Hora de salida debe ser posterior a hora de entrada",
  path: ["endTime"],
});

type WorkdayFormData = z.infer<typeof workdayFormSchema>;

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

  const { data: schedules, isLoading: schedulesLoading } = useQuery<DateSchedule[]>({
    queryKey: ["/api/date-schedules", user?.id, new Date().getFullYear()],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fichajes", {
        tipoRegistro: 'clock_in',
        origen: 'web'
      });
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
      const response = await apiRequest("POST", "/api/fichajes", {
        tipoRegistro: 'clock_out',
        origen: 'web'
      });
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
    const today = selectedDate; // Using selectedDate from state
    return schedules?.filter(schedule => 
      schedule.employeeId === user?.id && schedule.date === today && schedule.isActive
    ) || [];
  };

  const getWeekSchedules = () => {
    // Calcular inicio y fin de la semana del selectedDate
    const currentDate = new Date(selectedDate);
    const currentDay = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDay + 1); // Lunes
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Domingo
    
    const startDateStr = startOfWeek.toISOString().split('T')[0];
    const endDateStr = endOfWeek.toISOString().split('T')[0];
    
    // Filtrar horarios del empleado actual en el rango de la semana
    const weekSchedules = schedules?.filter(schedule => 
      schedule.isActive && 
      schedule.employeeId === user?.id &&
      schedule.date >= startDateStr && 
      schedule.date <= endDateStr
    ) || [];
    
    // Ordenar por fecha
    return weekSchedules.sort((a, b) => a.date.localeCompare(b.date));
  };

  const getScheduleStatusByDate = (scheduleDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    const entry = timeEntries?.find(entry => entry.date === scheduleDate);
    
    // Comparar fechas directamente
    if (scheduleDate < today) {
      if (entry?.clockOut) return { status: "completed", color: "bg-blue-500/10 text-blue-700" };
      return { status: "missed", color: "bg-red-500/10 text-red-700" };
    }
    if (scheduleDate === today) {
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
                  const scheduleStatus = getScheduleStatusByDate(schedule.date);
                  const scheduleDate = schedule.date;
                  const dayLabel = new Date(schedule.date).toLocaleDateString('es-ES', { weekday: 'long' });
                  
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
                           scheduleStatus.status === "missed" ? "Perdido" :
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
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Estados y form para gestión de jornadas
  const workdayForm = useForm<WorkdayFormData>({
    resolver: zodResolver(workdayFormSchema),
    defaultValues: {
      employeeId: "",
      date: "",
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 30,
    },
  });

  const watchEmployeeId = workdayForm.watch("employeeId");
  const watchDate = workdayForm.watch("date");

  const { data: workdayResponse, refetch: refetchWorkday } = useQuery<WorkdayResponse>({
    queryKey: ["/api/daily-workday", watchEmployeeId, watchDate],
    queryFn: async () => {
      if (!watchEmployeeId || !watchDate) return { workday: null, hasClockEntries: false, canEdit: true };
      const response = await fetch(
        `/api/daily-workday?employeeId=${watchEmployeeId}&date=${watchDate}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Error al obtener jornada");
      return response.json();
    },
    enabled: !!watchEmployeeId && !!watchDate,
  });

  useEffect(() => {
    if (workdayResponse?.workday) {
      const formatTimeFromDB = (timestamp: Date | string | null | undefined): string => {
        if (!timestamp) return "09:00";
        const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
        return format(date, "HH:mm");
      };

      workdayForm.setValue("startTime", formatTimeFromDB(workdayResponse.workday.startTime));
      workdayForm.setValue("endTime", formatTimeFromDB(workdayResponse.workday.endTime));
      workdayForm.setValue("breakMinutes", workdayResponse.workday.breakMinutes);
    }
  }, [workdayResponse?.workday]);

  const createWorkdayMutation = useMutation({
    mutationFn: async (data: WorkdayFormData) => {
      return apiRequest("POST", "/api/daily-workday", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral creada" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la jornada laboral",
        variant: "destructive",
      });
    },
  });

  const updateWorkdayMutation = useMutation({
    mutationFn: async (data: WorkdayFormData) => {
      return apiRequest("PUT", `/api/daily-workday/${workdayResponse?.workday?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral actualizada" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la jornada laboral",
        variant: "destructive",
      });
    },
  });

  const deleteWorkdayMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/daily-workday/${workdayResponse?.workday?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral eliminada" });
      workdayForm.reset({
        employeeId: "",
        date: "",
        startTime: "09:00",
        endTime: "17:00",
        breakMinutes: 30,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la jornada laboral",
        variant: "destructive",
      });
    },
  });

  const onWorkdaySubmit = (data: WorkdayFormData) => {
    if (workdayResponse?.workday) {
      updateWorkdayMutation.mutate(data);
    } else {
      createWorkdayMutation.mutate(data);
    }
  };

  const clockInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("POST", "/api/fichajes", { 
        employeeId,
        tipoRegistro: 'clock_in',
        origen: 'web'
      });
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
      const response = await apiRequest("POST", "/api/fichajes", { 
        employeeId,
        tipoRegistro: 'clock_out',
        origen: 'web'
      });
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
    
    const matchesDepartment = selectedDepartment === "all" || employee.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment && employee.isActive;
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

      {/* Gestión Manual de Jornadas Laborales */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5" />
            Gestión Manual de Jornadas
          </CardTitle>
          <CardDescription>Añadir, editar o eliminar jornadas laborales manualmente</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...workdayForm}>
            <form onSubmit={workdayForm.handleSubmit(onWorkdaySubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={workdayForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar empleado..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees?.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={workdayForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={workdayForm.control}
                  name="breakMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutos de Pausa</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={workdayForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Entrada</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={workdayForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Salida</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createWorkdayMutation.isPending || updateWorkdayMutation.isPending}
                  >
                    {workdayResponse?.workday ? "Actualizar Jornada" : "Crear Jornada"}
                  </Button>

                  {workdayResponse?.workday && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("¿Está seguro de eliminar esta jornada laboral?")) {
                          deleteWorkdayMutation.mutate();
                        }
                      }}
                      disabled={deleteWorkdayMutation.isPending}
                    >
                      Eliminar Jornada
                    </Button>
                  )}
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>

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
