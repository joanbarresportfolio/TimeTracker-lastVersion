import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Search, Calendar, Clock, CalendarDays } from "lucide-react";
import { insertScheduleSchemaBase, bulkScheduleCreateSchema } from "@shared/schema";
import { z } from "zod";
import type { Employee, Schedule, InsertSchedule, BulkScheduleCreate } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const daysOfWeek = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

export default function Schedules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [creationMode, setCreationMode] = useState<"single" | "bulk">("single");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: InsertSchedule) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      form.reset();
      resetFormState();
      toast({
        title: "Horario creado",
        description: "El horario ha sido creado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el horario.",
        variant: "destructive",
      });
    },
  });

  const createBulkScheduleMutation = useMutation({
    mutationFn: async (data: BulkScheduleCreate) => {
      const response = await apiRequest("POST", "/api/schedules/bulk", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      form.reset();
      resetFormState();
      const scheduleCount = Array.isArray(data) ? data.length : selectedDays.length;
      toast({
        title: "Horarios creados",
        description: `Se han creado ${scheduleCount} horarios exitosamente.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron crear los horarios.",
        variant: "destructive",
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertSchedule> }) => {
      const response = await apiRequest("PUT", `/api/schedules/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsDialogOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({
        title: "Horario actualizado",
        description: "El horario ha sido actualizado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el horario.",
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Horario eliminado",
        description: "El horario ha sido eliminado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el horario.",
        variant: "destructive",
      });
    },
  });

  // Schema personalizado para el formulario que funciona en ambos modos
  const formSchema = insertScheduleSchemaBase.extend({
    dayOfWeek: insertScheduleSchemaBase.shape.dayOfWeek.optional().default(1),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: "",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    },
  });

  const resetFormState = () => {
    setCreationMode("single");
    setSelectedDays([]);
  };

  const onSubmit = (data: InsertSchedule) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, data });
    } else {
      // Modo de creación individual
      if (creationMode === "single") {
        createScheduleMutation.mutate(data);
      } 
      // Modo de creación masiva
      else {
        if (selectedDays.length === 0) {
          toast({
            title: "Error",
            description: "Debe seleccionar al menos un día de la semana.",
            variant: "destructive",
          });
          return;
        }

        const bulkData: BulkScheduleCreate = {
          employeeId: data.employeeId,
          startTime: data.startTime,
          endTime: data.endTime,
          daysOfWeek: selectedDays,
          isActive: data.isActive ?? true,
        };
        createBulkScheduleMutation.mutate(bulkData);
      }
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    form.reset({
      employeeId: schedule.employeeId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este horario?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees?.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Empleado no encontrado";
  };

  const getEmployeeInfo = (employeeId: string) => {
    return employees?.find(emp => emp.id === employeeId);
  };

  const getDayName = (dayOfWeek: number) => {
    return daysOfWeek.find(day => day.value === dayOfWeek)?.label || "Día no válido";
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

  const filteredSchedules = schedules?.filter(schedule => {
    const employee = getEmployeeInfo(schedule.employeeId);
    if (!employee) return false;
    
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEmployee = selectedEmployee === "all" || schedule.employeeId === selectedEmployee;
    
    return matchesSearch && matchesEmployee && schedule.isActive;
  }) || [];

  const isLoading = employeesLoading || schedulesLoading;

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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Horarios y Turnos</h2>
        <p className="text-muted-foreground">Gestiona los horarios de trabajo de los empleados</p>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar empleados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-schedules"
                />
              </div>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-48" data-testid="select-employee-filter">
                  <SelectValue placeholder="Filtrar por empleado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees?.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingSchedule(null);
                    resetFormState();
                    form.reset({
                      employeeId: "",
                      dayOfWeek: 1,
                      startTime: "09:00",
                      endTime: "17:00",
                      isActive: true,
                    });
                  }}
                  data-testid="button-add-schedule"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Horario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? "Editar Horario" : "Nuevo Horario"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    {/* Modo de creación - solo mostrar cuando NO esté editando */}
                    {!editingSchedule && (
                      <div className="space-y-3">
                        <FormLabel>Tipo de Creación</FormLabel>
                        <RadioGroup 
                          value={creationMode} 
                          onValueChange={(value) => setCreationMode(value as "single" | "bulk")}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="single" id="single" />
                            <Label htmlFor="single" className="flex items-center space-x-2 cursor-pointer">
                              <Calendar className="w-4 h-4" />
                              <span>Horario individual</span>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="bulk" id="bulk" />
                            <Label htmlFor="bulk" className="flex items-center space-x-2 cursor-pointer">
                              <CalendarDays className="w-4 h-4" />
                              <span>Múltiples días</span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empleado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees?.map(employee => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.firstName} {employee.lastName} - {employee.employeeNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Campo día de la semana - solo mostrar en modo individual o cuando esté editando */}
                    {(creationMode === "single" || editingSchedule) && (
                      <FormField
                        control={form.control}
                        name="dayOfWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Día de la Semana</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-day-of-week">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {daysOfWeek.map(day => (
                                  <SelectItem key={day.value} value={day.value.toString()}>
                                    {day.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Selección múltiple de días - solo mostrar en modo masivo y NO esté editando */}
                    {creationMode === "bulk" && !editingSchedule && (
                      <div className="space-y-3">
                        <FormLabel>Seleccionar Días de la Semana</FormLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {daysOfWeek.map(day => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${day.value}`}
                                checked={selectedDays.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDays([...selectedDays, day.value]);
                                  } else {
                                    setSelectedDays(selectedDays.filter(d => d !== day.value));
                                  }
                                }}
                                data-testid={`checkbox-day-${day.value}`}
                              />
                              <Label htmlFor={`day-${day.value}`} className="cursor-pointer">
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {selectedDays.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Selecciona al menos un día de la semana
                          </p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Inicio</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-start-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hora de Fin</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-end-time" />
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
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending || createBulkScheduleMutation.isPending}
                        data-testid="button-save-schedule"
                      >
                        {editingSchedule ? "Actualizar" : 
                         creationMode === "bulk" ? "Crear Horarios" : "Crear Horario"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de horarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchedules.map((schedule) => {
          const employee = getEmployeeInfo(schedule.employeeId);
          if (!employee) return null;

          return (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow" data-testid={`schedule-card-${schedule.id}`}>
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
                    </div>
                  </div>
                  <Badge variant={schedule.isActive ? "default" : "secondary"}>
                    {schedule.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{getDayName(schedule.dayOfWeek)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Departamento: {employee.department}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleEdit(schedule)}
                    data-testid={`button-edit-schedule-${schedule.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleDelete(schedule.id)}
                    data-testid={`button-delete-schedule-${schedule.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSchedules.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              {schedules?.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No hay horarios configurados</h3>
                  <p>Comienza creando el primer horario para tus empleados</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No se encontraron horarios</h3>
                  <p>Intenta modificar los filtros de búsqueda</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
