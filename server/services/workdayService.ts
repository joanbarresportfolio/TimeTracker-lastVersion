/**
 * WORKDAY SERVICE - LÓGICA DE NEGOCIO DE JORNADAS LABORALES
 * ==========================================================
 * 
 * Maneja toda la lógica de negocio relacionada con jornadas diarias.
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import type { ClockEntry, DailyWorkday, Schedule } from "@shared/schema";

export interface WorkdayCalculation {
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  status: "open" | "closed";
  startTime: Date | null;
  endTime: Date | null;
}

export interface WorkdayConsolidation {
  date: string;
  employeeId: string;
  shiftId: string | null;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  status: "open" | "closed";
  startTime: Date | null;
  endTime: Date | null;
}

export class WorkdayService {
  /**
   * CALCULAR MINUTOS TRABAJADOS
   * ============================
   * 
   * Calcula los minutos trabajados desde los fichajes.
   * Solo cuenta tiempo entre clock_in y clock_out.
   * 
   * @param clockEntries - Array de fichajes ordenados por timestamp
   * @returns Total de minutos trabajados
   */
  calculateWorkedMinutes(clockEntries: ClockEntry[]): number {
    let totalMinutes = 0;
    let lastClockIn: Date | null = null;

    for (const entry of clockEntries) {
      if (entry.entryType === "clock_in") {
        lastClockIn = entry.timestamp;
      } else if (entry.entryType === "clock_out" && lastClockIn) {
        const minutes = Math.floor(
          (entry.timestamp.getTime() - lastClockIn.getTime()) / 60000
        );
        totalMinutes += minutes;
        lastClockIn = null;
      }
    }

    return totalMinutes;
  }

  /**
   * CALCULAR MINUTOS DE PAUSA
   * =========================
   * 
   * Calcula los minutos totales de pausas.
   * 
   * @param clockEntries - Array de fichajes ordenados por timestamp
   * @returns Total de minutos de pausa
   */
  calculateBreakMinutes(clockEntries: ClockEntry[]): number {
    let totalMinutes = 0;
    let lastBreakStart: Date | null = null;

    for (const entry of clockEntries) {
      if (entry.entryType === "break_start") {
        lastBreakStart = entry.timestamp;
      } else if (entry.entryType === "break_end" && lastBreakStart) {
        const minutes = Math.floor(
          (entry.timestamp.getTime() - lastBreakStart.getTime()) / 60000
        );
        totalMinutes += minutes;
        lastBreakStart = null;
      }
    }

    return totalMinutes;
  }

  /**
   * CALCULAR HORAS EXTRAS
   * =====================
   * 
   * Calcula las horas extras basadas en el horario programado.
   * 
   * @param workedMinutes - Minutos trabajados
   * @param scheduledShift - Horario programado (opcional)
   * @returns Minutos de horas extras
   */
  calculateOvertimeMinutes(
    workedMinutes: number,
    scheduledShift?: Schedule
  ): number {
    if (!scheduledShift || !scheduledShift.startTime || !scheduledShift.endTime) {
      return 0;
    }

    const [startHour, startMin] = scheduledShift.startTime
      .split(":")
      .map(Number);
    const [endHour, endMin] = scheduledShift.endTime
      .split(":")
      .map(Number);
    
    const scheduledMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    const overtime = workedMinutes - scheduledMinutes;
    
    return overtime > 0 ? overtime : 0;
  }

  /**
   * DETERMINAR ESTADO DE LA JORNADA
   * ================================
   * 
   * Determina si la jornada está abierta o cerrada.
   * 
   * @param clockEntries - Array de fichajes del día
   * @returns "open" si hay clock_in sin clock_out, "closed" si está completa
   */
  determineWorkdayStatus(clockEntries: ClockEntry[]): "open" | "closed" {
    if (clockEntries.length === 0) {
      return "open";
    }

    const lastEntry = clockEntries[clockEntries.length - 1];
    
    return lastEntry.entryType === "clock_out" ? "closed" : "open";
  }

  /**
   * CONSOLIDAR FICHAJES EN JORNADA
   * ===============================
   * 
   * Consolida múltiples fichajes en un resumen de jornada diaria.
   * 
   * @param employeeId - ID del empleado
   * @param date - Fecha de la jornada
   * @param clockEntries - Fichajes del día
   * @param scheduledShift - Horario programado (opcional)
   * @returns Datos consolidados de la jornada
   */
  consolidateClockEntries(
    employeeId: string,
    date: string,
    clockEntries: ClockEntry[],
    scheduledShift?: Schedule
  ): WorkdayConsolidation {
    const workedMinutes = this.calculateWorkedMinutes(clockEntries);
    const breakMinutes = this.calculateBreakMinutes(clockEntries);
    const overtimeMinutes = this.calculateOvertimeMinutes(
      workedMinutes,
      scheduledShift
    );
    const status = this.determineWorkdayStatus(clockEntries);

    const clockInEntry = clockEntries.find(e => e.entryType === "clock_in");
    const clockOutEntries = clockEntries.filter(e => e.entryType === "clock_out");
    const lastClockOut = clockOutEntries[clockOutEntries.length - 1];

    return {
      date,
      employeeId,
      shiftId: scheduledShift?.id || null,
      workedMinutes,
      breakMinutes,
      overtimeMinutes,
      status,
      startTime: clockInEntry?.timestamp || null,
      endTime: lastClockOut?.timestamp || null
    };
  }

  /**
   * CALCULAR JORNADA COMPLETA
   * =========================
   * 
   * Calcula todos los valores de una jornada desde los fichajes.
   * 
   * @param clockEntries - Fichajes del día ordenados
   * @param scheduledShift - Horario programado (opcional)
   * @returns Cálculo completo de la jornada
   */
  calculateFullWorkday(
    clockEntries: ClockEntry[],
    scheduledShift?: Schedule
  ): WorkdayCalculation {
    const workedMinutes = this.calculateWorkedMinutes(clockEntries);
    const breakMinutes = this.calculateBreakMinutes(clockEntries);
    const overtimeMinutes = this.calculateOvertimeMinutes(
      workedMinutes,
      scheduledShift
    );
    const status = this.determineWorkdayStatus(clockEntries);

    const clockInEntry = clockEntries.find(e => e.entryType === "clock_in");
    const clockOutEntries = clockEntries.filter(e => e.entryType === "clock_out");
    const lastClockOut = clockOutEntries[clockOutEntries.length - 1];

    return {
      workedMinutes,
      breakMinutes,
      overtimeMinutes,
      status,
      startTime: clockInEntry?.timestamp || null,
      endTime: lastClockOut?.timestamp || null
    };
  }

  /**
   * VALIDAR JORNADA MANUAL
   * ======================
   * 
   * Valida que los datos de una jornada manual sean correctos.
   * 
   * @param startTime - Hora de inicio
   * @param endTime - Hora de fin
   * @param breakMinutes - Minutos de pausa
   * @returns Objeto con resultado de validación
   */
  validateManualWorkday(
    startTime: string,
    endTime: string,
    breakMinutes: number
  ): { isValid: boolean; message: string } {
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

    const totalMinutes = endMinutes - startMinutes;

    if (breakMinutes < 0) {
      return {
        isValid: false,
        message: "Los minutos de pausa no pueden ser negativos"
      };
    }

    if (breakMinutes >= totalMinutes) {
      return {
        isValid: false,
        message: "Los minutos de pausa no pueden ser mayores o iguales al total de la jornada"
      };
    }

    return {
      isValid: true,
      message: "Jornada manual válida"
    };
  }

  /**
   * CALCULAR MINUTOS TRABAJADOS DE JORNADA MANUAL
   * ==============================================
   * 
   * Calcula los minutos trabajados de una jornada manual.
   * 
   * @param startTime - Hora de inicio (HH:MM)
   * @param endTime - Hora de fin (HH:MM)
   * @param breakMinutes - Minutos de pausa
   * @returns Minutos trabajados netos
   */
  calculateManualWorkdayMinutes(
    startTime: string,
    endTime: string,
    breakMinutes: number
  ): number {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;

    return totalMinutes - breakMinutes;
  }

  /**
   * BUSCAR O INDICAR CREACIÓN DE WORKDAY
   * =====================================
   * 
   * Verifica si existe un workday para un usuario en una fecha.
   * Esta es una función de utilidad para determinar si se necesita crear uno.
   * 
   * @param idUser - ID del usuario
   * @param date - Fecha en formato YYYY-MM-DD
   * @param existingWorkdays - Workdays existentes
   * @returns Workday encontrado o null si debe crearse uno nuevo
   */
  findWorkdayByUserAndDate(
    idUser: string,
    date: string,
    existingWorkdays: DailyWorkday[]
  ): DailyWorkday | null {
    return existingWorkdays.find(
      wd => wd.idUser === idUser && wd.date === date
    ) || null;
  }

  /**
   * COMPARAR CON HORARIO PROGRAMADO
   * ================================
   * 
   * Compara la jornada real con el horario programado.
   * Usa la fecha del workday para buscar el horario correspondiente.
   * 
   * @param workday - Jornada trabajada
   * @param schedules - Horarios disponibles
   * @param clockEntries - Fichajes del día
   * @returns Análisis de diferencias
   */
  compareWithSchedule(
    workday: DailyWorkday,
    schedules: Schedule[],
    clockEntries?: ClockEntry[]
  ): {
    isOnTime: boolean;
    minutesDifference: number;
    startedEarly: boolean;
    finishedLate: boolean;
  } {
    const scheduledShift = schedules.find(
      s => s.idUser === workday.idUser && s.date === workday.date
    );

    if (!scheduledShift || !clockEntries || clockEntries.length === 0) {
      return {
        isOnTime: true,
        minutesDifference: 0,
        startedEarly: false,
        finishedLate: false
      };
    }

    const [expectedStartHour, expectedStartMin] = scheduledShift.startTime
      .split(":")
      .map(Number);
    const [expectedEndHour, expectedEndMin] = scheduledShift.endTime
      .split(":")
      .map(Number);

    const clockInEntry = clockEntries.find(e => e.entryType === "clock_in");
    const clockOutEntry = clockEntries.filter(e => e.entryType === "clock_out").pop();

    if (!clockInEntry) {
      return {
        isOnTime: false,
        minutesDifference: 0,
        startedEarly: false,
        finishedLate: false
      };
    }

    const actualStart = clockInEntry.timestamp.getHours() * 60 + clockInEntry.timestamp.getMinutes();
    const actualEnd = clockOutEntry ? clockOutEntry.timestamp.getHours() * 60 + clockOutEntry.timestamp.getMinutes() : 0;
    const expectedStart = expectedStartHour * 60 + expectedStartMin;
    const expectedEnd = expectedEndHour * 60 + expectedEndMin;

    const startDifference = actualStart - expectedStart;
    const endDifference = actualEnd - expectedEnd;

    return {
      isOnTime: Math.abs(startDifference) <= 15 && Math.abs(endDifference) <= 15,
      minutesDifference: Math.abs(startDifference) + Math.abs(endDifference),
      startedEarly: startDifference < -15,
      finishedLate: endDifference > 15
    };
  }

  /**
   * CALCULAR TOTAL DE HORAS POR PERÍODO
   * ====================================
   * 
   * Calcula el total de horas trabajadas en un período.
   * 
   * @param workdays - Array de jornadas
   * @returns Total de minutos trabajados
   */
  calculateTotalHoursForPeriod(workdays: DailyWorkday[]): number {
    return workdays.reduce((total, workday) => {
      return total + (workday.workedMinutes || 0);
    }, 0);
  }

  /**
   * CALCULAR PROMEDIO DE HORAS DIARIAS
   * ===================================
   * 
   * Calcula el promedio de horas trabajadas por día.
   * 
   * @param workdays - Array de jornadas
   * @returns Promedio de minutos por día
   */
  calculateAverageDailyHours(workdays: DailyWorkday[]): number {
    if (workdays.length === 0) return 0;
    
    const total = this.calculateTotalHoursForPeriod(workdays);
    return Math.floor(total / workdays.length);
  }

  /**
   * FORMATEAR MINUTOS A HORAS
   * =========================
   * 
   * Convierte minutos a formato HH:MM.
   * 
   * @param minutes - Total de minutos
   * @returns String formateado
   */
  formatMinutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}

export const workdayService = new WorkdayService();
