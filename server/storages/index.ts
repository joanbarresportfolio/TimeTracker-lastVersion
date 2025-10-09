/**
 * STORAGE INDEX
 * =============
 * 
 * Este archivo combina todos los módulos de almacenamiento en una clase DatabaseStorage
 * que implementa la interfaz IStorage. Cada método delega al módulo correspondiente.
 */

import type { IStorage } from "../storage";
import type { 
  Employee, 
  InsertEmployee, 
  TimeEntry, 
  InsertTimeEntry, 
  BreakEntry,
  Schedule, 
  InsertSchedule, 
  Incident, 
  InsertIncident, 
  CreateEmployee, 
  User, 
  DateSchedule, 
  InsertDateSchedule, 
  BulkDateScheduleCreate,
  Department,
  RoleEnterprise,
  ScheduledShift,
  ClockEntry,
  DailyWorkday,
  IncidentsType,
  InsertIncidentsType
} from "@shared/schema";

// Importar todos los módulos de storage
import * as userStorage from "./userStorage";
import * as departmentStorage from "./departmentStorage";
import * as roleStorage from "./roleStorage";
import * as incidentTypeStorage from "./incidentTypeStorage";
import * as incidentStorage from "./incidentStorage";
import * as scheduleStorage from "./scheduleStorage";
import * as dailyWorkdayStorage from "./dailyWorkdayStorage";
import * as clockEntryStorage from "./clockEntryStorage";

/**
 * CLASE DATABASESTORAGE
 * =====================
 * 
 * Implementación de IStorage que combina todos los módulos de almacenamiento.
 * Cada método delega a la función correspondiente en su módulo.
 */
export class DatabaseStorage implements IStorage {
  
  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN Y USUARIOS
  // ==========================================
  
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    return userStorage.getEmployeeByEmail(email);
  }

  async authenticateEmployee(email: string, password: string): Promise<User | null> {
    return userStorage.authenticateEmployee(email, password);
  }

  async createEmployeeWithPassword(employee: CreateEmployee): Promise<Employee> {
    return userStorage.createEmployeeWithPassword(employee);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return userStorage.getEmployee(id);
  }

  async getEmployees(): Promise<Employee[]> {
    return userStorage.getEmployees();
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    return userStorage.getEmployeeByNumber(employeeNumber);
  }

  async createEmployee(employee: CreateEmployee): Promise<Employee> {
    return userStorage.createEmployee(employee);
  }

  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    return userStorage.updateEmployee(id, employee);
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return userStorage.deleteEmployee(id);
  }

  // ==========================================
  // MÉTODOS DE DEPARTAMENTOS
  // ==========================================
  
  async getDepartments(): Promise<Department[]> {
    return departmentStorage.getDepartments();
  }

  async createDepartment(data: { name: string; description?: string }): Promise<Department> {
    return departmentStorage.createDepartment(data);
  }

  async deleteDepartment(id: string): Promise<void> {
    return departmentStorage.deleteDepartment(id);
  }

  // ==========================================
  // MÉTODOS DE ROLES
  // ==========================================
  
  async getRoles(): Promise<RoleEnterprise[]> {
    return roleStorage.getRoles();
  }

  async createRole(data: { name: string; description?: string }): Promise<RoleEnterprise> {
    return roleStorage.createRole(data);
  }

  async deleteRole(id: string): Promise<void> {
    return roleStorage.deleteRole(id);
  }

  // ==========================================
  // MÉTODOS DE TIPOS DE INCIDENCIAS
  // ==========================================
  
  async getIncidentTypes(): Promise<IncidentsType[]> {
    return incidentTypeStorage.getIncidentTypes();
  }

  async createIncidentType(data: InsertIncidentsType): Promise<IncidentsType> {
    return incidentTypeStorage.createIncidentType(data);
  }

  async updateIncidentType(id: string, data: Partial<InsertIncidentsType>): Promise<IncidentsType> {
    return incidentTypeStorage.updateIncidentType(id, data);
  }

  async deleteIncidentType(id: string): Promise<void> {
    return incidentTypeStorage.deleteIncidentType(id);
  }

  // ==========================================
  // MÉTODOS DE REGISTROS DE TIEMPO (TimeEntry)
  // ==========================================
  
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return dailyWorkdayStorage.getTimeEntry(id);
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return dailyWorkdayStorage.getTimeEntries();
  }

  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    return dailyWorkdayStorage.getTimeEntriesByEmployee(employeeId);
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    return dailyWorkdayStorage.getTimeEntriesByDate(date);
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    return dailyWorkdayStorage.createTimeEntry(timeEntry);
  }

  async updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    return dailyWorkdayStorage.updateTimeEntry(id, timeEntry);
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    return dailyWorkdayStorage.deleteTimeEntry(id);
  }

  // ==========================================
  // MÉTODOS DE INCIDENCIAS
  // ==========================================
  
  async getIncident(id: string): Promise<Incident | undefined> {
    return incidentStorage.getIncident(id);
  }

  async getIncidents(): Promise<Incident[]> {
    return incidentStorage.getIncidents();
  }

  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    return incidentStorage.getIncidentsByEmployee(employeeId);
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    return incidentStorage.createIncident(incident);
  }

  async updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined> {
    return incidentStorage.updateIncident(id, incident);
  }

  async deleteIncident(id: string): Promise<boolean> {
    return incidentStorage.deleteIncident(id);
  }

  // ==========================================
  // MÉTODOS DE HORARIOS PROGRAMADOS (Scheduled Shifts)
  // ==========================================
  
  async getScheduledShifts(): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShifts();
  }

  async getScheduledShiftsByEmployee(employeeId: string): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByEmployee(employeeId);
  }

  async getScheduledShiftsByRange(startDate: string, endDate: string): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByRange(startDate, endDate);
  }

  async getScheduledShiftsByEmployeeAndRange(employeeId: string, startDate: string, endDate: string): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByEmployeeAndRange(employeeId, startDate, endDate);
  }

  async createScheduledShift(shift: Omit<ScheduledShift, 'id'>): Promise<ScheduledShift> {
    return scheduleStorage.createScheduledShift(shift);
  }

  async updateScheduledShiftStatus(id: string, status: string): Promise<ScheduledShift | undefined> {
    return scheduleStorage.updateScheduledShiftStatus(id, status);
  }

  async deleteScheduledShift(id: string): Promise<boolean> {
    return scheduleStorage.deleteScheduledShift(id);
  }

  // ==========================================
  // MÉTODOS DE DAILY WORKDAY
  // ==========================================
  
  async getDailyWorkdayByEmployeeAndDate(employeeId: string, date: string): Promise<DailyWorkday | undefined> {
    return dailyWorkdayStorage.getDailyWorkdayByEmployeeAndDate(employeeId, date);
  }

  async getDailyWorkdaysByEmployeeAndRange(employeeId: string, startDate: string, endDate: string): Promise<DailyWorkday[]> {
    return dailyWorkdayStorage.getDailyWorkdaysByEmployeeAndRange(employeeId, startDate, endDate);
  }

  async createManualDailyWorkday(data: { employeeId: string; date: string; startTime: string; endTime: string; breakMinutes: number }): Promise<DailyWorkday> {
    return dailyWorkdayStorage.createManualDailyWorkday(data);
  }

  async updateManualDailyWorkday(id: string, data: { startTime?: string; endTime?: string; breakMinutes?: number }): Promise<DailyWorkday | undefined> {
    return dailyWorkdayStorage.updateManualDailyWorkday(id, data);
  }

  async deleteDailyWorkday(id: string): Promise<boolean> {
    return dailyWorkdayStorage.deleteDailyWorkday(id);
  }

  async hasClockEntriesForDate(employeeId: string, date: string): Promise<boolean> {
    return dailyWorkdayStorage.hasClockEntriesForDate(employeeId, date);
  }

  async crearFichaje(
    employeeId: string,
    entryType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end',
    shiftId: string | null,
    source: 'web' | 'mobile_app' | 'physical_terminal',
    notes: string | null
  ): Promise<TimeEntry> {
    return clockEntryStorage.crearFichaje(employeeId, entryType, shiftId, source, notes);
  }

  // ==========================================
  // MÉTODOS ADICIONALES DEL STORAGE ORIGINAL
  // ==========================================
  
  // Métodos de DateSchedule
  async getDateSchedules(): Promise<DateSchedule[]> {
    return scheduleStorage.getDateSchedules();
  }

  async getDateSchedulesByEmployee(employeeId: string): Promise<DateSchedule[]> {
    return scheduleStorage.getDateSchedulesByEmployee(employeeId);
  }

  async getDateSchedulesByEmployeeAndRange(employeeId: string, startDate?: string, endDate?: string): Promise<DateSchedule[]> {
    return scheduleStorage.getDateSchedulesByEmployeeAndRange(employeeId, startDate, endDate);
  }

  async getDateSchedulesByRange(startDate?: string, endDate?: string): Promise<DateSchedule[]> {
    return scheduleStorage.getDateSchedulesByRange(startDate, endDate);
  }

  async createDateSchedule(insertDateSchedule: InsertDateSchedule): Promise<DateSchedule> {
    return scheduleStorage.createDateSchedule(insertDateSchedule);
  }

  async updateDateSchedule(id: string, dateScheduleData: Partial<InsertDateSchedule>): Promise<DateSchedule | undefined> {
    return scheduleStorage.updateDateSchedule(id, dateScheduleData);
  }

  async deleteDateSchedule(id: string): Promise<boolean> {
    return scheduleStorage.deleteDateSchedule(id);
  }

  async createBulkDateSchedules(bulkData: BulkDateScheduleCreate): Promise<DateSchedule[]> {
    return scheduleStorage.createBulkDateSchedules(bulkData);
  }

  // Métodos de ClockEntry
  async getClockEntry(id: string): Promise<ClockEntry | undefined> {
    return clockEntryStorage.getClockEntry(id);
  }

  async createClockEntry(data: Omit<ClockEntry, 'id'>): Promise<ClockEntry> {
    return clockEntryStorage.createClockEntry(data);
  }

  async getActiveClockEntry(employeeId: string): Promise<ClockEntry | undefined> {
    return clockEntryStorage.getActiveClockEntry(employeeId);
  }

  async closeClockEntry(employeeId: string): Promise<ClockEntry> {
    return clockEntryStorage.closeClockEntry(employeeId);
  }

  // Métodos adicionales con nombres en español (del storage original)
  async obtenerFichajesDelDia(employeeId: string, fecha: string) {
    return dailyWorkdayStorage.obtenerFichajesDelDia(employeeId, fecha);
  }

  async obtenerJornadaDiaria(employeeId: string, fecha: string): Promise<DailyWorkday | undefined> {
    return dailyWorkdayStorage.obtenerJornadaDiaria(employeeId, fecha);
  }

  async createDailyWorkdayWithAutoClockEntries(
    employeeId: string,
    date: string,
    startTime: Date,
    endTime: Date,
    breakMinutes: number,
    shiftId: string | null = null
  ): Promise<DailyWorkday> {
    return dailyWorkdayStorage.createDailyWorkdayWithAutoClockEntries(
      employeeId, date, startTime, endTime, breakMinutes, shiftId
    );
  }

  async updateDailyWorkdayWithAutoClockEntries(
    id: string,
    employeeId: string,
    date: string,
    startTime: Date,
    endTime: Date,
    breakMinutes: number,
    shiftId: string | null = null
  ): Promise<DailyWorkday | undefined> {
    return dailyWorkdayStorage.updateDailyWorkdayWithAutoClockEntries(
      id, employeeId, date, startTime, endTime, breakMinutes, shiftId
    );
  }

  async deleteDailyWorkdayWithAutoClockEntries(id: string, employeeId: string, date: string): Promise<boolean> {
    return dailyWorkdayStorage.deleteDailyWorkdayWithAutoClockEntries(id, employeeId, date);
  }
}

/**
 * INSTANCIA SINGLETON DE STORAGE
 * ==============================
 * 
 * Esta es la instancia única de DatabaseStorage que se exporta y usa en toda la aplicación.
 */
export const storage = new DatabaseStorage();

// También exportar funciones de clock entry para uso externo
export { calcularYActualizarJornada, crearFichaje } from "./clockEntryStorage";
