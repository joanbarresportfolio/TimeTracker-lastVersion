/**
 * SERVICIO DE API PARA APLICACIÓN MÓVIL
 * =====================================
 *
 * Este servicio maneja todas las comunicaciones con el backend del sistema
 * de seguimiento de tiempo. Incluye autenticación, gestión de empleados,
 * fichajes y reportes de incidencias.
 */

import {
  User,
  LoginRequest,
  LoginResponse,
  TimeEntry,
  InsertTimeEntry,
  ScheduledShift,
  DateSchedule,
  Incident,
  InsertIncident,
  TimeStats,
} from "../types/schema";

/**
 * Configuración base de la API
 * Se ajusta automáticamente según la plataforma para funcionar en dispositivos móviles
 */
import { Platform } from "react-native";

// Configurar URL base según la plataforma
const getApiBaseUrl = (): string => {
  // Para web (Expo web), construir URL del backend
  if (Platform.OS === "web") {
    // Verificar si estamos en Replit o desarrollo local
    if (typeof window !== "undefined") {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;

      // Si estamos en desarrollo local (localhost)
      if (hostname === "localhost") {
        console.log("[API Config] Local development - using localhost:5000");
        return "http://localhost:5000/api";
      }

      // Si estamos en Replit (cualquier dominio de replit.dev)
      if (hostname.includes("replit.dev")) {
        // En Replit, el formato del hostname es: {uuid}-00-{instance}.{cluster}.replit.dev:{port}
        // Ejemplo: c01b1921-e768-4ceb-80ea-89c2b2f264d5-00-4yhqgowik164.worf.replit.dev:3003
        // Para el backend en puerto 5000, necesitamos cambiar solo el puerto

        // Extraer las partes del hostname
        const parts = hostname.split(".");
        // parts = ["c01b1921-e768-4ceb-80ea-89c2b2f264d5-00-4yhqgowik164", "worf", "replit", "dev"]
        const cluster = parts[1]; // "worf" (siempre la segunda parte)
        const hostPart = parts[0]; // "c01b1921-e768-4ceb-80ea-89c2b2f264d5-00-4yhqgowik164"

        // Construir URL del backend cambiando el puerto a 5000
        // Replit usa el formato {uuid}-00-{instance}.{cluster}.replit.dev:{port}
        const backendUrl = `${protocol}//${hostPart}.${cluster}.replit.dev:5000/api`;
        console.log("[API Config] Replit mode - backend URL:", backendUrl);
        return backendUrl;
      }

      // Si estamos en repl.co (producción publicada)
      if (hostname.includes("repl.co")) {
        console.log("[API Config] Repl.co mode - using relative path");
        return "/api";
      }
    }

    // Fallback: ruta relativa
    console.log("[API Config] Using relative path /api");
    return "/api";
  }
  // 🚀 NUEVO: Configuración explícita para móviles
  if (Platform.OS === "android" || Platform.OS === "ios") {
    console.log("[API Config] Mobile device detected - using Replit backend");
    return "https://c01b1921-e768-4ceb-80ea-89c2b2f264d5-00-4yhqgowik164.worf.replit.dev:5000/api";
  }
  /*
  if (__DEV__) {
    // En desarrollo, conectar al servidor local en puerto 5000
    if (Platform.OS === "android") {
      // Android emulator necesita 10.0.2.2 para acceder al host
      return "http://10.0.2.2:5000/api";
    } else {
      // iOS simulator puede usar localhost
      return "http://localhost:5000/api";
    }
  } else {
    // En producción, usar URL del servidor local
    return "http://localhost:5000/api";
  }
  */
};
const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = 10000; // 10 segundos

/**
 * Token de autenticación global (se establece después del login)
 */
let authToken: string | null = null;

/**
 * Establece el token de autenticación para las próximas requests
 */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/**
 * Obtiene el token de autenticación actual
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Función helper para hacer requests HTTP con manejo de errores
 */
async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    requireAuth?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, requireAuth = true } = options;

  // Headers base
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Añadir token de autenticación si es requerido
  if (requireAuth && authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  // Crear AbortController para timeout manual (React Native compatible)
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, API_TIMEOUT);

  // Configuración de la request
  const config: RequestInit = {
    method,
    headers,
    signal: abortController.signal,
  };

  // Añadir body si se proporciona
  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, config);

    // Limpiar timeout
    clearTimeout(timeoutId);

    // Verificar si la response es exitosa
    if (!response.ok) {
      let errorMessage = "Error en la solicitud";

      try {
        // Intentar parsear respuesta JSON del servidor
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
      } catch {
        // Si no es JSON, usar mensaje de texto
        try {
          errorMessage = (await response.text()) || errorMessage;
        } catch {
          // Usar mensaje por defecto
        }
      }

      // Añadir código de estado para más contexto
      const statusMessage =
        response.status === 401
          ? "No autorizado"
          : response.status === 403
            ? "Acceso denegado"
            : response.status === 404
              ? "No encontrado"
              : response.status === 500
                ? "Error del servidor"
                : `Error ${response.status}`;

      // Combinar mensaje del servidor con código de estado si no están ya en el mensaje
      if (
        !errorMessage.includes(response.status.toString()) &&
        !errorMessage.includes(statusMessage)
      ) {
        errorMessage = `${statusMessage}: ${errorMessage}`;
      }

      throw new Error(errorMessage);
    }

    // Parsear JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Limpiar timeout en caso de error
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      // Si es error de timeout o red
      if (error.name === "AbortError") {
        throw new Error(
          "La solicitud tardó demasiado. Verifica tu conexión a internet.",
        );
      }

      // Si es error de red (no hay conexión)
      if (
        error.message === "Network request failed" ||
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "No se pudo conectar al servidor. Verifica tu conexión a internet.",
        );
      }

      throw error;
    }

    throw new Error("Error desconocido al comunicarse con el servidor");
  }
}

/**
 * SERVICIOS DE AUTENTICACIÓN
 * ==========================
 */

/**
 * Realiza login del usuario
 */
export async function loginUser(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  try {
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: credentials,
      requireAuth: false,
    });

    // Establecer token automáticamente después del login exitoso
    setAuthToken(response.token);

    return response;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Error al iniciar sesión",
    );
  }
}

/**
 * Cierra sesión del usuario
 */
export async function logoutUser(): Promise<void> {
  // Limpiar token local
  setAuthToken(null);

  try {
    await apiRequest("/auth/logout", {
      method: "POST",
    });
  } catch (error) {
    // No lanzar error si logout del servidor falla
    // El logout local ya se hizo
    console.warn("Error al hacer logout en el servidor:", error);
  }
}

/**
 * Obtiene información del usuario actual
 */
export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

/**
 * SERVICIOS DE FICHAJE (TIME TRACKING)
 * ====================================
 */

/**
 * Obtiene el estado de fichaje actual del empleado
 */
export async function getCurrentTimeEntry(): Promise<TimeEntry | null> {
  try {
    return await apiRequest<TimeEntry>("/time-entries/current");
  } catch (error) {
    // Distinguir entre "no hay entrada hoy" (404) y otros errores
    if (error instanceof Error && error.message.includes("404")) {
      return null; // No hay entrada actual, es válido
    }
    // Re-lanzar otros errores (problemas de red, autenticación, etc.)
    throw error;
  }
}

/**
 * Realiza fichaje de entrada (clock-in)
 */
export async function clockIn(): Promise<void> {
  try {
    await apiRequest("/fichajes", {
      method: "POST",
      body: {
        tipoRegistro: "clock_in",
        origen: "mobile_app",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error al marcar entrada";
    throw new Error(errorMessage);
  }
}

/**
 * Realiza fichaje de salida (clock-out)
 */
export async function clockOut(): Promise<void> {
  try {
    await apiRequest("/fichajes", {
      method: "POST",
      body: {
        tipoRegistro: "clock_out",
        origen: "mobile_app",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error al marcar salida";
    throw new Error(errorMessage);
  }
}

/**
 * Inicia una pausa (break-start)
 */
export async function startBreak(): Promise<void> {
  try {
    await apiRequest("/fichajes", {
      method: "POST",
      body: {
        tipoRegistro: "break_start",
        origen: "mobile_app",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error al iniciar pausa";
    throw new Error(errorMessage);
  }
}

/**
 * Finaliza una pausa (break-end)
 */
export async function endBreak(): Promise<void> {
  try {
    await apiRequest("/fichajes", {
      method: "POST",
      body: {
        tipoRegistro: "break_end",
        origen: "mobile_app",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error al finalizar pausa";
    throw new Error(errorMessage);
  }
}

/**
 * Obtiene registros de tiempo del empleado
 */
export async function getTimeEntries(
  startDate?: string,
  endDate?: string,
): Promise<TimeEntry[]> {
  let endpoint = "/time-entries";
  const params = new URLSearchParams();

  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  return apiRequest<TimeEntry[]>(endpoint);
}

/**
 * SERVICIOS DE HORARIOS
 * =====================
 */

/**
 * Obtiene horarios del empleado actual (legacy - weekly recurring)
 * NOTA: Este endpoint retorna un array vacío ya que el nuevo sistema
 * usa scheduled_shifts en vez de weekly schedules.
 */
export async function getMySchedules(): Promise<ScheduledShift[]> {
  return apiRequest<ScheduledShift[]>("/schedules/my");
}

/**
 * Obtiene horarios por fecha específica del empleado actual
 * El backend filtra automáticamente por el usuario autenticado si es employee
 */
export async function getMyDateSchedules(
  startDate?: string,
  endDate?: string,
): Promise<DateSchedule[]> {
  let endpoint = "/date-schedules";
  const params = new URLSearchParams();

  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  try {
    return await apiRequest<DateSchedule[]>(endpoint);
  } catch (error) {
    console.error("Error fetching date schedules:", error);
    throw new Error(
      error instanceof Error ? error.message : "Error al cargar horarios",
    );
  }
}

/**
 * SERVICIOS DE INCIDENCIAS
 * ========================
 */

/**
 * Obtiene incidencias del empleado actual
 */
export async function getMyIncidents(): Promise<Incident[]> {
  return apiRequest<Incident[]>("/incidents");
}

/**
 * Crea una nueva incidencia
 */
export async function createIncident(
  incident: InsertIncident,
): Promise<Incident> {
  return apiRequest<Incident>("/incidents", {
    method: "POST",
    body: incident,
  });
}

/**
 * SERVICIOS DE ESTADÍSTICAS
 * =========================
 */

/**
 * Obtiene estadísticas de tiempo del empleado
 */
export async function getTimeStats(): Promise<TimeStats> {
  // Esta función calcula estadísticas basadas en los registros de tiempo
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Obtener registros de los últimos 30 días
  const timeEntries = await getTimeEntries(
    thirtyDaysAgo.toISOString().split("T")[0],
    new Date().toISOString().split("T")[0],
  );

  // Filtrar entradas de esta semana
  const thisWeekEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= sevenDaysAgo;
  });

  // Calcular estadísticas
  // NOTA: totalHours en la DB está en minutos, por eso dividimos por 60
  const totalMinutesThisWeek = thisWeekEntries.reduce((sum, entry) => {
    return sum + (entry.totalHours || 0);
  }, 0);

  const totalMinutesThisMonth = timeEntries.reduce((sum, entry) => {
    return sum + (entry.totalHours || 0);
  }, 0);

  const daysWorkedThisMonth = timeEntries.filter(
    (entry) => entry.totalHours && entry.totalHours > 0,
  ).length;

  return {
    totalHoursThisWeek: Math.round((totalMinutesThisWeek / 60) * 100) / 100,
    totalHoursThisMonth: Math.round((totalMinutesThisMonth / 60) * 100) / 100,
    averageHoursPerDay:
      daysWorkedThisMonth > 0
        ? Math.round((totalMinutesThisMonth / 60 / daysWorkedThisMonth) * 100) /
          100
        : 0,
    daysWorkedThisMonth,
  };
}

/**
 * UTILIDADES
 * ==========
 */

/**
 * Verifica si hay conexión con el servidor
 */
export async function checkServerConnection(): Promise<boolean> {
  try {
    // Crear AbortController para timeout manual (React Native compatible)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 5000);

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
