/**
 * CLOCK SERVICE - LÓGICA DE NEGOCIO DE FICHAJES
 * ==============================================
 * 
 * Maneja toda la lógica de negocio relacionada con fichajes (clock entries).
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import type { ClockEntry } from "@shared/schema";

export type ClockEntryType = "clock_in" | "clock_out" | "break_start" | "break_end";

export interface ClockValidationResult {
  isValid: boolean;
  message: string;
}

export interface WorkedHoursCalculation {
  totalMinutes: number;
  hours: number;
  minutes: number;
}

export interface BreakTimeCalculation {
  totalMinutes: number;
  hours: number;
  minutes: number;
}

export class ClockService {
  /**
   * VALIDAR TIMESTAMP DE FICHAJE
   * =============================
   * 
   * Valida que el timestamp del fichaje sea correcto.
   * 
   * @param timestamp - Timestamp del fichaje
   * @returns Resultado de la validación
   */
  validateTimestamp(timestamp: Date): ClockValidationResult {
    const now = new Date();
    
    if (timestamp > now) {
      return {
        isValid: false,
        message: "No se puede fichar con una fecha futura"
      };
    }

    const daysDifference = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysDifference > 7) {
      return {
        isValid: false,
        message: "No se pueden crear fichajes con más de 7 días de antigüedad"
      };
    }

    return {
      isValid: true,
      message: "Timestamp válido"
    };
  }

  /**
   * DETECTAR FICHAJE DUPLICADO
   * ===========================
   * 
   * Detecta si ya existe un fichaje del mismo tipo en el mismo día.
   * 
   * @param entryType - Tipo de fichaje
   * @param date - Fecha del fichaje
   * @param existingEntries - Fichajes existentes del empleado
   * @returns true si hay duplicado
   */
  hasDuplicateEntry(
    entryType: ClockEntryType,
    date: string,
    existingEntries: ClockEntry[]
  ): boolean {
    return existingEntries.some(entry => {
      const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
      return entryDate === date && entry.entryType === entryType;
    });
  }

  /**
   * VALIDAR TRANSICIÓN DE ESTADO
   * =============================
   * 
   * Valida que la transición de estado sea correcta.
   * Secuencia válida: clock_in → break_start → break_end → clock_out
   * 
   * @param newEntryType - Tipo de nuevo fichaje
   * @param existingEntries - Fichajes existentes del día
   * @returns Resultado de la validación
   */
  validateStateTransition(
    newEntryType: ClockEntryType,
    existingEntries: ClockEntry[]
  ): ClockValidationResult {
    const lastEntry = existingEntries[existingEntries.length - 1];

    if (!lastEntry) {
      if (newEntryType !== "clock_in") {
        return {
          isValid: false,
          message: "El primer fichaje del día debe ser clock_in"
        };
      }
      return { isValid: true, message: "Primera entrada válida" };
    }

    const validTransitions: Record<ClockEntryType, ClockEntryType[]> = {
      clock_in: ["break_start", "clock_out"],
      break_start: ["break_end"],
      break_end: ["break_start", "clock_out"],
      clock_out: []
    };

    const allowedNext = validTransitions[lastEntry.entryType] || [];

    if (!allowedNext.includes(newEntryType)) {
      return {
        isValid: false,
        message: `No se puede hacer ${newEntryType} después de ${lastEntry.entryType}`
      };
    }

    return {
      isValid: true,
      message: "Transición válida"
    };
  }

  /**
   * CALCULAR HORAS TRABAJADAS
   * ==========================
   * 
   * Calcula las horas trabajadas totales desde los fichajes.
   * Solo cuenta tiempo entre clock_in y clock_out, excluyendo pausas.
   * 
   * @param clockEntries - Array de fichajes ordenados por timestamp
   * @returns Cálculo de horas trabajadas
   */
  calculateWorkedHours(clockEntries: ClockEntry[]): WorkedHoursCalculation {
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

    return {
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }

  /**
   * CALCULAR TIEMPO DE PAUSAS
   * ==========================
   * 
   * Calcula el tiempo total de pausas/breaks.
   * 
   * @param clockEntries - Array de fichajes ordenados por timestamp
   * @returns Cálculo de tiempo de pausas
   */
  calculateBreakTime(clockEntries: ClockEntry[]): BreakTimeCalculation {
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

    return {
      totalMinutes,
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  }

  /**
   * VALIDAR CLOCK-IN
   * ================
   * 
   * Valida que se pueda hacer un clock-in.
   * 
   * @param timestamp - Timestamp del fichaje
   * @param existingEntries - Fichajes existentes del día
   * @returns Resultado de la validación
   */
  validateClockIn(
    timestamp: Date,
    existingEntries: ClockEntry[]
  ): ClockValidationResult {
    const timestampValidation = this.validateTimestamp(timestamp);
    if (!timestampValidation.isValid) {
      return timestampValidation;
    }

    const date = timestamp.toISOString().split('T')[0];
    
    if (this.hasDuplicateEntry("clock_in", date, existingEntries)) {
      return {
        isValid: false,
        message: "Ya existe un clock-in para este día"
      };
    }

    const transitionValidation = this.validateStateTransition(
      "clock_in",
      existingEntries.filter(e => {
        const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
        return entryDate === date;
      })
    );

    return transitionValidation;
  }

  /**
   * VALIDAR CLOCK-OUT
   * =================
   * 
   * Valida que se pueda hacer un clock-out.
   * 
   * @param timestamp - Timestamp del fichaje
   * @param existingEntries - Fichajes existentes del día
   * @returns Resultado de la validación
   */
  validateClockOut(
    timestamp: Date,
    existingEntries: ClockEntry[]
  ): ClockValidationResult {
    const timestampValidation = this.validateTimestamp(timestamp);
    if (!timestampValidation.isValid) {
      return timestampValidation;
    }

    const date = timestamp.toISOString().split('T')[0];
    const dayEntries = existingEntries.filter(e => {
      const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
      return entryDate === date;
    });

    if (dayEntries.length === 0) {
      return {
        isValid: false,
        message: "No hay clock-in registrado para este día"
      };
    }

    const transitionValidation = this.validateStateTransition(
      "clock_out",
      dayEntries
    );

    return transitionValidation;
  }

  /**
   * VALIDAR INICIO DE PAUSA
   * =======================
   * 
   * Valida que se pueda iniciar una pausa.
   * 
   * @param timestamp - Timestamp del fichaje
   * @param existingEntries - Fichajes existentes del día
   * @returns Resultado de la validación
   */
  validateBreakStart(
    timestamp: Date,
    existingEntries: ClockEntry[]
  ): ClockValidationResult {
    const timestampValidation = this.validateTimestamp(timestamp);
    if (!timestampValidation.isValid) {
      return timestampValidation;
    }

    const date = timestamp.toISOString().split('T')[0];
    const dayEntries = existingEntries.filter(e => {
      const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
      return entryDate === date;
    });

    const transitionValidation = this.validateStateTransition(
      "break_start",
      dayEntries
    );

    return transitionValidation;
  }

  /**
   * VALIDAR FIN DE PAUSA
   * ====================
   * 
   * Valida que se pueda finalizar una pausa.
   * 
   * @param timestamp - Timestamp del fichaje
   * @param existingEntries - Fichajes existentes del día
   * @returns Resultado de la validación
   */
  validateBreakEnd(
    timestamp: Date,
    existingEntries: ClockEntry[]
  ): ClockValidationResult {
    const timestampValidation = this.validateTimestamp(timestamp);
    if (!timestampValidation.isValid) {
      return timestampValidation;
    }

    const date = timestamp.toISOString().split('T')[0];
    const dayEntries = existingEntries.filter(e => {
      const entryDate = new Date(e.timestamp).toISOString().split('T')[0];
      return entryDate === date;
    });

    const transitionValidation = this.validateStateTransition(
      "break_end",
      dayEntries
    );

    return transitionValidation;
  }

  /**
   * OBTENER ESTADO ACTUAL DEL DÍA
   * ==============================
   * 
   * Determina el estado actual basado en los fichajes del día.
   * 
   * @param entries - Fichajes del día ordenados por timestamp
   * @returns Estado actual: 'not_started' | 'working' | 'on_break' | 'finished'
   */
  getCurrentDayStatus(
    entries: ClockEntry[]
  ): "not_started" | "working" | "on_break" | "finished" {
    if (entries.length === 0) {
      return "not_started";
    }

    const lastEntry = entries[entries.length - 1];

    switch (lastEntry.entryType) {
      case "clock_in":
        return "working";
      case "break_start":
        return "on_break";
      case "break_end":
        return "working";
      case "clock_out":
        return "finished";
      default:
        return "not_started";
    }
  }

  /**
   * EXTRAER HORARIOS DE INICIO Y FIN
   * =================================
   * 
   * Extrae el primer clock_in y último clock_out del día.
   * 
   * @param entries - Fichajes del día ordenados por timestamp
   * @returns Objeto con startTime y endTime (null si no aplicable)
   */
  extractStartAndEndTimes(
    entries: ClockEntry[]
  ): { startTime: Date | null; endTime: Date | null } {
    const clockInEntry = entries.find(e => e.entryType === "clock_in");
    const clockOutEntries = entries.filter(e => e.entryType === "clock_out");
    const lastClockOut = clockOutEntries[clockOutEntries.length - 1];

    return {
      startTime: clockInEntry?.timestamp || null,
      endTime: lastClockOut?.timestamp || null
    };
  }

  /**
   * FORMATEAR DURACIÓN
   * ==================
   * 
   * Formatea minutos en formato HH:MM.
   * 
   * @param totalMinutes - Total de minutos
   * @returns String formateado (ej: "08:30")
   */
  formatDuration(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}

export const clockService = new ClockService();
