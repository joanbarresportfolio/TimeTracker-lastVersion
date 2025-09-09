import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Search, LogIn, LogOut, Timer } from "lucide-react";
import type { Employee, TimeEntry } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TimeTracking() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", selectedDate],
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
                    <p className="font-medium">{formatTime(entry?.clockIn)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salida</p>
                    <p className="font-medium">{formatTime(entry?.clockOut)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Tiempo trabajado</p>
                  <p className="font-medium">{formatDuration(entry?.totalHours)}</p>
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
