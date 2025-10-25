import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Edit3,
  Eye,
  Users,
  Timer,
  Building,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import {
  format,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  isToday,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  type User,
  type TimeEntry,
  type Schedule,
  type DailyWorkday,
  dailyWorkday,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Employees from "./employees";
const today = new Date().toISOString().split("T")[0]; // "2025-10-24"
interface EmployeeSummary {
  employee: User;
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
  schedule?: Schedule;
}

const currentYear = new Date().getFullYear();


export default function Schedules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"summary" | "calendar" | "schedule">(
    "summary",
  );
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);
  const [selectionType, setSelectionType] = useState<
    "with-schedule" | "without-schedule" | null
  >(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    workdayType: "completa" as "completa" | "partida",
    breakStartTime: "",
    breakEndTime: "",
  });
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState<User | null>(null);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [selectedEmployeesToCopy, setSelectedEmployeesToCopy] = useState<
    string[]
  >([]);

  const { toast } = useToast();

  const { data: employees,
    isLoading: employeesLoading
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: departmentsList } = useQuery<
    Array<{ id: string; name: string }>
  >({
    queryKey: ["/api/departments"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<
    TimeEntry[]
  >({
    queryKey: ["/api/time-entries"],
  });

  const { data: workdayHistory, isLoading: workdayHistoryLoading } = useQuery<
    DailyWorkday[]
  >({
    queryKey: ["/api/daily-workday/all"],
  });

  const {
    data: yearlySchedules,
    isLoading: yearlySchedulesLoading,
  } = useQuery<Schedule[]>({
    queryKey: ["/api/date-schedules/year", currentYear],
    queryFn: async () => {

      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      // No enviamos employeeId para obtener todos los empleados
      const url = `/api/date-schedules?startDate=${startDate}&endDate=${endDate}`;

      const response = await fetch(url, { credentials: "include" });
      const data = await response.json(); // leer una vez
      return data; // devolver para que useQuery lo tenga
    }, // opcional, según tu lógica
  });
  const {
    data: dateSchedules,
    isLoading: dateSchedulesLoading,
    refetch: refetchDateSchedules,
  } = useQuery<Schedule[]>({
    queryKey: ["/api/date-schedules", selectedEmployee?.id, calendarYear],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      const startDate = `${calendarYear}-01-01`;
      const endDate = `${calendarYear}-12-31`;
      const url = `/api/date-schedules?employeeId=${selectedEmployee.id}&startDate=${startDate}&endDate=${endDate}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch date schedules");
      return response.json();
    },
    enabled: !!selectedEmployee && viewMode === "calendar",
  });

  const { data: timeEntriesEmployee, isLoading: timeEntriesEmployeeLoading } =
    useQuery({
      queryKey: ["/api/time-entries/user", selectedEmployee?.id, historyMonth], // 👈 ahora depende también del mes
      queryFn: async () => {
        if (!selectedEmployee || !historyMonth) {
          console.log("Faltan datos: empleado o mes no definidos");
          return [];
        }

        // Convertir el mes a formato YYYY-MM-DD (por ejemplo, 2025-10-01)
        const formattedDate = format(historyMonth, "yyyy-MM-dd");

        // Endpoint ajustado a la nueva ruta
        const url = `/api/time-entries/user/${selectedEmployee.id}/month/${formattedDate}`;

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch employee time entries");

        const data = (await res.json()) as TimeEntry[];
        console.log("Time entries recibidas:", data);
        return data;
      },
      enabled: !!selectedEmployee && !!historyMonth, // 👈 solo ejecuta si hay empleado y mes
    });

  // ⚠️ HOOKS DE MUTACIÓN - DEBEN estar SIEMPRE antes de returns condicionales
  const createDateScheduleMutation = useMutation({
    mutationFn: (data: {
      employeeId: string;
      date: string;
      expectedStartTime: string;
      expectedEndTime: string;
    }) => apiRequest("/api/date-schedules", "POST", data),
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
        variant: "destructive",
      });
    },
  });

  const deleteDateScheduleMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/date-schedules/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/date-schedules"] });
      refetchDateSchedules();
      toast({ title: "Éxito", description: "Horario eliminado correctamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Error al eliminar el horario",
        variant: "destructive",
      });
    },
  });

  const createBulkDateScheduleMutation = useMutation({
    mutationFn: (data: {
      schedules: Array<{
        employeeId: string;
        date: string;
        startTime: string;
        endTime: string;
        startBreak?: string;
        endBreak?: string;
        scheduleType?: string;
      }>;
    }) => apiRequest("/api/date-schedules/bulk", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/date-schedules", selectedEmployee?.id, calendarYear],
      });
      refetchDateSchedules();
      setSelectedDates([]);
      setShowScheduleDialog(false);
      toast({ title: "Éxito", description: "Horarios creados correctamente" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Error al crear los horarios",
        variant: "destructive",
      });
    },
  });
  function calculateAssignedHours(schedules: Schedule[]): number {
    return schedules.reduce((total, shift) => {
      if (!shift.startTime || !shift.endTime) return total;

      const [startHour, startMin] = shift.startTime.split(":").map(Number);
      const [endHour, endMin] = shift.endTime.split(":").map(Number);

      let workMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      // Restamos pausa si existe
      if (shift.startBreak && shift.endBreak) {
        const [breakStartHour, breakStartMin] = shift.startBreak.split(":").map(Number);
        const [breakEndHour, breakEndMin] = shift.endBreak.split(":").map(Number);
        const breakMinutes = (breakEndHour * 60 + breakEndMin) - (breakStartHour * 60 + breakStartMin);
        workMinutes -= breakMinutes;
      }

      return total + workMinutes / 60; // convertimos a horas
    }, 0);
  }

  // useMemo para calcular horas asignadas por empleado
  const assignedHoursMap = useMemo(() => {
    if (!yearlySchedules || !employees) return new Map<string, number>();

    const map = new Map<string, number>();

    employees.forEach((employee) => {
      const employeeSchedules = yearlySchedules.filter(
        (s) => s.employeeId === employee.id
      );
      const assignedHours = calculateAssignedHours(employeeSchedules);
      map.set(employee.id, assignedHours);
    });

    return map; // Map<employeeId, assignedHours>
  }, [yearlySchedules, employees]);
  // Calcular resumen de empleados con horas trabajadas
  const employeeSummaries = useMemo((): EmployeeSummary[] => {
    if (!employees || !workdayHistory) return [];

    return employees.map((employee) => {
      // Filtrar entradas de tiempo para este empleado en el año actual
      const currentYear = new Date().getFullYear();
      const employee_workday = workdayHistory.filter((entry) => {
        const entryDate = new Date(entry.date);
        return (
          entry.idUser === employee.id &&
          entryDate.getFullYear() === currentYear &&
          entry.workedMinutes !== null
        );
      });

      // Calcular total de horas trabajadas este año (convertir de minutos a horas)
      const totalMinutesWorked = employee_workday.reduce(
        (sum, entry) => sum + (entry.workedMinutes || 0),
        0,
      );
      const hoursWorked = Math.round((totalMinutesWorked / 60) * 100) / 100;

      // Calcular porcentaje trabajado respecto a horas de convenio
      const conventionHours = 1752; // Horas de convenio anual estándar
      const percentageWorked =
        conventionHours > 0
          ? Math.round((hoursWorked / conventionHours) * 100 * 100) / 100
          : 0;

      return {
        employee,
        hoursWorked,
        conventionHours,
        percentageWorked,
      };
    });
  }, [employees, workdayHistory]);

  // Crear mapa de ID de departamento a nombre
  const departmentMap = useMemo(() => {
    if (!departmentsList) return new Map<string, string>();
    return new Map(departmentsList.map((dept) => [dept.id, dept.name]));
  }, [departmentsList]);

  // Filtrar empleados según búsqueda y departamento
  const filteredSummaries = useMemo(() => {
    return employeeSummaries.filter((summary) => {
      const employee = summary.employee;
      const matchesSearch =
        employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.numEmployee.toLowerCase().includes(searchTerm.toLowerCase());
      const employeeDeptName = employee.departmentId
        ? departmentMap.get(employee.departmentId)
        : null;
      const matchesDepartment =
        selectedDepartment === "all" || employeeDeptName === selectedDepartment;

      return matchesSearch && matchesDepartment && employee.isActive;
    });
  }, [employeeSummaries, searchTerm, selectedDepartment, departmentMap]);

  // Obtener departamentos únicos (nombres) para el filtro
  const departments = useMemo(() => {
    if (!employees || !departmentMap.size) return [];
    const deptNames = employees
      .map((emp) =>
        emp.departmentId ? departmentMap.get(emp.departmentId) : null,
      )
      .filter((name) => name !== null && name !== undefined) as string[];
    return Array.from(new Set(deptNames));
  }, [employees, departmentMap]);

  // ⚠️ CALENDARIO DATA MOVIDO AQUÍ - Debe estar antes de returns condicionales
  const calendarData = useMemo(() => {
    const year = calendarYear;
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 11, 31));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    return months.map((month) => {
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
      for (let i = 1; i <= 6 - endDay; i++) {
        const nextDate = new Date(monthEnd);
        nextDate.setDate(nextDate.getDate() + i);
        nextDays.push(nextDate);
      }

      const allDays = [...prevDays, ...days, ...nextDays];

      return {
        month,
        days: allDays.map((date): CalendarDay => {
          const dateStr = format(date, "yyyy-MM-dd");
          const schedule = dateSchedules?.find((s) => s.date === dateStr);

          return {
            date,
            dateStr,
            isCurrentMonth: isSameMonth(date, month),
            isToday: isToday(date),
            isSelected: selectedDates.some(
              (selected) => selected.dateStr === dateStr,
            ),
            hasSchedule: !!schedule,
            schedule,
          };
        }),
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

  const handleModifySchedule = (employee: User) => {
    setSelectedEmployee(employee);
    setViewMode("calendar");
    toast({
      title: "Modificar Horario",
      description: `Modificando horario para ${employee.firstName} ${employee.lastName}`,
    });
  };

  const handleViewSchedule = (employee: User) => {
    setSelectedEmployee(employee);
    setHistoryMonth(new Date());
    setShowHistoryDialog(true);
  };

  // Efecto para leer employeeId de sessionStorage y seleccionar empleado automáticamente
  useEffect(() => {
    const savedEmployeeId = sessionStorage.getItem("selectedEmployeeId");
    if (savedEmployeeId && employees) {
      const employee = employees.find((emp) => emp.id === savedEmployeeId);
      if (employee) {
        setSelectedEmployee(employee);
        setViewMode("calendar");
        // Limpiar el sessionStorage después de usarlo
        sessionStorage.removeItem("selectedEmployeeId");
      }
    }
  }, [employees]);

  const isLoading =
    employeesLoading ||
    timeEntriesLoading ||
    timeEntriesEmployeeLoading ||
    workdayHistoryLoading ||
    yearlySchedulesLoading ||
    (viewMode === "calendar" && dateSchedulesLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        {/* Spinner moderno */}
        <div className="relative">
          <div className="h-16 w-16 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute top-0 left-0 h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Texto de carga */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Cargando Horarios...</h2>
          <p className="text-muted-foreground mt-2">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  // Vista principal con tabla de resumen
  if (viewMode === "summary") {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Horarios y Turnos
          </h2>
          <p className="text-muted-foreground">
            Gestiona los horarios de trabajo y supervisa el progreso anual de
            cada empleado
          </p>
        </div>

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
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger
                  className="w-48"
                  data-testid="select-department-filter"
                >
                  <SelectValue placeholder="Filtrar por departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((department) => (
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
                    <TableHead>Horas Asignadas</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummaries.map((summary) => {
                    const assignedHours = assignedHoursMap.get(summary.employee.id) || 0;

                    return (
                      <TableRow
                        key={summary.employee.id}
                        data-testid={`employee-row-${summary.employee.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback
                                className={`bg-gradient-to-r ${getAvatarColor(summary.employee.firstName)} text-white text-sm font-semibold`}
                              >
                                {getInitials(summary.employee.firstName, summary.employee.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">
                                {summary.employee.firstName} {summary.employee.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {summary.employee.numEmployee}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {summary.employee.departmentId
                              ? departmentMap.get(summary.employee.departmentId) || "Sin departamento"
                              : "Sin departamento"}
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
                            <span className="text-muted-foreground">{assignedHours}h</span>
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
                    );
                  })}
                </TableBody>

              </Table>
            </div>

            {filteredSummaries.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No se encontraron empleados con los filtros aplicados
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo de historial de turnos */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Historial de Turnos - {historyEmployee?.firstName}{" "}
                {historyEmployee?.lastName}
              </DialogTitle>
              <DialogDescription>
                Visualiza el historial de jornadas laborales del empleado
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryMonth(subMonths(historyMonth, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold text-lg">
                {format(historyMonth, "MMMM yyyy", { locale: es })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryMonth(addMonths(historyMonth, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <Tabs defaultValue="table" className="w-full">
              <TabsContent value="table" className="space-y-4">
                {workdayHistoryLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Cargando historial...
                    </p>
                  </div>
                ) : !workdayHistory || workdayHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No hay jornadas registradas para este mes
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center">Fecha</TableHead>
                          <TableHead className="text-center">Entrada</TableHead>
                          <TableHead className="text-center">Salida</TableHead>
                          <TableHead className="text-center">
                            Horas Trabajadas
                          </TableHead>
                          <TableHead className="text-center">Pausas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeEntriesEmployee?.map((entry: TimeEntry) => {
                          const formatMinutesToHours = (minutes: number) => {
                            const hours = Math.floor(minutes / 60);
                            const mins = minutes % 60;
                            return `${hours}h ${mins}m`;
                          };

                          return (
                            <TableRow
                              key={entry.id}
                              data-testid={`workday-row-${entry.id}`}
                            >
                              <TableCell className="text-center font-medium">
                                {format(new Date(entry.date), "dd/MM/yyyy", {
                                  locale: es,
                                })}
                              </TableCell>
                              <TableCell className="text-center">
                                {entry.clockIn
                                  ? format(new Date(entry.clockIn), "HH:mm")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {entry.clockOut
                                  ? format(new Date(entry.clockOut), "HH:mm")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatMinutesToHours(entry.totalHours)}
                              </TableCell>
                              <TableCell className="text-center">
                                {formatMinutesToHours(entry.breakMinutes)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;

    const isSelected = selectedDates.some(
      (selected) => selected.dateStr === day.dateStr,
    );

    if (isSelected) {
      // Deseleccionar fecha
      const newSelectedDates = selectedDates.filter(
        (selected) => selected.dateStr !== day.dateStr,
      );
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
          setSelectedDates((prev) => [
            ...prev,
            { date: day.date, dateStr: day.dateStr },
          ]);
        } else if (selectionType === "without-schedule" && !dayHasSchedule) {
          // Permitir selección - mismo tipo (sin horario)
          setSelectedDates((prev) => [
            ...prev,
            { date: day.date, dateStr: day.dateStr },
          ]);
        } else {
          // Bloquear selección - tipos diferentes
          toast({
            title: "Selección no permitida",
            description:
              selectionType === "with-schedule"
                ? "No puedes seleccionar días sin horario cuando ya has seleccionado días con horario"
                : "No puedes seleccionar días con horario cuando ya has seleccionado días sin horario",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleAssignSchedule = async () => {
    if (!selectedEmployee || selectedDates.length === 0) return;

    // Validate start time is before end time
    const startTimeMinutes =
      parseInt(scheduleForm.startTime.split(":")[0]) * 60 +
      parseInt(scheduleForm.startTime.split(":")[1]);
    const endTimeMinutes =
      parseInt(scheduleForm.endTime.split(":")[0]) * 60 +
      parseInt(scheduleForm.endTime.split(":")[1]);

    if (startTimeMinutes >= endTimeMinutes) {
      toast({
        title: "Error de Validación",
        description: "La hora de inicio debe ser anterior a la hora de fin",
        variant: "destructive",
      });
      return;
    }

    try {
      // Si estamos modificando horarios existentes, primero borrarlos
      if (selectionType === "with-schedule" && dateSchedules) {
        const schedulesToDelete = selectedDates
          .map((selected) =>
            dateSchedules.find((s) => s.date === selected.dateStr),
          )
          .filter((s) => s !== undefined)
          .map((s) => s!.id);

        // Borrar los horarios antiguos silenciosamente
        for (const scheduleId of schedulesToDelete) {
          await apiRequest(`/api/date-schedules/${scheduleId}`, "DELETE");
        }
      }

      // Crear los nuevos horarios usando el endpoint bulk (funciona para uno o múltiples días)
      await createBulkDateScheduleMutation.mutateAsync({
        schedules: selectedDates.map((selected) => ({
          employeeId: selectedEmployee.id,
          date: selected.dateStr,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          startBreak: scheduleForm.breakStartTime || "",
          endBreak: scheduleForm.breakEndTime || "",
          scheduleType:
            scheduleForm.workdayType === "partida" ? "split" : "total",
        })),
      });

      // Mostrar mensaje de éxito apropiado
      if (selectionType === "with-schedule") {
        toast({
          title: "Horario modificado",
          description: "El horario ha sido modificado exitosamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Hubo un error al procesar la operación. Por favor, intenta de nuevo.",
        variant: "destructive",
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
        .map((selected) =>
          dateSchedules.find((s) => s.date === selected.dateStr),
        )
        .filter((s) => s !== undefined)
        .map((s) => s!.id);

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

  const handleCopySchedules = async () => {
    if (
      !selectedEmployee ||
      !dateSchedules ||
      selectedEmployeesToCopy.length === 0
    )
      return;

    try {
      // Determinar shiftType basado en la hora de inicio
      const determineShiftType = (
        startTime: string,
      ): "morning" | "afternoon" | "night" => {
        const hour = parseInt(startTime.split(":")[0]);
        if (hour < 12) return "morning";
        if (hour < 18) return "afternoon";
        return "night";
      };

      // Crear array de horarios para copiar
      const schedulesToCopy = dateSchedules.map((schedule) => ({
        employeeId: "", // Se llenará para cada empleado destino
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        startBreak: (schedule as any).startBreak || "",
        endBreak: (schedule as any).endBreak || "",
        scheduleType: (schedule as any).scheduleType || "total",
      }));

      let successCount = 0;
      let errorCount = 0;

      // Copiar horarios para cada empleado seleccionado
      for (const targetEmployeeId of selectedEmployeesToCopy) {
        const bulkSchedules = schedulesToCopy.map((s) => ({
          ...s,
          employeeId: targetEmployeeId,
        }));

        try {
          await apiRequest("/api/date-schedules/bulk", "POST", {
            schedules: bulkSchedules,
          });
          successCount++;
        } catch (error) {
          console.error(
            `Error copiando horarios para empleado ${targetEmployeeId}:`,
            error,
          );
          errorCount++;
        }
      }

      // Invalidar cache de horarios para todos los empleados afectados
      selectedEmployeesToCopy.forEach((employeeId) => {
        queryClient.invalidateQueries({
          queryKey: ["/api/date-schedules", employeeId, calendarYear],
        });
      });
      queryClient.invalidateQueries({ queryKey: ["/api/date-schedules"] });

      if (successCount > 0) {
        toast({
          title: "Horarios copiados",
          description: `Se copiaron ${dateSchedules.length} horarios a ${successCount} empleado(s)${errorCount > 0 ? `. ${errorCount} empleado(s) tuvieron errores (posiblemente ya tenían horarios en esas fechas)` : ""}`,
        });
      } else {
        toast({
          title: "Error",
          description:
            "No se pudieron copiar los horarios. Los empleados seleccionados podrían ya tener horarios en esas fechas.",
          variant: "destructive",
        });
      }

      setShowCopyDialog(false);
      setSelectedEmployeesToCopy([]);

      // Refrescar horarios del empleado actual
      await refetchDateSchedules();
    } catch (error) {
      console.error("Error copiando horarios:", error);
      toast({
        title: "Error",
        description:
          "Hubo un error al copiar los horarios. Por favor, intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeesToCopy((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId],
    );
  };

  // Vista de calendario
  if (viewMode === "calendar") {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Modificar Horario
            </h2>
            <p className="text-muted-foreground">
              Empleado: {selectedEmployee?.firstName}{" "}
              {selectedEmployee?.lastName}
            </p>
          </div>
          <div className="flex gap-2">
            {dateSchedules && dateSchedules.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowCopyDialog(true)}
                data-testid="button-copy-schedules"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Horarios
              </Button>
            )}
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
              <CalendarIcon className="w-5 h-5" />
              Calendario Anual {calendarYear}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarYear((prev) => prev - 1)}
                  data-testid="button-prev-year"
                >
                  {calendarYear - 1}
                </Button>
                <span className="font-medium px-4">{calendarYear}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarYear((prev) => prev + 1)}
                  data-testid="button-next-year"
                >
                  {calendarYear + 1}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {selectedDates.length > 0 && (
                  <>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {selectedDates.length} fecha
                      {selectedDates.length > 1 ? "s" : ""} seleccionada
                      {selectedDates.length > 1 ? "s" : ""}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Si estamos seleccionando días con horario, pre-rellenar el formulario con el horario existente
                        if (
                          selectionType === "with-schedule" &&
                          dateSchedules &&
                          selectedDates.length > 0
                        ) {
                          const firstSchedule = dateSchedules.find(
                            (s) => s.date === selectedDates[0].dateStr,
                          );
                          if (firstSchedule) {
                            setScheduleForm((prev) => ({
                              ...prev,
                              startTime: firstSchedule.startTime,
                              endTime: firstSchedule.endTime,
                            }));
                          }
                        }
                        setShowScheduleDialog(true);
                      }}
                      disabled={
                        createDateScheduleMutation.isPending ||
                        createBulkDateScheduleMutation.isPending
                      }
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
                    {format(month, "MMMM", { locale: es })}
                  </h3>

                  {/* Días de la semana */}
                  <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground text-center mb-2">
                    {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                      <div key={day} className="p-1">
                        {day}
                      </div>
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
                        day.isToday &&
                        "bg-primary text-primary-foreground font-semibold",
                        day.isSelected &&
                        "bg-blue-500 dark:bg-blue-600 text-white font-semibold",
                        day.hasSchedule &&
                        !day.isSelected &&
                        "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-medium",
                        !day.isCurrentMonth && "cursor-not-allowed",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={index}
                          className={dayClasses}
                          onClick={() => handleDateClick(day)}
                          title={
                            day.hasSchedule
                              ? `Horario: ${day.schedule?.startTime} - ${day.schedule?.endTime}`
                              : day.isCurrentMonth
                                ? format(day.date, "dd/MM/yyyy")
                                : undefined
                          }
                          data-testid={`calendar-day-${day.dateStr}`}
                        >
                          {format(day.date, "d")}
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
                <h4 className="font-medium mb-3 text-foreground">
                  Horarios Existentes
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {dateSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">
                          {format(new Date(schedule.date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </span>
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

        {/* Dialog para copiar horarios a otros empleados */}
        <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
          <DialogContent
            data-testid="dialog-copy-schedules"
            className="max-w-2xl max-h-[80vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>Copiar Horarios a Otros Empleados</DialogTitle>
              <DialogDescription>
                Selecciona los empleados a los que quieres copiar los{" "}
                {dateSchedules?.length || 0} horarios de{" "}
                {selectedEmployee?.firstName} {selectedEmployee?.lastName} del
                año {calendarYear}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
                {employees
                  ?.filter((emp) => emp.id !== selectedEmployee?.id)
                  .map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center space-x-3 hover-elevate p-2 rounded"
                    >
                      <Checkbox
                        id={`emp-${employee.id}`}
                        checked={selectedEmployeesToCopy.includes(employee.id)}
                        onCheckedChange={() =>
                          toggleEmployeeSelection(employee.id)
                        }
                        data-testid={`checkbox-employee-${employee.id}`}
                      />
                      <label
                        htmlFor={`emp-${employee.id}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee.departmentId
                              ? departmentMap.get(employee.departmentId) ||
                              "Sin departamento"
                              : "Sin departamento"}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
              </div>

              {selectedEmployeesToCopy.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {selectedEmployeesToCopy.length} empleado(s) seleccionado(s)
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCopyDialog(false);
                  setSelectedEmployeesToCopy([]);
                }}
                data-testid="button-cancel-copy"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCopySchedules}
                disabled={selectedEmployeesToCopy.length === 0}
                data-testid="button-confirm-copy"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Horarios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog para asignar/modificar horario */}
        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent data-testid="dialog-assign-schedule">
            <DialogHeader>
              <DialogTitle>
                {selectionType === "with-schedule"
                  ? "Modificar Horario"
                  : "Asignar Horario"}
              </DialogTitle>
              <DialogDescription>
                {selectionType === "with-schedule"
                  ? `Modificar o borrar horario de ${selectedDates.length} fecha${selectedDates.length > 1 ? "s" : ""} seleccionada${selectedDates.length > 1 ? "s" : ""}`
                  : `Asignar horario a ${selectedDates.length} fecha${selectedDates.length > 1 ? "s" : ""} seleccionada${selectedDates.length > 1 ? "s" : ""}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Jornada</Label>
                <Select
                  value={scheduleForm.workdayType}
                  onValueChange={(value: "completa" | "partida") =>
                    setScheduleForm((prev) => ({ ...prev, workdayType: value }))
                  }
                >
                  <SelectTrigger data-testid="select-workday-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completa">Jornada Completa</SelectItem>
                    <SelectItem value="partida">Jornada Partida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Hora de Inicio</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Hora de Fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              {scheduleForm.workdayType === "partida" && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="breakStartTime">Inicio de Pausa</Label>
                    <Input
                      id="breakStartTime"
                      type="time"
                      value={scheduleForm.breakStartTime}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          breakStartTime: e.target.value,
                        }))
                      }
                      data-testid="input-break-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breakEndTime">Fin de Pausa</Label>
                    <Input
                      id="breakEndTime"
                      type="time"
                      value={scheduleForm.breakEndTime}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          breakEndTime: e.target.value,
                        }))
                      }
                      data-testid="input-break-end-time"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">
                  Fechas seleccionadas:
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedDates.map((selected) => (
                    <Badge
                      key={selected.dateStr}
                      variant="secondary"
                      className="text-xs"
                    >
                      {format(selected.date, "dd/MM/yyyy", { locale: es })}
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
                disabled={
                  createDateScheduleMutation.isPending ||
                  createBulkDateScheduleMutation.isPending
                }
                data-testid="button-save-schedule"
              >
                <Save className="w-4 h-4 mr-2" />
                {selectionType === "with-schedule"
                  ? selectedDates.length > 1
                    ? "Modificar Todas"
                    : "Modificar"
                  : selectedDates.length > 1
                    ? "Asignar a Todas"
                    : "Asignar"}
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
              Empleado: {selectedEmployee?.firstName}{" "}
              {selectedEmployee?.lastName}
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
                La vista de historial de horarios estará disponible
                próximamente.
              </p>
              <p className="text-sm text-muted-foreground">
                Mostrará horas trabajadas para días pasados y horas programadas
                para días futuros.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
