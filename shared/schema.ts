/**
 * ESQUEMA DE BASE DE DATOS - SISTEMA DE REGISTRO DE JORNADA LABORAL
 * ==================================================================
 * 
 * Este archivo define la estructura completa de la base de datos para el sistema
 * de seguimiento y registro de jornadas laborales. Utiliza Drizzle ORM para
 * definir las tablas de PostgreSQL y Zod para las validaciones.
 * 
 * ESTRUCTURA DE TABLAS:
 * - empleado: Información de los empleados de la empresa
 * - horario_planificado: Turnos y horarios programados
 * - fichaje: Registros individuales de entrada/salida/pausas
 * - jornada_diaria: Resumen diario calculado automáticamente
 */

import { sql } from "drizzle-orm";
import { pgTable, bigint, varchar, text, timestamp, boolean, date, time, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// TABLA: empleado
// ============================================================================

/**
 * Tabla de empleados de la empresa
 * Almacena información personal y laboral de cada empleado
 */
export const empleado = pgTable("empleado", {
  idEmpleado: bigint("id_empleado", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  idEmpresa: bigint("id_empresa", { mode: "number" }).notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  apellido: varchar("apellido", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  rol: varchar("rol", { length: 50 }).notNull().default("empleado"), // 'admin' o 'empleado'
  departamento: varchar("departamento", { length: 255 }),
  puesto: varchar("puesto", { length: 255 }),
  fechaAlta: date("fecha_alta").notNull(),
  fechaBaja: date("fecha_baja"),
  activo: boolean("activo").notNull().default(true),
});

// ============================================================================
// TABLA: horario_planificado
// ============================================================================

/**
 * Tabla de horarios y turnos programados para los empleados
 * Permite planificar los turnos de trabajo con anticipación
 */
export const horarioPlanificado = pgTable("horario_planificado", {
  idTurno: bigint("id_turno", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  idEmpleado: bigint("id_empleado", { mode: "number" }).notNull().references(() => empleado.idEmpleado),
  fecha: date("fecha").notNull(),
  horaInicioPrevista: time("hora_inicio_prevista").notNull(),
  horaFinPrevista: time("hora_fin_prevista").notNull(),
  tipoTurno: varchar("tipo_turno", { length: 50 }), // 'mañana', 'tarde', 'noche'
  estado: varchar("estado", { length: 50 }).notNull().default("pendiente"), // 'pendiente', 'confirmado', 'cancelado'
});

// ============================================================================
// TABLA: fichaje
// ============================================================================

/**
 * Tabla de registros individuales de fichaje
 * Cada registro representa una acción: entrada, salida, inicio de pausa, fin de pausa
 */
export const fichaje = pgTable("fichaje", {
  idRegistro: bigint("id_registro", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  idEmpleado: bigint("id_empleado", { mode: "number" }).notNull().references(() => empleado.idEmpleado),
  idTurno: bigint("id_turno", { mode: "number" }).references(() => horarioPlanificado.idTurno),
  tipoRegistro: varchar("tipo_registro", { length: 50 }).notNull(), // 'entrada', 'salida', 'pausa_inicio', 'pausa_fin'
  timestampRegistro: timestamp("timestamp_registro", { withTimezone: true }).notNull().default(sql`now()`),
  origen: varchar("origen", { length: 50 }), // 'app_movil', 'terminal_fisico', 'web'
  observaciones: text("observaciones"),
});

// ============================================================================
// TABLA: jornada_diaria
// ============================================================================

/**
 * Tabla de resumen diario de jornadas laborales
 * Se actualiza automáticamente mediante trigger cuando se registran fichajes
 */
export const jornadaDiaria = pgTable("jornada_diaria", {
  idJornada: bigint("id_jornada", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  idEmpleado: bigint("id_empleado", { mode: "number" }).notNull().references(() => empleado.idEmpleado),
  fecha: date("fecha").notNull(),
  horaInicio: timestamp("hora_inicio", { withTimezone: true }),
  horaFin: timestamp("hora_fin", { withTimezone: true }),
  horasTrabajadas: numeric("horas_trabajadas", { precision: 6, scale: 2 }).notNull().default("0"),
  horasPausas: numeric("horas_pausas", { precision: 6, scale: 2 }).notNull().default("0"),
  horasExtra: numeric("horas_extra", { precision: 6, scale: 2 }).notNull().default("0"),
  estado: varchar("estado", { length: 50 }).notNull().default("abierta"), // 'abierta', 'cerrada', 'validada'
});

// ============================================================================
// ESQUEMAS DE VALIDACIÓN CON ZOD
// ============================================================================

/**
 * Schema para login de usuarios
 */
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

/**
 * Schema para crear empleados
 */
export const insertEmpleadoSchema = createInsertSchema(empleado).omit({
  idEmpleado: true,
  passwordHash: true,
}).extend({
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  fechaAlta: z.string().transform((str) => str), // Mantener como string para la DB
});

/**
 * Schema para actualizar empleados
 */
export const updateEmpleadoSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellido: z.string().min(1).optional(),
  email: z.string().email().optional(),
  departamento: z.string().optional(),
  puesto: z.string().optional(),
  fechaBaja: z.string().optional(),
  activo: z.boolean().optional(),
});

/**
 * Schema para horarios planificados
 */
export const insertHorarioPlanificadoSchema = createInsertSchema(horarioPlanificado).omit({
  idTurno: true,
}).extend({
  tipoTurno: z.enum(["mañana", "tarde", "noche"]).optional(),
  estado: z.enum(["pendiente", "confirmado", "cancelado"]).optional(),
});

/**
 * Schema para creación masiva de horarios
 */
export const bulkHorarioPlanificadoSchema = z.object({
  schedules: z.array(z.object({
    idEmpleado: z.number().int().positive(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horaInicioPrevista: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    horaFinPrevista: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    tipoTurno: z.enum(["mañana", "tarde", "noche"]).optional(),
  })).min(1),
});

/**
 * Schema para registros de fichaje
 */
export const insertFichajeSchema = createInsertSchema(fichaje).omit({
  idRegistro: true,
  timestampRegistro: true,
}).extend({
  tipoRegistro: z.enum(["entrada", "salida", "pausa_inicio", "pausa_fin"]),
  origen: z.enum(["app_movil", "terminal_fisico", "web"]).optional(),
});

/**
 * Schema para jornadas diarias (uso interno)
 */
export const insertJornadaDiariaSchema = createInsertSchema(jornadaDiaria).omit({
  idJornada: true,
});

// ============================================================================
// TIPOS TYPESCRIPT INFERIDOS
// ============================================================================

export type Empleado = typeof empleado.$inferSelect;
export type InsertEmpleado = z.infer<typeof insertEmpleadoSchema>;
export type UpdateEmpleado = z.infer<typeof updateEmpleadoSchema>;

export type HorarioPlanificado = typeof horarioPlanificado.$inferSelect;
export type InsertHorarioPlanificado = z.infer<typeof insertHorarioPlanificadoSchema>;
export type BulkHorarioPlanificado = z.infer<typeof bulkHorarioPlanificadoSchema>;

export type Fichaje = typeof fichaje.$inferSelect;
export type InsertFichaje = z.infer<typeof insertFichajeSchema>;

export type JornadaDiaria = typeof jornadaDiaria.$inferSelect;
export type InsertJornadaDiaria = z.infer<typeof insertJornadaDiariaSchema>;

// ============================================================================
// TIPOS AUXILIARES PARA COMPATIBILIDAD CON FRONTEND/MÓVIL
// ============================================================================

/**
 * Tipo User para información de sesión
 */
export type User = {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  rol: "admin" | "empleado";
};

/**
 * Tipo LoginRequest
 */
export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * Tipo LoginResponse
 */
export type LoginResponse = {
  user: User;
  token: string;
  message: string;
};

/**
 * Tipo para estadísticas de tiempo
 */
export type TimeStats = {
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  averageHoursPerDay: number;
  daysWorkedThisMonth: number;
};

// ============================================================================
// TIPOS DE COMPATIBILIDAD CON API EXISTENTE
// ============================================================================

/**
 * Estos tipos mantienen compatibilidad con el frontend y móvil existentes
 * Se mapean a la nueva estructura internamente
 */

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

export interface CreateEmployee extends InsertEmployee {
  password: string;
  role: "admin" | "employee";
}

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

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut: Date | null;
  totalHours: number | null;
  date: string;
}

export interface InsertTimeEntry {
  employeeId: string;
  clockIn: Date;
  clockOut?: Date | null;
  date: string;
}

export interface Schedule {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface InsertSchedule {
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface DateSchedule {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive: boolean;
}

export interface InsertDateSchedule {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive?: boolean;
}

export type BulkDateScheduleCreate = {
  schedules: Array<{
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }>;
};

export interface Incident {
  id: string;
  employeeId: string;
  type: string;
  description: string;
  date: Date;
  status: string;
  createdAt: Date;
}

export interface InsertIncident {
  employeeId: string;
  type: "late" | "absence" | "early_departure" | "forgot_clock_in" | "forgot_clock_out";
  description: string;
  date: Date;
  status?: "pending" | "approved" | "rejected";
}

// Schemas de compatibilidad
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

export const insertDateScheduleSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  workHours: z.number().int(),
  isActive: z.boolean().optional().default(true),
});

export const bulkDateScheduleCreateSchema = z.object({
  schedules: z.array(z.object({
    employeeId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean().optional().default(true),
  })).min(1),
});

export const insertIncidentSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["late", "absence", "early_departure", "forgot_clock_in", "forgot_clock_out"]),
  description: z.string().min(1),
  date: z.coerce.date(),
  status: z.enum(["pending", "approved", "rejected"]).optional().default("pending"),
});
