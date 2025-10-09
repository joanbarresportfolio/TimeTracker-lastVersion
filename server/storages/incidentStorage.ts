import { 
  type Incident, 
  type InsertIncident, 
  incidents,
  dailyWorkday,
  schedules,
  clockEntries,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { getDailyWorkdayByEmployeeAndDate } from "./dailyWorkdayStorage";

/**
 * INCIDENT STORAGE MODULE
 * =======================
 * 
 * Módulo de almacenamiento para operaciones relacionadas con incidencias.
 */

/**
 * OBTENER INCIDENCIA POR ID
 */
export async function getIncident(id: string): Promise<Incident | undefined> {
  const [incident] = await db
    .select()
    .from(incidents)
    .where(eq(incidents.id, id));
  
  return incident;
}

/**
 * OBTENER TODAS LAS INCIDENCIAS
 */
export async function getIncidents(): Promise<Incident[]> {
  return await db.select().from(incidents);
}

/**
 * OBTENER INCIDENCIAS POR EMPLEADO
 */
export async function getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
  return await db
    .select()
    .from(incidents)
    .where(eq(incidents.userId, employeeId));
}

/**
 * CREAR INCIDENCIA
 */
export async function createIncident(insertIncident: InsertIncident): Promise<Incident> {
  // PASO 1: Crear la incidencia
  const [incident] = await db
    .insert(incidents)
    .values({
      userId: insertIncident.userId,
      date: insertIncident.date,
      incidentType: insertIncident.incidentType,
      description: insertIncident.description,
      registeredBy: insertIncident.registeredBy || null,
      status: insertIncident.status || "pending",
    })
    .returning();
  
  // PASO 2: Buscar daily_workday para este empleado y fecha
  let workday = await getDailyWorkdayByEmployeeAndDate(insertIncident.userId, insertIncident.date);
  
  // PASO 3: Si no existe daily_workday, crearlo
  if (!workday) {
    // Buscar scheduled_shift para este día
    const [shift] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.idUser, insertIncident.userId),
          eq(schedules.date, insertIncident.date)
        )
      )
      .limit(1);
    
    // Crear daily_workday básico
    const [newWorkday] = await db
      .insert(dailyWorkday)
      .values({
        employeeId: insertIncident.userId,
        date: insertIncident.date,
        shiftId: shift?.id || null,
        incidentId: incident.id,
        status: 'open',
      })
      .returning();
    
    workday = newWorkday;
  } else {
    // PASO 4: Si existe, actualizar el incidentId
    await db
      .update(dailyWorkday)
      .set({ incidentId: incident.id })
      .where(eq(dailyWorkday.id, workday.id));
  }
  
  // PASO 5: Actualizar clock_entries del mismo día para asociarlos con la incidencia
  await db
    .update(clockEntries)
    .set({ 
      incidentId: incident.id,
      dailyWorkdayId: workday.id
    })
    .where(
      and(
        eq(clockEntries.employeeId, insertIncident.userId),
        sql`DATE(${clockEntries.timestamp}) = ${insertIncident.date}`
      )
    );
  
  return incident;
}

/**
 * ACTUALIZAR INCIDENCIA
 */
export async function updateIncident(id: string, incidentData: Partial<InsertIncident>): Promise<Incident | undefined> {
  const updateData: any = {};
  
  if (incidentData.userId !== undefined) updateData.userId = incidentData.userId;
  if (incidentData.date !== undefined) updateData.date = incidentData.date;
  if (incidentData.description !== undefined) updateData.description = incidentData.description;
  if (incidentData.incidentType !== undefined) updateData.incidentType = incidentData.incidentType;
  if (incidentData.status !== undefined) updateData.status = incidentData.status;
  if (incidentData.registeredBy !== undefined) updateData.registeredBy = incidentData.registeredBy;
  
  const [updatedIncident] = await db
    .update(incidents)
    .set(updateData)
    .where(eq(incidents.id, id))
    .returning();
  
  return updatedIncident;
}

/**
 * ELIMINAR INCIDENCIA
 */
export async function deleteIncident(id: string): Promise<boolean> {
  const result = await db.delete(incidents).where(eq(incidents.id, id));
  return (result.rowCount ?? 0) > 0;
}
