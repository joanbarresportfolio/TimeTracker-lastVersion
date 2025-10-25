import {
  InsertRoleEnterprise,
  type RoleEnterprise,
  rolesEnterprise,
  users,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

/**
 * ROLE STORAGE MODULE
 * ===================
 *
 * Módulo de almacenamiento para operaciones relacionadas con roles de empresa.
 */

/**
 * OBTENER TODOS LOS ROLES
 */
export async function getRoles(): Promise<RoleEnterprise[]> {
  return await db.select().from(rolesEnterprise);
}

/**
 * CREAR ROL
 */
export async function createRole(
  data: InsertRoleEnterprise,
): Promise<RoleEnterprise> {
  const [role] = await db.insert(rolesEnterprise).values(data).returning();
  return role;
}

/**
 * ACTUALIZAR ROL
 */
export async function updateRole(
  id: string,
  data: Partial<InsertRoleEnterprise>,
): Promise<RoleEnterprise> {
  const [role] = await db
    .update(rolesEnterprise)
    .set(data)
    .where(eq(rolesEnterprise.id, id))
    .returning();
  return role;
}

/**
 * ELIMINAR ROL
 */
export async function deleteRole(id: string): Promise<void> {
  // Actualizar empleados que tienen este rol enterprise a null
  await db
    .update(users)
    .set({ roleEnterpriseId: null })
    .where(eq(users.roleEnterpriseId, id));

  // Luego eliminar el rol
  await db.delete(rolesEnterprise).where(eq(rolesEnterprise.id, id));
}
