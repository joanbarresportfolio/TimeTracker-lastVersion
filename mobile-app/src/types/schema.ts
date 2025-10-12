/**
 * TIPOS PARA APLICACIÓN MÓVIL
 * ===========================
 * 
 * Definiciones de tipos para la aplicación móvil que corresponden
 * a las mismas estructuras de datos del backend (esquema en inglés).
 */

/**
 * TIPOS DE EMPLEADOS
 * ==================
 */

/** Tipo completo de empleado */
export interface Employee {
  id: string;
  numEmployee: string; // Actualizado: numEmployee en lugar de employeeNumber
  dni?: string | null; // Nuevo campo
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  roleSystem: "admin" | "employee"; // Actualizado: roleSystem en lugar de role
  roleEnterpriseId?: string | null; // Nuevo campo
  departmentId: string | null;
  hireDate: string; // El servidor envía ISO string, no Date
  isActive: boolean;
}

/** Tipo User para información de sesión (sin datos sensibles) */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleSystem: "admin" | "employee";
  numEmployee: string;
  dni?: string | null;
  departmentId?: string | null;
  roleEnterpriseId?: string | null;
}

/** Tipo para datos de login */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * TIPOS DE JORNADA DIARIA
 * =======================
 */

/** Tipo completo de jornada diaria consolidada */
export interface DailyWorkday {
  id: string;
  idUser: string;
  date: string; // YYYY-MM-DD
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  status: 'open' | 'closed';
}

/**
 * TIPOS DE REGISTROS DE TIEMPO (Clock Entries)
 * ============================================
 */

/** Tipo de entrada de reloj (eventos individuales) */
export interface ClockEntry {
  id: string;
  idUser: string;
  idDailyWorkday: string;
  entryType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  timestamp: string; // ISO string
  source?: string | null; // 'web' | 'mobile_device'
}

/** Tipo para crear nueva entrada de reloj */
export interface InsertClockEntry {
  idUser: string;
  idDailyWorkday?: string; // Opcional, el backend puede crear el daily_workday
  entryType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  source?: string;
}

/**
 * TIPOS DE HORARIOS PLANIFICADOS
 * ==============================
 */

/** Tipo completo de horario planificado (schedules) */
export interface Schedule {
  id: string;
  idUser: string; // Actualizado: idUser en lugar de employeeId
  idDailyWorkday?: string | null; // Nuevo campo
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format - Actualizado: startTime en lugar de expectedStartTime
  endTime: string; // HH:MM format - Actualizado: endTime en lugar de expectedEndTime
  scheduleType: 'split' | 'total'; // Actualizado: scheduleType en lugar de shiftType
}

/** Tipo para crear nuevo horario planificado */
export interface InsertSchedule {
  idUser: string; // Actualizado: idUser en lugar de employeeId
  idDailyWorkday?: string | null;
  date: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  scheduleType: 'split' | 'total';
}

// Mantener compatibilidad con nombre antiguo para evitar romper pantallas
export type ScheduledShift = Schedule;
export type DateSchedule = Schedule;

/**
 * TIPOS DE INCIDENCIAS
 * ====================
 */

/** Tipo de incidencia */
export interface IncidentType {
  id: string;
  name: string;
  description?: string | null;
}

/** Tipo completo de incidencia */
export interface Incident {
  id: string;
  idUser: string; // Actualizado: idUser en lugar de userId
  idDailyWorkday: string; // Actualizado: idDailyWorkday en lugar de entryId
  idIncidentsType: string; // Actualizado: ID del tipo de incidencia en lugar de enum
  description: string;
  registeredBy?: string | null;
  createdAt: string; // El servidor envía ISO string, no Date
  status: "pending" | "approved" | "rejected";
}

/** Tipo para crear nueva incidencia */
export interface InsertIncident {
  idUser: string; // Actualizado: idUser en lugar de userId
  idDailyWorkday: string; // Actualizado: idDailyWorkday en lugar de entryId
  idIncidentsType: string; // Actualizado: ID del tipo de incidencia
  description: string;
  registeredBy?: string;
  status?: "pending" | "approved" | "rejected";
}

/** Tipo simplificado para formulario de incidencias */
export interface IncidentFormData {
  idUser: string;
  date: string; // YYYY-MM-DD - El backend lo convierte a idDailyWorkday
  idIncidentsType: string;
  description: string;
  status?: "pending" | "approved" | "rejected";
  registeredBy?: string;
}

/**
 * TIPOS ESPECÍFICOS PARA LA APLICACIÓN MÓVIL
 * ==========================================
 */

/** Estado de autenticación para la aplicación móvil */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

/** Configuración de la API para conectar con el backend */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

/** Respuesta de la API para login */
export interface LoginResponse {
  user: User;
  token: string;
}

/** Estado del fichaje actual del empleado */
export interface CurrentClockStatus {
  hasActiveWorkday: boolean;
  workdayId?: string;
  lastEntry?: ClockEntry;
  canClockIn: boolean;
  canClockOut: boolean;
  canStartBreak: boolean;
  canEndBreak: boolean;
}

/** Estadísticas de tiempo trabajado */
export interface TimeStats {
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  averageHoursPerDay: number;
  daysWorkedThisMonth: number;
}

/**
 * TIPOS LEGACY (para compatibilidad con endpoints antiguos)
 * =========================================================
 */

/** Tipo de pausa individual (formato legacy) */
export interface BreakEntry {
  start: string; // ISO string
  end?: string | null; // ISO string
}

/** Tipo completo de registro de tiempo (formato legacy) */
export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string; // El servidor envía ISO string, no Date
  clockOut?: string | null; // El servidor envía ISO string, no Date
  totalHours?: number | null;
  breakMinutes?: number | null;
  breaks: BreakEntry[];
  date: string;
}

/** Tipo para crear nuevo registro de tiempo (formato legacy) */
export interface InsertTimeEntry {
  employeeId: string;
  clockIn: string; // Enviamos ISO string al servidor
  clockOut?: string | null; // Enviamos ISO string al servidor
  date: string;
}
