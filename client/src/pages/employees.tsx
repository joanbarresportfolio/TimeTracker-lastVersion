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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { createUserSchema } from "@shared/schema";
import type { Employee, CreateUser, Department, Role } from "@shared/schema";
import { z } from "zod";

// Tipos específicos para las llamadas a la API (con fechas como strings)
type CreateEmployeePayload = {
  employeeNumber: string;
  dni?: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId?: string;
  hireDate: string; // String para el backend
  isActive?: boolean;
  passwordHash: string;
  role: "admin" | "employee";
  rolEmpresa?: string;
};

type UpdateEmployeePayload = Omit<CreateEmployeePayload, 'passwordHash' | 'role'> & {
  passwordHash?: string;
  role?: "admin" | "employee";
  rolEmpresa?: string;
};

import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: CreateEmployeePayload) => {
      const response = await apiRequest("/api/employees", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Empleado creado",
        description: "El empleado ha sido creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el empleado.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeePayload }) => {
      const response = await apiRequest(`/api/employees/${id}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      form.reset();
      toast({
        title: "Empleado actualizado",
        description: "El empleado ha sido actualizado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el empleado.",
        variant: "destructive",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/employees/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Empleado eliminado",
        description: "El empleado ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el empleado.",
        variant: "destructive",
      });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("/api/departments", "POST", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setNewDepartmentName("");
      toast({
        title: "Departamento creado",
        description: "El departamento ha sido creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el departamento.",
        variant: "destructive",
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/departments/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Departamento eliminado",
        description: "El departamento ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el departamento.",
        variant: "destructive",
      });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("/api/roles", "POST", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setNewRoleName("");
      toast({
        title: "Rol creado",
        description: "El rol ha sido creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el rol.",
        variant: "destructive",
      });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/roles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el rol.",
        variant: "destructive",
      });
    },
  });

  // Esquema para el formulario (frontend - usa Date objects)
  // Hacemos la contraseña opcional para permitir edición sin cambiar la contraseña
  const employeeFormSchema = createUserSchema.extend({
    hireDate: z.date(), // El formulario usa Date objects
    passwordHash: z.string().min(4, "La contraseña debe tener al menos 4 caracteres").or(z.string().length(0)).optional(),
  });
  
  type EmployeeFormData = z.infer<typeof employeeFormSchema>;
  
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeNumber: "",
      dni: "",
      firstName: "",
      lastName: "",
      email: "",
      departmentId: "",
      hireDate: new Date(),
      isActive: true,
      passwordHash: "",
      role: "employee",
      rolEmpresa: "",
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (editingEmployee) {
      // Para actualizar, incluimos todos los campos excepto passwordHash y role si están vacíos
      const updatePayload: UpdateEmployeePayload = {
        employeeNumber: data.employeeNumber,
        dni: data.dni || undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        departmentId: data.departmentId === 'none' || !data.departmentId ? undefined : data.departmentId,
        hireDate: data.hireDate.toISOString(),
        isActive: data.isActive,
        rolEmpresa: data.rolEmpresa === 'none' || !data.rolEmpresa ? undefined : data.rolEmpresa,
      };
      
      // Solo incluir contraseña si se ha proporcionado una nueva
      if (data.passwordHash && data.passwordHash.trim()) {
        updatePayload.passwordHash = data.passwordHash;
      }
      
      // Incluir el rol si se ha especificado
      if (data.role) {
        updatePayload.role = data.role;
      }
      
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data: updatePayload });
    } else {
      // Para crear, incluimos todos los datos y convertimos fecha
      const createPayload: CreateEmployeePayload = {
        employeeNumber: data.employeeNumber,
        dni: data.dni || undefined,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        departmentId: data.departmentId === 'none' || !data.departmentId ? undefined : data.departmentId,
        hireDate: data.hireDate.toISOString(),
        isActive: data.isActive,
        passwordHash: data.passwordHash || "", // Asegurarse de que sea string
        role: data.role,
        rolEmpresa: data.rolEmpresa === 'none' || !data.rolEmpresa ? undefined : data.rolEmpresa,
      };
      createEmployeeMutation.mutate(createPayload);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    form.reset({
      employeeNumber: employee.employeeNumber,
      dni: employee.dni || "",
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentId: employee.departmentId || "none", // Usar "none" si está vacío
      hireDate: new Date(employee.hireDate), // Convertir string a Date object
      isActive: employee.isActive,
      passwordHash: "", // Vacío por defecto, opcional al editar
      role: employee.role as "admin" | "employee",
      rolEmpresa: employee.rolEmpresa || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este empleado?")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const handleDeleteDepartment = (id: string) => {
    const employeesInDept = employees?.filter(emp => emp.departmentId === id).length || 0;
    if (employeesInDept > 0) {
      if (!confirm(`Este departamento tiene ${employeesInDept} empleado(s) asignado(s). ¿Estás seguro de que quieres eliminarlo? Los empleados quedarán sin departamento.`)) {
        return;
      }
    }
    deleteDepartmentMutation.mutate(id);
  };

  const handleDeleteRole = (id: string) => {
    const role = roles.find(r => r.id === id);
    const employeesWithRole = employees?.filter(emp => emp.role === role?.name).length || 0;
    if (employeesWithRole > 0) {
      if (!confirm(`Este rol tiene ${employeesWithRole} empleado(s) asignado(s). ¿Estás seguro de que quieres eliminarlo? Los empleados se cambiarán al rol 'employee'.`)) {
        return;
      }
    }
    deleteRoleMutation.mutate(id);
  };
  
  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || employee.departmentId === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  }) || [];

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

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Empleados</h2>
          <p className="text-muted-foreground">Gestiona la información de los empleados</p>
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
        <h2 className="text-2xl font-bold text-foreground">Empleados</h2>
        <p className="text-muted-foreground">Gestiona la información de los empleados</p>
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
                  data-testid="input-search-employees"
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48" data-testid="select-department-filter">
                  <SelectValue placeholder="Filtrar por departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-edit-departments">
                    Editar Departamentos
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Gestionar Departamentos</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre del departamento"
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        data-testid="input-department-name"
                      />
                      <Button 
                        onClick={() => {
                          if (newDepartmentName.trim()) {
                            createDepartmentMutation.mutate(newDepartmentName.trim());
                          }
                        }}
                        disabled={createDepartmentMutation.isPending || !newDepartmentName.trim()}
                        data-testid="button-create-department"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {departments.map(dept => (
                        <div key={dept.id} className="flex items-center justify-between p-2 rounded-md border">
                          <span>{dept.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDepartment(dept.id)}
                            disabled={deleteDepartmentMutation.isPending}
                            data-testid={`button-delete-department-${dept.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-edit-roles">
                    Editar Roles
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Gestionar Roles</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nombre del rol"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        data-testid="input-role-name"
                      />
                      <Button 
                        onClick={() => {
                          if (newRoleName.trim()) {
                            createRoleMutation.mutate(newRoleName.trim());
                          }
                        }}
                        disabled={createRoleMutation.isPending || !newRoleName.trim()}
                        data-testid="button-create-role"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {roles.map(role => (
                        <div key={role.id} className="flex items-center justify-between p-2 rounded-md border">
                          <span>{role.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={deleteRoleMutation.isPending}
                            data-testid={`button-delete-role-${role.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => {
                      setEditingEmployee(null);
                      form.reset({
                        employeeNumber: "",
                        dni: "",
                        firstName: "",
                        lastName: "",
                        email: "",
                        departmentId: "",
                        hireDate: new Date(),
                        isActive: true,
                        passwordHash: "",
                        role: "employee",
                        rolEmpresa: "",
                      });
                    }}
                    data-testid="button-add-employee"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Empleado
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="employeeNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Empleado</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-employee-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dni"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DNI</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-dni" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellido</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="passwordHash"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña {editingEmployee && "(opcional)"}</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              {...field} 
                              placeholder={editingEmployee ? "Dejar en blanco para mantener la actual" : ""} 
                              data-testid="input-password" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol del Sistema</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="employee">Empleado</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="rolEmpresa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol en la Empresa</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-rol-empresa">
                                <SelectValue placeholder="Seleccionar rol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sin rol específico</SelectItem>
                              {roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Departamento (opcional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-department">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Ninguno</SelectItem>
                              {departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de Contratación</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                              data-testid="input-hire-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                        disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                        data-testid="button-save-employee"
                      >
                        {editingEmployee ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de empleados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-md transition-shadow" data-testid={`employee-card-${employee.id}`}>
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
                <Badge variant={employee.isActive ? "default" : "secondary"}>
                  {employee.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Departamento:</span>
                  <span className="font-medium">
                    {departments.find(d => d.id === employee.departmentId)?.name || "Sin asignar"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rol:</span>
                  <span className="font-medium">
                    {roles.find(r => r.id === employee.rolEmpresa)?.name || "Sin asignar"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium truncate">{employee.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contratación:</span>
                  <span className="font-medium">
                    {new Date(employee.hireDate).toLocaleDateString('es-ES')}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleEdit(employee)}
                  data-testid={`button-edit-${employee.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleDelete(employee.id)}
                  data-testid={`button-delete-${employee.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              {employees?.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No hay empleados registrados</h3>
                  <p>Comienza agregando tu primer empleado</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No se encontraron empleados</h3>
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
