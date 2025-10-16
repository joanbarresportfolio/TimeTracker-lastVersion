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
  type TimeEntry,
  type Schedule,
  type DailyWorkday,
  type Department,
  type WorkdayFormData,
  workdayFormSchema,
} from "@shared/schema";
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

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<
    TimeEntry[]
  >({
    queryKey: ["/api/time-entries"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  // Obtener clock_entries para detectar pausas activas
  const { data: allClockEntries } = useQuery({
    queryKey: ["/api/fichajes/all", selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/fichajes/all?date=${selectedDate}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
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
      console.log(workdayResponse);
      return apiRequest("/api/daily-workday", "POST", data);
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
      console.log(workdayResponse);
      return apiRequest("/api/daily-workday", "POST", data);
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

  const deleteWorkdayMutation = useMutation({
    mutationFn: async () => {
      console.log(workdayResponse);
      return apiRequest(`/api/daily-workday/${workdayResponse?.id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
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

  const clockInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("/api/fichajes", "POST", {
        employeeId,
        tipoRegistro: "clock_in",
        origen: "web",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/fichajes/all", selectedDate],
      });
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
      const response = await apiRequest("/api/fichajes", "POST", {
        employeeId,
        tipoRegistro: "clock_out",
        origen: "web",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/fichajes/all", selectedDate],
      });
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

  const breakStartMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("/api/fichajes", "POST", {
        employeeId,
        tipoRegistro: "break_start",
        origen: "web",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/fichajes/all", selectedDate],
      });
      toast({
        title: "Pausa iniciada",
        description: "La pausa ha sido registrada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al iniciar pausa",
        description: error.message || "No se pudo iniciar la pausa.",
        variant: "destructive",
      });
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const response = await apiRequest("/api/fichajes", "POST", {
        employeeId,
        tipoRegistro: "break_end",
        origen: "web",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/fichajes/all", selectedDate],
      });
      toast({
        title: "Pausa finalizada",
        description: "La pausa ha sido finalizada exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al finalizar pausa",
        description: error.message || "No se pudo finalizar la pausa.",
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

  const getEmployeeTimeEntry = (employeeId: string) => {
    return timeEntries?.find(
      (entry) => entry.employeeId === employeeId && entry.date === selectedDate,
    );
  };

  const hasActiveBreak = (employeeId: string) => {
    if (!allClockEntries) return false;
    const employeeEntries = allClockEntries.filter(
      (entry: any) => entry.idUser === employeeId,
    );
    const breakStarts = employeeEntries.filter(
      (entry: any) => entry.entryType === "break_start",
    );
    const breakEnds = employeeEntries.filter(
      (entry: any) => entry.entryType === "break_end",
    );
    return breakStarts.length > breakEnds.length;
  };

  const getEmployeeStatus = (employee: User) => {
    const entry = getEmployeeTimeEntry(employee.id);
    if (!entry)
      return {
        status: "not_started",
        label: "Sin fichar",
        color: "bg-gray-500/10 text-gray-700",
      };

    // Verificar si está en pausa
    if (entry.clockIn && !entry.clockOut && hasActiveBreak(employee.id)) {
      return {
        status: "on_break",
        label: "En pausa",
        color: "bg-orange-500/10 text-orange-700",
      };
    }

    if (entry.clockIn && !entry.clockOut)
      return {
        status: "clocked_in",
        label: "Presente",
        color: "bg-green-500/10 text-green-700",
      };
    if (entry.clockOut)
      return {
        status: "completed",
        label: "Completado",
        color: "bg-blue-500/10 text-blue-700",
      };
    return {
      status: "not_started",
      label: "Sin fichar",
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

  const isLoading = employeesLoading || timeEntriesLoading;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            Control Horario
          </h2>
          <p className="text-muted-foreground">
            Gestiona los fichajes de entrada y salida
          </p>
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
          const entry = getEmployeeTimeEntry(employee.id);
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
                  <p className="text-sm text-muted-foreground">
                    Tiempo trabajado
                  </p>
                  <p className="font-medium">
                    {formatDuration(entry?.totalHours || null)}
                  </p>
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
                    <>
                      <Button
                        onClick={() => breakStartMutation.mutate(employee.id)}
                        disabled={breakStartMutation.isPending}
                        variant="outline"
                        className="flex-1"
                        data-testid={`button-break-start-${employee.id}`}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Iniciar Pausa
                      </Button>
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
                    </>
                  )}

                  {status.status === "on_break" && (
                    <Button
                      onClick={() => breakEndMutation.mutate(employee.id)}
                      disabled={breakEndMutation.isPending}
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
