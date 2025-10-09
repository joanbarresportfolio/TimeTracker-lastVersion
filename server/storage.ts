/**
 * STORAGE INTERFACE
 * =================
 * 
 * Este archivo define la interfaz IStorage que especifica el contrato
 * para todas las operaciones de almacenamiento del sistema.
 * 
 * La implementación real se encuentra en server/storages/index.ts,
 * donde se combinan todos los módulos especializados.
 */

import { 
  type Employee, 
  type InsertEmployee, 
  type TimeEntry, 
  type InsertTimeEntry, 
  type Incident, 
  type InsertIncident, 
  type CreateEmployee, 
  type User, 
  type Department,
  type RoleEnterprise,
  type ScheduledShift,
  type DailyWorkday,
  type IncidentsType,
  type InsertIncidentsType
} from "@shared/schema";

/**
 * INTERFAZ DE ALMACENAMIENTO
 * =========================
 * 
 * Define el contrato que debe cumplir cualquier implementación de storage.
 * Esto permite cambiar fácilmente entre diferentes tipos de almacenamiento
 * (base de datos, memoria, archivos, etc.) sin afectar el resto del sistema.
 * 
 * Todas las operaciones son asíncronas ya que involucran I/O de base de datos.
 */
export interface IStorage {
  // Métodos de Autenticación
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  authenticateEmployee(email: string, password: string): Promise<User | null>;
  createEmployeeWithPassword(employee: CreateEmployee): Promise<Employee>;

  // Métodos de Empleados
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined>;
  createEmployee(employee: CreateEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Métodos de Departamentos
  getDepartments(): Promise<Department[]>;
  createDepartment(data: { name: string; description?: string }): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;
  
  // Métodos de Roles
  getRoles(): Promise<RoleEnterprise[]>;
  createRole(data: { name: string; description?: string }): Promise<RoleEnterprise>;
  deleteRole(id: string): Promise<void>;
  
  // Métodos de Tipos de Incidencias
  getIncidentTypes(): Promise<IncidentsType[]>;
  createIncidentType(data: InsertIncidentsType): Promise<IncidentsType>;
  updateIncidentType(id: string, data: Partial<InsertIncidentsType>): Promise<IncidentsType>;
  deleteIncidentType(id: string): Promise<void>;

  // Métodos de Registros de Tiempo
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]>;
  getTimeEntriesByDate(date: string): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;

  // Métodos de Incidencias
  getIncident(id: string): Promise<Incident | undefined>;
  getIncidents(): Promise<Incident[]>;
  getIncidentsByEmployee(employeeId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;

  // Métodos de Horarios Programados (Scheduled Shifts)
  getScheduledShifts(): Promise<ScheduledShift[]>;
  getScheduledShiftsByEmployee(employeeId: string): Promise<ScheduledShift[]>;
  getScheduledShiftsByRange(startDate: string, endDate: string): Promise<ScheduledShift[]>;
  getScheduledShiftsByEmployeeAndRange(employeeId: string, startDate: string, endDate: string): Promise<ScheduledShift[]>;
  createScheduledShift(shift: Omit<ScheduledShift, 'id'>): Promise<ScheduledShift>;
  updateScheduledShiftStatus(id: string, status: string): Promise<ScheduledShift | undefined>;
  deleteScheduledShift(id: string): Promise<boolean>;

  // Métodos de Daily Workday
  getDailyWorkdayById(id: string): Promise<DailyWorkday | undefined>;
  getDailyWorkdayByEmployeeAndDate(employeeId: string, date: string): Promise<DailyWorkday | undefined>;
  getDailyWorkdaysByEmployeeAndRange(employeeId: string, startDate: string, endDate: string): Promise<DailyWorkday[]>;
  createManualDailyWorkday(data: { employeeId: string; date: string; startTime: string; endTime: string; breakMinutes: number }): Promise<DailyWorkday>;
  updateManualDailyWorkday(id: string, data: { startTime?: string; endTime?: string; breakMinutes?: number }): Promise<DailyWorkday | undefined>;
  deleteDailyWorkday(id: string): Promise<boolean>;
  hasClockEntriesForDate(employeeId: string, date: string): Promise<boolean>;
  
  // Métodos de Fichaje (Clock Entry)
  crearFichaje(
    employeeId: string,
    entryType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end',
    shiftId: string | null,
    source: 'web' | 'mobile_app' | 'physical_terminal',
    notes: string | null
  ): Promise<TimeEntry>;
}

/**
 * EXPORTACIÓN DE LA IMPLEMENTACIÓN
 * ================================
 * 
 * Se re-exporta la implementación DatabaseStorage y la instancia storage
 * desde el módulo de storages para mantener compatibilidad con el código existente.
 */
export { DatabaseStorage, storage } from "./storages/index";
