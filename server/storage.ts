import { type Employee, type InsertEmployee, type TimeEntry, type InsertTimeEntry, type Schedule, type InsertSchedule, type Incident, type InsertIncident, type CreateEmployee, type User, type BulkScheduleCreate, employees, timeEntries, schedules, incidents } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Authentication methods
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  authenticateEmployee(email: string, password: string): Promise<User | null>;
  createEmployeeWithPassword(employee: CreateEmployee): Promise<Employee>;

  // Employee methods
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Time entry methods
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]>;
  getTimeEntriesByDate(date: string): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;

  // Schedule methods
  getSchedule(id: string): Promise<Schedule | undefined>;
  getSchedules(): Promise<Schedule[]>;
  getSchedulesByEmployee(employeeId: string): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  createBulkSchedules(bulkData: BulkScheduleCreate): Promise<Schedule[]>;
  updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;

  // Incident methods
  getIncident(id: string): Promise<Incident | undefined>;
  getIncidents(): Promise<Incident[]>;
  getIncidentsByEmployee(employeeId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Authentication methods
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.email, email));
    return employee || undefined;
  }

  async authenticateEmployee(email: string, password: string): Promise<User | null> {
    const employee = await this.getEmployeeByEmail(email);
    if (!employee) return null;

    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) return null;

    return {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role as "admin" | "employee",
      employeeNumber: employee.employeeNumber,
    };
  }

  async createEmployeeWithPassword(employeeData: CreateEmployee): Promise<Employee> {
    const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    const [employee] = await db
      .insert(employees)
      .values({
        ...employeeData,
        password: hashedPassword,
      })
      .returning();
    return employee;
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees);
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.employeeNumber, employeeNumber));
    return employee || undefined;
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(insertEmployee)
      .returning();
    return employee;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updatedEmployee] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee || undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(employees).where(eq(employees.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Time entry methods
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [timeEntry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return timeEntry || undefined;
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries);
  }

  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.employeeId, employeeId));
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    return await db.select().from(timeEntries).where(eq(timeEntries.date, date));
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    let totalHours = null;
    
    if (insertTimeEntry.clockOut) {
      const clockIn = new Date(insertTimeEntry.clockIn);
      const clockOut = new Date(insertTimeEntry.clockOut);
      totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60)); // minutes
    }

    const [timeEntry] = await db
      .insert(timeEntries)
      .values({
        ...insertTimeEntry,
        totalHours,
      })
      .returning();
    return timeEntry;
  }

  async updateTimeEntry(id: string, timeEntryData: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    // Get existing entry first to calculate total hours
    const existingEntry = await this.getTimeEntry(id);
    if (!existingEntry) return undefined;

    const updatedData = { ...existingEntry, ...timeEntryData };
    
    // Recalculate total hours if both clockIn and clockOut are present
    let totalHours = null;
    if (updatedData.clockIn && updatedData.clockOut) {
      const clockIn = new Date(updatedData.clockIn);
      const clockOut = new Date(updatedData.clockOut);
      totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    }

    const [updatedTimeEntry] = await db
      .update(timeEntries)
      .set({
        ...timeEntryData,
        totalHours,
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedTimeEntry || undefined;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Schedule methods
  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
  }

  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules);
  }

  async getSchedulesByEmployee(employeeId: string): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.employeeId, employeeId));
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const [schedule] = await db
      .insert(schedules)
      .values(insertSchedule)
      .returning();
    return schedule;
  }

  async updateSchedule(id: string, scheduleData: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [updatedSchedule] = await db
      .update(schedules)
      .set(scheduleData)
      .where(eq(schedules.id, id))
      .returning();
    return updatedSchedule || undefined;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const result = await db.delete(schedules).where(eq(schedules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createBulkSchedules(bulkData: BulkScheduleCreate): Promise<Schedule[]> {
    const scheduleInserts: InsertSchedule[] = bulkData.daysOfWeek.map(dayOfWeek => ({
      employeeId: bulkData.employeeId,
      dayOfWeek: dayOfWeek,
      startTime: bulkData.startTime,
      endTime: bulkData.endTime,
      isActive: bulkData.isActive ?? true,
    }));

    const createdSchedules = await db
      .insert(schedules)
      .values(scheduleInserts)
      .returning();
    
    return createdSchedules;
  }

  // Incident methods
  async getIncident(id: string): Promise<Incident | undefined> {
    const [incident] = await db.select().from(incidents).where(eq(incidents.id, id));
    return incident || undefined;
  }

  async getIncidents(): Promise<Incident[]> {
    return await db.select().from(incidents);
  }

  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    return await db.select().from(incidents).where(eq(incidents.employeeId, employeeId));
  }

  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const [incident] = await db
      .insert(incidents)
      .values(insertIncident)
      .returning();
    return incident;
  }

  async updateIncident(id: string, incidentData: Partial<InsertIncident>): Promise<Incident | undefined> {
    const [updatedIncident] = await db
      .update(incidents)
      .set(incidentData)
      .where(eq(incidents.id, id))
      .returning();
    return updatedIncident || undefined;
  }

  async deleteIncident(id: string): Promise<boolean> {
    const result = await db.delete(incidents).where(eq(incidents.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();