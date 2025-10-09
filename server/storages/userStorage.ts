import { 
  type Employee, 
  type InsertEmployee, 
  type CreateEmployee, 
  type User, 
  users,
} from "@shared/schema";
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
export async function getEmployeeByEmail(email: string): Promise<Employee | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  return user;
}

/**
 * AUTENTICAR EMPLEADO
 */
export async function authenticateEmployee(email: string, password: string): Promise<User | null> {
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
export async function createEmployeeWithPassword(employeeData: CreateEmployee): Promise<Employee> {
  const hashedPassword = await bcrypt.hash(employeeData.password, 10);
  
  const [user] = await db
    .insert(users)
    .values({
      numEmployee: employeeData.numEmployee,
      dni: employeeData.dni,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      passwordHash: hashedPassword,
      hireDate: employeeData.hireDate,
      isActive: employeeData.isActive,
      roleSystem: employeeData.roleSystem,
      roleEnterpriseId: employeeData.roleEnterpriseId,
      departmentId: employeeData.departmentId,
    })
    .returning();
    
  return user;
}

/**
 * OBTENER EMPLEADO POR ID
 */
export async function getEmployee(id: string): Promise<Employee | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  
  return user;
}

/**
 * OBTENER TODOS LOS EMPLEADOS
 */
export async function getEmployees(): Promise<Employee[]> {
  return await db.select().from(users);
}

/**
 * BUSCAR EMPLEADO POR NÚMERO DE EMPLEADO
 */
export async function getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.numEmployee, employeeNumber))
    .limit(1);
  
  return user;
}

/**
 * CREAR EMPLEADO (delega a createEmployeeWithPassword)
 */
export async function createEmployee(employee: CreateEmployee): Promise<Employee> {
  return createEmployeeWithPassword(employee);
}

/**
 * ACTUALIZAR EMPLEADO
 */
export async function updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee | undefined> {
  const [updatedUser] = await db
    .update(users)
    .set(employeeData)
    .where(eq(users.id, id))
    .returning();
  
  return updatedUser;
}

/**
 * ELIMINAR EMPLEADO
 */
export async function deleteEmployee(id: string): Promise<boolean> {
  const result = await db.delete(users).where(eq(users.id, id));
  return (result.rowCount ?? 0) > 0;
}
