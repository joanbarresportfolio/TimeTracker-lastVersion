import { type InsertUser, UpdateUser, type User, users } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * USER STORAGE MODULE
 * ===================
 *
 * Módulo de almacenamiento para operaciones relacionadas con usuarios y empleados.
 * Incluye métodos de autenticación, CRUD de empleados y gestión de contraseñas.
 */

/**
 * BUSCAR EMPLEADO POR EMAIL
 */
/*
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
}
*/
/**
 * AUTENTICAR EMPLEADO
 */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (result.length === 0) return null;

  const user = result[0];
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) return null;

  return user;
}

/**
 * CREAR EMPLEADO CON CONTRASEÑA ENCRIPTADA
 */
export async function createUser(UserData: InsertUser): Promise<User> {
  const hashedPassword = await bcrypt.hash(UserData.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      numEmployee: UserData.numEmployee,
      dni: UserData.dni,
      firstName: UserData.firstName,
      lastName: UserData.lastName,
      email: UserData.email,
      passwordHash: hashedPassword,
      hireDate: UserData.hireDate,
      isActive: UserData.isActive,
      roleSystem: UserData.roleSystem,
      roleEnterpriseId: UserData.roleEnterpriseId,
      departmentId: UserData.departmentId,
    })
    .returning();

  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return user;
}

export async function getUsers(): Promise<User[]> {
  return await db.select().from(users);
}

export async function getUserByNumber(
  UserNumber: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.numEmployee, UserNumber))
    .limit(1);

  return user;
}

export async function getUserByEmail(
  email: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
}

export async function getUserByDNI(
  dni: string,
): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.dni, dni))
    .limit(1);

  return user;
}

export async function updateUser(
  id: string,
  userData: UpdateUser,
): Promise<User | undefined> {
  const [updatedUser] = await db
    .update(users)
    .set(userData)
    .where(eq(users.id, id))
    .returning();

  return updatedUser;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id));
  return (result.rowCount ?? 0) > 0;
}
