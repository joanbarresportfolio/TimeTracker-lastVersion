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
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "admin" | "employee";
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
  role: "admin" | "employee";
  employeeNumber: string;
  departmentId?: string | null;
}

/** Tipo para datos de login */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * TIPOS DE REGISTROS DE TIEMPO
 * ============================
 * 
 * NOTA: La app móvil usa los endpoints legacy /api/time-entries
 * que mantienen compatibilidad con el sistema antiguo de clockIn/clockOut.
 * El backend internamente usa el nuevo sistema de eventos (clock_entries).
 */

/** Tipo de pausa individual */
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

/**
 * TIPOS DE HORARIOS PLANIFICADOS
 * ==============================
 */

/** Tipo completo de horario planificado (scheduled_shifts) */
export interface ScheduledShift {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD format
  expectedStartTime: string; // HH:MM format
  expectedEndTime: string; // HH:MM format
  shiftType: "morning" | "afternoon" | "night";
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
}

/** Tipo para crear nuevo horario planificado */
export interface InsertScheduledShift {
  employeeId: string;
  date: string; // YYYY-MM-DD format
  expectedStartTime: string; // HH:MM format
  expectedEndTime: string; // HH:MM format
  shiftType: "morning" | "afternoon" | "night";
  status?: "scheduled" | "confirmed" | "completed" | "cancelled";
}

// Mantener compatibilidad con nombre antiguo para evitar romper pantallas
export type DateSchedule = ScheduledShift;

/**
 * TIPOS DE INCIDENCIAS
 * ====================
 */

/** Tipo completo de incidencia */
export interface Incident {
  id: string;
  userId: string; // Cambio: ahora es userId en vez de employeeId
  entryId?: string | null; // Referencia a clock_entry si aplica
  incidentType: "late" | "absence" | "sick_leave" | "vacation" | "forgot_clock_in" | "other"; // Cambio: incidentType en vez de type
  description: string;
  registeredBy?: string | null;
  createdAt: string; // El servidor envía ISO string, no Date
  status: "pending" | "approved" | "rejected";
}

/** Tipo para crear nueva incidencia */
export interface InsertIncident {
  userId: string; // Cambio: ahora es userId en vez de employeeId
  entryId?: string | null;
  incidentType: "late" | "absence" | "sick_leave" | "vacation" | "forgot_clock_in" | "other"; // Cambio: incidentType en vez de type
  description: string;
  registeredBy?: string;
  status?: "pending" | "approved" | "rejected";
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
export interface CurrentTimeEntry {
  id: string;
  clockIn: string;
  isWorking: boolean;
}

/** Estadísticas de tiempo trabajado */
export interface TimeStats {
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  averageHoursPerDay: number;
  daysWorkedThisMonth: number;
}
