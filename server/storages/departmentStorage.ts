import { 
  type Department, 
  departments,
  users,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * DEPARTMENT STORAGE MODULE
 * =========================
 * 
 * Módulo de almacenamiento para operaciones relacionadas con departamentos.
 */

/**
 * OBTENER TODOS LOS DEPARTAMENTOS
 */
export async function getDepartments(): Promise<Department[]> {
  return await db.select().from(departments);
}

/**
 * CREAR DEPARTAMENTO
 */
export async function createDepartment(data: { name: string; description?: string }): Promise<Department> {
  const [department] = await db.insert(departments).values(data).returning();
  return department;
}

/**
 * ELIMINAR DEPARTAMENTO
 */
export async function deleteDepartment(id: string): Promise<void> {
  // Primero desasignar el departamento de todos los empleados
  await db.update(users).set({ departmentId: null }).where(eq(users.departmentId, id));
  
  // Luego eliminar el departamento
  await db.delete(departments).where(eq(departments.id, id));
}
