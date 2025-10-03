/**
 * SISTEMA DE ALMACENAMIENTO DE DATOS
 * ==================================
 * 
 * Este archivo define la capa de acceso a datos del sistema de seguimiento de empleados.
 * Utiliza Drizzle ORM como herramienta de abstracción sobre PostgreSQL para realizar
 * operaciones CRUD (Create, Read, Update, Delete) de manera type-safe.
 * 
 * ARQUITECTURA DE LA CONEXIÓN A BASE DE DATOS:
 * 
 * Frontend (React) → API Routes (Express) → Storage Layer (este archivo) → Drizzle ORM → PostgreSQL
 * 
 * FLUJO DE DATOS TÍPICO:
 * 1. El frontend envía una request HTTP a una ruta API (ej: POST /api/employees)
 * 2. La ruta API valida los datos usando schemas de Zod
 * 3. La ruta API llama a un método de storage (ej: storage.createEmployee(data))
 * 4. El método de storage ejecuta consultas SQL usando Drizzle ORM
 * 5. PostgreSQL procesa la query y devuelve resultados
 * 6. Los resultados se propagan de vuelta hasta el frontend
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Type Safety: Todos los tipos están sincronizados con los schemas de base de datos
 * - Password Hashing: Las contraseñas se encriptan automáticamente con bcrypt
 * - Validaciones: Se aplican reglas de negocio antes de persistir datos
 * - Error Handling: Manejo robusto de errores de base de datos
 * - Abstracción: Interfaz limpia que oculta complejidad SQL al resto del sistema
 * 
 * MODELOS DE DATOS PRINCIPALES:
 * - Employee: Información de empleados (credenciales, departamento, rol)
 * - TimeEntry: Registros de tiempo (clock-in/out, horas trabajadas)
 * - Schedule: Horarios semanales de empleados
 * - Incident: Incidencias laborales y reportes
 * 
 * TECNOLOGÍAS UTILIZADAS:
 * - PostgreSQL: Base de datos relacional principal
 * - Drizzle ORM: Mapeador objeto-relacional type-safe
 * - bcryptjs: Hashing seguro de contraseñas
 * - Driver de BD: Configurado en server/db.ts (Neon serverless o similar)
 * 
 * ESTE ARCHIVO CONTIENE:
 * - IStorage: Interfaz que define el contrato de almacenamiento
 * - DatabaseStorage: Implementación concreta usando PostgreSQL
 * - storage: Instancia singleton para uso global
 * 
 * DOCUMENTACIÓN ACTUALIZADA: 2025-10-02
 * REFACTORIZACIÓN: Uso directo del esquema en inglés sin mapeos
 */

import { 
  type Employee, 
  type InsertEmployee, 
  type TimeEntry, 
  type InsertTimeEntry, 
  type Schedule, 
  type InsertSchedule, 
  type Incident, 
  type InsertIncident, 
  type CreateEmployee, 
  type User, 
  type DateSchedule, 
  type InsertDateSchedule, 
  type BulkDateScheduleCreate,
  users,
  departments,
  scheduledShifts,
  clockEntries,
  dailyWorkday,
  incidents,
  type Department,
  type ScheduledShift,
  type ClockEntry,
  type DailyWorkday
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * INTERFAZ DE ALMACENAMIENTO
 * =========================
 * 
 * Define el contrato que debe cumplir cualquier implementación de storage.
 * Esto permite cambiar fácilmente entre diferentes tipos de almacenamiento
 * (base de datos, memoria, archivos, etc.) sin afectar el resto del sistema.
 * 
 * Todas las operaciones son asíncronas ya que involucran I/O de base de datos.
 */
export interface IStorage {
  // Métodos de Autenticación
  // Estas operaciones manejan el login y validación de credenciales
  
  /** Busca un empleado por su dirección de correo electrónico */
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  
  /** 
   * Autentica un empleado verificando email y contraseña
   * @param email - Email del empleado
   * @param password - Contraseña en texto plano (se compara con hash bcrypt)
   * @returns Objeto User con información básica si las credenciales son válidas, null en caso contrario
   */
  authenticateEmployee(email: string, password: string): Promise<User | null>;
  
  /**
   * Crea un nuevo empleado con contraseña encriptada
   * @param employee - Datos del empleado incluyendo contraseña en texto plano
   * @returns Empleado creado con contraseña ya encriptada
   */
  createEmployeeWithPassword(employee: CreateEmployee): Promise<Employee>;

  // Métodos de Empleados
  // Operaciones CRUD para la gestión de información de empleados
  
  /** Obtiene un empleado por su ID único */
  getEmployee(id: string): Promise<Employee | undefined>;
  
  /** Obtiene todos los empleados del sistema */
  getEmployees(): Promise<Employee[]>;
  
  /** Busca un empleado por su número de empleado (identificador empresarial) */
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined>;
  
  /** 
   * Crea un nuevo empleado (delega a createEmployeeWithPassword para asegurar hashing)
   * @param employee - Datos completos del empleado incluyendo contraseña
   */
  createEmployee(employee: CreateEmployee): Promise<Employee>;
  
  /**
   * Actualiza información de un empleado existente
   * @param id - ID del empleado a actualizar
   * @param employee - Campos a modificar (actualización parcial)
   * @returns Empleado actualizado o undefined si no existe
   */
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  
  /**
   * Elimina un empleado del sistema
   * @param id - ID del empleado a eliminar
   * @returns true si se eliminó, false si no existía
   */
  deleteEmployee(id: string): Promise<boolean>;

  // Métodos de Registros de Tiempo
  // Gestión de fichajes (clock-in/clock-out) y cálculo automático de horas trabajadas
  
  /** Obtiene un registro de tiempo específico por su ID */
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  
  /** Obtiene todos los registros de tiempo del sistema */
  getTimeEntries(): Promise<TimeEntry[]>;
  
  /** Obtiene todos los registros de tiempo de un empleado específico */
  getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]>;
  
  /** Obtiene todos los registros de tiempo de una fecha específica (formato YYYY-MM-DD) */
  getTimeEntriesByDate(date: string): Promise<TimeEntry[]>;
  
  /**
   * Crea un nuevo registro de tiempo con cálculo automático de horas
   * Si clockOut está presente, calcula totalHours automáticamente
   * @param timeEntry - Datos del registro (clockIn requerido, clockOut opcional)
   */
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  
  /**
   * Actualiza un registro de tiempo existente recalculando horas automáticamente
   * @param id - ID del registro a actualizar
   * @param timeEntry - Campos a modificar
   * @returns Registro actualizado con horas recalculadas o undefined si no existe
   */
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  
  /** Elimina un registro de tiempo */
  deleteTimeEntry(id: string): Promise<boolean>;

  // Métodos de Incidencias
  // Gestión de reportes e incidencias laborales (tardanzas, faltas, accidentes, etc.)
  
  /** Obtiene una incidencia específica por su ID */
  getIncident(id: string): Promise<Incident | undefined>;
  
  /** Obtiene todas las incidencias del sistema */
  getIncidents(): Promise<Incident[]>;
  
  /** Obtiene todas las incidencias de un empleado específico */
  getIncidentsByEmployee(employeeId: string): Promise<Incident[]>;
  
  /** Crea una nueva incidencia */
  createIncident(incident: InsertIncident): Promise<Incident>;
  
  /** Actualiza una incidencia existente */
  updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined>;
  
  /** Elimina una incidencia */
  deleteIncident(id: string): Promise<boolean>;
}

/**
 * IMPLEMENTACIÓN DE ALMACENAMIENTO EN BASE DE DATOS
 * ===============================================
 * 
 * Esta clase implementa la interfaz IStorage utilizando PostgreSQL como backend
 * y Drizzle ORM como capa de abstracción. Todas las operaciones son type-safe
 * y manejan automáticamente la serialización/deserialización de datos.
 * 
 * CONEXIÓN A LA BASE DE DATOS:
 * La instancia 'db' se importa desde './db' y contiene la configuración de conexión
 * a la base de datos PostgreSQL. La conexión se establece automáticamente al
 * importar el módulo usando el driver configurado (ver server/db.ts).
 * 
 * PATRONES DE CONSULTA DRIZZLE:
 * - SELECT: db.select().from(table).where(condition)
 * - INSERT: db.insert(table).values(data).returning()
 * - UPDATE: db.update(table).set(data).where(condition).returning()
 * - DELETE: db.delete(table).where(condition)
 * 
 * MANEJO DE ERRORES:
 * Las consultas pueden lanzar excepciones que deben ser manejadas en las rutas API.
 * Los errores comunes incluyen: violaciones de restricción única, foreign key constraints,
 * y errores de conexión a la base de datos.
 */
export class DatabaseStorage implements IStorage {
  
  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================
  
  /**
   * BUSCAR EMPLEADO POR EMAIL
   * ========================
   * 
   * Realiza una consulta SELECT para encontrar un empleado por su dirección de correo.
   * Esta operación es fundamental para el proceso de autenticación.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = $1 LIMIT 1;
   * 
   * @param email - Dirección de correo electrónico del empleado
   * @returns Empleado encontrado o undefined si no existe
   */
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const result = await db
      .select({
        user: users,
        department: departments,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.email, email))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const { user, department } = result[0];
    
    return {
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.passwordHash,
      role: user.role,
      department: department?.name || "",
      position: "",
      hireDate: user.hireDate,
      conventionHours: 1752,
      isActive: user.isActive,
    };
  }

  /**
   * AUTENTICAR EMPLEADO
   * ==================
   * 
   * Proceso de autenticación en dos etapas:
   * 1. Busca el empleado por email en la base de datos
   * 2. Compara la contraseña proporcionada con el hash bcrypt almacenado
   * 
   * FLUJO DE SEGURIDAD:
   * - Las contraseñas nunca se almacenan en texto plano
   * - Se usa bcrypt para hashing con salt automático
   * - El hash se compara usando bcrypt.compare() que es resistente a timing attacks
   * - Devuelve el registro completo de User (las rutas API deben filtrar campos sensibles)
   * 
   * @param email - Email del empleado
   * @param password - Contraseña en texto plano
   * @returns Objeto User completo si es válido, null si falla la autenticación
   */
  async authenticateEmployee(email: string, password: string): Promise<User | null> {
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
   * =========================================
   * 
   * Crea un nuevo empleado en la base de datos asegurando que la contraseña
   * se encripte antes del almacenamiento.
   * 
   * PROCESO DE ENCRIPTACIÓN:
   * - Usa bcrypt con factor de costo 10 (2^10 = 1024 iteraciones)
   * - El salt se genera automáticamente
   * - El hash resultante incluye salt + hash en un formato estándar
   * 
   * CONSULTA SQL EQUIVALENTE:
   * INSERT INTO users (employeeNumber, firstName, lastName, email, passwordHash, role, departmentId, hireDate, isActive)
   * VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
   * RETURNING *;
   * 
   * @param employeeData - Datos del empleado incluyendo contraseña en texto plano
   * @returns Empleado creado con ID generado y contraseña ya encriptada
   */
  async createEmployeeWithPassword(employeeData: CreateEmployee): Promise<Employee> {
    const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    
    let departmentId: string | null = null;
    let departmentData: Department | undefined = undefined;
    
    if (employeeData.department) {
      const [existingDept] = await db
        .select()
        .from(departments)
        .where(eq(departments.name, employeeData.department))
        .limit(1);
      
      if (existingDept) {
        departmentId = existingDept.id;
        departmentData = existingDept;
      } else {
        const [newDept] = await db
          .insert(departments)
          .values({
            name: employeeData.department,
            description: null,
          })
          .returning();
        departmentId = newDept.id;
        departmentData = newDept;
      }
    }
    
    const [user] = await db
      .insert(users)
      .values({
        employeeNumber: employeeData.employeeNumber,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        passwordHash: hashedPassword,
        hireDate: employeeData.hireDate,
        isActive: employeeData.isActive,
        role: employeeData.role,
        departmentId: departmentId,
      })
      .returning();
      
    return {
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.passwordHash,
      role: user.role,
      department: departmentData?.name || "",
      position: "",
      hireDate: user.hireDate,
      conventionHours: 1752,
      isActive: user.isActive,
    };
  }

  // ==========================================
  // MÉTODOS DE GESTIÓN DE EMPLEADOS
  // ==========================================
  
  /**
   * OBTENER EMPLEADO POR ID
   * ======================
   * 
   * Busca un empleado por su identificador único generado por la base de datos.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = $1 LIMIT 1;
   * 
   * @param id - UUID del empleado
   * @returns Empleado encontrado o undefined si no existe
   */
  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await db
      .select({
        user: users,
        department: departments,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.id, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const { user, department } = result[0];
    
    return {
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.passwordHash,
      role: user.role,
      department: department?.name || "",
      position: "",
      hireDate: user.hireDate,
      conventionHours: 1752,
      isActive: user.isActive,
    };
  }

  /**
   * OBTENER TODOS LOS EMPLEADOS
   * ==========================
   * 
   * Recupera la lista completa de empleados del sistema.
   * Incluye tanto empleados activos como inactivos.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM users u LEFT JOIN departments d ON u.department_id = d.id ORDER BY u.id;
   * 
   * @returns Array con todos los empleados (puede estar vacío)
   */
  async getEmployees(): Promise<Employee[]> {
    const results = await db
      .select({
        user: users,
        department: departments,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id));
    
    return results.map(({ user, department }) => ({
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.passwordHash,
      role: user.role,
      department: department?.name || "",
      position: "",
      hireDate: user.hireDate,
      conventionHours: 1752,
      isActive: user.isActive,
    }));
  }

  /**
   * BUSCAR EMPLEADO POR NÚMERO DE EMPLEADO
   * ====================================
   * 
   * Busca un empleado usando su número de empleado (identificador empresarial).
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM users WHERE employee_number = $1 LIMIT 1;
   * 
   * @param employeeNumber - Código identificador del empleado (ej: "EMP001")
   * @returns Empleado encontrado o undefined si no existe
   */
  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    const result = await db
      .select({
        user: users,
        department: departments,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.employeeNumber, employeeNumber))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const { user, department } = result[0];
    
    return {
      id: user.id,
      employeeNumber: user.employeeNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.passwordHash,
      role: user.role,
      department: department?.name || "",
      position: "",
      hireDate: user.hireDate,
      conventionHours: 1752,
      isActive: user.isActive,
    };
  }

  /**
   * CREAR EMPLEADO
   * =============
   * 
   * Delega a createEmployeeWithPassword para asegurar encriptación de contraseña.
   * 
   * @param employee - Datos completos del empleado
   * @returns Empleado creado
   */
  async createEmployee(employee: CreateEmployee): Promise<Employee> {
    return this.createEmployeeWithPassword(employee);
  }

  /**
   * ACTUALIZAR EMPLEADO
   * ==================
   * 
   * Actualiza campos específicos de un empleado existente.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * UPDATE users SET field1 = $1, field2 = $2 WHERE id = $3 RETURNING *;
   * 
   * @param id - ID del empleado a actualizar
   * @param employeeData - Campos a modificar
   * @returns Empleado actualizado o undefined si no existía
   */
  async updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const updateData: any = {};
    
    if (employeeData.employeeNumber !== undefined) updateData.employeeNumber = employeeData.employeeNumber;
    if (employeeData.firstName !== undefined) updateData.firstName = employeeData.firstName;
    if (employeeData.lastName !== undefined) updateData.lastName = employeeData.lastName;
    if (employeeData.email !== undefined) updateData.email = employeeData.email;
    if (employeeData.hireDate !== undefined) updateData.hireDate = employeeData.hireDate;
    if (employeeData.isActive !== undefined) updateData.isActive = employeeData.isActive;
    if (employeeData.role !== undefined) updateData.role = employeeData.role;
    
    if (employeeData.department !== undefined) {
      if (employeeData.department) {
        const [existingDept] = await db
          .select()
          .from(departments)
          .where(eq(departments.name, employeeData.department))
          .limit(1);
        
        if (existingDept) {
          updateData.departmentId = existingDept.id;
        } else {
          const [newDept] = await db
            .insert(departments)
            .values({
              name: employeeData.department,
              description: null,
            })
            .returning();
          updateData.departmentId = newDept.id;
        }
      } else {
        updateData.departmentId = null;
      }
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) return undefined;
    
    const [dept] = updatedUser.departmentId 
      ? await db.select().from(departments).where(eq(departments.id, updatedUser.departmentId)).limit(1)
      : [undefined];
    
    return {
      id: updatedUser.id,
      employeeNumber: updatedUser.employeeNumber,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      password: updatedUser.passwordHash,
      role: updatedUser.role,
      department: dept?.name || "",
      position: "",
      hireDate: updatedUser.hireDate,
      conventionHours: 1752,
      isActive: updatedUser.isActive,
    };
  }

  /**
   * ELIMINAR EMPLEADO
   * ================
   * 
   * Elimina permanentemente un empleado del sistema.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * DELETE FROM users WHERE id = $1;
   * 
   * @param id - ID del empleado a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================
  // MÉTODOS DE REGISTROS DE TIEMPO
  // ==========================================
  
  /**
   * OBTENER REGISTRO DE TIEMPO POR ID
   * ================================
   * 
   * Recupera un registro consolidado de tiempo (jornada diaria) por su ID.
   * 
   * @param id - ID único del registro de tiempo
   * @returns Registro de tiempo encontrado o undefined si no existe
   */
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [workday] = await db
      .select()
      .from(dailyWorkday)
      .where(eq(dailyWorkday.id, id));
    
    if (!workday) return undefined;
    
    const totalMinutes = workday.workedMinutes - workday.breakMinutes;
    const totalHours = totalMinutes / 60;
    
    return {
      id: workday.id,
      employeeId: workday.employeeId,
      clockIn: workday.startTime || new Date(),
      clockOut: workday.endTime,
      totalHours: totalHours,
      date: workday.date,
    };
  }

  /**
   * OBTENER TODOS LOS REGISTROS DE TIEMPO
   * ====================================
   * 
   * Recupera todos los registros consolidados de tiempo del sistema.
   * 
   * @returns Array con todos los registros de tiempo
   */
  async getTimeEntries(): Promise<TimeEntry[]> {
    const workdays = await db.select().from(dailyWorkday);
    
    return workdays.map(workday => {
      const totalMinutes = workday.workedMinutes - workday.breakMinutes;
      const totalHours = totalMinutes / 60;
      
      return {
        id: workday.id,
        employeeId: workday.employeeId,
        clockIn: workday.startTime || new Date(),
        clockOut: workday.endTime,
        totalHours: totalHours,
        date: workday.date,
      };
    });
  }

  /**
   * OBTENER REGISTROS DE TIEMPO POR EMPLEADO
   * =======================================
   * 
   * Recupera todos los registros de tiempo de un empleado específico.
   * 
   * @param employeeId - ID del empleado
   * @returns Array con registros de tiempo del empleado
   */
  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    const workdays = await db
      .select()
      .from(dailyWorkday)
      .where(eq(dailyWorkday.employeeId, employeeId));
    
    return workdays.map(workday => {
      const totalMinutes = workday.workedMinutes - workday.breakMinutes;
      const totalHours = totalMinutes / 60;
      
      return {
        id: workday.id,
        employeeId: workday.employeeId,
        clockIn: workday.startTime || new Date(),
        clockOut: workday.endTime,
        totalHours: totalHours,
        date: workday.date,
      };
    });
  }

  /**
   * OBTENER REGISTROS DE TIEMPO POR FECHA
   * ====================================
   * 
   * Recupera todos los registros de tiempo de una fecha específica.
   * 
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Array con registros de tiempo de esa fecha
   */
  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    const workdays = await db
      .select()
      .from(dailyWorkday)
      .where(eq(dailyWorkday.date, date));
    
    return workdays.map(workday => {
      const totalMinutes = workday.workedMinutes - workday.breakMinutes;
      const totalHours = totalMinutes / 60;
      
      return {
        id: workday.id,
        employeeId: workday.employeeId,
        clockIn: workday.startTime || new Date(),
        clockOut: workday.endTime,
        totalHours: totalHours,
        date: workday.date,
      };
    });
  }

  /**
   * CREAR REGISTRO DE TIEMPO
   * =======================
   * 
   * Crea un nuevo registro de tiempo (jornada diaria).
   * Este método crea o actualiza la jornada diaria y opcionalmente crea el evento de fichaje.
   * 
   * @param timeEntry - Datos del registro de tiempo
   * @returns Registro de tiempo creado
   */
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const date = timeEntry.date;
    
    const [existingWorkday] = await db
      .select()
      .from(dailyWorkday)
      .where(
        and(
          eq(dailyWorkday.employeeId, timeEntry.employeeId),
          eq(dailyWorkday.date, date)
        )
      );
    
    let workday: DailyWorkday;
    
    if (existingWorkday) {
      const updateData: any = {};
      
      if (!existingWorkday.startTime || timeEntry.clockIn < existingWorkday.startTime) {
        updateData.startTime = timeEntry.clockIn;
      }
      
      if (timeEntry.clockOut) {
        if (!existingWorkday.endTime || timeEntry.clockOut > existingWorkday.endTime) {
          updateData.endTime = timeEntry.clockOut;
        }
        
        if (existingWorkday.startTime && timeEntry.clockOut) {
          const startMs = (existingWorkday.startTime || timeEntry.clockIn).getTime();
          const endMs = timeEntry.clockOut.getTime();
          const workedMinutes = Math.floor((endMs - startMs) / 60000);
          updateData.workedMinutes = workedMinutes;
        }
        
        updateData.status = 'closed';
      }
      
      [workday] = await db
        .update(dailyWorkday)
        .set(updateData)
        .where(eq(dailyWorkday.id, existingWorkday.id))
        .returning();
    } else {
      const workedMinutes = timeEntry.clockOut 
        ? Math.floor((timeEntry.clockOut.getTime() - timeEntry.clockIn.getTime()) / 60000)
        : 0;
      
      [workday] = await db
        .insert(dailyWorkday)
        .values({
          employeeId: timeEntry.employeeId,
          date: date,
          startTime: timeEntry.clockIn,
          endTime: timeEntry.clockOut || null,
          workedMinutes: workedMinutes,
          breakMinutes: 0,
          overtimeMinutes: 0,
          status: timeEntry.clockOut ? 'closed' : 'open',
        })
        .returning();
    }
    
    const totalMinutes = workday.workedMinutes - workday.breakMinutes;
    const totalHours = totalMinutes / 60;
    
    return {
      id: workday.id,
      employeeId: workday.employeeId,
      clockIn: workday.startTime || timeEntry.clockIn,
      clockOut: workday.endTime,
      totalHours: totalHours,
      date: workday.date,
    };
  }

  /**
   * ACTUALIZAR REGISTRO DE TIEMPO
   * ============================
   * 
   * Actualiza un registro de tiempo existente.
   * 
   * @param id - ID del registro a actualizar
   * @param timeEntryData - Campos a modificar
   * @returns Registro actualizado o undefined si no existía
   */
  async updateTimeEntry(id: string, timeEntryData: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const [existing] = await db
      .select()
      .from(dailyWorkday)
      .where(eq(dailyWorkday.id, id));
    
    if (!existing) return undefined;
    
    const updateData: any = {};
    
    if (timeEntryData.clockIn) {
      updateData.startTime = timeEntryData.clockIn;
    }
    
    if (timeEntryData.clockOut) {
      updateData.endTime = timeEntryData.clockOut;
      updateData.status = 'closed';
    }
    
    const startTime = timeEntryData.clockIn || existing.startTime;
    const endTime = timeEntryData.clockOut !== undefined ? timeEntryData.clockOut : existing.endTime;
    
    if (startTime && endTime) {
      const workedMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);
      updateData.workedMinutes = workedMinutes;
    }
    
    const [updatedWorkday] = await db
      .update(dailyWorkday)
      .set(updateData)
      .where(eq(dailyWorkday.id, id))
      .returning();
    
    const totalMinutes = updatedWorkday.workedMinutes - updatedWorkday.breakMinutes;
    const totalHours = totalMinutes / 60;
    
    return {
      id: updatedWorkday.id,
      employeeId: updatedWorkday.employeeId,
      clockIn: updatedWorkday.startTime || new Date(),
      clockOut: updatedWorkday.endTime,
      totalHours: totalHours,
      date: updatedWorkday.date,
    };
  }

  /**
   * ELIMINAR REGISTRO DE TIEMPO
   * ==========================
   * 
   * Elimina permanentemente un registro de tiempo del sistema.
   * 
   * @param id - ID del registro a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteTimeEntry(id: string): Promise<boolean> {
    const result = await db.delete(dailyWorkday).where(eq(dailyWorkday.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================
  // MÉTODOS DE GESTIÓN DE INCIDENCIAS
  // ==========================================
  
  /**
   * OBTENER INCIDENCIA POR ID
   * ========================
   * 
   * Recupera una incidencia específica por su identificador único.
   * 
   * @param id - ID único de la incidencia
   * @returns Incidencia encontrada o undefined si no existe
   */
  async getIncident(id: string): Promise<Incident | undefined> {
    const [incident] = await db
      .select()
      .from(incidents)
      .where(eq(incidents.id, id));
    
    return incident;
  }

  /**
   * OBTENER TODAS LAS INCIDENCIAS
   * ============================
   * 
   * Recupera todas las incidencias registradas en el sistema.
   * 
   * @returns Array con todas las incidencias del sistema
   */
  async getIncidents(): Promise<Incident[]> {
    return await db.select().from(incidents);
  }

  /**
   * OBTENER INCIDENCIAS POR EMPLEADO
   * ===============================
   * 
   * Recupera todas las incidencias de un empleado específico.
   * 
   * @param employeeId - ID del empleado
   * @returns Array con incidencias del empleado
   */
  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    return await db
      .select()
      .from(incidents)
      .where(eq(incidents.userId, employeeId));
  }

  /**
   * CREAR INCIDENCIA
   * ===============
   * 
   * Registra una nueva incidencia en el sistema.
   * 
   * @param insertIncident - Datos de la incidencia
   * @returns Incidencia creada con ID asignado
   */
  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const [incident] = await db
      .insert(incidents)
      .values({
        userId: insertIncident.userId,
        entryId: insertIncident.entryId || null,
        incidentType: insertIncident.incidentType,
        description: insertIncident.description,
        registeredBy: insertIncident.registeredBy || null,
        status: insertIncident.status || "pending",
      })
      .returning();
    
    return incident;
  }

  /**
   * ACTUALIZAR INCIDENCIA
   * ====================
   * 
   * Actualiza el estado o detalles de una incidencia existente.
   * 
   * @param id - ID de la incidencia a actualizar
   * @param incidentData - Campos a modificar
   * @returns Incidencia actualizada o undefined si no existía
   */
  async updateIncident(id: string, incidentData: Partial<InsertIncident>): Promise<Incident | undefined> {
    const updateData: any = {};
    
    if (incidentData.userId !== undefined) updateData.userId = incidentData.userId;
    if (incidentData.description !== undefined) updateData.description = incidentData.description;
    if (incidentData.incidentType !== undefined) updateData.incidentType = incidentData.incidentType;
    if (incidentData.status !== undefined) updateData.status = incidentData.status;
    if (incidentData.entryId !== undefined) updateData.entryId = incidentData.entryId;
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
   * ==================
   * 
   * Elimina permanentemente una incidencia del sistema.
   * 
   * @param id - ID de la incidencia a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteIncident(id: string): Promise<boolean> {
    const result = await db.delete(incidents).where(eq(incidents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================
  // MÉTODOS UTILITARIOS
  // ==========================================
  
  /**
   * CALCULAR HORAS DE TRABAJO EN MINUTOS
   * ===================================
   * 
   * Calcula la diferencia entre hora de inicio y fin en minutos.
   * 
   * @param startTime - Hora de inicio en formato HH:MM
   * @param endTime - Hora de fin en formato HH:MM
   * @returns Diferencia en minutos
   */
  private calculateWorkHours(startTime: string, endTime: string): number {
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

  // ==========================================
  // MÉTODOS DE HORARIOS ESPECÍFICOS POR FECHA (dateSchedules)
  // ==========================================
  
  /**
   * OBTENER TODOS LOS HORARIOS POR FECHA
   * ===================================
   * 
   * Recupera todos los horarios específicos por fecha del sistema.
   * 
   * @returns Array con todos los horarios por fecha del sistema
   */
  async getDateSchedules(): Promise<DateSchedule[]> {
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
   * =====================================
   * 
   * Recupera horarios específicos por fecha de un empleado.
   * 
   * @param employeeId - ID del empleado
   * @returns Array con horarios por fecha del empleado
   */
  async getDateSchedulesByEmployee(employeeId: string): Promise<DateSchedule[]> {
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
   * ==============================================
   * 
   * Recupera horarios específicos por fecha de un empleado dentro de un rango.
   * 
   * @param employeeId - ID del empleado
   * @param startDate - Fecha de inicio (opcional, formato YYYY-MM-DD)
   * @param endDate - Fecha de fin (opcional, formato YYYY-MM-DD)
   * @returns Array con horarios filtrados por fecha
   */
  async getDateSchedulesByEmployeeAndRange(employeeId: string, startDate?: string, endDate?: string): Promise<DateSchedule[]> {
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
   * =========================================================
   * 
   * Recupera horarios específicos por fecha de todos los empleados dentro de un rango.
   * 
   * @param startDate - Fecha de inicio (opcional, formato YYYY-MM-DD)
   * @param endDate - Fecha de fin (opcional, formato YYYY-MM-DD)
   * @returns Array con horarios filtrados por fecha
   */
  async getDateSchedulesByRange(startDate?: string, endDate?: string): Promise<DateSchedule[]> {
    if (!startDate && !endDate) {
      return this.getDateSchedules();
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
   * =================================
   * 
   * Crea un horario para una fecha específica.
   * 
   * @param insertDateSchedule - Datos del horario para fecha específica
   * @returns Horario por fecha creado con ID asignado
   */
  async createDateSchedule(insertDateSchedule: InsertDateSchedule): Promise<DateSchedule> {
    const workHours = (insertDateSchedule as any).workHours ?? this.calculateWorkHours(
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
   * ===========================
   * 
   * Actualiza campos específicos de un horario por fecha existente.
   * 
   * @param id - ID del horario por fecha a actualizar
   * @param dateScheduleData - Campos a modificar
   * @returns Horario por fecha actualizado o undefined si no existía
   */
  async updateDateSchedule(id: string, dateScheduleData: Partial<InsertDateSchedule>): Promise<DateSchedule | undefined> {
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
   * =========================
   * 
   * Elimina permanentemente un horario específico por fecha.
   * 
   * @param id - ID del horario por fecha a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteDateSchedule(id: string): Promise<boolean> {
    const result = await db.delete(scheduledShifts).where(eq(scheduledShifts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * CREAR HORARIOS MASIVOS POR FECHA CON ANTI-DUPLICADOS
   * ===================================================
   * 
   * Crea múltiples horarios específicos por fecha en una operación.
   * 
   * @param bulkData - Datos con array de horarios por fecha
   * @returns Array de horarios por fecha creados (solo los nuevos)
   */
  async createBulkDateSchedules(bulkData: BulkDateScheduleCreate): Promise<DateSchedule[]> {
    if (!bulkData.schedules || bulkData.schedules.length === 0) {
      return [];
    }

    const schedulesToCreate = bulkData.schedules.map(schedule => {
      const workHours = this.calculateWorkHours(
        schedule.expectedStartTime, 
        schedule.expectedEndTime
      );
      
      const [startHour] = schedule.expectedStartTime.split(':').map(Number);
      let shiftType: 'morning' | 'afternoon' | 'night' = 'morning';
      if (startHour >= 14 && startHour < 22) {
        shiftType = 'afternoon';
      } else if (startHour >= 22 || startHour < 6) {
        shiftType = 'night';
      }
      
      return {
        employeeId: schedule.employeeId,
        date: schedule.date,
        expectedStartTime: schedule.expectedStartTime,
        expectedEndTime: schedule.expectedEndTime,
        workHours: workHours,
        shiftType: shiftType,
        status: schedule.status ?? 'scheduled'
      };
    });

    const employeeIds = Array.from(new Set(schedulesToCreate.map(s => s.employeeId)));
    
    const existingShifts = await db
      .select()
      .from(scheduledShifts)
      .where(inArray(scheduledShifts.employeeId, employeeIds));

    const uniqueSchedules = schedulesToCreate.filter(newSchedule => {
      return !existingShifts.some(existing => 
        existing.employeeId === newSchedule.employeeId &&
        existing.date === newSchedule.date &&
        existing.expectedStartTime === newSchedule.expectedStartTime &&
        existing.expectedEndTime === newSchedule.expectedEndTime
      );
    });

    if (uniqueSchedules.length === 0) {
      return [];
    }

    const shiftsToInsert = uniqueSchedules.map(schedule => ({
      employeeId: schedule.employeeId,
      date: schedule.date,
      expectedStartTime: schedule.expectedStartTime,
      expectedEndTime: schedule.expectedEndTime,
      shiftType: schedule.shiftType,
      status: schedule.status,
    }));

    const createdShifts = await db
      .insert(scheduledShifts)
      .values(shiftsToInsert)
      .returning();

    return createdShifts.map(shift => {
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
}

/**
 * ============================================================================
 * NUEVA LÓGICA DE FICHAJES Y JORNADA DIARIA
 * ============================================================================
 * 
 * Sistema basado en eventos individuales de fichaje que actualiza
 * automáticamente la tabla dailyWorkday consolidada.
 */

/**
 * Calcula y actualiza la jornada diaria basándose en todos los fichajes del día
 */
async function calcularYActualizarJornada(employeeId: string, fecha: string): Promise<void> {
  const entriesOfDay = await db
    .select()
    .from(clockEntries)
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${fecha} AND ${clockEntries.employeeId} = ${employeeId}`
    )
    .orderBy(clockEntries.timestamp);

  let startTime: Date | null = null;
  let endTime: Date | null = null;
  let workedMinutes = 0;
  let breakMinutes = 0;
  let status: 'open' | 'closed' = 'open';

  let lastClockIn: Date | null = null;
  let lastBreakStart: Date | null = null;

  for (const entry of entriesOfDay) {
    switch (entry.entryType) {
      case 'clock_in':
        if (!startTime) startTime = entry.timestamp;
        lastClockIn = entry.timestamp;
        break;

      case 'clock_out':
        endTime = entry.timestamp;
        if (lastClockIn) {
          const minutes = Math.floor((endTime.getTime() - lastClockIn.getTime()) / 60000);
          workedMinutes += minutes;
          lastClockIn = null;
        }
        status = 'closed';
        break;

      case 'break_start':
        lastBreakStart = entry.timestamp;
        break;

      case 'break_end':
        if (lastBreakStart) {
          const minutes = Math.floor((entry.timestamp.getTime() - lastBreakStart.getTime()) / 60000);
          breakMinutes += minutes;
          lastBreakStart = null;
        }
        break;
    }
  }

  // BUSCAR EL HORARIO PROGRAMADO (scheduled_shift) PARA ESTE DÍA
  const [scheduledShift] = await db
    .select()
    .from(scheduledShifts)
    .where(
      and(
        eq(scheduledShifts.employeeId, employeeId),
        eq(scheduledShifts.date, fecha)
      )
    )
    .limit(1);
  
  const shiftId = scheduledShift?.id || null;

  const [existingWorkday] = await db
    .select()
    .from(dailyWorkday)
    .where(
      and(
        eq(dailyWorkday.employeeId, employeeId),
        eq(dailyWorkday.date, fecha)
      )
    );

  let workdayId: string;

  if (existingWorkday) {
    await db
      .update(dailyWorkday)
      .set({
        shiftId,
        startTime,
        endTime,
        workedMinutes,
        breakMinutes,
        status,
      })
      .where(eq(dailyWorkday.id, existingWorkday.id));
    
    workdayId = existingWorkday.id;
  } else {
    const [newWorkday] = await db
      .insert(dailyWorkday)
      .values({
        employeeId,
        date: fecha,
        shiftId,
        startTime,
        endTime,
        workedMinutes,
        breakMinutes,
        overtimeMinutes: 0,
        status,
      })
      .returning();
    
    workdayId = newWorkday.id;
  }

  // ACTUALIZAR TODOS LOS CLOCK_ENTRIES DEL DÍA CON EL daily_workday_id
  await db
    .update(clockEntries)
    .set({ dailyWorkdayId: workdayId })
    .where(
      sql`DATE(${clockEntries.timestamp}) = ${fecha} AND ${clockEntries.employeeId} = ${employeeId}`
    );
}

/**
 * Servicio de fichajes - Crea un evento de fichaje individual
 */
export const fichajesService = {
  async crearFichaje(
    employeeId: string,
    entryType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end',
    shiftId: string | null = null,
    source: 'mobile_app' | 'physical_terminal' | 'web' = 'web',
    notes: string | null = null
  ): Promise<ClockEntry> {
    // Obtener fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    
    // VALIDACIÓN: Verificar restricciones antes de crear el fichaje
    if (entryType === 'clock_in') {
      // 1. Verificar que no exista ya un clock_in hoy
      const fichajesHoy = await this.obtenerFichajesDelDia(employeeId, hoy);
      const yaHayClockIn = fichajesHoy.some(f => f.entryType === 'clock_in');
      
      if (yaHayClockIn) {
        throw new Error('Ya has iniciado jornada hoy. No puedes iniciar jornada dos veces el mismo día.');
      }
      
      // 2. Verificar que no exista una jornada cerrada hoy
      const jornadaHoy = await this.obtenerJornadaDiaria(employeeId, hoy);
      if (jornadaHoy && jornadaHoy.status === 'closed') {
        throw new Error('Ya has finalizado tu jornada hoy. No puedes iniciar otra jornada el mismo día.');
      }
    }
    
    if (entryType === 'clock_out') {
      // Verificar que exista un clock_in sin clock_out correspondiente
      const fichajesHoy = await this.obtenerFichajesDelDia(employeeId, hoy);
      const hayClockIn = fichajesHoy.some(f => f.entryType === 'clock_in');
      const hayClockOut = fichajesHoy.some(f => f.entryType === 'clock_out');
      
      if (!hayClockIn) {
        throw new Error('No has iniciado jornada hoy. Debes iniciar jornada antes de finalizar.');
      }
      
      if (hayClockOut) {
        throw new Error('Ya has finalizado tu jornada hoy.');
      }
    }
    
    // BUSCAR AUTOMÁTICAMENTE EL HORARIO ASIGNADO (scheduled_shift) DEL DÍA
    // Si no se proporciona shiftId, buscar el horario programado para hoy
    let finalShiftId = shiftId;
    if (!finalShiftId) {
      const [scheduledShift] = await db
        .select()
        .from(scheduledShifts)
        .where(
          and(
            eq(scheduledShifts.employeeId, employeeId),
            eq(scheduledShifts.date, hoy)
          )
        )
        .limit(1);
      
      if (scheduledShift) {
        finalShiftId = scheduledShift.id;
      }
    }
    
    // Crear el fichaje con el shiftId encontrado (o null si no hay horario)
    const [entry] = await db
      .insert(clockEntries)
      .values({
        employeeId,
        shiftId: finalShiftId,
        entryType,
        source,
        notes,
      })
      .returning();

    const fecha = entry.timestamp.toISOString().split('T')[0];
    await calcularYActualizarJornada(employeeId, fecha);

    return entry;
  },

  async obtenerFichajesDelDia(employeeId: string, fecha: string): Promise<ClockEntry[]> {
    return await db
      .select()
      .from(clockEntries)
      .where(
        sql`DATE(${clockEntries.timestamp}) = ${fecha} AND ${clockEntries.employeeId} = ${employeeId}`
      )
      .orderBy(clockEntries.timestamp);
  },

  async obtenerJornadaDiaria(employeeId: string, fecha: string): Promise<DailyWorkday | undefined> {
    const [workday] = await db
      .select()
      .from(dailyWorkday)
      .where(
        and(
          eq(dailyWorkday.employeeId, employeeId),
          eq(dailyWorkday.date, fecha)
        )
      );
    return workday;
  },
};

/**
 * INSTANCIA SINGLETON DE STORAGE
 * ==============================
 * 
 * Esta es la instancia única de DatabaseStorage que se exporta y usa en toda la aplicación.
 * Se crea automáticamente al importar este módulo.
 */
export const storage = new DatabaseStorage();
