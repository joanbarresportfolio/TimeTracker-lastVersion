/**
 * TIPOS PARA APLICACIÓN MÓVIL
 * ===========================
 * 
 * Definiciones de tipos para la aplicación móvil que corresponden
 * a las mismas estructuras de datos del backend.
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
  department: string;
  position: string;
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
}

/** Tipo para datos de login */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * TIPOS DE REGISTROS DE TIEMPO
 * ============================
 */

/** Tipo completo de registro de tiempo */
export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string; // El servidor envía ISO string, no Date
  clockOut?: string | null; // El servidor envía ISO string, no Date
  totalHours?: number | null;
  date: string;
}

/** Tipo para crear nuevo registro de tiempo */
export interface InsertTimeEntry {
  employeeId: string;
  clockIn: string; // Enviamos ISO string al servidor
  clockOut?: string | null; // Enviamos ISO string al servidor
  date: string;
}

/**
 * TIPOS DE HORARIOS
 * =================
 */

/** Tipo completo de horario (legacy - weekly recurring) */
export interface Schedule {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/** Tipo completo de horario por fecha específica */
export interface DateSchedule {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD format
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/**
 * TIPOS DE INCIDENCIAS
 * ====================
 */

/** Tipo completo de incidencia */
export interface Incident {
  id: string;
  employeeId: string;
  type: "late" | "absence" | "early_departure" | "forgot_clock_in" | "forgot_clock_out";
  description: string;
  date: string; // El servidor envía ISO string, no Date
  status: "pending" | "approved" | "rejected";
  createdAt: string; // El servidor envía ISO string, no Date
}

/** Tipo para crear nueva incidencia */
export interface InsertIncident {
  employeeId: string;
  type: "late" | "absence" | "early_departure" | "forgot_clock_in" | "forgot_clock_out";
  description: string;
  date: string; // Enviamos ISO string al servidor
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