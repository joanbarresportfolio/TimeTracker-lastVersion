import { 
  type ScheduledShift, 
  type DateSchedule, 
  type InsertDateSchedule, 
  type BulkDateScheduleCreate,
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
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const workMinutes = endMinutes - startMinutes;
  if (workMinutes < 0) {
    throw new Error(`Hora de fin (${endTime}) debe ser posterior a hora de inicio (${startTime})`);
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
export async function getScheduledShiftsByEmployee(employeeId: string): Promise<ScheduledShift[]> {
  return await db
    .select()
    .from(schedules)
    .where(eq(schedules.idUser, employeeId));
}

/**
 * OBTENER TURNOS PROGRAMADOS POR RANGO DE FECHAS
 */
export async function getScheduledShiftsByRange(startDate: string, endDate: string): Promise<ScheduledShift[]> {
  return await db
    .select()
    .from(schedules)
    .where(
      and(
        gte(schedules.date, startDate),
        lte(schedules.date, endDate)
      )
    );
}

/**
 * OBTENER TURNOS PROGRAMADOS POR EMPLEADO Y RANGO DE FECHAS
 */
export async function getScheduledShiftsByEmployeeAndRange(
  employeeId: string, 
  startDate: string, 
  endDate: string
): Promise<ScheduledShift[]> {
  return await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.idUser, employeeId),
        gte(schedules.date, startDate),
        lte(schedules.date, endDate)
      )
    );
}

/**
 * CREAR NUEVO TURNO PROGRAMADO
 */
export async function createScheduledShift(shift: Omit<ScheduledShift, 'id'>): Promise<ScheduledShift> {
  const [newShift] = await db
    .insert(scheduledShifts)
    .values(shift)
    .returning();
  return newShift;
}

/**
 * ACTUALIZAR ESTADO DE TURNO PROGRAMADO
 */
export async function updateScheduledShiftStatus(id: string, status: string): Promise<ScheduledShift | undefined> {
  const [updated] = await db
    .update(scheduledShifts)
    .set({ status })
    .where(eq(scheduledShifts.id, id))
    .returning();
  return updated;
}

/**
 * ELIMINAR TURNO PROGRAMADO
 */
export async function deleteScheduledShift(id: string): Promise<boolean> {
  const result = await db.delete(scheduledShifts).where(eq(scheduledShifts.id, id));
  return (result.rowCount ?? 0) > 0;
}

// ==========================================
// DATE SCHEDULES (Horarios específicos por fecha)
// ==========================================

/**
 * OBTENER TODOS LOS HORARIOS POR FECHA
 */
export async function getDateSchedules(): Promise<DateSchedule[]> {
  const shifts = await db.select().from(scheduledShifts);
  
  return shifts.map(shift => {
    const [startHour, startMin] = shift.expectedStartTime.split(':').map(Number);
    const [endHour, endMin] = shift.expectedEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const workMinutes = endMinutes - startMinutes;
    
    return {
      id: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.expectedStartTime,
      endTime: shift.expectedEndTime,
      workHours: workMinutes,
      isActive: shift.status === 'scheduled' || shift.status === 'confirmed' || shift.status === 'completed',
    };
  });
}

/**
 * OBTENER HORARIOS POR FECHA DE EMPLEADO
 */
export async function getDateSchedulesByEmployee(employeeId: string): Promise<DateSchedule[]> {
  const shifts = await db
    .select()
    .from(scheduledShifts)
    .where(eq(scheduledShifts.employeeId, employeeId));
  
  return shifts.map(shift => {
    const [startHour, startMin] = shift.expectedStartTime.split(':').map(Number);
    const [endHour, endMin] = shift.expectedEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const workMinutes = endMinutes - startMinutes;
    
    return {
      id: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.expectedStartTime,
      endTime: shift.expectedEndTime,
      workHours: workMinutes,
      isActive: shift.status === 'scheduled' || shift.status === 'confirmed' || shift.status === 'completed',
    };
  });
}

/**
 * OBTENER HORARIOS POR EMPLEADO Y RANGO DE FECHAS
 */
export async function getDateSchedulesByEmployeeAndRange(employeeId: string, startDate?: string, endDate?: string): Promise<DateSchedule[]> {
  const conditions = [eq(scheduledShifts.employeeId, employeeId)];
  
  if (startDate && endDate) {
    conditions.push(gte(scheduledShifts.date, startDate));
    conditions.push(lte(scheduledShifts.date, endDate));
  } else if (startDate) {
    conditions.push(gte(scheduledShifts.date, startDate));
  } else if (endDate) {
    conditions.push(lte(scheduledShifts.date, endDate));
  }
  
  const shifts = await db
    .select()
    .from(scheduledShifts)
    .where(and(...conditions));
  
  return shifts.map(shift => {
    const [startHour, startMin] = shift.expectedStartTime.split(':').map(Number);
    const [endHour, endMin] = shift.expectedEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const workMinutes = endMinutes - startMinutes;
    
    return {
      id: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.expectedStartTime,
      endTime: shift.expectedEndTime,
      workHours: workMinutes,
      isActive: shift.status === 'scheduled' || shift.status === 'confirmed' || shift.status === 'completed',
    };
  });
}

/**
 * OBTENER HORARIOS POR RANGO DE FECHAS (TODOS LOS EMPLEADOS)
 */
export async function getDateSchedulesByRange(startDate?: string, endDate?: string): Promise<DateSchedule[]> {
  if (!startDate && !endDate) {
    return getDateSchedules();
  }
  
  const conditions = [];
  
  if (startDate && endDate) {
    conditions.push(gte(scheduledShifts.date, startDate));
    conditions.push(lte(scheduledShifts.date, endDate));
  } else if (startDate) {
    conditions.push(gte(scheduledShifts.date, startDate));
  } else if (endDate) {
    conditions.push(lte(scheduledShifts.date, endDate));
  }
  
  const shifts = await db
    .select()
    .from(scheduledShifts)
    .where(and(...conditions));
  
  return shifts.map(shift => {
    const [startHour, startMin] = shift.expectedStartTime.split(':').map(Number);
    const [endHour, endMin] = shift.expectedEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const workMinutes = endMinutes - startMinutes;
    
    return {
      id: shift.id,
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.expectedStartTime,
      endTime: shift.expectedEndTime,
      workHours: workMinutes,
      isActive: shift.status === 'scheduled' || shift.status === 'confirmed' || shift.status === 'completed',
    };
  });
}

/**
 * CREAR HORARIO ESPECÍFICO POR FECHA
 */
export async function createDateSchedule(insertDateSchedule: InsertDateSchedule): Promise<DateSchedule> {
  const workHours = (insertDateSchedule as any).workHours ?? calculateWorkHours(
    insertDateSchedule.startTime, 
    insertDateSchedule.endTime
  );
  
  const [startHour] = insertDateSchedule.startTime.split(':').map(Number);
  let shiftType: 'morning' | 'afternoon' | 'night' = 'morning';
  if (startHour >= 14 && startHour < 22) {
    shiftType = 'afternoon';
  } else if (startHour >= 22 || startHour < 6) {
    shiftType = 'night';
  }
  
  const [shift] = await db
    .insert(scheduledShifts)
    .values({
      employeeId: insertDateSchedule.employeeId,
      date: insertDateSchedule.date,
      expectedStartTime: insertDateSchedule.startTime,
      expectedEndTime: insertDateSchedule.endTime,
      shiftType: shiftType,
      status: insertDateSchedule.isActive === false ? 'cancelled' : 'scheduled',
    })
    .returning();
  
  return {
    id: shift.id,
    employeeId: shift.employeeId,
    date: shift.date,
    startTime: shift.expectedStartTime,
    endTime: shift.expectedEndTime,
    workHours: workHours,
    isActive: shift.status === 'scheduled' || shift.status === 'confirmed' || shift.status === 'completed',
  };
}

/**
 * ACTUALIZAR HORARIO POR FECHA
 */
export async function updateDateSchedule(id: string, dateScheduleData: Partial<InsertDateSchedule>): Promise<DateSchedule | undefined> {
  const updateData: any = {};
  
  if (dateScheduleData.employeeId !== undefined) updateData.employeeId = dateScheduleData.employeeId;
  if (dateScheduleData.date !== undefined) updateData.date = dateScheduleData.date;
  if (dateScheduleData.startTime !== undefined) updateData.expectedStartTime = dateScheduleData.startTime;
  if (dateScheduleData.endTime !== undefined) updateData.expectedEndTime = dateScheduleData.endTime;
  if (dateScheduleData.isActive !== undefined) {
    updateData.status = dateScheduleData.isActive ? 'scheduled' : 'cancelled';
  }
  
  if (dateScheduleData.startTime !== undefined) {
    const [startHour] = dateScheduleData.startTime.split(':').map(Number);
    if (startHour >= 14 && startHour < 22) {
      updateData.shiftType = 'afternoon';
    } else if (startHour >= 22 || startHour < 6) {
      updateData.shiftType = 'night';
    } else {
      updateData.shiftType = 'morning';
    }
  }
  
  const [updatedShift] = await db
    .update(scheduledShifts)
    .set(updateData)
    .where(eq(scheduledShifts.id, id))
    .returning();
  
  if (!updatedShift) return undefined;
  
  const [startHour, startMin] = updatedShift.expectedStartTime.split(':').map(Number);
  const [endHour, endMin] = updatedShift.expectedEndTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const workMinutes = endMinutes - startMinutes;
  
  return {
    id: updatedShift.id,
    employeeId: updatedShift.employeeId,
    date: updatedShift.date,
    startTime: updatedShift.expectedStartTime,
    endTime: updatedShift.expectedEndTime,
    workHours: workMinutes,
    isActive: updatedShift.status === 'scheduled' || updatedShift.status === 'confirmed' || updatedShift.status === 'completed',
  };
}

/**
 * ELIMINAR HORARIO POR FECHA
 */
export async function deleteDateSchedule(id: string): Promise<boolean> {
  const result = await db.delete(scheduledShifts).where(eq(scheduledShifts.id, id));
  return (result.rowCount ?? 0) > 0;
}

/**
 * CREAR HORARIOS MASIVOS POR FECHA CON ANTI-DUPLICADOS
 */
export async function createBulkDateSchedules(bulkData: BulkDateScheduleCreate): Promise<DateSchedule[]> {
  if (!bulkData.schedules || bulkData.schedules.length === 0) {
    return [];
  }

  const schedulesToCreate = bulkData.schedules.map(schedule => {
    const workHours = calculateWorkHours(
      schedule.startTime, 
      schedule.endTime
    );
    
    return {
      idUser: schedule.employeeId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      scheduleType: schedule.scheduleType || 'total',
      workHours: workHours,
    };
  });

  const employeeIds = Array.from(new Set(schedulesToCreate.map(s => s.idUser)));
  
  const existingShifts = await db
    .select()
    .from(schedules)
    .where(inArray(schedules.idUser, employeeIds));

  const uniqueSchedules = schedulesToCreate.filter(newSchedule => {
    return !existingShifts.some(existing => 
      existing.idUser === newSchedule.idUser &&
      existing.date === newSchedule.date &&
      existing.startTime === newSchedule.startTime &&
      existing.endTime === newSchedule.endTime
    );
  });

  if (uniqueSchedules.length === 0) {
    return [];
  }

  const shiftsToInsert = uniqueSchedules.map(schedule => ({
    idUser: schedule.idUser,
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    scheduleType: schedule.scheduleType,
  }));

  const createdShifts = await db
    .insert(schedules)
    .values(shiftsToInsert)
    .returning();

  return createdShifts.map(shift => {
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const workMinutes = endMinutes - startMinutes;
    
    return {
      id: shift.id,
      employeeId: shift.idUser,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      workHours: workMinutes,
      isActive: true,
    };
  });
}
