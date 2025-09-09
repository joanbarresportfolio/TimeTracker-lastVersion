import { type Employee, type InsertEmployee, type TimeEntry, type InsertTimeEntry, type Schedule, type InsertSchedule, type Incident, type InsertIncident } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
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

export class MemStorage implements IStorage {
  private employees: Map<string, Employee> = new Map();
  private timeEntries: Map<string, TimeEntry> = new Map();
  private schedules: Map<string, Schedule> = new Map();
  private incidents: Map<string, Incident> = new Map();

  constructor() {
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create sample employees
    const sampleEmployees: InsertEmployee[] = [
      {
        employeeNumber: "EMP001",
        firstName: "Ana",
        lastName: "García",
        email: "ana.garcia@company.com",
        department: "Desarrollo",
        position: "Desarrolladora Senior",
        hireDate: new Date("2022-03-15"),
        isActive: true,
      },
      {
        employeeNumber: "EMP002",
        firstName: "María",
        lastName: "Rodríguez",
        email: "maria.rodriguez@company.com",
        department: "Marketing",
        position: "Especialista en Marketing",
        hireDate: new Date("2023-01-10"),
        isActive: true,
      },
      {
        employeeNumber: "EMP003",
        firstName: "Carlos",
        lastName: "López",
        email: "carlos.lopez@company.com",
        department: "Ventas",
        position: "Ejecutivo de Ventas",
        hireDate: new Date("2021-11-20"),
        isActive: true,
      },
      {
        employeeNumber: "EMP004",
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan.perez@company.com",
        department: "Ventas",
        position: "Representante de Ventas",
        hireDate: new Date("2023-12-01"),
        isActive: true,
      },
    ];

    for (const employee of sampleEmployees) {
      await this.createEmployee(employee);
    }

    // Create sample time entries for today
    const today = new Date().toISOString().split('T')[0];
    const employees = Array.from(this.employees.values());
    
    if (employees.length > 0) {
      // Ana García - Present
      await this.createTimeEntry({
        employeeId: employees[0].id,
        clockIn: new Date(`${today}T08:00:00`),
        date: today,
      });

      // Carlos López - Present with late entry
      await this.createTimeEntry({
        employeeId: employees[2].id,
        clockIn: new Date(`${today}T09:15:00`),
        date: today,
      });
    }
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(
      (employee) => employee.employeeNumber === employeeNumber
    );
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = { ...insertEmployee, id };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existingEmployee = this.employees.get(id);
    if (!existingEmployee) return undefined;

    const updatedEmployee = { ...existingEmployee, ...employee };
    this.employees.set(id, updatedEmployee);
    return updatedEmployee;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employees.delete(id);
  }

  // Time entry methods
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values());
  }

  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(
      (entry) => entry.employeeId === employeeId
    );
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter(
      (entry) => entry.date === date
    );
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = randomUUID();
    let totalHours = null;
    
    if (insertTimeEntry.clockOut) {
      const clockIn = new Date(insertTimeEntry.clockIn);
      const clockOut = new Date(insertTimeEntry.clockOut);
      totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60)); // minutes
    }

    const timeEntry: TimeEntry = { ...insertTimeEntry, id, totalHours };
    this.timeEntries.set(id, timeEntry);
    return timeEntry;
  }

  async updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const existingEntry = this.timeEntries.get(id);
    if (!existingEntry) return undefined;

    const updatedEntry = { ...existingEntry, ...timeEntry };
    
    // Recalculate total hours if both clockIn and clockOut are present
    if (updatedEntry.clockIn && updatedEntry.clockOut) {
      const clockIn = new Date(updatedEntry.clockIn);
      const clockOut = new Date(updatedEntry.clockOut);
      updatedEntry.totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    }

    this.timeEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  // Schedule methods
  async getSchedule(id: string): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async getSchedulesByEmployee(employeeId: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.employeeId === employeeId
    );
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const id = randomUUID();
    const schedule: Schedule = { ...insertSchedule, id };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const existingSchedule = this.schedules.get(id);
    if (!existingSchedule) return undefined;

    const updatedSchedule = { ...existingSchedule, ...schedule };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }

  // Incident methods
  async getIncident(id: string): Promise<Incident | undefined> {
    return this.incidents.get(id);
  }

  async getIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }

  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.employeeId === employeeId
    );
  }

  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const id = randomUUID();
    const incident: Incident = { 
      ...insertIncident, 
      id, 
      createdAt: new Date(),
    };
    this.incidents.set(id, incident);
    return incident;
  }

  async updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined> {
    const existingIncident = this.incidents.get(id);
    if (!existingIncident) return undefined;

    const updatedIncident = { ...existingIncident, ...incident };
    this.incidents.set(id, updatedIncident);
    return updatedIncident;
  }

  async deleteIncident(id: string): Promise<boolean> {
    return this.incidents.delete(id);
  }
}

export const storage = new MemStorage();
