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
 * TABLE: users
 * ============
 * 
 * Stores information about employees and administrators.
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: text("employee_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  role: text("role").notNull().default("employee"), // "admin" or "employee"
  departmentId: varchar("department_id").references(() => departments.id),
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
  entryType: varchar("entry_type").notNull(), // 'clock_in', 'clock_out', 'break_start', 'break_end'
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  source: varchar("source"), // 'mobile_app', 'physical_terminal', 'web'
  notes: text("notes"),
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
  startTime: timestamp("start_time"), // First clock-in entry of the day
  endTime: timestamp("end_time"), // Last clock-out entry of the day
  workedMinutes: integer("worked_minutes").notNull().default(0), // in minutes
  breakMinutes: integer("break_minutes").notNull().default(0), // in minutes
  overtimeMinutes: integer("overtime_minutes").notNull().default(0), // in minutes
  status: varchar("status").notNull().default('open'), // 'open', 'closed'
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
  entryId: varchar("entry_id").references(() => clockEntries.id),
  incidentType: text("incident_type").notNull(), // "late", "absence", "sick_leave", "vacation", "forgot_clock_in", "other"
  description: text("description").notNull(),
  registeredBy: varchar("registered_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
});

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

/**
 * SCHEMAS FOR DEPARTMENTS
 */
export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
});

/**
 * SCHEMAS FOR USERS
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  role: true,
});

export const createUserSchema = insertUserSchema.extend({
  passwordHash: z.string().min(4, "Password must be at least 4 characters"),
  role: z.enum(["admin", "employee"]).default("employee"),
  hireDate: z.string().transform((str) => new Date(str)),
});

export const updateUserSchema = z.object({
  employeeNumber: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  departmentId: z.string().min(1).optional(),
  hireDate: z.string().transform((str) => new Date(str)).optional(),
  isActive: z.boolean().optional(),
});

/**
 * SCHEMAS FOR SCHEDULED SHIFTS
 */
export const insertScheduledShiftSchema = createInsertSchema(scheduledShifts).omit({
  id: true,
}).extend({
  shiftType: z.enum(['morning', 'afternoon', 'night']),
  status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).default('scheduled'),
});

export const bulkScheduledShiftCreateSchema = z.object({
  schedules: z.array(z.object({
    employeeId: z.string().min(1, "Employee ID is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    expectedStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"),
    expectedEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"),
    shiftType: z.enum(['morning', 'afternoon', 'night']).default('morning'),
    status: z.enum(['scheduled', 'confirmed', 'completed', 'cancelled']).default('scheduled'),
  })).min(1, "At least one schedule is required"),
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

/**
 * SCHEMAS FOR INCIDENTS
 */
export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
}).extend({
  incidentType: z.enum(["late", "absence", "sick_leave", "vacation", "forgot_clock_in", "other"]),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
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

export type ScheduledShift = typeof scheduledShifts.$inferSelect;
export type InsertScheduledShift = z.infer<typeof insertScheduledShiftSchema>;
export type BulkScheduledShiftCreate = z.infer<typeof bulkScheduledShiftCreateSchema>;

export type ClockEntry = typeof clockEntries.$inferSelect;
export type InsertClockEntry = z.infer<typeof insertClockEntrySchema>;

export type DailyWorkday = typeof dailyWorkday.$inferSelect;
export type InsertDailyWorkday = z.infer<typeof insertDailyWorkdaySchema>;

export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

// ============================================================================
// LEGACY TYPES FOR API COMPATIBILITY
// ============================================================================

/**
 * Legacy Employee interface - maps to User
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
