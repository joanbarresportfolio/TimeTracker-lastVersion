import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Search,
  LogIn,
  LogOut,
  Timer,
  Calendar,
  AlertCircle,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  type User,
  type Schedule,
  type DailyWorkday,
  type Department,
  type WorkdayFormData,
  workdayFormSchema,
  ClockEntry,
  TimeEntry,
  BreakEntry,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function TimeTracking() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const { toast } = useToast();

  // Vista de administrador (existente)
  return (
    <AdminTimeTracking
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      toast={toast}
    />
  );
}
function formatHours(hours: number): string {
  const h = Math.floor(hours); // Parte entera → horas
  const m = Math.round((hours - h) * 60); // Parte decimal → minutos

  // Si no hay horas, muestra solo minutos
  if (h === 0) return `${m}m`;
  // Si no hay minutos, muestra solo horas
  if (m === 0) return `${h}h`;
  // En caso contrario, muestra ambas
  return `${h}h ${m}m`;
}
// Componente para administradores (vista existente)
function AdminTimeTracking({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  toast,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  toast: any;
}) {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "update" | "delete" | null
  >(null);
  const [pendingData, setPendingData] = useState<WorkdayFormData | null>(null);

  const { data: employees, isLoading: employeesLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: timeEntriesByDate, isLoading: timeEntriesByDateLoading } =
    useQuery({
      queryKey: ["/api/time-entries/day", selectedDate],
      queryFn: async () => {
        if (!selectedDate) return [];

        // Llamada a la nueva ruta del backend
        const response = await fetch(`/api/time-entries/day/${selectedDate}`, {
          credentials: "include",
        });

        if (!response.ok) {
          console.error("Error al obtener los time entries del día");
          return [];
        }

        return response.json();
      },
      enabled: !!selectedDate, // Solo se ejecuta si hay fecha seleccionada
    });
  // Estados y form para gestión de jornadas
  const workdayForm = useForm<WorkdayFormData>({
    resolver: zodResolver(workdayFormSchema),
    defaultValues: {
      userId: "",
      date: "",
      workdayType: "completa",
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 0,
    },
  });

  const watchEmployeeId = workdayForm.watch("userId");
  const watchDate = workdayForm.watch("date");

  const { data: workdayResponse, refetch: refetchWorkday } =
    useQuery<DailyWorkday>({
      queryKey: ["/api/daily-workday", watchEmployeeId, watchDate],
      queryFn: async () => {
        if (!watchEmployeeId || !watchDate)
          return { workday: null, hasClockEntries: false, canEdit: true };
        const response = await fetch(
          `/api/daily-workday?userId=${watchEmployeeId}&date=${watchDate}`,
          { credentials: "include" },
        );
        if (!response.ok) throw new Error("Error al obtener jornada");
        return response.json();
      },
      enabled: !!watchEmployeeId && !!watchDate,
    });
  const createWorkdayMutation = useMutation({
    mutationFn: async (data: WorkdayFormData) => {
      return apiRequest("/api/daily-workday", "POST", data);
    },
    onSuccess: () => {
      // Invalidar queries generales y específicas
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/time-entries/day", selectedDate],
      });
      if (workdayForm.watch("userId") && workdayForm.watch("date")) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/daily-workday",
            workdayForm.watch("userId"),
            workdayForm.watch("date"),
          ],
        });
      }

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
      return apiRequest("/api/daily-workday", "POST", data);
    },
    onSuccess: () => {
      // Invalidar queries generales y específicas
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/time-entries/day", selectedDate],
      });
      if (workdayForm.watch("userId") && workdayForm.watch("date")) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/daily-workday",
            workdayForm.watch("userId"),
            workdayForm.watch("date"),
          ],
        });
      }

      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral actualizada" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "No se pudo actualizar la jornada laboral",
        variant: "destructive",
      });
    },
  });

  const deleteWorkdayMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/daily-workday/${workdayResponse?.id}`, "DELETE");
    },
    onSuccess: () => {
      // Invalidar queries generales y específicas
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/time-entries/day", selectedDate],
      });
      if (workdayForm.watch("userId") && workdayForm.watch("date")) {
        queryClient.invalidateQueries({
          queryKey: [
            "/api/daily-workday",
            workdayForm.watch("userId"),
            workdayForm.watch("date"),
          ],
        });
      }

      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral eliminada" });
      workdayForm.reset({
        userId: "",
        date: "",
        startTime: "09:00",
        endTime: "17:00",
        breakMinutes: 0,
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
    if (workdayResponse) {
      setPendingData(data);
      setConfirmAction("update");
      setShowConfirmDialog(true);
    } else {
      createWorkdayMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    // Si hay fichajes, mostrar diálogo de confirmación
    if (workdayResponse) {
      setConfirmAction("delete");
      setShowConfirmDialog(true);
    } else {
      deleteWorkdayMutation.mutate();
    }
  };

  const handleConfirm = () => {
    console.log(confirmAction);
    if (confirmAction === "update" && pendingData) {
      updateWorkdayMutation.mutate(pendingData);
    } else if (confirmAction === "delete") {
      deleteWorkdayMutation.mutate();
    }
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setPendingData(null);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setPendingData(null);
  };

  const clockEntryMutation = useMutation({
    mutationFn: async ({
      employeeId,
      tipoRegistro,
      date,
    }: {
      employeeId: string;
      tipoRegistro: string;
      date: string;
    }) => {
      const response = await apiRequest("/api/clock-entry", "POST", {
        employeeId,
        tipoRegistro,
        origen: "web",
        date: selectedDate,
      });

      if (!response.ok) throw new Error("Error al registrar el fichaje");
      return response.json();
    },

    onSuccess: (_, variables) => {
      // Invalidar las queries relacionadas
      queryClient.invalidateQueries({
        queryKey: ["/api/daily-workday", watchEmployeeId, watchDate],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/time-entries/day", selectedDate],
      });

      // Mostrar un mensaje distinto según el tipo de registro
      let title = "";
      let description = "";

      switch (variables.tipoRegistro) {
        case "clock_in":
          title = "Entrada registrada";
          description = "El empleado ha fichado la entrada exitosamente.";
          break;
        case "clock_out":
          title = "Salida registrada";
          description = "El empleado ha fichado la salida exitosamente.";
          break;
        case "break_start":
          title = "Pausa iniciada";
          description = "La pausa ha sido registrada exitosamente.";
          break;
        case "break_end":
          title = "Pausa finalizada";
          description = "La pausa ha sido finalizada exitosamente.";
          break;
      }

      toast({ title, description });
    },

    onError: (error: any, variables) => {
      let title = "";
      switch (variables.tipoRegistro) {
        case "clock_in":
          title = "Error al fichar entrada";
          break;
        case "clock_out":
          title = "Error al fichar salida";
          break;
        case "break_start":
          title = "Error al iniciar pausa";
          break;
        case "break_end":
          title = "Error al finalizar pausa";
          break;
      }

      toast({
        title,
        description: error.message || "No se pudo registrar el fichaje.",
        variant: "destructive",
      });
    },
  });

  const filteredEmployees =
    employees?.filter((employee) => {
      const matchesSearch =
        employee.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.numEmployee?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment =
        selectedDepartment === "all" ||
        employee.departmentId === selectedDepartment;

      return matchesSearch && matchesDepartment && employee.isActive;
    }) || [];

  const getUserTimeEntriesDay = (employeeId: string) => {
    return timeEntriesByDate?.find(
      (entry: TimeEntry) => entry.employeeId === employeeId,
    );
  };

  const getEmployeeStatus = (employee: User) => {
    // Obtener los time entries del día para este empleado
    const entry = getUserTimeEntriesDay(employee.id);

    if (!entry || entry.length === 0) {
      return {
        status: "not_started",
        label: "Sin fichar",
        color: "bg-gray-500/10 text-gray-700",
      };
    }

    // Si tiene clockOut → jornada finalizada
    if (entry.clockOut) {
      return {
        status: "completed",
        label: "Completado",
        color: "bg-blue-500/10 text-blue-700",
      };
    }

    // Si tiene pausas y la última no ha terminado → en pausa
    const lastBreak = entry.breaks?.[entry.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      return {
        status: "on_break",
        label: "En pausa",
        color: "bg-orange-500/10 text-orange-700",
      };
    }

    // Si tiene clockIn pero no clockOut ni pausa → trabajando
    if (entry.clockIn && !entry.clockOut) {
      return {
        status: "clocked_in",
        label: "Presente",
        color: "bg-green-500/10 text-green-700",
      };
    }

    // Cualquier otro caso
    return {
      status: "unknown",
      label: "Desconocido",
      color: "bg-gray-500/10 text-gray-700",
    };
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
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

  const isLoading = employeesLoading || timeEntriesByDateLoading;

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
          <h2 className="text-xl font-semibold text-foreground">Cargando control horario...</h2>
          <p className="text-muted-foreground mt-2">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Control Horario</h2>
        <p className="text-muted-foreground">
          Gestiona los fichajes de entrada y salida
        </p>
      </div>

      {/* Gestión Manual de Jornadas Laborales */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="w-5 h-5" />
            Gestión Manual de Jornadas
          </CardTitle>
          <CardDescription>
            Añadir, editar o eliminar jornadas laborales manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...workdayForm}>
            <form
              onSubmit={workdayForm.handleSubmit(onWorkdaySubmit)}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={workdayForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
                  name="workdayType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Jornada</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="completa">
                            Jornada Completa
                          </SelectItem>
                          <SelectItem value="partida">
                            Jornada Partida
                          </SelectItem>
                        </SelectContent>
                      </Select>
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

              {workdayForm.watch("workdayType") === "partida" && (
                <div className="grid gap-4 md:grid-cols-3 p-3 bg-muted rounded-lg">
                  <FormField
                    control={workdayForm.control}
                    name="startBreak"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inicio de Pausa</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={workdayForm.control}
                    name="endBreak"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fin de Pausa</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    createWorkdayMutation.isPending ||
                    updateWorkdayMutation.isPending
                  }
                >
                  {workdayResponse ? "Actualizar Jornada" : "Crear Jornada"}
                </Button>

                {workdayResponse && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteWorkdayMutation.isPending}
                    data-testid="button-delete-workday"
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
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger
                className="w-[200px]"
                data-testid="select-department-filter"
              >
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
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
                <p className="text-sm font-medium text-muted-foreground">
                  Total Empleados
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">
                  Presentes
                </p>
                <p className="text-2xl font-bold">
                  {
                    filteredEmployees.filter(
                      (emp) => getEmployeeStatus(emp).status === "clocked_in",
                    ).length
                  }
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
                <p className="text-sm font-medium text-muted-foreground">
                  Completados
                </p>
                <p className="text-2xl font-bold">
                  {
                    filteredEmployees.filter(
                      (emp) => getEmployeeStatus(emp).status === "completed",
                    ).length
                  }
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
                <p className="text-sm font-medium text-muted-foreground">
                  Sin Fichar
                </p>
                <p className="text-2xl font-bold">
                  {
                    filteredEmployees.filter(
                      (emp) => getEmployeeStatus(emp).status === "not_started",
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de empleados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredEmployees.map((employee) => {
          const entry = getUserTimeEntriesDay(employee.id);
          const status = getEmployeeStatus(employee);
          return (
            <Card
              key={employee.id}
              className="hover:shadow-md transition-shadow"
              data-testid={`employee-time-card-${employee.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback
                        className={`bg-gradient-to-r ${getAvatarColor(employee.firstName)} text-white font-semibold`}
                      >
                        {getInitials(employee.firstName, employee.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {employee.numEmployee}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {departments?.find(
                          (d) => d.id === employee.departmentId,
                        )?.name || "Sin asignar"}
                      </p>
                    </div>
                  </div>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Entrada</p>
                    <p className="font-medium">
                      {formatTime(entry?.clockIn || null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salida</p>
                    <p className="font-medium">
                      {formatTime(entry?.clockOut || null)}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Tiempo trabajado</p>
                  <p className="font-medium">
                    {formatDuration(entry?.totalHours || null)}
                  </p>
                </div>

                {/* 👇 Nueva sección para mostrar pausas */}
                {entry?.breaks && entry.breaks.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Pausas ({entry.breaks.length})
                    </p>
                    <div className="space-y-1">
                      {entry.breaks.map((b: BreakEntry, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm text-muted-foreground border rounded-md px-3 py-1"
                        >
                          <span>Pausa {i + 1}</span>
                          <span>
                            {formatTime(b.start)} —{" "}
                            {b.end ? formatTime(b.end) : "En curso"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total de minutos en pausa */}
                    <p className="text-xs text-muted-foreground mt-2">
                      Total pausas: <span className="font-medium">{entry.breakMinutes} min</span>
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Tiempo trabajado
                  </p>
                  <p className="font-medium">
                    {formatHours(entry?.totalHours || null)}
                  </p>
                </div>

                <div className="flex space-x-2">
                  {status.status === "not_started" && (
                    <Button
                      onClick={() =>
                        clockEntryMutation.mutate({
                          employeeId: employee.id,
                          tipoRegistro: "clock_in",
                          date: selectedDate,
                        })
                      }
                      disabled={clockEntryMutation.isPending}
                      className="flex-1"
                      data-testid={`button-clock-in-${employee.id}`}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Fichar Entrada
                    </Button>
                  )}

                  {status.status === "clocked_in" && (
                    <>
                      <Button
                        onClick={() =>
                          clockEntryMutation.mutate({
                            employeeId: employee.id,
                            tipoRegistro: "break_start",
                            date: selectedDate,
                          })
                        }
                        disabled={clockEntryMutation.isPending}
                        variant="outline"
                        className="flex-1"
                        data-testid={`button-break-start-${employee.id}`}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Iniciar Pausa
                      </Button>
                      <Button
                        onClick={() =>
                          clockEntryMutation.mutate({
                            employeeId: employee.id,
                            tipoRegistro: "clock_out",
                            date: selectedDate,
                          })
                        }
                        disabled={clockEntryMutation.isPending}
                        variant="outline"
                        className="flex-1"
                        data-testid={`button-clock-out-${employee.id}`}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Fichar Salida
                      </Button>
                    </>
                  )}

                  {status.status === "on_break" && (
                    <Button
                      onClick={() =>
                        clockEntryMutation.mutate({
                          employeeId: employee.id,
                          tipoRegistro: "break_end",
                          date: selectedDate,
                        })
                      }
                      disabled={clockEntryMutation.isPending}
                      variant="outline"
                      className="flex-1"
                      data-testid={`button-break-end-${employee.id}`}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Finalizar Pausa
                    </Button>
                  )}

                  {status.status === "completed" && (
                    <Badge
                      variant="outline"
                      className="flex-1 justify-center py-2"
                    >
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
              <h3 className="text-lg font-semibold mb-2">
                No se encontraron empleados
              </h3>
              <p>Intenta modificar los filtros de búsqueda</p>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          }
        }}
      >
        <AlertDialogContent
          className="bg-white dark:bg-gray-900 border-2 shadow-2xl"
          data-testid="dialog-confirm-workday-action"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">
              {confirmAction === "update"
                ? "¿Actualizar jornada con fichajes?"
                : "¿Eliminar jornada con fichajes?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              Esta jornada tiene fichajes registrados.{" "}
              {confirmAction === "update" ? "Si actualizas" : "Si eliminas"}{" "}
              esta jornada, los fichajes asociados serán eliminados
              automáticamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancel}
              data-testid="button-cancel-action"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              data-testid="button-confirm-action"
            >
              {confirmAction === "update" ? "Actualizar" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
