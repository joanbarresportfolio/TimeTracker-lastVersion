import { type Incident, type InsertIncident, incidents } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * INCIDENT STORAGE MODULE
 * =======================
 *
 * Módulo de almacenamiento para operaciones relacionadas con incidencias.
 *
 * NOTA: Las incidencias requieren un idDailyWorkday. La lógica de buscar/crear
 * el daily_workday se maneja en incidentRoutes.ts antes de llamar a estos métodos.
 */

/**
 * OBTENER INCIDENCIA POR ID
 */
export async function getIncidentById(
  id: string,
): Promise<Incident | undefined> {
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
export async function getIncidentsByUser(
  employeeId: string,
): Promise<Incident[]> {
  return await db
    .select()
    .from(incidents)
    .where(eq(incidents.idUser, employeeId));
}

/**
 * CREAR INCIDENCIA
 *
 * IMPORTANTE: Este método espera recibir un InsertIncident con idDailyWorkday ya resuelto.
 * La conversión de fecha a idDailyWorkday debe hacerse en la capa de rutas.
 */
export async function createIncident(
  insertIncident: InsertIncident,
): Promise<Incident> {
  const [incident] = await db
    .insert(incidents)
    .values({
      idUser: insertIncident.idUser,
      idDailyWorkday: insertIncident.idDailyWorkday,
      idIncidentsType: insertIncident.idIncidentsType,
      description: insertIncident.description,
      registeredBy: insertIncident.registeredBy || null,
      status: insertIncident.status || "pending",
    })
    .returning();

  return incident;
}

/**
 * ACTUALIZAR INCIDENCIA
 */
export async function updateIncident(
  id: string,
  incidentData: Partial<InsertIncident>,
): Promise<Incident | undefined> {
  const updateData: any = {};

  if (incidentData.idUser !== undefined)
    updateData.idUser = incidentData.idUser;
  if (incidentData.idDailyWorkday !== undefined)
    updateData.idDailyWorkday = incidentData.idDailyWorkday;
  if (incidentData.description !== undefined)
    updateData.description = incidentData.description;
  if (incidentData.idIncidentsType !== undefined)
    updateData.idIncidentsType = incidentData.idIncidentsType;
  if (incidentData.status !== undefined)
    updateData.status = incidentData.status;
  if (incidentData.registeredBy !== undefined)
    updateData.registeredBy = incidentData.registeredBy;

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
