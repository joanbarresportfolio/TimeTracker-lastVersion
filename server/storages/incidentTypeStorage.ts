import {
  type IncidentsType,
  type InsertIncidentsType,
  incidentsType,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * INCIDENT TYPE STORAGE MODULE
 * ============================
 *
 * Módulo de almacenamiento para operaciones relacionadas con tipos de incidencias.
 */

/**
 * OBTENER TODOS LOS TIPOS DE INCIDENCIAS
 */
export async function getIncidentTypes(): Promise<IncidentsType[]> {
  return await db.select().from(incidentsType).orderBy(incidentsType.name);
}

/**
 * CREAR TIPO DE INCIDENCIA
 */
export async function createIncidentType(
  data: InsertIncidentsType,
): Promise<IncidentsType> {
  const [incidentType] = await db
    .insert(incidentsType)
    .values(data)
    .returning();
  return incidentType;
}

/**
 * ACTUALIZAR TIPO DE INCIDENCIA
 */
export async function updateIncidentType(
  id: string,
  data: Partial<InsertIncidentsType>,
): Promise<IncidentsType> {
  const [incidentType] = await db
    .update(incidentsType)
    .set(data)
    .where(eq(incidentsType.id, id))
    .returning();
  return incidentType;
}

/**
 * ELIMINAR TIPO DE INCIDENCIA
 */
export async function deleteIncidentType(id: string): Promise<void> {
  await db.delete(incidentsType).where(eq(incidentsType.id, id));
}
