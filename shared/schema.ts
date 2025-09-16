/**
 * ESQUEMA COMPARTIDO DE BASE DE DATOS
 * =====================================
 * 
 * Este archivo define toda la estructura de datos compartida entre el frontend y el backend.
 * Utiliza Drizzle ORM para definir las tablas de PostgreSQL y Zod para las validaciones.
 * 
 * ARQUITECTURA:
 * - Tablas de DB definidas con Drizzle (pgTable)
 * - Esquemas de validación con Zod
 * - Tipos TypeScript inferidos automáticamente
 * - Validaciones compartidas entre cliente y servidor
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * TABLA: employees
 * ================
 * 
 * Almacena la información principal de todos los empleados de la empresa.
 * Esta es la tabla central del sistema, todas las demás tablas referencian a esta.
 * 
 * CAMPOS:
 * - id: Identificador único UUID generado automáticamente por PostgreSQL
 * - employeeNumber: Número de empleado único para identificación interna
 * - firstName: Nombre del empleado
 * - lastName: Apellidos del empleado 
 * - email: Correo electrónico único, usado para iniciar sesión
 * - password: Contraseña hasheada con bcrypt (NUNCA se almacena en texto plano)
 * - role: Rol del usuario ("admin" o "employee") que determina permisos
 * - department: Departamento al que pertenece (ej: "Recursos Humanos", "IT")
 * - position: Cargo o posición (ej: "Desarrollador", "Gerente")
 * - hireDate: Fecha de contratación
 * - isActive: Indica si el empleado está activo o ha sido dado de baja
 */
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: text("employee_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // "admin" o "employee"
  department: text("department").notNull(),
  position: text("position").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  conventionHours: integer("convention_hours").notNull().default(1752), // Horas de convenio anuales
  isActive: boolean("is_active").notNull().default(true),
});

/**
 * TABLA: timeEntries
 * ==================
 * 
 * Registra las entradas y salidas de tiempo de cada empleado (fichaje).
 * Cada registro representa un día de trabajo con hora de entrada y salida.
 * 
 * FLUJO DE DATOS:
 * 1. Empleado hace "clock-in" → se crea registro con clockIn
 * 2. Empleado hace "clock-out" → se actualiza clockOut y se calcula totalHours
 * 3. Sistema valida que no existan registros duplicados para el mismo día
 * 
 * CAMPOS:
 * - id: Identificador único del registro de tiempo
 * - employeeId: Referencia al empleado (FK a employees.id)
 * - clockIn: Timestamp de entrada (obligatorio)
 * - clockOut: Timestamp de salida (opcional hasta que el empleado salga)
 * - totalHours: Horas trabajadas en minutos (calculado automáticamente)
 * - date: Fecha en formato YYYY-MM-DD para indexación y consultas
 */
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  totalHours: integer("total_hours"), // en minutos para mayor precisión
  date: text("date").notNull(), // formato YYYY-MM-DD
});

/**
 * TABLA: schedules
 * ================
 * 
 * Define los horarios de trabajo asignados a cada empleado por día de la semana.
 * Un empleado puede tener múltiples horarios (ej: horario de mañana y tarde).
 * 
 * FUNCIONAMIENTO:
 * - Se crean horarios recurrentes por día de la semana
 * - Sistema verifica que empleado esté dentro de ventana de ±20 minutos para fichar
 * - Permite creación masiva de horarios para múltiples días
 * 
 * CAMPOS:
 * - id: Identificador único del horario
 * - employeeId: Referencia al empleado (FK a employees.id)
 * - dayOfWeek: Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
 * - startTime: Hora de inicio en formato HH:MM (ej: "09:00")
 * - endTime: Hora de fin en formato HH:MM (ej: "17:00")
 * - isActive: Permite activar/desactivar horarios sin eliminarlos
 */
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Domingo a Sábado)
  startTime: text("start_time").notNull(), // formato HH:MM (ej: "09:00")
  endTime: text("end_time").notNull(), // formato HH:MM (ej: "17:00")
  isActive: boolean("is_active").notNull().default(true),
});

/**
 * TABLA: incidents
 * ================
 * 
 * Registra incidencias laborales reportadas por empleados o detectadas por el sistema.
 * Incluye retrasos, ausencias, olvidos de fichaje, etc.
 * 
 * FLUJO DE APROBACIÓN:
 * 1. Se crea incidencia con status "pending"
 * 2. Administrador revisa y cambia a "approved" o "rejected"
 * 3. Se mantiene historial completo para auditorías
 * 
 * TIPOS DE INCIDENCIAS:
 * - "late": Llegada tarde
 * - "absence": Ausencia sin previo aviso
 * - "early_departure": Salida temprana
 * - "forgot_clock_in": Olvido de fichar entrada
 * - "forgot_clock_out": Olvido de fichar salida
 * 
 * CAMPOS:
 * - id: Identificador único de la incidencia
 * - employeeId: Referencia al empleado (FK a employees.id)
 * - type: Tipo de incidencia (ver tipos arriba)
 * - description: Descripción detallada del empleado o sistema
 * - date: Fecha y hora cuando ocurrió la incidencia
 * - status: Estado de aprobación ("pending", "approved", "rejected")
 * - createdAt: Timestamp de cuándo se reportó la incidencia
 */
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  type: text("type").notNull(), // "late", "absence", "early_departure", "forgot_clock_in", "forgot_clock_out"
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

/**
 * TABLA: dateSchedules
 * ====================
 * 
 * Define horarios específicos para fechas concretas de empleados.
 * Esta tabla permite asignar horarios específicos para días individuales,
 * complementando o sobrescribiendo los horarios recurrentes de la tabla schedules.
 * 
 * FUNCIONAMIENTO:
 * - Se crean horarios para fechas específicas (YYYY-MM-DD)
 * - Tiene prioridad sobre los horarios recurrentes de la tabla schedules
 * - Permite asignación masiva de horarios para múltiples fechas
 * - Usado para horarios especiales, vacaciones, turnos extras, etc.
 * 
 * CAMPOS:
 * - id: Identificador único del horario específico
 * - employeeId: Referencia al empleado (FK a employees.id)
 * - date: Fecha específica en formato YYYY-MM-DD
 * - startTime: Hora de inicio en formato HH:MM (ej: "09:00")
 * - endTime: Hora de fin en formato HH:MM (ej: "17:00")
 * - workHours: Horas de trabajo calculadas en minutos
 * - isActive: Permite activar/desactivar horarios sin eliminarlos
 */
export const dateSchedules = pgTable("date_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  date: text("date").notNull(), // formato YYYY-MM-DD
  startTime: text("start_time").notNull(), // formato HH:MM (ej: "09:00")
  endTime: text("end_time").notNull(), // formato HH:MM (ej: "17:00")
  workHours: integer("work_hours").notNull(), // Horas de trabajo en minutos
  isActive: boolean("is_active").notNull().default(true),
});

// ============================================================================
// ESQUEMAS DE VALIDACIÓN CON ZOD
// ============================================================================

/**
 * ESQUEMAS PARA EMPLEADOS
 * =======================
 */

/**
 * Schema base para insertar empleados (sin campos auto-generados)
 * Excluye: id (UUID automático), password (se maneja por separado), role (se asigna en createEmployeeSchema)
 */
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  password: true,
  role: true,
});

/**
 * Schema para login de usuarios
 * Valida que el email tenga formato correcto y que la contraseña no esté vacía
 */
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Schema para crear nuevos empleados
 * Extiende insertEmployeeSchema añadiendo validaciones específicas:
 * - password: mínimo 4 caracteres (se hasheará con bcrypt antes de guardar)
 * - role: enum que permite solo "admin" o "employee"
 * - hireDate: acepta string ISO y lo transforma a objeto Date
 */
export const createEmployeeSchema = insertEmployeeSchema.extend({
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  role: z.enum(["admin", "employee"]).default("employee"),
  hireDate: z.string().transform((str) => new Date(str)), // Frontend envía string, se convierte a Date
});

/**
 * Schema para actualizar empleados existentes
 * - Todos los campos son opcionales (partial)
 * - hireDate sigue aceptando string y transformándose a Date
 * - No incluye password (se actualiza por separado por seguridad)
 */
export const updateEmployeeSchema = insertEmployeeSchema.partial().extend({
  hireDate: z.string().transform((str) => new Date(str)).optional(),
  conventionHours: z.number().int().positive().optional(),
});

/**
 * ESQUEMAS PARA REGISTROS DE TIEMPO
 * =================================
 */

/**
 * Schema para crear registros de tiempo (fichajes)
 * Excluye: id (UUID automático), totalHours (calculado automáticamente)
 * El sistema calculará totalHours cuando se haga clockOut
 */
export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  totalHours: true,
});

/**
 * ESQUEMAS PARA HORARIOS
 * ======================
 */

/**
 * Schema base para horarios (usado en formularios)
 * No incluye validación de lógica de tiempo para permitir formularios parciales
 */
export const insertScheduleSchemaBase = createInsertSchema(schedules).omit({
  id: true,
});

/**
 * Schema completo para horarios (usado en endpoints)
 * Incluye validación que asegura startTime < endTime
 * 
 * PROCESO DE VALIDACIÓN:
 * 1. Convierte "HH:MM" a minutos totales desde medianoche
 * 2. Compara que inicio < fin
 * 3. Si falla, error se asocia al campo 'endTime'
 */
export const insertScheduleSchema = insertScheduleSchemaBase.refine((data) => {
  // Validar que la hora de inicio sea anterior a la hora de fin
  const startTime = data.startTime;
  const endTime = data.endTime;
  
  if (!startTime || !endTime) return true; // Si falta alguna hora, dejar que Zod la valide
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return startTotalMinutes < endTotalMinutes;
}, {
  message: "La hora de inicio debe ser anterior a la hora de fin",
  path: ["endTime"],
});

/**
 * Schema para creación masiva de horarios
 * Permite crear múltiples horarios para un empleado en varios días de la semana
 * 
 * FUNCIONAMIENTO:
 * - daysOfWeek: array de números [0,1,2,3,4] para Lunes-Viernes
 * - Se valida que startTime < endTime igual que schema individual
 * - Backend crea un registro por cada día especificado
 * - Incluye protección contra duplicados en el backend
 */
export const bulkScheduleCreateSchema = z.object({
  employeeId: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1), // Array de días (0=Domingo, 6=Sábado)
  isActive: z.boolean().optional().default(true),
}).refine((data) => {
  // Validar que la hora de inicio sea anterior a la hora de fin
  const startTime = data.startTime;
  const endTime = data.endTime;
  
  if (!startTime || !endTime) return true; // Si falta alguna hora, dejar que Zod la valide
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return startTotalMinutes < endTotalMinutes;
}, {
  message: "La hora de inicio debe ser anterior a la hora de fin",
  path: ["endTime"],
});

/**
 * ESQUEMAS PARA HORARIOS ESPECÍFICOS POR FECHA
 * =============================================
 */

/**
 * Schema base para horarios por fecha específica
 */
export const insertDateScheduleSchemaBase = createInsertSchema(dateSchedules).omit({
  id: true,
  workHours: true, // Se calcula automáticamente
});

/**
 * Schema completo para horarios por fecha específica con validación de tiempo
 */
export const insertDateScheduleSchema = insertDateScheduleSchemaBase.refine((data) => {
  const startTime = data.startTime;
  const endTime = data.endTime;
  
  if (!startTime || !endTime) return true;
  
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return startTotalMinutes < endTotalMinutes;
}, {
  message: "La hora de inicio debe ser anterior a la hora de fin",
  path: ["endTime"],
});

/**
 * Schema para creación masiva de horarios por fecha
 * FORMATO: { schedules: Array<{ employeeId, date, startTime, endTime }> }
 */
export const bulkDateScheduleCreateSchema = z.object({
  schedules: z.array(z.object({
    employeeId: z.string().min(1),
    date: z.string().min(1), // Fecha en formato YYYY-MM-DD
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    isActive: z.boolean().optional().default(true),
  }).refine((data) => {
    const { startTime, endTime } = data;
    
    if (!startTime || !endTime) return true;
    
    // Validar formato HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return false;
    }
    
    // Validar que startTime < endTime
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    return startTotalMinutes < endTotalMinutes;
  }, {
    message: "La hora de inicio debe ser anterior a la hora de fin y ambas deben estar en formato HH:MM válido",
    path: ["endTime"],
  })).min(1, "Debe incluir al menos un horario"),
});

/**
 * ESQUEMAS PARA INCIDENCIAS
 * =========================
 */

/**
 * Schema para crear incidencias
 * Excluye: id (UUID automático), createdAt (timestamp automático)
 * 
 * TRANSFORMACIONES:
 * - date: acepta string o Date, se convierte automáticamente a Date
 * - status se asigna como "pending" por defecto en la tabla
 */
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(["late", "absence", "early_departure", "forgot_clock_in", "forgot_clock_out"], {
    errorMap: () => ({ message: "Tipo de incidencia inválido" })
  }),
  status: z.enum(["pending", "approved", "rejected"], {
    errorMap: () => ({ message: "Estado de incidencia inválido" })
  }).default("pending"),
  date: z.coerce.date(), // Acepta string o Date, convierte a Date
});

// ============================================================================
// TIPOS TYPESCRIPT
// ============================================================================

/**
 * TIPOS PARA EMPLEADOS
 * ====================
 * Estos tipos se infieren automáticamente de las tablas y esquemas de Zod
 */

/** Tipo completo de empleado como se almacena en la base de datos */
export type Employee = typeof employees.$inferSelect;

/** Tipo para insertar empleado (sin campos auto-generados) */
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;

/** Tipo para crear empleado (incluye password y role) */
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;

/** Tipo para actualizar empleado (todos los campos opcionales) */
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;

/** Tipo para datos de login */
export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * TIPOS PARA REGISTROS DE TIEMPO
 * ==============================
 */

/** Tipo completo de registro de tiempo como se almacena en la base de datos */
export type TimeEntry = typeof timeEntries.$inferSelect;

/** Tipo para crear nuevo registro de tiempo */
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;

/**
 * TIPOS PARA HORARIOS
 * ===================
 */

/** Tipo completo de horario como se almacena en la base de datos */
export type Schedule = typeof schedules.$inferSelect;

/** Tipo para crear horario individual */
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

/** Tipo para crear múltiples horarios en una operación */
export type BulkScheduleCreate = z.infer<typeof bulkScheduleCreateSchema>;

/**
 * TIPOS PARA HORARIOS ESPECÍFICOS POR FECHA
 * ==========================================
 */

/** Tipo completo de horario por fecha como se almacena en la base de datos */
export type DateSchedule = typeof dateSchedules.$inferSelect;

/** Tipo para crear horario por fecha específica */
export type InsertDateSchedule = z.infer<typeof insertDateScheduleSchema>;

/** Tipo para crear múltiples horarios por fechas específicas */
export type BulkDateScheduleCreate = z.infer<typeof bulkDateScheduleCreateSchema>;

/**
 * TIPOS PARA INCIDENCIAS
 * ======================
 */

/** Tipo completo de incidencia como se almacena en la base de datos */
export type Incident = typeof incidents.$inferSelect;

/** Tipo para crear nueva incidencia */
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

/**
 * TIPOS ESPECIALES
 * ================
 */

/**
 * Tipo User para información de sesión
 * Se usa en el frontend para mostrar datos del usuario logueado
 * Es un subconjunto de Employee sin información sensible
 */
export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "employee";
  employeeNumber: string;
};
