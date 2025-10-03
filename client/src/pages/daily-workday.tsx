import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DailyWorkday } from "@shared/schema";

type Employee = {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: string;
};

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

export default function DailyWorkday() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: workdayResponse, refetch: refetchWorkday } = useQuery<WorkdayResponse>({
    queryKey: ["/api/daily-workday", selectedEmployee?.id, selectedDate ? format(selectedDate, "yyyy-MM-dd") : null],
    queryFn: async () => {
      if (!selectedEmployee || !selectedDate) return { workday: null, hasClockEntries: false, canEdit: true };
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/daily-workday?employeeId=${selectedEmployee.id}&date=${dateStr}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Error al obtener jornada");
      return response.json();
    },
    enabled: !!selectedEmployee && !!selectedDate,
  });

  const form = useForm<WorkdayFormData>({
    resolver: zodResolver(workdayFormSchema),
    defaultValues: {
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 30,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkdayFormData) => {
      const payload = {
        employeeId: selectedEmployee!.id,
        date: format(selectedDate!, "yyyy-MM-dd"),
        ...data,
      };
      return apiRequest("POST", "/api/daily-workday", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral creada correctamente" });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la jornada laboral",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: WorkdayFormData) => {
      return apiRequest("PUT", `/api/daily-workday/${workdayResponse?.workday?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral actualizada correctamente" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la jornada laboral",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/daily-workday/${workdayResponse?.workday?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-workday"] });
      refetchWorkday();
      toast({ title: "Éxito", description: "Jornada laboral eliminada correctamente" });
      form.reset({
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

  const onSubmit = (data: WorkdayFormData) => {
    if (workdayResponse?.workday) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (confirm("¿Está seguro de que desea eliminar esta jornada laboral?")) {
      deleteMutation.mutate();
    }
  };

  const formatTime = (timestamp: string | null | undefined): string => {
    if (!timestamp) return "--:--";
    const date = new Date(timestamp);
    return format(date, "HH:mm");
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees?.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && workdayResponse?.workday) {
      form.reset({
        startTime: formatTime(workdayResponse.workday.startTime),
        endTime: formatTime(workdayResponse.workday.endTime),
        breakMinutes: workdayResponse.workday.breakMinutes,
      });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Jornadas Laborales</h1>
        <p className="text-muted-foreground">
          Crear, editar o eliminar registros de jornadas laborales manualmente
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-employee-selector">
          <CardHeader>
            <CardTitle>1. Seleccionar Empleado</CardTitle>
            <CardDescription>Elige el empleado para gestionar su jornada</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEmployee?.id || ""}
              onValueChange={handleEmployeeChange}
              disabled={employeesLoading}
            >
              <SelectTrigger data-testid="select-employee">
                <SelectValue placeholder="Seleccionar empleado..." />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card data-testid="card-date-selector">
          <CardHeader>
            <CardTitle>2. Seleccionar Fecha</CardTitle>
            <CardDescription>Elige la fecha de la jornada laboral</CardDescription>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  disabled={!selectedEmployee}
                  data-testid="button-date-picker"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Seleccionar fecha..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      {selectedEmployee && selectedDate && (
        <>
          {workdayResponse?.hasClockEntries && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta jornada tiene fichajes automáticos y no puede ser editada o eliminada.
                Solo puede visualizarse.
              </AlertDescription>
            </Alert>
          )}

          <Card data-testid="card-workday-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {workdayResponse?.workday ? "Editar Jornada Laboral" : "Crear Jornada Laboral"}
              </CardTitle>
              <CardDescription>
                {selectedEmployee.firstName} {selectedEmployee.lastName} - {format(selectedDate, "PPP")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hora de Entrada</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="time"
                              disabled={!workdayResponse?.canEdit}
                              data-testid="input-start-time"
                            />
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
                          <FormLabel>Hora de Salida</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="time"
                              disabled={!workdayResponse?.canEdit}
                              data-testid="input-end-time"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="breakMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minutos de Pausa</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            disabled={!workdayResponse?.canEdit}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-break-minutes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {workdayResponse?.workday && (
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h3 className="font-semibold">Datos Calculados</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Minutos trabajados:</span>
                          <span className="ml-2 font-medium" data-testid="text-worked-minutes">
                            {workdayResponse.workday.workedMinutes}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Estado:</span>
                          <span className="ml-2 font-medium" data-testid="text-status">
                            {workdayResponse.workday.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {workdayResponse?.canEdit && (
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit"
                      >
                        {workdayResponse?.workday ? "Actualizar" : "Crear"} Jornada
                      </Button>

                      {workdayResponse?.workday && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={deleteMutation.isPending}
                          data-testid="button-delete"
                        >
                          Eliminar
                        </Button>
                      )}
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
