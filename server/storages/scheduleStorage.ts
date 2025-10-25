import {
  type ScheduledShift,
  type DateSchedule,
  type InsertDateSchedule,
  type BulkScheduleCreate,
  schedules,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

/**
 * SCHEDULE STORAGE MODULE
 * =======================
 *
 * Módulo de almacenamiento para operaciones relacionadas con horarios programados.
 */

/**
 * CALCULAR HORAS DE TRABAJO EN MINUTOS
 */
function calculateWorkHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  const workMinutes = endMinutes - startMinutes;
  if (workMinutes < 0) {
    throw new Error(
      `Hora de fin (${endTime}) debe ser posterior a hora de inicio (${startTime})`,
    );
  }

  return workMinutes;
}

/**
 * OBTENER TODOS LOS TURNOS PROGRAMADOS
 */
export async function getScheduledShifts(): Promise<ScheduledShift[]> {
  return await db.select().from(schedules);
}

/**
 * OBTENER TURNOS PROGRAMADOS POR EMPLEADO
 */
export async function getScheduledShiftsByEmployee(
  employeeId: string,
): Promise<ScheduledShift[]> {
  return await db
    .select()
    .from(schedules)
    .where(eq(schedules.idUser, employeeId));
}

/**
 * OBTENER TURNOS PROGRAMADOS POR RANGO DE FECHAS
 */
export async function getScheduledShiftsByRange(
  startDate: string,
  endDate: string,
): Promise<ScheduledShift[]> {
  return await db
    .select()
    .from(schedules)
    .where(and(gte(schedules.date, startDate), lte(schedules.date, endDate)));
}

export async function getScheduledShiftsByDate(
  date: string,
): Promise<ScheduledShift[]> {
  return await db.select().from(schedules).where(eq(schedules.date, date));
}
/**
 * OBTENER TURNOS PROGRAMADOS POR EMPLEADO Y RANGO DE FECHAS
 */
export async function getScheduledShiftsByEmployeeAndRange(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<ScheduledShift[]> {
  return await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.idUser, employeeId),
        gte(schedules.date, startDate),
        lte(schedules.date, endDate),
      ),
    );
}

// ==========================================
// DATE SCHEDULES (Horarios específicos por fecha)
// ==========================================

/**
 * ACTUALIZAR HORARIO POR FECHA
 */
export async function updateDateSchedule(
  id: string,
  dateScheduleData: Partial<InsertDateSchedule>,
): Promise<DateSchedule | undefined> {
  const updateData: any = {};

  if (dateScheduleData.idUser !== undefined)
    updateData.idUser = dateScheduleData.idUser;
  if (dateScheduleData.date !== undefined)
    updateData.date = dateScheduleData.date;
  if (dateScheduleData.startTime !== undefined)
    updateData.startTime = dateScheduleData.startTime;
  if (dateScheduleData.endTime !== undefined)
    updateData.endTime = dateScheduleData.endTime;
  if (dateScheduleData.startBreak !== undefined)
    updateData.startBreak = dateScheduleData.startBreak || null;
  if (dateScheduleData.endBreak !== undefined)
    updateData.endBreak = dateScheduleData.endBreak || null;
  if (dateScheduleData.scheduleType !== undefined)
    updateData.scheduleType = dateScheduleData.scheduleType;
  if (dateScheduleData.idDailyWorkday !== undefined)
    updateData.idDailyWorkday = dateScheduleData.idDailyWorkday;

  const [updatedSchedule] = await db
    .update(schedules)
    .set(updateData)
    .where(eq(schedules.id, id))
    .returning();

  if (!updatedSchedule) return undefined;

  return updatedSchedule;
}

/**
 * ELIMINAR HORARIO POR FECHA
 */
export async function deleteDateSchedule(id: string): Promise<boolean> {
  const result = await db.delete(schedules).where(eq(schedules.id, id));
  return (result.rowCount ?? 0) > 0;
}

/**
 * CREAR HORARIOS MASIVOS POR FECHA CON ANTI-DUPLICADOS
 */
export async function createBulkDateSchedules(
  bulkData: BulkScheduleCreate,
): Promise<DateSchedule[]> {
  if (!bulkData.schedules || bulkData.schedules.length === 0) {
    return [];
  }

  const schedulesToCreate = bulkData.schedules.map((schedule) => {
    const workHours = calculateWorkHours(schedule.startTime, schedule.endTime);

    return {
      idUser: schedule.employeeId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      startBreak: schedule.startBreak || null,
      endBreak: schedule.endBreak || null,
      scheduleType: schedule.scheduleType || "total",
      workHours: workHours,
    };
  });

  const employeeIds = Array.from(
    new Set(schedulesToCreate.map((s) => s.idUser)),
  );

  const existingShifts = await db
    .select()
    .from(schedules)
    .where(inArray(schedules.idUser, employeeIds));

  const uniqueSchedules = schedulesToCreate.filter((newSchedule) => {
    return !existingShifts.some(
      (existing) =>
        existing.idUser === newSchedule.idUser &&
        existing.date === newSchedule.date &&
        existing.startTime === newSchedule.startTime &&
        existing.endTime === newSchedule.endTime,
    );
  });

  if (uniqueSchedules.length === 0) {
    return [];
  }

  const shiftsToInsert = uniqueSchedules.map((schedule) => ({
    idUser: schedule.idUser,
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    startBreak: schedule.startBreak,
    endBreak: schedule.endBreak,
    scheduleType: schedule.scheduleType,
  }));

  const createdShifts = await db
    .insert(schedules)
    .values(shiftsToInsert)
    .returning();

  return createdShifts;
}
