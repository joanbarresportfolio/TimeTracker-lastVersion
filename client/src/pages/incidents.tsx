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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Search, AlertTriangle, Check, X } from "lucide-react";
import { insertIncidentSchema } from "@shared/schema";
import type { Employee, Incident, InsertIncident, IncidentType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const statusTypes = [
  { value: "pending", label: "Pendiente", color: "bg-yellow-500/10 text-yellow-700" },
  { value: "approved", label: "Aprobado", color: "bg-green-500/10 text-green-700" },
  { value: "rejected", label: "Rechazado", color: "bg-red-500/10 text-red-700" },
];

export default function Incidents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const { data: incidentTypes, isLoading: typesLoading } = useQuery<IncidentType[]>({
    queryKey: ["/api/incident-types"],
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (data: InsertIncident) => {
      const response = await apiRequest("/api/incidents", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Incidencia creada",
        description: "La incidencia ha sido creada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la incidencia.",
        variant: "destructive",
      });
    },
  });

  const updateIncidentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertIncident> }) => {
      const response = await apiRequest(`/api/incidents/${id}`, "PUT", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setIsDialogOpen(false);
      setEditingIncident(null);
      form.reset();
      toast({
        title: "Incidencia actualizada",
        description: "La incidencia ha sido actualizada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la incidencia.",
        variant: "destructive",
      });
    },
  });

  const deleteIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/incidents/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Incidencia eliminada",
        description: "La incidencia ha sido eliminada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la incidencia.",
        variant: "destructive",
      });
    },
  });

  const approveIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/incidents/${id}`, "PUT", { status: "approved" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Incidencia aprobada",
        description: "La incidencia ha sido aprobada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo aprobar la incidencia.",
        variant: "destructive",
      });
    },
  });

  const rejectIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/incidents/${id}`, "PUT", { status: "rejected" });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Incidencia rechazada",
        description: "La incidencia ha sido rechazada.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo rechazar la incidencia.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertIncident>({
    resolver: zodResolver(insertIncidentSchema),
    defaultValues: {
      userId: "",
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      incidentType: "",
      description: "",
      status: "pending",
    },
  });

  const onSubmit = (data: InsertIncident) => {
    if (editingIncident) {
      updateIncidentMutation.mutate({ id: editingIncident.id, data });
    } else {
      createIncidentMutation.mutate(data);
    }
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    form.reset({
      userId: incident.userId,
      date: incident.date,
      incidentType: incident.incidentType,
      description: incident.description,
      status: incident.status as "pending" | "approved" | "rejected",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta incidencia?")) {
      deleteIncidentMutation.mutate(id);
    }
  };

  const getEmployeeInfo = (employeeId: string) => {
    return employees?.find(emp => emp.id === employeeId);
  };

  const getIncidentTypeLabel = (type: string) => {
    return incidentTypes?.find(t => t.name === type)?.name || type;
  };

  const getStatusInfo = (status: string) => {
    return statusTypes.find(s => s.value === status) || statusTypes[0];
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

  const filteredIncidents = incidents?.filter(incident => {
    const employee = getEmployeeInfo(incident.userId);
    if (!employee) return false;
    
    const matchesSearch = 
      employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || incident.status === selectedStatus;
    const matchesType = selectedType === "all" || incident.incidentType === selectedType;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const isLoading = employeesLoading || incidentsLoading;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Incidencias</h2>
          <p className="text-muted-foreground">Gestiona las incidencias y ausencias de los empleados</p>
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
        <h2 className="text-2xl font-bold text-foreground">Incidencias</h2>
        <p className="text-muted-foreground">Gestiona las incidencias y ausencias de los empleados</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusTypes.map(status => (
          <Card key={status.value}>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{status.label}</p>
                  <p className="text-2xl font-bold">
                    {incidents?.filter(inc => inc.status === status.value).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar incidencias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-incidents"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {statusTypes.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48" data-testid="select-type-filter">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {incidentTypes?.filter(t => t.isActive).map(type => (
                    <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => {
                    setEditingIncident(null);
                    const defaultType = incidentTypes?.find(t => t.isActive)?.name || "";
                    form.reset({
                      userId: "",
                      date: new Date().toISOString().split('T')[0],
                      incidentType: defaultType,
                      description: "",
                      status: "pending",
                    });
                  }}
                  data-testid="button-add-incident"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Incidencia
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingIncident ? "Editar Incidencia" : "Nueva Incidencia"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empleado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employee">
                                <SelectValue placeholder="Selecciona un empleado" />
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
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de la Incidencia</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-incident-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="incidentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Incidencia</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-incident-type">
                                <SelectValue placeholder="Selecciona un tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {incidentTypes?.filter(t => t.isActive).map(type => (
                                <SelectItem key={type.id} value={type.name}>
                                  {type.name}
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
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              data-testid="textarea-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-incident-status">
                                <SelectValue placeholder="Selecciona un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusTypes.map(status => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        disabled={createIncidentMutation.isPending || updateIncidentMutation.isPending}
                        data-testid="button-save-incident"
                      >
                        {editingIncident ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de incidencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredIncidents.map((incident) => {
          const employee = getEmployeeInfo(incident.userId);
          if (!employee) return null;

          const statusInfo = getStatusInfo(incident.status);

          return (
            <Card key={incident.id} className="hover:shadow-md transition-shadow" data-testid={`incident-card-${incident.id}`}>
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
                  <Badge className={statusInfo.color}>
                    {statusInfo.label}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{getIncidentTypeLabel(incident.incidentType)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha de Incidencia:</span>
                    <span className="font-medium">
                      {new Date(incident.date + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registrada el:</span>
                    <span className="font-medium text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Descripción:</span>
                    <p className="mt-1 text-foreground">{incident.description}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleEdit(incident)}
                      data-testid={`button-edit-incident-${incident.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleDelete(incident.id)}
                      data-testid={`button-delete-incident-${incident.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {incident.status === "pending" && (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm"
                        onClick={() => approveIncidentMutation.mutate(incident.id)}
                        disabled={approveIncidentMutation.isPending}
                        data-testid={`button-approve-incident-${incident.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprobar
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => rejectIncidentMutation.mutate(incident.id)}
                        disabled={rejectIncidentMutation.isPending}
                        data-testid={`button-reject-incident-${incident.id}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredIncidents.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              {incidents?.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">No hay incidencias registradas</h3>
                  <p>Las incidencias aparecerán aquí cuando se reporten</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No se encontraron incidencias</h3>
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
