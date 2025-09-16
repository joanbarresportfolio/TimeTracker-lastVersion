import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit3, Eye, Users, Timer, Building, Clock, Calendar } from "lucide-react";
import type { Employee, TimeEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface EmployeeSummary {
  employee: Employee;
  hoursWorked: number;
  conventionHours: number;
  percentageWorked: number;
}

export default function Schedules() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"summary" | "calendar" | "schedule">("summary");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
  });

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

  const isLoading = employeesLoading || timeEntriesLoading;

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

  // Vista de calendario (próximamente)
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
          <Button 
            variant="outline"
            onClick={() => setViewMode("summary")}
            data-testid="button-back-to-summary"
          >
            Volver al Resumen
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendario Anual - Próximamente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                La funcionalidad del calendario anual estará disponible próximamente.
              </p>
              <p className="text-sm text-muted-foreground">
                Permitirá seleccionar múltiples fechas y asignar horarios específicos.
              </p>
            </div>
          </CardContent>
        </Card>
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