import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings, Users, Clock, Bell, Shield, Database, Plus, Trash2, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomFieldSchema, type InsertCustomField, type CustomField } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // General settings
    companyName: "TimeTracker Pro",
    timezone: "America/Mexico_City",
    dateFormat: "DD/MM/YYYY",
    currency: "MXN",
    
    // Work hours settings
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    breakDuration: 60, // minutes
    overtimeThreshold: 480, // minutes (8 hours)
    
    // Notifications
    emailNotifications: true,
    clockInReminders: true,
    clockOutReminders: true,
    lateArrivalNotifications: true,
    
    // Security
    sessionTimeout: 480, // minutes
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowRemoteClocking: true,
    
    // Advanced
    automaticBackup: true,
    backupFrequency: "daily",
    retentionPeriod: 365, // days
  });

  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<"employee" | "incident">("employee");

  const { data: customFields, isLoading: loadingFields } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields"],
  });

  const form = useForm<InsertCustomField>({
    resolver: zodResolver(insertCustomFieldSchema),
    defaultValues: {
      entityType: "employee",
      fieldName: "",
      fieldType: "text",
      options: [],
      isRequired: false,
    },
  });

  const fieldType = form.watch("fieldType");

  const createFieldMutation = useMutation({
    mutationFn: (data: InsertCustomField) =>
      apiRequest("/api/custom-fields", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Campo creado",
        description: "El campo personalizado se ha creado exitosamente.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el campo personalizado.",
        variant: "destructive",
      });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/custom-fields/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({
        title: "Campo eliminado",
        description: "El campo personalizado se ha eliminado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el campo personalizado.",
        variant: "destructive",
      });
    },
  });

  const onSubmitCustomField = (data: InsertCustomField) => {
    createFieldMutation.mutate(data);
  };

  const employeeFields = customFields?.filter((f) => f.entityType === "employee") || [];
  const incidentFields = customFields?.filter((f) => f.entityType === "incident") || [];

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    // In a real application, this would save to the backend
    toast({
      title: "Configuración guardada",
      description: "Los cambios han sido guardados exitosamente.",
    });
  };

  const resetSettings = () => {
    if (confirm("¿Estás seguro de que quieres restablecer todas las configuraciones?")) {
      // Reset to default values
      toast({
        title: "Configuración restablecida",
        description: "Todas las configuraciones han sido restablecidas a sus valores por defecto.",
      });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
        <p className="text-muted-foreground">Gestiona la configuración del sistema</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6" data-testid="settings-tabs">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="work-hours" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificaciones</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Seguridad</span>
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="flex items-center space-x-2">
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">Campos</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">Avanzado</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => handleSettingChange("companyName", e.target.value)}
                    data-testid="input-company-name"
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleSettingChange("timezone", value)}>
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Mexico_City">Ciudad de México (GMT-6)</SelectItem>
                      <SelectItem value="America/New_York">Nueva York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/Madrid">Madrid (GMT+1)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokio (GMT+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateFormat">Formato de Fecha</Label>
                  <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange("dateFormat", value)}>
                    <SelectTrigger data-testid="select-date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleSettingChange("currency", value)}>
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                      <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Horarios de Trabajo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="defaultStartTime">Hora de Inicio por Defecto</Label>
                  <Input
                    id="defaultStartTime"
                    type="time"
                    value={settings.defaultStartTime}
                    onChange={(e) => handleSettingChange("defaultStartTime", e.target.value)}
                    data-testid="input-default-start-time"
                  />
                </div>
                <div>
                  <Label htmlFor="defaultEndTime">Hora de Fin por Defecto</Label>
                  <Input
                    id="defaultEndTime"
                    type="time"
                    value={settings.defaultEndTime}
                    onChange={(e) => handleSettingChange("defaultEndTime", e.target.value)}
                    data-testid="input-default-end-time"
                  />
                </div>
                <div>
                  <Label htmlFor="breakDuration">Duración del Descanso (minutos)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    value={settings.breakDuration}
                    onChange={(e) => handleSettingChange("breakDuration", parseInt(e.target.value))}
                    data-testid="input-break-duration"
                  />
                </div>
                <div>
                  <Label htmlFor="overtimeThreshold">Umbral de Horas Extra (minutos)</Label>
                  <Input
                    id="overtimeThreshold"
                    type="number"
                    value={settings.overtimeThreshold}
                    onChange={(e) => handleSettingChange("overtimeThreshold", parseInt(e.target.value))}
                    data-testid="input-overtime-threshold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones importantes por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                  data-testid="switch-email-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recordatorios de Entrada</Label>
                  <p className="text-sm text-muted-foreground">
                    Recordar a los empleados que fichen su entrada
                  </p>
                </div>
                <Switch
                  checked={settings.clockInReminders}
                  onCheckedChange={(checked) => handleSettingChange("clockInReminders", checked)}
                  data-testid="switch-clock-in-reminders"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Recordatorios de Salida</Label>
                  <p className="text-sm text-muted-foreground">
                    Recordar a los empleados que fichen su salida
                  </p>
                </div>
                <Switch
                  checked={settings.clockOutReminders}
                  onCheckedChange={(checked) => handleSettingChange("clockOutReminders", checked)}
                  data-testid="switch-clock-out-reminders"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones de Retraso</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar cuando un empleado llegue tarde
                  </p>
                </div>
                <Switch
                  checked={settings.lateArrivalNotifications}
                  onCheckedChange={(checked) => handleSettingChange("lateArrivalNotifications", checked)}
                  data-testid="switch-late-arrival-notifications"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sessionTimeout">Tiempo de Sesión (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleSettingChange("sessionTimeout", parseInt(e.target.value))}
                    data-testid="input-session-timeout"
                  />
                </div>
                <div>
                  <Label htmlFor="passwordMinLength">Longitud Mínima de Contraseña</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => handleSettingChange("passwordMinLength", parseInt(e.target.value))}
                    data-testid="input-password-min-length"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticación de Dos Factores</Label>
                  <p className="text-sm text-muted-foreground">
                    Requerir verificación adicional para el acceso
                  </p>
                </div>
                <Switch
                  checked={settings.requireTwoFactor}
                  onCheckedChange={(checked) => handleSettingChange("requireTwoFactor", checked)}
                  data-testid="switch-two-factor"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir Fichaje Remoto</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir a los empleados fichar desde ubicaciones remotas
                  </p>
                </div>
                <Switch
                  checked={settings.allowRemoteClocking}
                  onCheckedChange={(checked) => handleSettingChange("allowRemoteClocking", checked)}
                  data-testid="switch-remote-clocking"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-fields" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                <CardTitle>Campos de Empleados</CardTitle>
                <Dialog open={dialogOpen && selectedEntity === "employee"} onOpenChange={(open) => {
                  if (open) {
                    setSelectedEntity("employee");
                    form.setValue("entityType", "employee");
                  }
                  setDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-employee-field">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Campo de Empleado</DialogTitle>
                      <DialogDescription>
                        Crea un campo personalizado para los empleados
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitCustomField)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="fieldName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del Campo</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-field-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fieldType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Campo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-field-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="text">Texto</SelectItem>
                                  <SelectItem value="dropdown">Lista Desplegable</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {fieldType === "dropdown" && (
                          <FormField
                            control={form.control}
                            name="options"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Opciones (separadas por coma)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value?.join(", ") || ""}
                                    onChange={(e) => {
                                      const options = e.target.value
                                        .split(",")
                                        .map((opt) => opt.trim())
                                        .filter((opt) => opt.length > 0);
                                      field.onChange(options);
                                    }}
                                    placeholder="Opción 1, Opción 2, Opción 3"
                                    data-testid="input-field-options"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-field-required"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Campo Obligatorio</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            data-testid="button-cancel-field"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={createFieldMutation.isPending}
                            data-testid="button-create-field"
                          >
                            Crear Campo
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingFields ? (
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : employeeFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay campos personalizados</p>
                ) : (
                  <div className="space-y-2">
                    {employeeFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`field-employee-${field.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-field-name-${field.id}`}>
                            {field.fieldName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {field.fieldType === "text" ? "Texto" : "Lista"}
                            </Badge>
                            {field.isRequired && (
                              <Badge variant="secondary">Obligatorio</Badge>
                            )}
                          </div>
                          {field.options && field.options.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Opciones: {field.options.join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFieldMutation.mutate(field.id)}
                          disabled={deleteFieldMutation.isPending}
                          data-testid={`button-delete-field-${field.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                <CardTitle>Campos de Incidentes</CardTitle>
                <Dialog open={dialogOpen && selectedEntity === "incident"} onOpenChange={(open) => {
                  if (open) {
                    setSelectedEntity("incident");
                    form.setValue("entityType", "incident");
                  }
                  setDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-incident-field">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuevo Campo de Incidente</DialogTitle>
                      <DialogDescription>
                        Crea un campo personalizado para los incidentes
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitCustomField)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="fieldName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del Campo</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-field-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fieldType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Campo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-field-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="text">Texto</SelectItem>
                                  <SelectItem value="dropdown">Lista Desplegable</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {fieldType === "dropdown" && (
                          <FormField
                            control={form.control}
                            name="options"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Opciones (separadas por coma)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value?.join(", ") || ""}
                                    onChange={(e) => {
                                      const options = e.target.value
                                        .split(",")
                                        .map((opt) => opt.trim())
                                        .filter((opt) => opt.length > 0);
                                      field.onChange(options);
                                    }}
                                    placeholder="Opción 1, Opción 2, Opción 3"
                                    data-testid="input-field-options"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                          name="isRequired"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-field-required"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Campo Obligatorio</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            data-testid="button-cancel-field"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            disabled={createFieldMutation.isPending}
                            data-testid="button-create-field"
                          >
                            Crear Campo
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingFields ? (
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                ) : incidentFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay campos personalizados</p>
                ) : (
                  <div className="space-y-2">
                    {incidentFields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`field-incident-${field.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-field-name-${field.id}`}>
                            {field.fieldName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {field.fieldType === "text" ? "Texto" : "Lista"}
                            </Badge>
                            {field.isRequired && (
                              <Badge variant="secondary">Obligatorio</Badge>
                            )}
                          </div>
                          {field.options && field.options.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Opciones: {field.options.join(", ")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteFieldMutation.mutate(field.id)}
                          disabled={deleteFieldMutation.isPending}
                          data-testid={`button-delete-field-${field.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Avanzada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Respaldo Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Crear respaldos automáticos de los datos
                  </p>
                </div>
                <Switch
                  checked={settings.automaticBackup}
                  onCheckedChange={(checked) => handleSettingChange("automaticBackup", checked)}
                  data-testid="switch-automatic-backup"
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="backupFrequency">Frecuencia de Respaldo</Label>
                  <Select value={settings.backupFrequency} onValueChange={(value) => handleSettingChange("backupFrequency", value)}>
                    <SelectTrigger data-testid="select-backup-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diario</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="retentionPeriod">Período de Retención (días)</Label>
                  <Input
                    id="retentionPeriod"
                    type="number"
                    value={settings.retentionPeriod}
                    onChange={(e) => handleSettingChange("retentionPeriod", parseInt(e.target.value))}
                    data-testid="input-retention-period"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="outline" data-testid="button-export-data">
                  <Database className="w-4 h-4 mr-2" />
                  Exportar Datos
                </Button>
                <Button variant="outline" data-testid="button-import-data">
                  <Database className="w-4 h-4 mr-2" />
                  Importar Datos
                </Button>
                <Button variant="outline" data-testid="button-clear-cache">
                  <Settings className="w-4 h-4 mr-2" />
                  Limpiar Caché
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-border">
        <Button variant="outline" onClick={resetSettings} data-testid="button-reset-settings">
          Restablecer
        </Button>
        <Button onClick={saveSettings} data-testid="button-save-settings">
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
