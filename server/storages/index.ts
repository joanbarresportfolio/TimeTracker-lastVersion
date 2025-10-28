/**
 * STORAGE INDEX
 * =============
 *
 * Este archivo combina todos los módulos de almacenamiento en una clase DatabaseStorage
 * que implementa la interfaz IStorage. Cada método delega al módulo correspondiente.
 */

import type { IStorage } from "../storage";
import type {
  LoginRequest,
  Department,
  InsertDepartment,
  User,
  InsertUser,
  Schedule,
  InsertSchedule,
  ClockEntry,
  InsertClockEntry,
  DailyWorkday,
  InsertDailyWorkday,
  IncidentsType,
  InsertIncidentsType,
  Incident,
  InsertIncident,
  RoleEnterprise,
  InsertRoleEnterprise,
  TimeEntry,
  BulkDateScheduleCreate,
  ScheduledShift,
  DateSchedule,
  BulkScheduleCreate,
  InsertDateSchedule,
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

  async authenticateUser(
    email: string,
    password: string,
  ): Promise<User | null> {
    return userStorage.authenticateUser(email, password);
  }

  async getUser(id: string): Promise<User | undefined> {
    return userStorage.getUserById(id);
  }

  async getUsers(): Promise<User[]> {
    return userStorage.getUsers();
  }

  async getUserByNumber(UserNumber: string): Promise<User | undefined> {
    return userStorage.getUserByNumber(UserNumber);
  }

  async createUser(User: InsertUser): Promise<User> {
    return userStorage.createUser(User);
  }

  async updateUser(
    id: string,
    User: Partial<InsertUser>,
  ): Promise<User | undefined> {
    return userStorage.updateUser(id, User);
  }

  async deleteUser(id: string): Promise<boolean> {
    return userStorage.deleteUser(id);
  }

  // ==========================================
  // MÉTODOS DE DEPARTAMENTOS
  // ==========================================

  async getDepartments(): Promise<Department[]> {
    return departmentStorage.getDepartments();
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    return departmentStorage.createDepartment(dept);
  }

  async updateDepartment(
    id: string,
    data: Partial<InsertDepartment>,
  ): Promise<Department> {
    return departmentStorage.updateDepartment(id, data);
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

  async createRole(data: InsertRoleEnterprise): Promise<RoleEnterprise> {
    return roleStorage.createRole(data);
  }

  async updateRole(
    id: string,
    data: Partial<InsertRoleEnterprise>,
  ): Promise<RoleEnterprise> {
    return roleStorage.updateRole(id, data);
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

  async updateIncidentType(
    id: string,
    data: Partial<InsertIncidentsType>,
  ): Promise<IncidentsType> {
    return incidentTypeStorage.updateIncidentType(id, data);
  }

  async deleteIncidentType(id: string): Promise<void> {
    return incidentTypeStorage.deleteIncidentType(id);
  }

  // ==========================================
  // MÉTODOS DE REGISTROS DE TIEMPO (TimeEntry)
  // ==========================================

  // ==========================================
  // MÉTODOS DE INCIDENCIAS
  // ==========================================

  async getIncident(id: string): Promise<Incident | undefined> {
    return incidentStorage.getIncidentById(id);
  }

  async getIncidents(): Promise<Incident[]> {
    return incidentStorage.getIncidents();
  }

  async getIncidentsByUser(UserId: string): Promise<Incident[]> {
    return incidentStorage.getIncidentsByUser(UserId);
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    return incidentStorage.createIncident(incident);
  }

  async updateIncident(
    id: string,
    incident: Partial<InsertIncident>,
  ): Promise<Incident | undefined> {
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

  async getScheduledShiftsByEmployee(
    employeeId: string,
  ): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByEmployee(employeeId);
  }

  async getScheduledShiftsByRange(
    startDate: string,
    endDate: string,
  ): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByRange(startDate, endDate);
  }
  async getScheduledShiftsByDate(date: string): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByDate(date);
  }

  async getScheduledShiftsByEmployeeAndRange(
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<ScheduledShift[]> {
    return scheduleStorage.getScheduledShiftsByEmployeeAndRange(
      employeeId,
      startDate,
      endDate,
    );
  }
  async createBulkDateSchedules(
    bulkData: BulkScheduleCreate,
  ): Promise<DateSchedule[]> {
    return scheduleStorage.createBulkDateSchedules(bulkData);
  }
  async deleteDateSchedule(id: string): Promise<boolean> {
    return scheduleStorage.deleteDateSchedule(id);
  }
  async updateDateSchedule(
    id: string,
    dateScheduleData: Partial<InsertDateSchedule>,
  ): Promise<DateSchedule | undefined> {
    return scheduleStorage.updateDateSchedule(id, dateScheduleData);
  }
  // ==========================================
  // MÉTODOS DE DAILY WORKDAY
  // ==========================================
  async getDailyWorkdays(): Promise<DailyWorkday[]> {
    return dailyWorkdayStorage.getDailyWorkdays();
  }
  async getDailyWorkdayById(id: string): Promise<DailyWorkday | undefined> {
    return dailyWorkdayStorage.getDailyWorkdayById(id);
  }

  async getDailyWorkdayByUserAndDate(
    UserId: string,
    date: string,
  ): Promise<DailyWorkday | undefined> {
    return dailyWorkdayStorage.getDailyWorkdayByUserAndDate(UserId, date);
  }

  async getDailyWorkdaysByUserAndRange(
    UserId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyWorkday[]> {
    return dailyWorkdayStorage.getDailyWorkdaysByUserAndRange(
      UserId,
      startDate,
      endDate,
    );
  }

  async createManualDailyWorkday(data: {
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    startBreak?: string;
    endBreak?: string;
  }): Promise<DailyWorkday> {
    return dailyWorkdayStorage.createManualDailyWorkday(data);
  }

  async deleteDailyWorkday(id: string): Promise<boolean> {
    return dailyWorkdayStorage.deleteDailyWorkday(id);
  }
  async getDailyWorkdaysLastWeek(): Promise<DailyWorkday[]> {
    return dailyWorkdayStorage.getDailyWorkdaysLastWeek();
  }
  // En storage (dailyWorkdayStorage.ts o index.ts)
  async getClockEntriesByDate(date: string): Promise<ClockEntry[]> {
    return clockEntryStorage.getClockEntriesByDate(date);
  }
  async deleteClockEntriesByDailyWorkday(
    dailyWorkdayId: string,
  ): Promise<boolean> {
    return dailyWorkdayStorage.deleteClockEntriesByDailyWorkday(dailyWorkdayId);
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    return clockEntryStorage.getTimeEntriesByDate(date);
  }
  async getTimeEntriesByUserMonth(
    userId: string,
    date: string,
  ): Promise<TimeEntry[]> {
    return clockEntryStorage.getTimeEntriesByUserMonth(userId, date);
  }

  async createClockEntry(
    employeeId: string,
    entryType: string,
    date: string,
    source: string,
    providedTimestamp?: Date | string,
    useSpanishTime: boolean = false,
  ): Promise<ClockEntry> {
    // Convertimos el timestamp string a Date si se proporciona
    return clockEntryStorage.createClockEntry(
      employeeId,
      entryType,
      date,
      source,
      providedTimestamp,
      useSpanishTime,
    );
  }
}

/**
 * INSTANCIA SINGLETON DE STORAGE
 * ==============================
 *
 * Esta es la instancia única de DatabaseStorage que se exporta y usa en toda la aplicación.
 */
export const storage = new DatabaseStorage();
