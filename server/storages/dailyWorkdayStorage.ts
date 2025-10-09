import { 
  type DailyWorkday, 
  type TimeEntry, 
  type BreakEntry,
  dailyWorkday,
  clockEntries,
  schedules,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";

/**
 * DAILY WORKDAY STORAGE MODULE
 * ============================
 * 
 * Módulo de almacenamiento para operaciones relacionadas con jornadas diarias.
 */

/**
 * OBTENER PAUSAS DE UN DÍA ESPECÍFICO
 */
async function getBreaksForDay(employeeId: string, date: string): Promise<BreakEntry[]> {
  const entries = await db
    .select()
    .from(clockEntries)
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${date} AND ${clockEntries.employeeId} = ${employeeId} AND (${clockEntries.entryType} = 'break_start' OR ${clockEntries.entryType} = 'break_end')`
    )
    .orderBy(clockEntries.timestamp);

  const breaks: BreakEntry[] = [];
  let currentBreakStart: Date | null = null;

  for (const entry of entries) {
    if (entry.entryType === 'break_start') {
      currentBreakStart = entry.timestamp;
    } else if (entry.entryType === 'break_end' && currentBreakStart) {
      breaks.push({
        start: currentBreakStart,
        end: entry.timestamp,
      });
      currentBreakStart = null;
    }
  }

  // Si hay un break_start sin break_end correspondiente
  if (currentBreakStart) {
    breaks.push({
      start: currentBreakStart,
      end: null,
    });
  }

  return breaks;
}

/**
 * OBTENER JORNADA LABORAL POR EMPLEADO Y FECHA
 */
export async function getDailyWorkdayByEmployeeAndDate(employeeId: string, date: string): Promise<DailyWorkday | undefined> {
  const [workday] = await db
    .select()
    .from(dailyWorkday)
    .where(
      and(
        eq(dailyWorkday.employeeId, employeeId),
        eq(dailyWorkday.date, date)
      )
    );
  return workday;
}

/**
 * OBTENER JORNADAS LABORALES POR EMPLEADO Y RANGO
 */
export async function getDailyWorkdaysByEmployeeAndRange(employeeId: string, startDate: string, endDate: string): Promise<DailyWorkday[]> {
  return await db
    .select()
    .from(dailyWorkday)
    .where(
      and(
        eq(dailyWorkday.employeeId, employeeId),
        sql`${dailyWorkday.date} >= ${startDate} AND ${dailyWorkday.date} <= ${endDate}`
      )
    );
}

/**
 * CREAR JORNADA LABORAL MANUAL
 */
export async function createManualDailyWorkday(data: { 
  employeeId: string; 
  date: string; 
  startTime: string; 
  endTime: string; 
  breakMinutes: number 
}): Promise<DailyWorkday> {
  // Verificar si ya existen clock_entries para este día
  const hasEntries = await hasClockEntriesForDate(data.employeeId, data.date);
  if (hasEntries) {
    throw new Error('Ya existen registros de fichaje para este día. No se puede crear una jornada manual.');
  }

  // Calcular minutos trabajados
  const [startHour, startMin] = data.startTime.split(':').map(Number);
  const [endHour, endMin] = data.endTime.split(':').map(Number);
  const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  const workedMinutes = totalMinutes - data.breakMinutes;

  // Buscar el horario programado para ese día
  const [shift] = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.idUser, data.employeeId),
        eq(schedules.date, data.date)
      )
    )
    .limit(1);

  const [workday] = await db
    .insert(dailyWorkday)
    .values({
      employeeId: data.employeeId,
      date: data.date,
      shiftId: shift?.id || null,
      workedMinutes,
      breakMinutes: data.breakMinutes,
      overtimeMinutes: 0,
      status: 'closed',
    })
    .returning();

  return workday;
}

/**
 * ACTUALIZAR JORNADA LABORAL MANUAL
 */
export async function updateManualDailyWorkday(
  id: string, 
  data: { startTime?: string; endTime?: string; breakMinutes?: number }
): Promise<DailyWorkday | undefined> {
  const [existing] = await db
    .select()
    .from(dailyWorkday)
    .where(eq(dailyWorkday.id, id));

  if (!existing) return undefined;

  let workedMinutes = existing.workedMinutes;
  let breakMinutes = existing.breakMinutes;

  if (data.startTime && data.endTime) {
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    breakMinutes = data.breakMinutes ?? existing.breakMinutes;
    workedMinutes = totalMinutes - breakMinutes;
  } else if (data.breakMinutes !== undefined) {
    breakMinutes = data.breakMinutes;
  }

  const [updated] = await db
    .update(dailyWorkday)
    .set({
      workedMinutes,
      breakMinutes,
    })
    .where(eq(dailyWorkday.id, id))
    .returning();

  return updated;
}

/**
 * ELIMINAR JORNADA LABORAL
 */
export async function deleteDailyWorkday(id: string): Promise<boolean> {
  const result = await db.delete(dailyWorkday).where(eq(dailyWorkday.id, id));
  return (result.rowCount ?? 0) > 0;
}

/**
 * VERIFICAR SI EXISTEN CLOCK_ENTRIES PARA UNA FECHA
 */
export async function hasClockEntriesForDate(employeeId: string, date: string): Promise<boolean> {
  const entries = await db
    .select()
    .from(clockEntries)
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${date} AND ${clockEntries.employeeId} = ${employeeId}`
    )
    .limit(1);
  
  return entries.length > 0;
}

/**
 * OBTENER REGISTRO DE TIEMPO POR ID (TimeEntry)
 */
export async function getTimeEntry(id: string): Promise<TimeEntry | undefined> {
  const [workday] = await db
    .select()
    .from(dailyWorkday)
    .where(eq(dailyWorkday.id, id));
  
  if (!workday) return undefined;
  
  const totalMinutes = workday.workedMinutes - workday.breakMinutes;
  const totalHours = totalMinutes / 60;
  
  // Obtener pausas del día
  const breaks = await getBreaksForDay(workday.employeeId, workday.date);
  
  return {
    id: workday.id,
    employeeId: workday.employeeId,
    clockIn: workday.startTime || new Date(),
    clockOut: workday.endTime,
    totalHours: totalHours,
    breakMinutes: workday.breakMinutes,
    breaks: breaks,
    date: workday.date,
  };
}

/**
 * OBTENER TODOS LOS REGISTROS DE TIEMPO (TimeEntries)
 */
export async function getTimeEntries(): Promise<TimeEntry[]> {
  const workdays = await db.select().from(dailyWorkday);
  
  const entries = await Promise.all(workdays.map(async workday => {
    const totalMinutes = workday.workedMinutes - workday.breakMinutes;
    const totalHours = totalMinutes / 60;
    
    // Obtener pausas del día
    const breaks = await getBreaksForDay(workday.employeeId, workday.date);
    
    return {
      id: workday.id,
      employeeId: workday.employeeId,
      clockIn: workday.startTime || new Date(),
      clockOut: workday.endTime,
      totalHours: totalHours,
      breakMinutes: workday.breakMinutes,
      breaks: breaks,
      date: workday.date,
    };
  }));
  
  return entries;
}

/**
 * OBTENER REGISTROS DE TIEMPO POR EMPLEADO
 */
export async function getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
  const workdays = await db
    .select()
    .from(dailyWorkday)
    .where(eq(dailyWorkday.employeeId, employeeId));
  
  const entries = await Promise.all(workdays.map(async workday => {
    const totalMinutes = workday.workedMinutes - workday.breakMinutes;
    const totalHours = totalMinutes / 60;
    
    // Obtener pausas del día
    const breaks = await getBreaksForDay(workday.employeeId, workday.date);
    
    return {
      id: workday.id,
      employeeId: workday.employeeId,
      clockIn: workday.startTime || new Date(),
      clockOut: workday.endTime,
      totalHours: totalHours,
      breakMinutes: workday.breakMinutes,
      breaks: breaks,
      date: workday.date,
    };
  }));
  
  return entries;
}

/**
 * OBTENER REGISTROS DE TIEMPO POR FECHA
 */
export async function getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
  const workdays = await db
    .select()
    .from(dailyWorkday)
    .where(eq(dailyWorkday.date, date));
  
  const entries = await Promise.all(workdays.map(async workday => {
    const totalMinutes = workday.workedMinutes - workday.breakMinutes;
    const totalHours = totalMinutes / 60;
    
    // Obtener pausas del día
    const breaks = await getBreaksForDay(workday.employeeId, workday.date);
    
    return {
      id: workday.id,
      employeeId: workday.employeeId,
      clockIn: workday.startTime || new Date(),
      clockOut: workday.endTime,
      totalHours: totalHours,
      breakMinutes: workday.breakMinutes,
      breaks: breaks,
      date: workday.date,
    };
  }));
  
  return entries;
}

/**
 * CREAR REGISTRO DE TIEMPO (TimeEntry) - NO IMPLEMENTADO EN ORIGINAL
 * Este método no existe en el storage original pero está en la interfaz
 */
export async function createTimeEntry(timeEntry: any): Promise<TimeEntry> {
  throw new Error('createTimeEntry no está implementado. Use métodos de clock entries y daily workday.');
}

/**
 * ACTUALIZAR REGISTRO DE TIEMPO (TimeEntry) - NO IMPLEMENTADO EN ORIGINAL
 */
export async function updateTimeEntry(id: string, timeEntry: any): Promise<TimeEntry | undefined> {
  throw new Error('updateTimeEntry no está implementado. Use métodos de clock entries y daily workday.');
}

/**
 * ELIMINAR REGISTRO DE TIEMPO (TimeEntry)
 */
export async function deleteTimeEntry(id: string): Promise<boolean> {
  const result = await db.delete(dailyWorkday).where(eq(dailyWorkday.id, id));
  return (result.rowCount ?? 0) > 0;
}

// Métodos adicionales del storage original (con nombres en español)

export async function obtenerFichajesDelDia(employeeId: string, fecha: string) {
  return await db
    .select()
    .from(clockEntries)
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${fecha} AND ${clockEntries.employeeId} = ${employeeId}`
    )
    .orderBy(clockEntries.timestamp);
}

export async function obtenerJornadaDiaria(employeeId: string, fecha: string): Promise<DailyWorkday | undefined> {
  const [workday] = await db
    .select()
    .from(dailyWorkday)
    .where(
      and(
        eq(dailyWorkday.employeeId, employeeId),
        eq(dailyWorkday.date, fecha)
      )
    );
  return workday;
}

export async function createDailyWorkdayWithAutoClockEntries(
  employeeId: string,
  date: string,
  startTime: Date,
  endTime: Date,
  breakMinutes: number,
  shiftId: string | null = null
): Promise<DailyWorkday> {
  const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
  const workedMinutes = totalMinutes - breakMinutes;

  const [workday] = await db
    .insert(dailyWorkday)
    .values({
      employeeId,
      date,
      shiftId,
      startTime,
      endTime,
      workedMinutes,
      breakMinutes,
      overtimeMinutes: 0,
      status: 'closed',
    })
    .returning();

  const clockInTimestamp = startTime;
  await db.insert(clockEntries).values({
    employeeId,
    shiftId,
    entryType: 'clock_in',
    timestamp: clockInTimestamp,
    source: 'web',
    autoGenerated: true,
  });

  if (breakMinutes > 0) {
    const halfDuration = totalMinutes / 2;
    const breakStart = new Date(startTime.getTime() + (halfDuration - breakMinutes / 2) * 60000);
    const breakEnd = new Date(startTime.getTime() + (halfDuration + breakMinutes / 2) * 60000);

    await db.insert(clockEntries).values({
      employeeId,
      shiftId,
      entryType: 'break_start',
      timestamp: breakStart,
      source: 'web',
      autoGenerated: true,
    });

    await db.insert(clockEntries).values({
      employeeId,
      shiftId,
      entryType: 'break_end',
      timestamp: breakEnd,
      source: 'web',
      autoGenerated: true,
    });
  }

  const clockOutTimestamp = endTime;
  await db.insert(clockEntries).values({
    employeeId,
    shiftId,
    entryType: 'clock_out',
    timestamp: clockOutTimestamp,
    source: 'web',
    autoGenerated: true,
  });

  return workday;
}

export async function updateDailyWorkdayWithAutoClockEntries(
  id: string,
  employeeId: string,
  date: string,
  startTime: Date,
  endTime: Date,
  breakMinutes: number,
  shiftId: string | null = null
): Promise<DailyWorkday | undefined> {
  const autoEntries = await db
    .select()
    .from(clockEntries)
    .where(
      and(
        eq(clockEntries.employeeId, employeeId),
        sql`DATE(${clockEntries.timestamp}) = ${date}`,
        eq(clockEntries.autoGenerated, true)
      )
    );

  if (autoEntries.length > 0) {
    await db
      .delete(clockEntries)
      .where(
        and(
          eq(clockEntries.employeeId, employeeId),
          sql`DATE(${clockEntries.timestamp}) = ${date}`,
          eq(clockEntries.autoGenerated, true)
        )
      );
  }

  const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
  const workedMinutes = totalMinutes - breakMinutes;

  const [updated] = await db
    .update(dailyWorkday)
    .set({
      startTime,
      endTime,
      workedMinutes,
      breakMinutes,
      shiftId,
      status: 'closed',
    })
    .where(eq(dailyWorkday.id, id))
    .returning();

  if (!updated) {
    return undefined;
  }

  await db.insert(clockEntries).values({
    employeeId,
    shiftId,
    entryType: 'clock_in',
    timestamp: startTime,
    source: 'web',
    autoGenerated: true,
  });

  if (breakMinutes > 0) {
    const halfDuration = totalMinutes / 2;
    const breakStart = new Date(startTime.getTime() + (halfDuration - breakMinutes / 2) * 60000);
    const breakEnd = new Date(startTime.getTime() + (halfDuration + breakMinutes / 2) * 60000);

    await db.insert(clockEntries).values({
      employeeId,
      shiftId,
      entryType: 'break_start',
      timestamp: breakStart,
      source: 'web',
      autoGenerated: true,
    });

    await db.insert(clockEntries).values({
      employeeId,
      shiftId,
      entryType: 'break_end',
      timestamp: breakEnd,
      source: 'web',
      autoGenerated: true,
    });
  }

  await db.insert(clockEntries).values({
    employeeId,
    shiftId,
    entryType: 'clock_out',
    timestamp: endTime,
    source: 'web',
    autoGenerated: true,
  });

  return updated;
}

export async function deleteDailyWorkdayWithAutoClockEntries(id: string, employeeId: string, date: string): Promise<boolean> {
  await db
    .delete(clockEntries)
    .where(
      and(
        eq(clockEntries.employeeId, employeeId),
        sql`DATE(${clockEntries.timestamp}) = ${date}`,
        eq(clockEntries.autoGenerated, true)
      )
    );

  const result = await db.delete(dailyWorkday).where(eq(dailyWorkday.id, id));
  return (result.rowCount ?? 0) > 0;
}
