import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Edit3, Eye, Users, Timer, Building, Clock, Calendar, Plus, Trash2, Save, X, AlertCircle, ClipboardList } from "lucide-react";
import { format, startOfYear, endOfYear, eachMonthOfInterval, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Employee, TimeEntry, DateSchedule, DailyWorkday } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface EmployeeSummary {
  employee: Employee;
  hoursWorked: number;
  conventionHours: number;
  percentageWorked: number;
}

interface SelectedDate {
  date: Date;
  dateStr: string;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasSchedule: boolean;
  schedule?: DateSchedule;
}

type WorkdayResponse = {
  workday: DailyWorkday | null;
  hasClockEntries: boolean;
  canEdit: boolean;
};

const workdayFormSchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Debe ser formato HH:MM"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Debe ser formato HH:MM"),
  breakMinutes: z.number().int().min(0, "No puede ser negativo"),
}).refine((data) => data.startTime < data.endTime, {
  message: "Hora de salida debe ser posterior a hora de entrada",
  path: ["endTime"],
});

type WorkdayFormData = z.infer<typeof workdayFormSchema>;

export default function Schedules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"summary" | "calendar" | "schedule">("summary");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);
  const [selectionType, setSelectionType] = useState<"with-schedule" | "without-schedule" | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ startTime: "09:00", endTime: "17:00" });
  
  const [workdayEmployee, setWorkdayEmployee] = useState<Employee | null>(null);
  const [workdayDate, setWorkdayDate] = useState<Date | undefined>(undefined);
  
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

  const { data: dateSchedules, isLoading: dateSchedulesLoading, refetch: refetchDateSchedules } = useQuery<DateSchedule[]>({
    queryKey: ["/api/date-schedules", selectedEmployee?.id, calendarYear],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      const startDate = `${calendarYear}-01-01`;
      const endDate = `${calendarYear}-12-31`;
      const url = `/api/date-schedules?employeeId=${selectedEmployee.id}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch date schedules');
      return response.json();
    },
    enabled: !!selectedEmployee && viewMode === "calendar",
  });

  // ⚠️ HOOKS DE MUTACIÓN - DEBEN estar SIEMPRE antes de returns condicionales
  const createDateScheduleMutation = useMutation({
    mutationFn: (data: { employeeId: string; date: string; expectedStartTime: string; expectedEndTime: string }) => 
      apiRequest("POST", "/api/date-schedules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/date-schedules"] });
      refetchDateSchedules();
      setSelectedDates([]);
      setShowScheduleDialog(false);
      toast({ title: "Éxito", description: "Horario creado correctamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Error al crear el horario",
        variant: "destructive"
      });
    },
  });

  const deleteDateScheduleMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/date-schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/date-schedules"] });
      refetchDateSchedules();
      toast({ title: "Éxito", description: "Horario eliminado correctamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Error al eliminar el horario",
        variant: "destructive"
      });
    },
  });

  const createBulkDateScheduleMutation = useMutation({
    mutationFn: (data: { schedules: Array<{ employeeId: string; date: string; expectedStartTime: string; expectedEndTime: string }> }) => 
      apiRequest("POST", "/api/date-schedules/bulk", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/date-schedules"] });
      refetchDateSchedules();
      setSelectedDates([]);
      setShowScheduleDialog(false);
      toast({ title: "Éxito", description: "Horarios creados correctamente" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "Error al crear los horarios",
        variant: "destructive"
      });
    },
  });

  // Queries y mutaciones para gestión manual de jornadas
  const { data: workdayResponse, refetch: refetchWorkday } = useQuery<WorkdayResponse>({
    queryKey: ["/api/daily-workday", workdayEmployee?.id, workdayDate ? format(workdayDate, "yyyy-MM-dd") : null],
    queryFn: async () => {
      if (!workdayEmployee || !workdayDate) return { workday: null, hasClockEntries: false, canEdit: true };
      const dateStr = format(workdayDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/daily-workday?employeeId=${workdayEmployee.id}&date=${dateStr}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Error al obtener jornada");
      return response.json();
    },
    enabled: !!workdayEmployee && !!workdayDate,
  });

  const workdayForm = useForm<WorkdayFormData>({
    resolver: zodResolver(workdayFormSchema),
    defaultValues: {
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 30,
    },
  });

  useEffect(() => {
    if (workdayResponse?.workday) {
      const formatTime = (timestamp: string | null | undefined): string => {
        if (!timestamp) return "09:00";
        const date = new Date(timestamp);
        return format(date, "HH:mm");
      };

      workdayForm.reset({
        startTime: formatTime(workdayResponse.workday.startTime),
        endTime: formatTime(workdayResponse.workday.endTime),
        breakMinutes: workdayResponse.workday.breakMinutes,
      });
    }
  }, [workdayResponse?.workday]);

  const createWorkdayMutation = useMutation({
    mutationFn: async (data: WorkdayFormData) => {
      const payload = {
        employeeId: workdayEmployee!.id,
        date: format(workdayDate!, "yyyy-MM-dd"),
        ...data,
      };
      return apiRequest("POST", "/api/daily-workday", payload);
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

  // Calcular resumen de empleados con horas trabajadas vs horas de convenio
  const employeeSummaries = useMemo((): EmployeeSummary[] => {
    if (!employees || !timeEntries) return [];

    return employees.map(employee => {
      // Filtrar entradas de tiempo para este empleado en el año actual
      const currentYear = new Date().getFullYear();
      const employeeEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entry.employeeId === employee.id && 
               entryDate.getFullYear() === currentYear &&
               entry.totalHours !== null;
      });

      // Calcular total de horas trabajadas este año (convertir de minutos a horas)
      const totalMinutesWorked = employeeEntries.reduce((sum, entry) => 
        sum + (entry.totalHours || 0), 0
      );
      const hoursWorked = Math.round(totalMinutesWorked / 60 * 100) / 100;

      // Calcular porcentaje trabajado respecto a horas de convenio
      const conventionHours = employee.conventionHours || 1752;
      const percentageWorked = conventionHours > 0 ? 
        Math.round((hoursWorked / conventionHours) * 100 * 100) / 100 : 0;

      return {
        employee,
        hoursWorked,
        conventionHours,
        percentageWorked,
      };
    });
  }, [employees, timeEntries]);

  // Filtrar empleados según búsqueda y departamento
  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter(summary => {
      const employee = summary.employee;
      const matchesSearch = 
        employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = selectedDepartment === "all" || 
        employee.department === selectedDepartment;
      
      return matchesSearch && matchesDepartment && employee.isActive;
    });
  }, [employeeSummaries, searchTerm, selectedDepartment]);

  // Obtener departamentos únicos
  const departments = useMemo(() => {
    if (!employees) return [];
    return Array.from(new Set(employees.map(emp => emp.department)));
  }, [employees]);

  // ⚠️ CALENDARIO DATA MOVIDO AQUÍ - Debe estar antes de returns condicionales
  const calendarData = useMemo(() => {
    const year = calendarYear;
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 11, 31));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      // Agregar días del mes anterior para completar la primera semana (Monday-first)
      const startDay = (getDay(monthStart) + 6) % 7; // Convert Sunday-first to Monday-first
      const prevDays = [];
      for (let i = startDay - 1; i >= 0; i--) {
        const prevDate = new Date(monthStart);
        prevDate.setDate(prevDate.getDate() - i - 1);
        prevDays.push(prevDate);
      }
      
      // Agregar días del mes siguiente para completar la última semana (Monday-first)
      const endDay = (getDay(monthEnd) + 6) % 7; // Convert Sunday-first to Monday-first
      const nextDays = [];
      for (let i = 1; i <= (6 - endDay); i++) {
        const nextDate = new Date(monthEnd);
        nextDate.setDate(nextDate.getDate() + i);
        nextDays.push(nextDate);
      }
      
      const allDays = [...prevDays, ...days, ...nextDays];
      
      return {
        month,
        days: allDays.map((date): CalendarDay => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const schedule = dateSchedules?.find(s => s.date === dateStr);
          
          return {
            date,
            dateStr,
            isCurrentMonth: isSameMonth(date, month),
            isToday: isToday(date),
            isSelected: selectedDates.some(selected => selected.dateStr === dateStr),
            hasSchedule: !!schedule,
            schedule,
          };
        })
      };
    });
  }, [calendarYear, dateSchedules, selectedDates]);

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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    if (percentage >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  const handleModifySchedule = (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewMode("calendar");
    toast({
      title: "Modificar Horario",
      description: `Modificando horario para ${employee.firstName} ${employee.lastName}`,
    });
  };

  const handleViewSchedule = (employee: Employee) => {
    setSelectedEmployee(employee);
    setViewMode("schedule");
    toast({
      title: "Ver Horario",
      description: `Visualizando horario de ${employee.firstName} ${employee.lastName}`,
    });
  };

  const isLoading = employeesLoading || timeEntriesLoading || (viewMode === "calendar" && dateSchedulesLoading);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Horarios y Turnos</h2>
          <p className="text-muted-foreground">Gestiona los horarios de trabajo de los empleados</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

  // Vista principal con tabla de resumen
  if (viewMode === "summary") {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Horarios y Turnos</h2>
          <p className="text-muted-foreground">
            Gestiona los horarios de trabajo y supervisa el progreso anual de cada empleado
          </p>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Empleado</Label>
                  <Select
                    value={workdayEmployee?.id || ""}
                    onValueChange={(id) => {
                      const emp = employees?.find(e => e.id === id);
                      setWorkdayEmployee(emp || null);
                    }}
                    disabled={employeesLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar empleado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.firstName} {employee.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-1"
                        disabled={!workdayEmployee}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {workdayDate ? format(workdayDate, "PPP", { locale: es }) : "Seleccionar fecha..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={workdayDate}
                        onSelect={setWorkdayDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {workdayEmployee && workdayDate && (
                <div className="space-y-3">
                  {workdayResponse?.hasClockEntries && (
                    <Alert className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Tiene fichajes automáticos. Solo lectura.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Form {...workdayForm}>
                    <form onSubmit={workdayForm.handleSubmit(onWorkdaySubmit)} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <FormField
                          control={workdayForm.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Hora Entrada</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="time"
                                  disabled={!workdayResponse?.canEdit}
                                  className="h-8"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={workdayForm.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Hora Salida</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="time"
                                  disabled={!workdayResponse?.canEdit}
                                  className="h-8"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={workdayForm.control}
                        name="breakMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Minutos de Pausa</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                disabled={!workdayResponse?.canEdit}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                className="h-8"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {workdayResponse?.canEdit && (
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={createWorkdayMutation.isPending || updateWorkdayMutation.isPending}
                          >
                            {workdayResponse?.workday ? "Actualizar" : "Crear"}
                          </Button>

                          {workdayResponse?.workday && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm("¿Eliminar jornada?")) {
                                  deleteWorkdayMutation.mutate();
                                }
                              }}
                              disabled={deleteWorkdayMutation.isPending}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      )}
                    </form>
                  </Form>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Resumen de Empleados
            </CardTitle>
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
                <SelectTrigger className="w-48" data-testid="select-department-filter">
                  <SelectValue placeholder="Filtrar por departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map(department => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Horas Trabajadas</TableHead>
                    <TableHead>Horas Convenio</TableHead>
                    <TableHead>Progreso Anual</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => (
                    <TableRow key={summary.employee.id} data-testid={`employee-row-${summary.employee.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className={`bg-gradient-to-r ${getAvatarColor(summary.employee.firstName)} text-white text-sm font-semibold`}>
                              {getInitials(summary.employee.firstName, summary.employee.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground">
                              {summary.employee.firstName} {summary.employee.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {summary.employee.employeeNumber}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {summary.employee.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{summary.hoursWorked}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{summary.conventionHours}h</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{summary.percentageWorked}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(summary.percentageWorked)} transition-all duration-300`}
                              style={{ width: `${Math.min(summary.percentageWorked, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleModifySchedule(summary.employee)}
                            data-testid={`button-modify-${summary.employee.id}`}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Modificar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewSchedule(summary.employee)}
                            data-testid={`button-view-${summary.employee.id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredSummaries.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron empleados con los filtros aplicados</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }



  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    
    const isSelected = selectedDates.some(selected => selected.dateStr === day.dateStr);
    
    if (isSelected) {
      // Deseleccionar fecha
      const newSelectedDates = selectedDates.filter(selected => selected.dateStr !== day.dateStr);
      setSelectedDates(newSelectedDates);
      
      // Si no quedan fechas seleccionadas, resetear el tipo de selección
      if (newSelectedDates.length === 0) {
        setSelectionType(null);
      }
    } else {
      // Intentar seleccionar fecha
      const dayHasSchedule = day.hasSchedule;
      
      // Si no hay ninguna fecha seleccionada, establecer el tipo según el día clickeado
      if (selectedDates.length === 0) {
        setSelectionType(dayHasSchedule ? "with-schedule" : "without-schedule");
        setSelectedDates([{ date: day.date, dateStr: day.dateStr }]);
      } else {
        // Si ya hay fechas seleccionadas, verificar que el tipo coincida
        if (selectionType === "with-schedule" && dayHasSchedule) {
          // Permitir selección - mismo tipo (con horario)
          setSelectedDates(prev => [...prev, { date: day.date, dateStr: day.dateStr }]);
        } else if (selectionType === "without-schedule" && !dayHasSchedule) {
          // Permitir selección - mismo tipo (sin horario)
          setSelectedDates(prev => [...prev, { date: day.date, dateStr: day.dateStr }]);
        } else {
          // Bloquear selección - tipos diferentes
          toast({
            title: "Selección no permitida",
            description: selectionType === "with-schedule" 
              ? "No puedes seleccionar días sin horario cuando ya has seleccionado días con horario"
              : "No puedes seleccionar días con horario cuando ya has seleccionado días sin horario",
            variant: "destructive"
          });
        }
      }
    }
  };

  const handleAssignSchedule = async () => {
    if (!selectedEmployee || selectedDates.length === 0) return;
    
    // Validate start time is before end time
    const startTimeMinutes = parseInt(scheduleForm.startTime.split(':')[0]) * 60 + parseInt(scheduleForm.startTime.split(':')[1]);
    const endTimeMinutes = parseInt(scheduleForm.endTime.split(':')[0]) * 60 + parseInt(scheduleForm.endTime.split(':')[1]);
    
    if (startTimeMinutes >= endTimeMinutes) {
      toast({
        title: "Error de Validación",
        description: "La hora de inicio debe ser anterior a la hora de fin",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Si estamos modificando horarios existentes, primero borrarlos
      if (selectionType === "with-schedule" && dateSchedules) {
        const schedulesToDelete = selectedDates
          .map(selected => dateSchedules.find(s => s.date === selected.dateStr))
          .filter(s => s !== undefined)
          .map(s => s!.id);
        
        // Borrar los horarios antiguos silenciosamente
        for (const scheduleId of schedulesToDelete) {
          await apiRequest("DELETE", `/api/date-schedules/${scheduleId}`);
        }
      }
      
      // Crear los nuevos horarios usando el endpoint bulk (funciona para uno o múltiples días)
      await createBulkDateScheduleMutation.mutateAsync({
        schedules: selectedDates.map(selected => ({
          employeeId: selectedEmployee.id,
          date: selected.dateStr,
          expectedStartTime: scheduleForm.startTime,
          expectedEndTime: scheduleForm.endTime,
          shiftType: 'morning', // Valor por defecto
          status: 'scheduled', // Valor por defecto
        }))
      });
      
      // Mostrar mensaje de éxito apropiado
      if (selectionType === "with-schedule") {
        toast({
          title: "Horario modificado",
          description: "El horario ha sido modificado exitosamente"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al procesar la operación. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    await deleteDateScheduleMutation.mutateAsync(scheduleId);
  };

  const handleDeleteSelectedSchedules = async () => {
    if (!dateSchedules || selectedDates.length === 0) return;
    
    try {
      // Encontrar los IDs de los horarios de los días seleccionados
      const schedulesToDelete = selectedDates
        .map(selected => dateSchedules.find(s => s.date === selected.dateStr))
        .filter(s => s !== undefined)
        .map(s => s!.id);
      
      // Borrar cada horario
      for (const scheduleId of schedulesToDelete) {
        await deleteDateScheduleMutation.mutateAsync(scheduleId);
      }
      
      // Limpiar selección
      setSelectedDates([]);
      setSelectionType(null);
      setShowScheduleDialog(false);
    } catch (error) {
      // Error handling is done in mutation onError callbacks
    }
  };

  const clearSelection = () => {
    setSelectedDates([]);
    setSelectionType(null);
  };

  // Vista de calendario
  if (viewMode === "calendar") {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Modificar Horario</h2>
            <p className="text-muted-foreground">
              Empleado: {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setViewMode("summary")}
              data-testid="button-back-to-summary"
            >
              Volver al Resumen
            </Button>
          </div>
        </div>

        {/* Controles del calendario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendario Anual {calendarYear}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCalendarYear(prev => prev - 1)}
                  data-testid="button-prev-year"
                >
                  {calendarYear - 1}
                </Button>
                <span className="font-medium px-4">{calendarYear}</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCalendarYear(prev => prev + 1)}
                  data-testid="button-next-year"
                >
                  {calendarYear + 1}
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {selectedDates.length > 0 && (
                  <>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {selectedDates.length} fecha{selectedDates.length > 1 ? 's' : ''} seleccionada{selectedDates.length > 1 ? 's' : ''}
                    </Badge>
                    <Button 
                      size="sm"
                      onClick={() => {
                        // Si estamos seleccionando días con horario, pre-rellenar el formulario con el horario existente
                        if (selectionType === "with-schedule" && dateSchedules && selectedDates.length > 0) {
                          const firstSchedule = dateSchedules.find(s => s.date === selectedDates[0].dateStr);
                          if (firstSchedule) {
                            setScheduleForm({
                              startTime: firstSchedule.startTime,
                              endTime: firstSchedule.endTime
                            });
                          }
                        }
                        setShowScheduleDialog(true);
                      }}
                      disabled={createDateScheduleMutation.isPending || createBulkDateScheduleMutation.isPending}
                      data-testid="button-assign-schedule"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Asignar Horario
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={clearSelection}
                      data-testid="button-clear-selection"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Limpiar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Grid de meses */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {calendarData.map(({ month, days }) => (
                <div key={month.getTime()} className="space-y-2">
                  <h3 className="font-semibold text-center text-foreground">
                    {format(month, 'MMMM', { locale: es })}
                  </h3>
                  
                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground text-center mb-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                      <div key={day} className="p-1">{day}</div>
                    ))}
                  </div>
                  
                  {/* Días del mes */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      const dayClasses = [
                        "w-8 h-8 text-xs flex items-center justify-center rounded-md cursor-pointer transition-all duration-200",
                        day.isCurrentMonth 
                          ? "text-foreground hover-elevate"
                          : "text-muted-foreground/50",
                        day.isToday && "bg-primary text-primary-foreground font-semibold",
                        day.isSelected && "bg-blue-500 dark:bg-blue-600 text-white font-semibold",
                        day.hasSchedule && !day.isSelected && "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium",
                        !day.isCurrentMonth && "cursor-not-allowed"
                      ].filter(Boolean).join(" ");
                      
                      return (
                        <div
                          key={index}
                          className={dayClasses}
                          onClick={() => handleDateClick(day)}
                          title={
                            day.hasSchedule 
                              ? `Horario: ${day.schedule?.startTime} - ${day.schedule?.endTime}`
                              : day.isCurrentMonth 
                                ? format(day.date, 'dd/MM/yyyy')
                                : undefined
                          }
                          data-testid={`calendar-day-${day.dateStr}`}
                        >
                          {format(day.date, 'd')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Leyenda */}
            <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span>Hoy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded"></div>
                <span>Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded"></div>
                <span>Con horario</span>
              </div>
            </div>
            
            {/* Lista de horarios existentes */}
            {dateSchedules && dateSchedules.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium mb-3 text-foreground">Horarios Existentes</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {dateSchedules.map(schedule => (
                    <div key={schedule.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{format(new Date(schedule.date), 'dd/MM/yyyy', { locale: es })}</span>
                        <Badge variant="outline" className="text-xs">
                          {schedule.startTime} - {schedule.endTime}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        disabled={deleteDateScheduleMutation.isPending}
                        data-testid={`button-delete-schedule-${schedule.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Dialog para asignar/modificar horario */}
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent data-testid="dialog-assign-schedule">
            <DialogHeader>
              <DialogTitle>
                {selectionType === "with-schedule" ? "Modificar Horario" : "Asignar Horario"}
              </DialogTitle>
              <DialogDescription>
                {selectionType === "with-schedule" 
                  ? `Modificar o borrar horario de ${selectedDates.length} fecha${selectedDates.length > 1 ? 's' : ''} seleccionada${selectedDates.length > 1 ? 's' : ''}`
                  : `Asignar horario a ${selectedDates.length} fecha${selectedDates.length > 1 ? 's' : ''} seleccionada${selectedDates.length > 1 ? 's' : ''}`
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Hora de Inicio</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Hora de Fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                    data-testid="input-end-time"
                  />
                </div>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Fechas seleccionadas:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedDates.map(selected => (
                    <Badge key={selected.dateStr} variant="secondary" className="text-xs">
                      {format(selected.date, 'dd/MM/yyyy', { locale: es })}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowScheduleDialog(false)}
                data-testid="button-cancel-schedule"
              >
                Cancelar
              </Button>
              {selectionType === "with-schedule" && (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteSelectedSchedules}
                  disabled={deleteDateScheduleMutation.isPending}
                  data-testid="button-delete-schedules"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Borrar
                </Button>
              )}
              <Button 
                onClick={handleAssignSchedule}
                disabled={createDateScheduleMutation.isPending || createBulkDateScheduleMutation.isPending}
                data-testid="button-save-schedule"
              >
                <Save className="w-4 h-4 mr-2" />
                {selectionType === "with-schedule" 
                  ? (selectedDates.length > 1 ? 'Modificar Todas' : 'Modificar')
                  : (selectedDates.length > 1 ? 'Asignar a Todas' : 'Asignar')
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Vista de horario (próximamente)
  if (viewMode === "schedule") {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Ver Horario</h2>
            <p className="text-muted-foreground">
              Empleado: {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => setViewMode("summary")}
            data-testid="button-back-to-summary-schedule"
          >
            Volver al Resumen
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historial de Horarios - Próximamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                La vista de historial de horarios estará disponible próximamente.
              </p>
              <p className="text-sm text-muted-foreground">
                Mostrará horas trabajadas para días pasados y horas programadas para días futuros.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}