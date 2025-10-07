/**
 * SHARED DATABASE SCHEMA
 * =====================
 * 
 * This file defines the entire data structure shared between frontend and backend.
 * Uses Drizzle ORM to define PostgreSQL tables and Zod for validations.
 * 
 * ARCHITECTURE:
 * - DB tables defined with Drizzle (pgTable)
 * - Validation schemas with Zod
 * - TypeScript types automatically inferred
 * - Shared validations between client and server
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// DATABASE TABLES
// ============================================================================

/**
 * TABLE: departments
 * ==================
 * 
 * Organizes the different departments of the company.
 */
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
});

/**
 * TABLE: roles
 * ============
 * 
 * Defines user roles in the system.
 */
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

/**
 * TABLE: users
 * ============
 * 
 * Stores information about employees and administrators.
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: text("employee_number").notNull().unique(),
  dni: text("dni"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  role: text("role").notNull().default("employee"), // "admin" or "employee" - system permission level
  departmentId: varchar("department_id").references(() => departments.id),
  rolEmpresa: varchar("rol_empresa").references(() => roles.id), // Company role/position
});

/**
 * TABLE: scheduled_shifts
 * =======================
 * 
 * Scheduled shifts/schedules for each employee by specific date.
 */
export const scheduledShifts = pgTable("scheduled_shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD
  expectedStartTime: text("expected_start_time").notNull(), // HH:MM
  expectedEndTime: text("expected_end_time").notNull(), // HH:MM
  shiftType: varchar("shift_type").notNull(), // 'morning', 'afternoon', 'night'
  status: varchar("status").notNull().default('scheduled'), // 'scheduled', 'confirmed', 'completed', 'cancelled'
});

/**
 * TABLE: incidents
 * ================
 * 
 * Record of work incidents (delays, absences, sick leave, etc.).
 */
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  incidentType: text("incident_type").notNull(), // "late", "absence", "sick_leave", "vacation", "forgot_clock_in", "other"
  description: text("description").notNull(),
  registeredBy: varchar("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
});

/**
 * TABLE: custom_fields
 * ====================
 * 
 * Defines custom fields for employees and incidents.
 * Allows dynamic form fields with text or dropdown types.
 */
export const customFields = pgTable("custom_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // "employee" or "incident"
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(), // "text" or "dropdown"
  options: text("options").array(), // Array of options for dropdown type
  isRequired: boolean("is_required").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

/**
 * TABLE: daily_workday
 * ====================
 * 
 * Consolidated summary of each employee's work day.
 * Automatically updated with each clock entry of the day.
 */
export const dailyWorkday = pgTable("daily_workday", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD
  shiftId: varchar("shift_id").references(() => scheduledShifts.id), // Reference to scheduled shift for this day
  incidentId: varchar("incident_id").references(() => incidents.id), // Reference to incident if there's one this day
  startTime: timestamp("start_time"), // First clock-in entry of the day
  endTime: timestamp("end_time"), // Last clock-out entry of the day
  workedMinutes: integer("worked_minutes").notNull().default(0), // in minutes
  breakMinutes: integer("break_minutes").notNull().default(0), // in minutes
  overtimeMinutes: integer("overtime_minutes").notNull().default(0), // in minutes
  status: varchar("status").notNull().default('open'), // 'open', 'closed'
});

/**
 * TABLE: clock_entries
 * ====================
 * 
 * Individual clock entry records (clock in, clock out, breaks).
 * Each entry is a unique event that updates the daily_workday.
 */
export const clockEntries = pgTable("clock_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => users.id),
  shiftId: varchar("shift_id").references(() => scheduledShifts.id), // NULL if no shift assigned
  dailyWorkdayId: varchar("daily_workday_id").references(() => dailyWorkday.id), // Reference to parent daily workday
  incidentId: varchar("incident_id").references(() => incidents.id), // Reference to related incident if any
  entryType: varchar("entry_type").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end'
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  source: varchar("source"), // 'mobile_app', 'physical_terminal', 'web'
  notes: text("notes"),
  autoGenerated: boolean("auto_generated").notNull().default(false), // true if created from manual daily_workday entry
});

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

/**
 * SCHEMAS FOR DEPARTMENTS
 */
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
});

/**
 * SCHEMAS FOR ROLES
 */
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
});

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

/**
 * SCHEMAS FOR USERS
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  role: true,
});

export const createUserSchema = insertUserSchema.extend({
  employeeNumber: z.string().min(1, "El número de empleado es obligatorio"),
  dni: z.string().optional(),
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Debe ingresar un correo electrónico válido"),
  passwordHash: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  role: z.enum(["admin", "employee"], {
    errorMap: () => ({ message: "Debe seleccionar un rol válido" })
  }).default("employee"),
  hireDate: z.string().transform((str) => new Date(str)),
  rolEmpresa: z.string().optional(),
});

export const updateUserSchema = z.object({
  employeeNumber: z.string().min(1, "El número de empleado es obligatorio").optional(),
  dni: z.string().optional(),
  firstName: z.string().min(1, "El nombre es obligatorio").optional(),
  lastName: z.string().min(1, "El apellido es obligatorio").optional(),
  email: z.string().email("Debe ingresar un correo electrónico válido").optional(),
  departmentId: z.string().min(1, "Debe seleccionar un departamento").optional(),
  hireDate: z.string().transform((str) => new Date(str)).optional(),
  isActive: z.boolean().optional(),
  passwordHash: z.string().min(4, "La contraseña debe tener al menos 4 caracteres").optional(),
  role: z.enum(["admin", "employee"], {
    errorMap: () => ({ message: "Debe seleccionar un rol válido" })
  }).optional(),
  rolEmpresa: z.string().optional(),
});

/**
 * SCHEMAS FOR SCHEDULED SHIFTS
 */
export const insertScheduledShiftSchema = createInsertSchema(scheduledShifts).omit({
  id: true,
}).extend({
  employeeId: z.string().min(1, "Debe seleccionar un empleado"),
  shiftType: z.enum(['morning', 'afternoon', 'night'], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de turno válido" })
  }),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).default('scheduled'),
});

export const bulkScheduledShiftCreateSchema = z.object({
  schedules: z.array(z.object({
    employeeId: z.string().min(1, "Debe seleccionar un empleado"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato AAAA-MM-DD"),
    expectedStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de inicio debe estar en formato HH:MM"),
    expectedEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de fin debe estar en formato HH:MM"),
    shiftType: z.enum(['morning', 'afternoon', 'night']).default('morning'),
    status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).default('scheduled'),
  })).min(1, "Debe haber al menos un horario"),
});

/**
 * SCHEMAS FOR CLOCK ENTRIES
 */
export const insertClockEntrySchema = createInsertSchema(clockEntries).omit({
  id: true,
  timestamp: true,
}).extend({
  entryType: z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']),
  source: z.enum(['mobile_app', 'physical_terminal', 'web']).optional(),
});

/**
 * SCHEMAS FOR DAILY WORKDAY
 */
export const insertDailyWorkdaySchema = createInsertSchema(dailyWorkday).omit({
  id: true,
  workedMinutes: true,
  breakMinutes: true,
  overtimeMinutes: true,
}).extend({
  status: z.enum(['open', 'closed']).default('open'),
});

export const manualDailyWorkdaySchema = z.object({
  employeeId: z.string().min(1, "Debe seleccionar un empleado"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato AAAA-MM-DD"),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de inicio debe estar en formato HH:MM"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de fin debe estar en formato HH:MM"),
  breakMinutes: z.number().int().min(0, "Los minutos de descanso no pueden ser negativos"),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: "La hora de fin debe ser posterior a la hora de inicio", path: ["endTime"] }
);

export const updateManualDailyWorkdaySchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de inicio debe estar en formato HH:MM").optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de fin debe estar en formato HH:MM").optional(),
  breakMinutes: z.number().int().min(0, "Los minutos de descanso no pueden ser negativos").optional(),
}).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      return data.startTime < data.endTime;
    }
    return true;
  },
  { message: "La hora de fin debe ser posterior a la hora de inicio", path: ["endTime"] }
);

/**
 * SCHEMAS FOR INCIDENTS
 */
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
}).extend({
  employeeId: z.string().min(1, "Debe seleccionar un empleado"),
  incidentType: z.enum(["late", "absence", "sick_leave", "vacation", "forgot_clock_in", "other"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de incidente válido" })
  }),
  description: z.string().min(1, "La descripción es obligatoria"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

/**
 * SCHEMAS FOR CUSTOM FIELDS
 */
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({
  id: true,
  createdAt: true,
}).extend({
  entityType: z.enum(["employee", "incident"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de entidad válido" })
  }),
  fieldName: z.string().min(1, "El nombre del campo es obligatorio"),
  fieldType: z.enum(["text", "dropdown"], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de campo válido" })
  }),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.fieldType === "dropdown") {
      return data.options && data.options.length > 0;
    }
    return true;
  },
  { message: "Los campos de tipo dropdown deben tener al menos una opción", path: ["options"] }
);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type ScheduledShift = typeof scheduledShifts.$inferSelect;
export type InsertScheduledShift = z.infer<typeof insertScheduledShiftSchema>;
export type BulkScheduledShiftCreate = z.infer<typeof bulkScheduledShiftCreateSchema>;

export type ClockEntry = typeof clockEntries.$inferSelect;
export type InsertClockEntry = z.infer<typeof insertClockEntrySchema>;

export type DailyWorkday = typeof dailyWorkday.$inferSelect;
export type InsertDailyWorkday = z.infer<typeof insertDailyWorkdaySchema>;
export type ManualDailyWorkday = z.infer<typeof manualDailyWorkdaySchema>;
export type UpdateManualDailyWorkday = z.infer<typeof updateManualDailyWorkdaySchema>;

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;

// ============================================================================
// LEGACY TYPES FOR API COMPATIBILITY
// ============================================================================

/**
 * Employee type - alias for User
 */
export type Employee = User;

/**
 * Break entry for TimeEntry
 */
export interface BreakEntry {
  start: Date;
  end: Date | null;
}

/**
 * Legacy TimeEntry interface - maps to DailyWorkday
 */
export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut: Date | null;
  totalHours: number | null;
  breakMinutes: number | null;
  breaks: BreakEntry[];
  date: string;
}

/**
 * Legacy InsertTimeEntry interface
 */
export interface InsertTimeEntry {
  employeeId: string;
  clockIn: Date;
  clockOut?: Date | null;
  date: string;
}

/**
 * Legacy Schedule interface - maps to ScheduledShift
 */
export interface Schedule {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/**
 * Legacy DateSchedule interface - maps to ScheduledShift
 */
export interface DateSchedule {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive: boolean;
}

/**
 * Legacy InsertDateSchedule interface
 */
export interface InsertDateSchedule {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  workHours: number;
  isActive?: boolean;
}

/**
 * Legacy types
 */
export type LoginRequest = z.infer<typeof loginSchema>;
export type InsertEmployee = Omit<Employee, 'id' | 'password'>;
export type CreateEmployee = InsertEmployee & { password: string; role: "admin" | "employee" };
export type UpdateEmployee = Partial<InsertEmployee>;
export type InsertSchedule = Omit<Schedule, 'id'>;
export type BulkDateScheduleCreate = z.infer<typeof bulkScheduledShiftCreateSchema>;
