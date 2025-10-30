import type {
  User,
  InsertUser,
  Department,
  RoleEnterprise,
  DailyWorkday,
  IncidentsType,
  InsertIncidentsType,
  Incident,
  InsertIncident,
  ClockEntry,
  Schedule,
  InsertSchedule,
  TimeEntry,
  BulkDateScheduleCreate,
  ScheduledShift,
  BulkScheduleCreate,
  DateSchedule,
  InsertDateSchedule,
} from "@shared/schema";
import { insertClockEntry } from "./storages/clockEntryStorage";

export interface IStorage {
  // =====================
  // USUARIOS
  // =====================
  authenticateUser(email: string, password: string): Promise<User | null>;
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByNumber(UserNumber: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByDNI(dni: string): Promise<User | undefined>;
  createUser(User: InsertUser): Promise<User>;
  updateUser(id: string, User: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // =====================
  // DEPARTAMENTOS
  // =====================
  getDepartments(): Promise<Department[]>;
  createDepartment(dept: {
    name: string;
    description?: string;
  }): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  // =====================
  // ROLES
  // =====================
  getRoles(): Promise<RoleEnterprise[]>;
  createRole(data: {
    name: string;
    description?: string;
  }): Promise<RoleEnterprise>;
  deleteRole(id: string): Promise<void>;

  // =====================
  // TIPOS DE INCIDENCIAS
  // =====================
  getIncidentTypes(): Promise<IncidentsType[]>;
  createIncidentType(data: InsertIncidentsType): Promise<IncidentsType>;
  updateIncidentType(
    id: string,
    data: Partial<InsertIncidentsType>,
  ): Promise<IncidentsType>;
  deleteIncidentType(id: string): Promise<void>;

  // =====================
  // INCIDENCIAS
  // =====================
  getIncident(id: string): Promise<Incident | undefined>;
  getIncidents(): Promise<Incident[]>;
  getIncidentsByUser(UserId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(
    id: string,
    incident: Partial<InsertIncident>,
  ): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;

  // =====================
  // HORARIOS PROGRAMADOS
  // =====================
  // Métodos de Horarios Programados (Scheduled Shifts)
  // Métodos de Horarios Programados (Scheduled Shifts)
  getScheduledShifts(): Promise<ScheduledShift[]>;
  getScheduledShiftsByEmployee(employeeId: string): Promise<ScheduledShift[]>;
  getScheduledShiftsByRange(
    startDate: string,
    endDate: string,
  ): Promise<ScheduledShift[]>;
  getScheduledShiftsByDate(date: string): Promise<ScheduledShift[]>;
  getScheduledShiftsByEmployeeAndRange(
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<ScheduledShift[]>;
  createBulkDateSchedules(
    bulkData: BulkScheduleCreate,
  ): Promise<DateSchedule[]>;
  deleteDateSchedule(id: string): Promise<boolean>;
  updateDateSchedule(
    id: string,
    dateScheduleData: Partial<InsertDateSchedule>,
  ): Promise<DateSchedule | undefined>;
  // =====================
  // DAILY WORKDAY
  // =====================
  getDailyWorkdayById(id: string): Promise<DailyWorkday | undefined>;
  getDailyWorkdayByUserAndDate(
    UserId: string,
    date: string,
  ): Promise<DailyWorkday | undefined>;
  getDailyWorkdaysByUserAndRange(
    UserId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyWorkday[]>;
  createManualDailyWorkday(data: {
    userId: string;
    date: string;
    startTime: string;
    endTime: string;
    startBreak?: string;
    endBreak?: string;
  }): Promise<DailyWorkday>;
  deleteDailyWorkday(id: string): Promise<boolean>;
  getDailyWorkdaysLastWeek(): Promise<DailyWorkday[]>;
  getDailyWorkdays(): Promise<DailyWorkday[]>;
  deleteClockEntriesByDailyWorkday(dailyWorkdayId: string): Promise<boolean>;
  // =====================
  // CLOCK ENTRY
  // =====================
  getClockEntriesByDate(date: string): Promise<ClockEntry[]>;
  getTimeEntriesByDate(date: string): Promise<TimeEntry[]>;
  getTimeEntriesByUserMonth(userId: string, date: string): Promise<TimeEntry[]>;
  createClockEntry(
    employeeId: string,
    entryType: string,
    date: string,
    source: string,
  ): Promise<ClockEntry>;
}

export { DatabaseStorage, storage } from "./storages/index";
