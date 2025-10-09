/**
 * UTILIDADES COMPARTIDAS PARA RUTAS
 * ==================================
 * 
 * Funciones auxiliares utilizadas en múltiples archivos de rutas.
 */

import { z } from "zod";

/**
 * HELPER PARA MANEJO CONSISTENTE DE ERRORES
 * ==========================================
 * 
 * Maneja errores de manera consistente en todas las rutas.
 * Determina el código de estado HTTP apropiado y formatea el mensaje.
 */
export function handleApiError(res: any, error: unknown, defaultMessage: string) {
  console.error(`${defaultMessage}:`, error);

  // Manejar errores de validación Zod
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Datos inválidos",
      errors: error.errors,
    });
  }

  // Extraer mensaje de error
  const errorMessage = error instanceof Error ? error.message : defaultMessage;

  // Determinar código de estado basado en el mensaje
  let statusCode = 500;
  if (
    errorMessage.includes("no encontrado") ||
    errorMessage.includes("not found")
  ) {
    statusCode = 404;
  } else if (
    errorMessage.includes("ya existe") ||
    errorMessage.includes("duplicado") ||
    errorMessage.includes("duplicate")
  ) {
    statusCode = 409;
  } else if (
    errorMessage.includes("no autorizado") ||
    errorMessage.includes("unauthorized")
  ) {
    statusCode = 401;
  } else if (
    errorMessage.includes("no permitido") ||
    errorMessage.includes("forbidden")
  ) {
    statusCode = 403;
  } else if (
    errorMessage.includes("inválido") ||
    errorMessage.includes("invalid")
  ) {
    statusCode = 400;
  }

  res.status(statusCode).json({ message: errorMessage });
}

/**
 * FUNCIÓN AUXILIAR DE VALIDACIÓN DE HORARIOS DE FICHAJE
 * ====================================================
 * 
 * Permite el fichaje sin restricciones de horario.
 * Los empleados pueden fichar a cualquier hora del día.
 * 
 * @param employeeId - ID del empleado que intenta fichar
 * @param currentTime - Timestamp actual del intento de fichaje
 * @param action - Tipo de acción: "clock-in" (entrada) o "clock-out" (salida)
 * @returns Objeto con resultado de validación (siempre válido)
 */
export async function validateClockingTime(
  employeeId: string,
  currentTime: Date,
  action: "clock-in" | "clock-out",
): Promise<{ isValid: boolean; message: string }> {
  // Permitir fichaje sin restricciones
  return {
    isValid: true,
    message: "",
  };
}
