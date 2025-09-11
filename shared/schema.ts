import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeNumber: text("employee_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // "admin" or "employee"
  department: text("department").notNull(),
  position: text("position").notNull(),
  hireDate: timestamp("hire_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  totalHours: integer("total_hours"), // in minutes
  date: text("date").notNull(), // YYYY-MM-DD format
});

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday to Saturday)
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  isActive: boolean("is_active").notNull().default(true),
});

export const incidents = pgTable("incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  type: text("type").notNull(), // "late", "absence", "early_departure", "forgot_clock_in", "forgot_clock_out"
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected"
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  password: true,
  role: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const createEmployeeSchema = insertEmployeeSchema.extend({
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  role: z.enum(["admin", "employee"]).default("employee"),
  hireDate: z.string().transform((str) => new Date(str)), // Acepta string y convierte a Date
});

export const updateEmployeeSchema = insertEmployeeSchema.partial().extend({
  hireDate: z.string().transform((str) => new Date(str)).optional(), // Acepta string y convierte a Date para actualizaciones
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  totalHours: true,
});

// Schema base sin validación de tiempo (para formularios)
export const insertScheduleSchemaBase = createInsertSchema(schedules).omit({
  id: true,
});

// Schema con validación de tiempo (para endpoints)
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

// Schema para creación masiva de horarios
export const bulkScheduleCreateSchema = z.object({
  employeeId: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).min(1), // Array de días de la semana (0-6)
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

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.coerce.date(), // Accept both string and Date, coerce to Date
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployee = z.infer<typeof updateEmployeeSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type BulkScheduleCreate = z.infer<typeof bulkScheduleCreateSchema>;
export type Incident = typeof incidents.$inferSelect;
export type InsertIncident = z.infer<typeof insertIncidentSchema>;

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "employee";
  employeeNumber: string;
};
