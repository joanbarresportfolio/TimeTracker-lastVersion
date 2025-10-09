import { 
  type ClockEntry, 
  clockEntries,
  dailyWorkday,
  schedules,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";

/**
 * CLOCK ENTRY STORAGE MODULE
 * ==========================
 * 
 * Módulo de almacenamiento para operaciones relacionadas con fichajes (clock entries).
 */

/**
 * OBTENER ENTRADA DE FICHAJE POR ID
 */
export async function getClockEntry(id: string): Promise<ClockEntry | undefined> {
  const [entry] = await db
    .select()
    .from(clockEntries)
    .where(eq(clockEntries.id, id))
    .limit(1);
  
  return entry;
}

/**
 * CREAR ENTRADA DE FICHAJE
 */
export async function createClockEntry(data: Omit<ClockEntry, 'id'>): Promise<ClockEntry> {
  const [entry] = await db
    .insert(clockEntries)
    .values(data)
    .returning();
  
  return entry;
}

/**
 * OBTENER FICHAJE ACTIVO (último clock_in sin clock_out)
 */
export async function getActiveClockEntry(employeeId: string): Promise<ClockEntry | undefined> {
  // Obtener el último clock_in del empleado
  const [lastClockIn] = await db
    .select()
    .from(clockEntries)
    .where(
      and(
        eq(clockEntries.employeeId, employeeId),
        eq(clockEntries.entryType, 'clock_in')
      )
    )
    .orderBy(sql`${clockEntries.timestamp} DESC`)
    .limit(1);
  
  if (!lastClockIn) return undefined;
  
  // Verificar si hay un clock_out posterior
  const [clockOut] = await db
    .select()
    .from(clockEntries)
    .where(
      and(
        eq(clockEntries.employeeId, employeeId),
        eq(clockEntries.entryType, 'clock_out'),
        sql`${clockEntries.timestamp} > ${lastClockIn.timestamp}`
      )
    )
    .limit(1);
  
  // Si hay un clock_out, no hay fichaje activo
  if (clockOut) return undefined;
  
  return lastClockIn;
}

/**
 * CERRAR FICHAJE (crear clock_out)
 */
export async function closeClockEntry(employeeId: string): Promise<ClockEntry> {
  const activeEntry = await getActiveClockEntry(employeeId);
  
  if (!activeEntry) {
    throw new Error('No hay fichaje activo para cerrar');
  }
  
  const [clockOut] = await db
    .insert(clockEntries)
    .values({
      employeeId,
      shiftId: activeEntry.shiftId,
      entryType: 'clock_out',
      timestamp: new Date(),
      source: activeEntry.source,
    })
    .returning();
  
  // Actualizar daily_workday
  await calcularYActualizarJornada(employeeId, new Date().toISOString().split('T')[0]);
  
  return clockOut;
}

/**
 * CALCULAR Y ACTUALIZAR JORNADA DIARIA
 * ====================================
 * 
 * Calcula y actualiza la jornada diaria basándose en todos los fichajes del día.
 * Esta función se exporta para ser usada por otros módulos.
 */
export async function calcularYActualizarJornada(employeeId: string, fecha: string): Promise<void> {
  const entriesOfDay = await db
    .select()
    .from(clockEntries)
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${fecha} AND ${clockEntries.employeeId} = ${employeeId}`
    )
    .orderBy(clockEntries.timestamp);

  let startTime: Date | null = null;
  let endTime: Date | null = null;
  let workedMinutes = 0;
  let breakMinutes = 0;
  let status: 'open' | 'closed' = 'open';

  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;

  for (const entry of entriesOfDay) {
    switch (entry.entryType) {
      case 'clock_in':
        if (!startTime) startTime = entry.timestamp;
        lastClockIn = entry.timestamp;
        break;

      case 'clock_out':
        endTime = entry.timestamp;
        if (lastClockIn) {
          const minutes = Math.floor((endTime.getTime() - lastClockIn.getTime()) / 60000);
          workedMinutes += minutes;
          lastClockIn = null;
        }
        status = 'closed';
        break;

      case 'break_start':
        lastBreakStart = entry.timestamp;
        break;

      case 'break_end':
        if (lastBreakStart) {
          const minutes = Math.floor((entry.timestamp.getTime() - lastBreakStart.getTime()) / 60000);
          breakMinutes += minutes;
          lastBreakStart = null;
        }
        break;
    }
  }

  // BUSCAR EL HORARIO PROGRAMADO (scheduled_shift) PARA ESTE DÍA
  const [scheduledShift] = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.idUser, employeeId),
        eq(schedules.date, fecha)
      )
    )
    .limit(1);
  
  const shiftId = scheduledShift?.id || null;

  const [existingWorkday] = await db
    .select()
    .from(dailyWorkday)
    .where(
      and(
        eq(dailyWorkday.employeeId, employeeId),
        eq(dailyWorkday.date, fecha)
      )
    );

  let workdayId: string;

  if (existingWorkday) {
    await db
      .update(dailyWorkday)
      .set({
        shiftId,
        startTime,
        endTime,
        workedMinutes,
        breakMinutes,
        status,
      })
      .where(eq(dailyWorkday.id, existingWorkday.id));
    
    workdayId = existingWorkday.id;
  } else {
    const [newWorkday] = await db
      .insert(dailyWorkday)
      .values({
        employeeId,
        date: fecha,
        shiftId,
        startTime,
        endTime,
        workedMinutes,
        breakMinutes,
        overtimeMinutes: 0,
        status,
      })
      .returning();
    
    workdayId = newWorkday.id;
  }

  // ACTUALIZAR TODOS LOS CLOCK_ENTRIES DEL DÍA CON EL daily_workday_id
  await db
    .update(clockEntries)
    .set({ dailyWorkdayId: workdayId })
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${fecha} AND ${clockEntries.employeeId} = ${employeeId}`
    );
}
