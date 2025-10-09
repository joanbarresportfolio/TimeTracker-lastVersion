/**
 * SHARED DATABASE SCHEMA - RESTRUCTURED
 * ======================================
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
import { pgTable, text, varchar, timestamp, integer, boolean, uniqueIndex } from "drizzle-orm/pg-core";
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
  convenionHours: integer("convenion_hours"), // Horas de convenio del departamento
});

/**
 * TABLE: roles_enterprise
 * =======================
 * 
 * Defines enterprise roles/positions (e.g., Manager, Supervisor, Operator).
 */
export const rolesEnterprise = pgTable("roles_enterprise", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

/**
 * TABLE: users
 * ============
 * 
 * Stores information about employees and administrators.
 * 
 * RELATIONS:
 * - users N...1 roles_enterprise
 * - users N...1 departments
 * - users 1...N schedules
 * - users 1...N clock_entries
 * - users 1...N daily_workday
 * - users 1...N incidents
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  numEmployee: text("num_employee").notNull().unique(),
  dni: text("dni"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  roleSystem: text("role_system").notNull().default("employee"), // "admin" or "employee"
  roleEnterpriseId: varchar("role_enterprise_id").references(() => rolesEnterprise.id), // FK to roles_enterprise
  departmentId: varchar("department_id").references(() => departments.id), // FK to departments
});

/**
 * TABLE: daily_workday
 * ====================
 * 
 * Consolidated summary of each employee's work day.
 * 
 * RELATIONS:
 * - daily_workday 1...N clock_entries
 * - daily_workday 1...1 schedules
 * - daily_workday 1...N incidents
 */
export const dailyWorkday = pgTable("daily_workday", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idUser: varchar("id_user").notNull().references(() => users.id), // FK to users
  date: text("date").notNull(), // YYYY-MM-DD format
  workedMinutes: integer("worked_minutes").notNull().default(0), // in minutes
  breakMinutes: integer("break_minutes").notNull().default(0), // in minutes
  overtimeMinutes: integer("overtime_minutes").notNull().default(0), // in minutes
  status: varchar("status").notNull().default('open'), // 'open', 'closed'
}, (table) => ({
  // Unique constraint: one workday per user per day
  userDateIdx: uniqueIndex("idx_daily_workday_user_date").on(table.idUser, table.date),
}));

/**
 * TABLE: schedules
 * ================
 * 
 * Scheduled shifts/schedules for each employee.
 * 
 * RELATIONS:
 * - users 1...N schedules
 * - daily_workday 1...1 schedules (optional, linked when workday exists)
 */
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idUser: varchar("id_user").notNull().references(() => users.id), // FK to users
  idDailyWorkday: varchar("id_daily_workday").unique().references(() => dailyWorkday.id), // FK to daily_workday (optional, 1:1 when exists)
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
  scheduleType: varchar("schedule_type").notNull(), // 'split', 'total'
});

/**
 * TABLE: clock_entries
 * ====================
 * 
 * Individual clock entry records (clock in, clock out, breaks).
 * 
 * RELATIONS:
 * - users 1...N clock_entries
 * - daily_workday 1...N clock_entries
 */
export const clockEntries = pgTable("clock_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idUser: varchar("id_user").notNull().references(() => users.id), // FK to users
  idDailyWorkday: varchar("id_daily_workday").notNull().references(() => dailyWorkday.id), // FK to daily_workday (required)
  entryType: varchar("entry_type").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end'
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  source: varchar("source"), // 'web', 'mobile_device'
});

/**
 * TABLE: incidents_type
 * =====================
 * 
 * Types of incidents that can be created in the system.
 * 
 * RELATIONS:
 * - incidents N...1 incidents_type
 */
export const incidentsType = pgTable("incidents_type", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

/**
 * TABLE: incidents
 * ================
 * 
 * Record of work incidents (delays, absences, sick leave, etc.).
 * 
 * RELATIONS:
 * - users 1...N incidents
 * - incidents N...1 incidents_type
 * - daily_workday 1...N incidents
 */
export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  idUser: varchar("id_user").notNull().references(() => users.id), // FK to users
  idDailyWorkday: varchar("id_daily_workday").notNull().references(() => dailyWorkday.id), // FK to daily_workday (required)
  idIncidentsType: varchar("id_incidents_type").notNull().references(() => incidentsType.id), // FK to incidents_type
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  registeredBy: varchar("registered_by").references(() => users.id), // FK to users (who registered)
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
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
 * SCHEMAS FOR ROLES_ENTERPRISE
 */
export const insertRoleEnterpriseSchema = createInsertSchema(rolesEnterprise).omit({
  id: true,
});

export type RoleEnterprise = typeof rolesEnterprise.$inferSelect;
export type InsertRoleEnterprise = z.infer<typeof insertRoleEnterpriseSchema>;

/**
 * SCHEMAS FOR USERS
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  roleSystem: true,
});

export const createUserSchema = insertUserSchema.extend({
  numEmployee: z.string().min(1, "El número de empleado es obligatorio"),
  dni: z.string().optional(),
  firstName: z.string().min(1, "El nombre es obligatorio"),
  lastName: z.string().min(1, "El apellido es obligatorio"),
  email: z.string().email("Debe ingresar un correo electrónico válido"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  roleSystem: z.enum(["admin", "employee"], {
    errorMap: () => ({ message: "Debe seleccionar un rol válido" })
  }).default("employee"),
  hireDate: z.string().transform((str) => new Date(str)),
  roleEnterpriseId: z.string().optional(),
});

export const updateUserSchema = z.object({
  numEmployee: z.string().min(1, "El número de empleado es obligatorio").optional(),
  dni: z.string().optional(),
  firstName: z.string().min(1, "El nombre es obligatorio").optional(),
  lastName: z.string().min(1, "El apellido es obligatorio").optional(),
  email: z.string().email("Debe ingresar un correo electrónico válido").optional(),
  departmentId: z.string().min(1, "Debe seleccionar un departamento").optional(),
  hireDate: z.string().transform((str) => new Date(str)).optional(),
  isActive: z.boolean().optional(),
  passwordHash: z.string().min(4, "La contraseña debe tener al menos 4 caracteres").optional(),
  roleSystem: z.enum(["admin", "employee"], {
    errorMap: () => ({ message: "Debe seleccionar un rol válido" })
  }).optional(),
  roleEnterpriseId: z.string().optional(),
});

/**
 * SCHEMAS FOR SCHEDULES
 */
export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
}).extend({
  idUser: z.string().min(1, "Debe seleccionar un empleado"),
  idDailyWorkday: z.string().optional(), // Now optional since it's nullable
  scheduleType: z.enum(['split', 'total'], {
    errorMap: () => ({ message: "Debe seleccionar un tipo de horario válido" })
  }),
});

export const bulkScheduleCreateSchema = z.object({
  schedules: z.array(z.object({
    idUser: z.string().min(1, "Debe seleccionar un empleado"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato AAAA-MM-DD"),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de inicio debe estar en formato HH:MM"),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "La hora de fin debe estar en formato HH:MM"),
    scheduleType: z.enum(['split', 'total']).default('total'),
  })).min(1, "Debe haber al menos un horario"),
});

/**
 * SCHEMAS FOR CLOCK ENTRIES
 */
export const insertClockEntrySchema = createInsertSchema(clockEntries).omit({
  id: true,
  timestamp: true,
}).extend({
  idUser: z.string().min(1, "Debe seleccionar un empleado"),
  idDailyWorkday: z.string().min(1, "Debe seleccionar una jornada diaria"),
  entryType: z.enum(['clock_in', 'clock_out', 'break_start', 'break_end']),
  source: z.enum(['web', 'mobile_device']).optional(),
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
  idUser: z.string().min(1, "Debe seleccionar un empleado"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD"),
  status: z.enum(['open', 'closed']).default('open'),
});

/**
 * SCHEMAS FOR INCIDENTS_TYPE
 */
export const insertIncidentsTypeSchema = createInsertSchema(incidentsType).omit({
  id: true,
}).extend({
  name: z.string().min(1, "El nombre del tipo de incidencia es obligatorio"),
  description: z.string().optional(),
});

/**
 * SCHEMAS FOR INCIDENTS
 */
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
}).extend({
  idUser: z.string().min(1, "Debe seleccionar un empleado"),
  idDailyWorkday: z.string().min(1, "Debe seleccionar una jornada diaria"),
  idIncidentsType: z.string().min(1, "Debe seleccionar un tipo de incidencia"),
  description: z.string().min(1, "La descripción es obligatoria"),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
});

/**
 * SCHEMAS FOR MANUAL DAILY WORKDAY
 */
export const manualDailyWorkdaySchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().optional(),
});

export const updateManualDailyWorkdaySchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().optional(),
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type BulkScheduleCreate = z.infer<typeof bulkScheduleCreateSchema>;

export type ClockEntry = typeof clockEntries.$inferSelect;
export type InsertClockEntry = z.infer<typeof insertClockEntrySchema>;

export type DailyWorkday = typeof dailyWorkday.$inferSelect;
export type InsertDailyWorkday = z.infer<typeof insertDailyWorkdaySchema>;

export type IncidentsType = typeof incidentsType.$inferSelect;
export type InsertIncidentsType = z.infer<typeof insertIncidentsTypeSchema>;

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

// ============================================================================
// LEGACY TYPE ALIASES FOR COMPATIBILITY
// ============================================================================

export type Employee = User;
export type CreateEmployee = CreateUser;
export type InsertEmployee = InsertUser;
export type ScheduledShift = Schedule;
export type InsertScheduledShift = InsertSchedule;
export type BulkScheduledShiftCreate = BulkScheduleCreate;
export type IncidentType = IncidentsType;
export type InsertIncidentType = InsertIncidentsType;
export type Role = RoleEnterprise;
export type InsertRole = InsertRoleEnterprise;

// Login types
export type LoginRequest = z.infer<typeof loginSchema>;
