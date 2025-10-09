/**
 * SCHEDULE SERVICE - LÓGICA DE NEGOCIO DE HORARIOS
 * =================================================
 * 
 * Maneja toda la lógica de negocio relacionada con horarios y turnos.
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import type { Schedule } from "@shared/schema";

export interface DateRangeValidation {
  isValid: boolean;
  message: string;
}

export interface ScheduleConflict {
  hasConflict: boolean;
  conflictingSchedules: Schedule[];
  message: string;
}

export class ScheduleService {
  /**
   * VALIDAR RANGO DE FECHAS
   * ========================
   * 
   * Valida que el rango de fechas sea correcto.
   * 
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Resultado de validación
   */
  validateDateRange(startDate: string, endDate: string): DateRangeValidation {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        isValid: false,
        message: "Formato de fecha inválido"
      };
    }

    if (end < start) {
      return {
        isValid: false,
        message: "La fecha de fin debe ser posterior a la fecha de inicio"
      };
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 365) {
      return {
        isValid: false,
        message: "El rango de fechas no puede exceder 1 año"
      };
    }

    return {
      isValid: true,
      message: "Rango de fechas válido"
    };
  }

  /**
   * DETECTAR CONFLICTOS DE HORARIOS
   * ================================
   * 
   * Detecta si hay conflictos entre horarios del mismo empleado.
   * Un conflicto ocurre cuando hay múltiples horarios en la misma fecha.
   * 
   * @param newSchedule - Nuevo horario a verificar
   * @param existingSchedules - Horarios existentes del empleado
   * @returns Información sobre conflictos
   */
  detectScheduleConflicts(
    newSchedule: { employeeId: string; date: string },
    existingSchedules: Schedule[]
  ): ScheduleConflict {
    const conflicting = existingSchedules.filter(
      schedule => 
        schedule.employeeId === newSchedule.employeeId &&
        schedule.date === newSchedule.date
    );

    if (conflicting.length > 0) {
      return {
        hasConflict: true,
        conflictingSchedules: conflicting,
        message: `Ya existe un horario para el empleado ${newSchedule.employeeId} en la fecha ${newSchedule.date}`
      };
    }

    return {
      hasConflict: false,
      conflictingSchedules: [],
      message: "No hay conflictos"
    };
  }

  /**
   * VALIDAR HORARIO
   * ===============
   * 
   * Valida que los datos de un horario sean correctos.
   * 
   * @param startTime - Hora de inicio (HH:MM)
   * @param endTime - Hora de fin (HH:MM)
   * @returns Resultado de validación
   */
  validateScheduleTime(
    startTime: string,
    endTime: string
  ): { isValid: boolean; message: string } {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return {
        isValid: false,
        message: "Formato de hora inválido. Use HH:MM"
      };
    }

    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      return {
        isValid: false,
        message: "La hora de fin debe ser posterior a la hora de inicio"
      };
    }

    const durationMinutes = endMinutes - startMinutes;

    if (durationMinutes > 12 * 60) {
      return {
        isValid: false,
        message: "La jornada no puede exceder 12 horas"
      };
    }

    if (durationMinutes < 30) {
      return {
        isValid: false,
        message: "La jornada debe ser de al menos 30 minutos"
      };
    }

    return {
      isValid: true,
      message: "Horario válido"
    };
  }

  /**
   * CALCULAR HORAS TOTALES DE UN HORARIO
   * =====================================
   * 
   * Calcula las horas totales de un horario.
   * 
   * @param startTime - Hora de inicio (HH:MM)
   * @param endTime - Hora de fin (HH:MM)
   * @returns Total de minutos del horario
   */
  calculateScheduleHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }

  /**
   * GENERAR HORARIOS PARA RANGO DE FECHAS
   * ======================================
   * 
   * Genera datos de horarios para un rango de fechas.
   * Útil para crear horarios recurrentes.
   * 
   * @param employeeId - ID del empleado
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @param startTime - Hora de inicio
   * @param endTime - Hora de fin
   * @param excludeWeekends - Excluir sábados y domingos
   * @returns Array de datos de horarios
   */
  generateSchedulesForDateRange(
    employeeId: string,
    startDate: string,
    endDate: string,
    startTime: string,
    endTime: string,
    excludeWeekends: boolean = true
  ): Array<{
    employeeId: string;
    date: string;
    expectedStartTime: string;
    expectedEndTime: string;
    status: "scheduled";
  }> {
    const schedules: Array<{
      employeeId: string;
      date: string;
      expectedStartTime: string;
      expectedEndTime: string;
      status: "scheduled";
    }> = [];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      
      if (!excludeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        schedules.push({
          employeeId,
          date: current.toISOString().split('T')[0],
          expectedStartTime: startTime,
          expectedEndTime: endTime,
          status: "scheduled"
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return schedules;
  }

  /**
   * COPIAR HORARIOS A OTRO AÑO
   * ===========================
   * 
   * Genera horarios para un nuevo año basándose en horarios existentes.
   * 
   * @param existingSchedules - Horarios del año anterior
   * @param targetYear - Año destino
   * @returns Nuevos horarios para el año destino
   */
  copySchedulesToYear(
    existingSchedules: Schedule[],
    targetYear: number
  ): Array<{
    employeeId: string;
    date: string;
    expectedStartTime: string;
    expectedEndTime: string;
    status: "scheduled";
  }> {
    return existingSchedules.map(schedule => {
      const originalDate = new Date(schedule.date);
      const newDate = new Date(targetYear, originalDate.getMonth(), originalDate.getDate());

      return {
        employeeId: schedule.employeeId,
        date: newDate.toISOString().split('T')[0],
        expectedStartTime: schedule.expectedStartTime,
        expectedEndTime: schedule.expectedEndTime,
        status: "scheduled" as const
      };
    });
  }

  /**
   * CALCULAR TOTAL DE HORAS PROGRAMADAS POR PERÍODO
   * ================================================
   * 
   * Calcula el total de horas programadas en un período.
   * 
   * @param schedules - Array de horarios
   * @returns Total de minutos programados
   */
  calculateTotalScheduledHours(schedules: Schedule[]): number {
    return schedules.reduce((total, schedule) => {
      if (schedule.expectedStartTime && schedule.expectedEndTime) {
        const hours = this.calculateScheduleHours(
          schedule.expectedStartTime,
          schedule.expectedEndTime
        );
        return total + hours;
      }
      return total;
    }, 0);
  }

  /**
   * AGRUPAR HORARIOS POR EMPLEADO
   * ==============================
   * 
   * Agrupa horarios por empleado.
   * 
   * @param schedules - Array de horarios
   * @returns Map con horarios agrupados por empleado
   */
  groupSchedulesByEmployee(schedules: Schedule[]): Map<string, Schedule[]> {
    const grouped = new Map<string, Schedule[]>();

    for (const schedule of schedules) {
      const existing = grouped.get(schedule.employeeId) || [];
      existing.push(schedule);
      grouped.set(schedule.employeeId, existing);
    }

    return grouped;
  }

  /**
   * VERIFICAR HORARIO EN FECHA
   * ==========================
   * 
   * Verifica si un empleado tiene horario programado en una fecha.
   * 
   * @param employeeId - ID del empleado
   * @param date - Fecha a verificar
   * @param schedules - Horarios existentes
   * @returns true si hay horario programado
   */
  hasScheduleOnDate(
    employeeId: string,
    date: string,
    schedules: Schedule[]
  ): boolean {
    return schedules.some(
      schedule => 
        schedule.employeeId === employeeId && 
        schedule.date === date
    );
  }

  /**
   * OBTENER HORARIO DE FECHA
   * =========================
   * 
   * Obtiene el horario programado para una fecha específica.
   * 
   * @param employeeId - ID del empleado
   * @param date - Fecha
   * @param schedules - Horarios existentes
   * @returns Horario encontrado o undefined
   */
  getScheduleForDate(
    employeeId: string,
    date: string,
    schedules: Schedule[]
  ): Schedule | undefined {
    return schedules.find(
      schedule => 
        schedule.employeeId === employeeId && 
        schedule.date === date
    );
  }

  /**
   * FORMATEAR HORARIO
   * =================
   * 
   * Formatea un horario en texto legible.
   * 
   * @param startTime - Hora de inicio
   * @param endTime - Hora de fin
   * @returns String formateado (ej: "09:00 - 17:00")
   */
  formatSchedule(startTime: string, endTime: string): string {
    return `${startTime} - ${endTime}`;
  }
}

export const scheduleService = new ScheduleService();
