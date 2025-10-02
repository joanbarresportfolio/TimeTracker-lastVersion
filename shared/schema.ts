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


// ============================================================================
// ESQUEMAS DE VALIDACIÓN CON ZOD
// ============================================================================

/**
 * Schema para login de usuarios
 * Valida que el email tenga formato correcto y que la contraseña no esté vacía
 */
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Schema para crear nuevos empleados (para compatibilidad de API)
 */
export const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  role: z.enum(["admin", "employee"]).default("employee"),
  department: z.string().min(1),
  position: z.string().min(1),
  hireDate: z.string().transform((str) => new Date(str)),
  conventionHours: z.number().int().positive().optional().default(1752),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema para actualizar empleados existentes (para compatibilidad de API)
 */
export const updateEmployeeSchema = z.object({
  employeeNumber: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  department: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  hireDate: z.string().transform((str) => new Date(str)).optional(),
  conventionHours: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

/**
 * ESQUEMAS PARA HORARIOS ESPECÍFICOS POR FECHA
 * =============================================
 */

/**
 * Schema para horarios por fecha específica (para compatibilidad de API)
 */
export const insertDateScheduleSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  workHours: z.number().int(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema para creación masiva de horarios por fecha - VALIDACIÓN SIMPLIFICADA
 * FORMATO: { schedules: Array<{ employeeId, date, startTime, endTime }> }
 */
export const bulkDateScheduleCreateSchema = z.object({
  schedules: z.array(z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"),
    isActive: z.boolean().optional().default(true),
  })).min(1, "At least one schedule is required"),
});

/**
 * Schema para crear incidencias (para compatibilidad de API)
 */
export const insertIncidentSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["late", "absence", "early_departure", "forgot_clock_in", "forgot_clock_out"], {
    errorMap: () => ({ message: "Tipo de incidencia inválido" })
  }),
  description: z.string().min(1),
  date: z.coerce.date(),
  status: z.enum(["pending", "approved", "rejected"], {
    errorMap: () => ({ message: "Estado de incidencia inválido" })
  }).optional().default("pending"),
});

// ============================================================================
// TIPOS TYPESCRIPT
// ============================================================================

/**
 * TIPOS PARA EMPLEADOS
 * ====================
 * Estos tipos se infieren automáticamente de las tablas y esquemas de Zod
 */

/** Tipo completo de empleado - mantenido para compatibilidad de API */
export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  department: string;
  position: string;
  hireDate: Date;
  conventionHours: number;
  isActive: boolean;
}

/** Tipo para insertar empleado (sin campos auto-generados) */
export interface InsertEmployee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  hireDate: Date;
  conventionHours?: number;
  isActive?: boolean;
}

/** Tipo para crear empleado (incluye password y role) */
export interface CreateEmployee extends InsertEmployee {
  password: string;
  role: "admin" | "employee";
}

/** Tipo para actualizar empleado (todos los campos opcionales) */
export interface UpdateEmployee {
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  position?: string;
  hireDate?: Date;
  conventionHours?: number;
  isActive?: boolean;
}

/** Tipo para datos de login */
export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * TIPOS PARA REGISTROS DE TIEMPO
 * ==============================
 */

/** Tipo completo de registro de tiempo - mantenido para compatibilidad de API */
export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut: Date | null;
  totalHours: number | null;
  date: string;
}

/** Tipo para crear nuevo registro de tiempo */
export interface InsertTimeEntry {
  employeeId: string;
  clockIn: Date;
  clockOut?: Date | null;
  date: string;
}

/**
 * TIPOS PARA HORARIOS
 * ===================
 */

/** Tipo completo de horario - mantenido para compatibilidad de API */
export interface Schedule {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/** Tipo para crear horario individual */
export interface InsertSchedule {
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

/** Tipo para crear múltiples horarios en una operación */

/**
 * TIPOS PARA HORARIOS ESPECÍFICOS POR FECHA
 * ==========================================
 */

/** Tipo completo de horario por fecha - mantenido para compatibilidad de API */
export interface DateSchedule {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive: boolean;
}

/** Tipo para crear horario por fecha específica */
export interface InsertDateSchedule {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive?: boolean;
}

/** Tipo para crear múltiples horarios por fechas específicas */
export type BulkDateScheduleCreate = z.infer<typeof bulkDateScheduleCreateSchema>;

/**
 * TIPOS PARA INCIDENCIAS
 * ======================
 */

/** Tipo completo de incidencia - mantenido para compatibilidad de API */
export interface Incident {
  id: string;
  employeeId: string;
  type: string;
  description: string;
  date: Date;
  status: string;
  createdAt: Date;
}

/** Tipo para crear nueva incidencia */
export interface InsertIncident {
  employeeId: string;
  type: "late" | "absence" | "early_departure" | "forgot_clock_in" | "forgot_clock_out";
  description: string;
  date: Date;
  status?: "pending" | "approved" | "rejected";
}

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

// ============================================================================
// NUEVA ESTRUCTURA DE BASE DE DATOS EN ESPAÑOL
// ============================================================================

/**
 * TABLA: departamentos
 * ====================
 * 
 * Organiza los diferentes departamentos de la empresa.
 */
export const departamentos = pgTable("departamentos", {
  idDepartamento: varchar("id_departamento").primaryKey().default(sql`gen_random_uuid()`),
  nombreDepartamento: text("nombre_departamento").notNull(),
  descripcion: text("descripcion"),
});

/**
 * TABLA: usuarios
 * ===============
 * 
 * Almacena información de empleados y administradores.
 * Reemplaza la tabla 'employees' con nombres en español.
 */
export const usuarios = pgTable("usuarios", {
  idUsuario: varchar("id_usuario").primaryKey().default(sql`gen_random_uuid()`),
  numEmpleado: text("num_empleado").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fechaContratacion: timestamp("fecha_contratacion").notNull(),
  activo: boolean("activo").notNull().default(true),
  rol: text("rol").notNull().default("empleado"), // "administrador" o "empleado"
  idDepartamento: varchar("id_departamento").references(() => departamentos.idDepartamento),
});

/**
 * TABLA: horarios_planificados
 * =============================
 * 
 * Horarios/turnos planificados para cada empleado por fecha específica.
 */
export const horariosPlanificados = pgTable("horarios_planificados", {
  idTurno: varchar("id_turno").primaryKey().default(sql`gen_random_uuid()`),
  idEmpleado: varchar("id_empleado").notNull().references(() => usuarios.idUsuario),
  fecha: text("fecha").notNull(), // YYYY-MM-DD
  horaInicioPrevista: text("hora_inicio_prevista").notNull(), // HH:MM
  horaFinPrevista: text("hora_fin_prevista").notNull(), // HH:MM
  tipoTurno: varchar("tipo_turno").notNull(), // 'mañana', 'tarde', 'noche'
  estado: varchar("estado").notNull().default('pendiente'), // 'pendiente', 'confirmado', 'completado', 'cancelado'
});

/**
 * TABLA: fichajes
 * ===============
 * 
 * Registros individuales de fichaje (entrada, salida, pausas).
 * Cada fichaje es un evento único que actualiza la jornada_diaria.
 */
export const fichajes = pgTable("fichajes", {
  idRegistro: varchar("id_registro").primaryKey().default(sql`gen_random_uuid()`),
  idEmpleado: varchar("id_empleado").notNull().references(() => usuarios.idUsuario),
  idTurno: varchar("id_turno").references(() => horariosPlanificados.idTurno), // NULL si no hay turno asignado
  tipoRegistro: varchar("tipo_registro").notNull(), // 'entrada', 'salida', 'pausa_inicio', 'pausa_fin'
  timestampRegistro: timestamp("timestamp_registro").notNull().default(sql`now()`),
  origen: varchar("origen"), // 'app_movil', 'terminal_fisico', 'web'
  observaciones: text("observaciones"),
});

/**
 * TABLA: jornada_diaria
 * =====================
 * 
 * Resumen consolidado de cada jornada laboral de un empleado.
 * Se actualiza automáticamente con cada fichaje del día.
 */
export const jornadaDiaria = pgTable("jornada_diaria", {
  idJornada: varchar("id_jornada").primaryKey().default(sql`gen_random_uuid()`),
  idEmpleado: varchar("id_empleado").notNull().references(() => usuarios.idUsuario),
  fecha: text("fecha").notNull(), // YYYY-MM-DD
  horaInicio: timestamp("hora_inicio"), // Primer fichaje de entrada del día
  horaFin: timestamp("hora_fin"), // Último fichaje de salida del día
  horasTrabajadas: integer("horas_trabajadas").notNull().default(0), // en minutos
  horasPausas: integer("horas_pausas").notNull().default(0), // en minutos
  horasExtra: integer("horas_extra").notNull().default(0), // en minutos
  estado: varchar("estado").notNull().default('abierta'), // 'abierta', 'cerrada'
});

/**
 * TABLA: incidencias
 * ==================
 * 
 * Registro de incidencias laborales (retrasos, ausencias, bajas, etc.).
 */
export const incidencias = pgTable("incidencias", {
  idIncidencia: varchar("id_incidencia").primaryKey().default(sql`gen_random_uuid()`),
  idUsuario: varchar("id_usuario").notNull().references(() => usuarios.idUsuario),
  idRegistro: varchar("id_registro").references(() => fichajes.idRegistro),
  tipoIncidencia: text("tipo_incidencia").notNull(), // "retraso", "ausencia", "baja_medica", "vacaciones", "olvido_fichar", "otro"
  descripcion: text("descripcion").notNull(),
  registradoPor: varchar("registrado_por").references(() => usuarios.idUsuario),
  fechaRegistro: timestamp("fecha_registro").notNull().default(sql`now()`),
  estado: text("estado").notNull().default("pendiente"), // "pendiente", "justificada", "no_justificada"
});

// ============================================================================
// ESQUEMAS ZOD PARA NUEVAS TABLAS ESPAÑOLAS
// ============================================================================

/**
 * ESQUEMAS PARA DEPARTAMENTOS
 */
export const insertDepartamentoSchema = createInsertSchema(departamentos).omit({
  idDepartamento: true,
});

/**
 * ESQUEMAS PARA USUARIOS
 */
export const insertUsuarioSchema = createInsertSchema(usuarios).omit({
  idUsuario: true,
  passwordHash: true,
  rol: true,
});

export const createUsuarioSchema = insertUsuarioSchema.extend({
  passwordHash: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  rol: z.enum(["administrador", "empleado"]).default("empleado"),
  fechaContratacion: z.string().transform((str) => new Date(str)),
});

/**
 * ESQUEMAS PARA HORARIOS PLANIFICADOS
 */
export const insertHorarioPlanificadoSchema = createInsertSchema(horariosPlanificados).omit({
  idTurno: true,
}).extend({
  tipoTurno: z.enum(['mañana', 'tarde', 'noche']),
  estado: z.enum(['pendiente', 'confirmado', 'completado', 'cancelado']).default('pendiente'),
});

/**
 * ESQUEMAS PARA FICHAJES
 */
export const insertFichajeSchema = createInsertSchema(fichajes).omit({
  idRegistro: true,
  timestampRegistro: true,
}).extend({
  tipoRegistro: z.enum(['entrada', 'salida', 'pausa_inicio', 'pausa_fin']),
  origen: z.enum(['app_movil', 'terminal_fisico', 'web']).optional(),
});

/**
 * ESQUEMAS PARA JORNADA DIARIA
 */
export const insertJornadaDiariaSchema = createInsertSchema(jornadaDiaria).omit({
  idJornada: true,
  horasTrabajadas: true,
  horasPausas: true,
  horasExtra: true,
}).extend({
  estado: z.enum(['abierta', 'cerrada']).default('abierta'),
});

/**
 * ESQUEMAS PARA INCIDENCIAS
 */
export const insertIncidenciaSchema = createInsertSchema(incidencias).omit({
  idIncidencia: true,
  fechaRegistro: true,
}).extend({
  tipoIncidencia: z.enum(["retraso", "ausencia", "baja_medica", "vacaciones", "olvido_fichar", "otro"]),
  estado: z.enum(["pendiente", "justificada", "no_justificada"]).default("pendiente"),
});

// ============================================================================
// TIPOS TYPESCRIPT PARA NUEVAS TABLAS
// ============================================================================

export type Departamento = typeof departamentos.$inferSelect;
export type InsertDepartamento = z.infer<typeof insertDepartamentoSchema>;

export type Usuario = typeof usuarios.$inferSelect;
export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type CreateUsuario = z.infer<typeof createUsuarioSchema>;

export type HorarioPlanificado = typeof horariosPlanificados.$inferSelect;
export type InsertHorarioPlanificado = z.infer<typeof insertHorarioPlanificadoSchema>;

export type Fichaje = typeof fichajes.$inferSelect;
export type InsertFichaje = z.infer<typeof insertFichajeSchema>;

export type JornadaDiaria = typeof jornadaDiaria.$inferSelect;
export type InsertJornadaDiaria = z.infer<typeof insertJornadaDiariaSchema>;

export type Incidencia = typeof incidencias.$inferSelect;
export type InsertIncidencia = z.infer<typeof insertIncidenciaSchema>;
