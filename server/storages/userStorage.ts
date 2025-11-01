import { type InsertUser, UpdateUser, type User, users, schedules, dailyWorkday, clockEntries, incidents } from "@shared/schema";
import { db } from "../db";
import { eq, or, inArray } from "drizzle-orm";
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
  // Primero necesitamos obtener los IDs de daily_workday del empleado
  // porque clock_entries e incidents tienen FK a daily_workday
  const userWorkdays = await db
    .select({ id: dailyWorkday.id })
    .from(dailyWorkday)
    .where(eq(dailyWorkday.idUser, id));
  
  const workdayIds = userWorkdays.map(w => w.id);

  // 1. Borrar clock_entries relacionados con los daily_workday del empleado
  if (workdayIds.length > 0) {
    await db.delete(clockEntries).where(
      inArray(clockEntries.idDailyWorkday, workdayIds)
    );
  }

  // 2. Borrar incidents donde:
  //    - El empleado es el afectado (idUser)
  //    - El empleado registró el incidente (registeredBy)
  //    - El incidente está relacionado con un daily_workday del empleado (idDailyWorkday)
  if (workdayIds.length > 0) {
    await db.delete(incidents).where(
      or(
        eq(incidents.idUser, id),
        eq(incidents.registeredBy, id),
        inArray(incidents.idDailyWorkday, workdayIds)
      )
    );
  } else {
    // Si no hay workdays, solo borrar por idUser y registeredBy
    await db.delete(incidents).where(
      or(
        eq(incidents.idUser, id),
        eq(incidents.registeredBy, id)
      )
    );
  }

  // 3. Borrar schedules del empleado
  await db.delete(schedules).where(eq(schedules.employeeId, id));

  // 4. Borrar daily_workday del empleado
  await db.delete(dailyWorkday).where(eq(dailyWorkday.idUser, id));

  // 5. Finalmente borrar el empleado
  const result = await db.delete(users).where(eq(users.id, id));
  return (result.rowCount ?? 0) > 0;
}
