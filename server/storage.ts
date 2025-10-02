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
 * DOCUMENTACIÓN GENERADA: 2025-09-11
 * PROPÓSITO: Refactorización con buenas prácticas y documentación exhaustiva
 */

import { type Employee, type InsertEmployee, type TimeEntry, type InsertTimeEntry, type Schedule, type InsertSchedule, type Incident, type InsertIncident, type CreateEmployee, type User, type DateSchedule, type InsertDateSchedule, type BulkDateScheduleCreate, usuarios, departamentos, horariosPlanificados, fichajes, incidencias, jornadaDiaria, type Usuario, type Departamento, type HorarioPlanificado, type Fichaje, type Incidencia, type JornadaDiaria, type InsertFichaje, type InsertJornadaDiaria } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, gte, lte, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ============================================================================
// FUNCIONES ADAPTADORAS: MAPEO ENTRE TIPOS INGLÉS ↔ ESPAÑOL
// ============================================================================

/**
 * Mapea un Usuario (español) a Employee (inglés) para mantener compatibilidad de API
 */
function mapUsuarioToEmployee(usuario: Usuario, departamento?: Departamento): Employee {
  return {
    id: usuario.idUsuario,
    employeeNumber: usuario.numEmpleado,
    firstName: usuario.firstName,
    lastName: usuario.lastName,
    email: usuario.email,
    password: usuario.passwordHash,
    role: usuario.rol === "administrador" ? "admin" : "employee",
    department: departamento?.nombreDepartamento || "",
    position: "", // No tenemos posición en la nueva estructura
    hireDate: usuario.fechaContratacion,
    conventionHours: 1752, // Valor por defecto
    isActive: usuario.activo,
  };
}

/**
 * Mapea CreateEmployee (inglés) a datos para insertar Usuario (español)
 */
function mapCreateEmployeeToInsertUsuario(employee: CreateEmployee) {
  return {
    numEmpleado: employee.employeeNumber,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    passwordHash: "", // Se establecerá con bcrypt
    fechaContratacion: employee.hireDate,
    activo: employee.isActive,
    rol: employee.role === "admin" ? "administrador" : "empleado",
    idDepartamento: null as string | null, // Se establecerá después
  };
}

/**
 * Mapea un Fichaje (español) a TimeEntry (inglés)
 */
function mapFichajeToTimeEntry(fichaje: Fichaje): TimeEntry {
  return {
    id: fichaje.idFichaje,
    employeeId: fichaje.idUsuario,
    clockIn: fichaje.horaEntrada,
    clockOut: fichaje.horaSalida || null,
    totalHours: fichaje.horasTrabajadas || null,
    date: fichaje.fecha,
  };
}

/**
 * Mapea un HorarioPlanificado (español) a DateSchedule (inglés)
 */
function mapHorarioPlanificadoToDateSchedule(horario: HorarioPlanificado): DateSchedule {
  // Calcular workHours a partir de start/end time
  const [startHour, startMin] = horario.horaInicioProgramada.split(':').map(Number);
  const [endHour, endMin] = horario.horaFinProgramada.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const workMinutes = endMinutes - startMinutes - (horario.descansoMinutos || 0);
  
  return {
    id: horario.idHorario,
    employeeId: horario.idUsuario,
    date: horario.fecha,
    startTime: horario.horaInicioProgramada,
    endTime: horario.horaFinProgramada,
    workHours: workMinutes,
    isActive: true, // No tenemos isActive en horarios_planificados, asumimos true
  };
}

/**
 * Mapea una Incidencia (español) a Incident (inglés)
 */
function mapIncidenciaToIncident(incidencia: Incidencia): Incident {
  // Mapeo inverso de tipos
  const typeMap: Record<string, string> = {
    "retraso": "late",
    "ausencia": "absence",
    "baja_medica": "absence",
    "vacaciones": "absence",
    "olvido_fichar": "forgot_clock_in",
    "otro": "early_departure",
  };
  
  // Mapeo inverso de estados
  const statusMap: Record<string, string> = {
    "pendiente": "pending",
    "justificada": "approved",
    "no_justificada": "rejected",
  };
  
  return {
    id: incidencia.idIncidencia,
    employeeId: incidencia.idUsuario,
    type: typeMap[incidencia.tipoIncidencia] || "early_departure",
    description: incidencia.descripcion,
    date: incidencia.fechaRegistro,
    status: statusMap[incidencia.estado] || "pending",
    createdAt: incidencia.fechaRegistro,
  };
}

// ============================================================================
// FUNCIONES REVERSE MAPPING: INGLÉS → ESPAÑOL (para INSERT/UPDATE)
// ============================================================================

/**
 * Mapea InsertTimeEntry a formato para insertar en Fichaje
 */
async function toFichajeInsert(entry: InsertTimeEntry): Promise<Omit<typeof fichajes.$inferInsert, 'idFichaje'>> {
  let horasTrabajadas = null;
  
  // Calcular horas trabajadas si existe clockOut
  if (entry.clockOut) {
    const clockIn = new Date(entry.clockIn);
    const clockOut = new Date(entry.clockOut);
    horasTrabajadas = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
  }
  
  // Determinar estado
  let estado = "pendiente";
  if (entry.clockOut) {
    estado = "completo";
  } else {
    estado = "incompleto";
  }
  
  return {
    idUsuario: entry.employeeId,
    idHorario: null, // Se vinculará después si existe horario correspondiente
    fecha: entry.date,
    horaEntrada: entry.clockIn,
    horaSalida: entry.clockOut || null,
    horasTrabajadas,
    estado,
  };
}

/**
 * Busca o crea departamento y retorna su ID
 */
async function getDepartamentoId(departmentName: string): Promise<string | null> {
  if (!departmentName) return null;
  
  // Buscar existente
  const [existing] = await db
    .select()
    .from(departamentos)
    .where(eq(departamentos.nombreDepartamento, departmentName))
    .limit(1);
  
  if (existing) return existing.idDepartamento;
  
  // Crear nuevo
  const [newDept] = await db
    .insert(departamentos)
    .values({ nombreDepartamento: departmentName, descripcion: null })
    .returning();
  
  return newDept.idDepartamento;
}

/**
 * Mapea InsertDateSchedule a formato para insertar en HorarioPlanificado
 */
function toHorarioPlanificadoInsert(schedule: any): Omit<typeof horariosPlanificados.$inferInsert, 'idHorario'> {
  // Calcular descansoMinutos basado en workHours si está disponible
  // workHours está en minutos y representa el tiempo de trabajo neto
  // descansoMinutos es el tiempo de descanso
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const totalMinutes = endMinutes - startMinutes;
  const workHours = schedule.workHours ?? totalMinutes;
  const descansoMinutos = totalMinutes - workHours;
  
  return {
    idUsuario: schedule.employeeId,
    fecha: schedule.date,
    horaInicioProgramada: schedule.startTime,
    horaFinProgramada: schedule.endTime,
    descansoMinutos: descansoMinutos > 0 ? descansoMinutos : 0,
  };
}

/**
 * Mapea InsertIncident a formato para insertar en Incidencia
 */
function toIncidenciaInsert(incident: InsertIncident): Omit<typeof incidencias.$inferInsert, 'idIncidencia'> {
  // Mapeo de tipos inglés → español
  const typeMap: Record<string, string> = {
    "late": "retraso",
    "absence": "ausencia",
    "early_departure": "otro",
    "forgot_clock_in": "olvido_fichar",
    "forgot_clock_out": "olvido_fichar",
  };
  
  // Mapeo de estados inglés → español
  const statusMap: Record<string, string> = {
    "pending": "pendiente",
    "approved": "justificada",
    "rejected": "no_justificada",
  };
  
  return {
    idUsuario: incident.employeeId,
    tipoIncidencia: typeMap[incident.type] || "otro",
    descripcion: incident.description,
    fechaRegistro: incident.date,
    estado: (incident.status && statusMap[incident.status]) || "pendiente",
  };
}

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
   * SELECT * FROM employees WHERE email = $1 LIMIT 1;
   * 
   * @param email - Dirección de correo electrónico del empleado
   * @returns Empleado encontrado o undefined si no existe
   */
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    // Usar tabla usuarios (español) y hacer join con departamentos
    const result = await db
      .select({
        usuario: usuarios,
        departamento: departamentos,
      })
      .from(usuarios)
      .leftJoin(departamentos, eq(usuarios.idDepartamento, departamentos.idDepartamento))
      .where(eq(usuarios.email, email))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return mapUsuarioToEmployee(result[0].usuario, result[0].departamento || undefined);
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
   * - Solo se devuelve información no sensible en el objeto User
   * 
   * @param email - Email del empleado
   * @param password - Contraseña en texto plano
   * @returns Objeto User con información básica si es válido, null si falla la autenticación
   */
  async authenticateEmployee(email: string, password: string): Promise<User | null> {
    // PASO 1: Buscar empleado en base de datos
    const employee = await this.getEmployeeByEmail(email);
    if (!employee) return null;

    // PASO 2: Verificar contraseña contra hash bcrypt
    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) return null;

    // PASO 3: Devolver solo información no sensible (sin password hash)
    return {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role as "admin" | "employee",
      employeeNumber: employee.employeeNumber,
    };
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
   * INSERT INTO employees (employeeNumber, firstName, lastName, email, password, role, department, position, hireDate, isActive)
   * VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
   * RETURNING *;
   * 
   * ERRORES POSIBLES:
   * - Violación de restricción única en email o employeeNumber
   * - Violación de restricciones de validación (NOT NULL, CHECK)
   * - Errores de conexión a base de datos
   * 
   * @param employeeData - Datos del empleado incluyendo contraseña en texto plano
   * @returns Empleado creado con ID generado y contraseña ya encriptada
   */
  async createEmployeeWithPassword(employeeData: CreateEmployee): Promise<Employee> {
    // PASO 1: Encriptar contraseña con bcrypt (factor de costo: 10)
    const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    
    // PASO 2: Buscar o crear departamento
    let departamentoId: string | null = null;
    let departamentoData: Departamento | undefined = undefined;
    
    if (employeeData.department) {
      // Buscar departamento existente
      const [existingDept] = await db
        .select()
        .from(departamentos)
        .where(eq(departamentos.nombreDepartamento, employeeData.department))
        .limit(1);
      
      if (existingDept) {
        departamentoId = existingDept.idDepartamento;
        departamentoData = existingDept;
      } else {
        // Crear nuevo departamento
        const [newDept] = await db
          .insert(departamentos)
          .values({
            nombreDepartamento: employeeData.department,
            descripcion: null,
          })
          .returning();
        departamentoId = newDept.idDepartamento;
        departamentoData = newDept;
      }
    }
    
    // PASO 3: Insertar usuario en tabla usuarios (español)
    const [usuario] = await db
      .insert(usuarios)
      .values({
        numEmpleado: employeeData.employeeNumber,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        email: employeeData.email,
        passwordHash: hashedPassword,
        fechaContratacion: employeeData.hireDate,
        activo: employeeData.isActive,
        rol: employeeData.role === "admin" ? "administrador" : "empleado",
        idDepartamento: departamentoId,
      })
      .returning();
      
    // PASO 4: Mapear a formato Employee (inglés) para compatibilidad
    return mapUsuarioToEmployee(usuario, departamentoData);
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
   * SELECT * FROM employees WHERE id = $1 LIMIT 1;
   * 
   * ⚠️  ADVERTENCIA DE SEGURIDAD:
   * Este método devuelve el registro completo incluyendo el hash de contraseña.
   * Las rutas API NUNCA deben serializar el campo 'password' en las respuestas.
   * Usar destructuring para omitir: const { password, ...safeEmployee } = employee
   * 
   * @param id - UUID o ID numérico del empleado
   * @returns Empleado encontrado o undefined si no existe
   */
  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await db
      .select({
        usuario: usuarios,
        departamento: departamentos,
      })
      .from(usuarios)
      .leftJoin(departamentos, eq(usuarios.idDepartamento, departamentos.idDepartamento))
      .where(eq(usuarios.idUsuario, id))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return mapUsuarioToEmployee(result[0].usuario, result[0].departamento || undefined);
  }

  /**
   * OBTENER TODOS LOS EMPLEADOS
   * ==========================
   * 
   * Recupera la lista completa de empleados del sistema.
   * Incluye tanto empleados activos como inactivos.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM employees ORDER BY id;
   * 
   * ⚠️  ADVERTENCIA DE SEGURIDAD:
   * Este método devuelve registros completos incluyendo hashes de contraseña.
   * Las rutas API deben omitir el campo 'password' usando:
   * employees.map(({password, ...safe}) => safe)
   * 
   * USO TÍPICO:
   * - Dashboard de administración
   * - Listados de empleados
   * - Reportes generales
   * 
   * @returns Array con todos los empleados (puede estar vacío)
   */
  async getEmployees(): Promise<Employee[]> {
    const results = await db
      .select({
        usuario: usuarios,
        departamento: departamentos,
      })
      .from(usuarios)
      .leftJoin(departamentos, eq(usuarios.idDepartamento, departamentos.idDepartamento));
    
    return results.map(r => mapUsuarioToEmployee(r.usuario, r.departamento || undefined));
  }

  /**
   * BUSCAR EMPLEADO POR NÚMERO DE EMPLEADO
   * ====================================
   * 
   * Busca un empleado usando su número de empleado (identificador empresarial).
   * Este es diferente del ID de base de datos y lo asigna la empresa.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM employees WHERE employeeNumber = $1 LIMIT 1;
   * 
   * USO TÍPICO:
   * - Verificación de duplicados en proceso de semilla
   * - Búsqueda rápida por código de empleado
   * - Integración con sistemas externos
   * 
   * @param employeeNumber - Código identificador del empleado (ej: "EMP001")
   * @returns Empleado encontrado o undefined si no existe
   */
  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    const result = await db
      .select({
        usuario: usuarios,
        departamento: departamentos,
      })
      .from(usuarios)
      .leftJoin(departamentos, eq(usuarios.idDepartamento, departamentos.idDepartamento))
      .where(eq(usuarios.numEmpleado, employeeNumber))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return mapUsuarioToEmployee(result[0].usuario, result[0].departamento || undefined);
  }

  /**
   * CREAR EMPLEADO (DELEGACIÓN)
   * ==========================
   * 
   * Método de conveniencia que delega a createEmployeeWithPassword.
   * Esto asegura que todas las creaciones de empleados:
   * 1. Encripten la contraseña adecuadamente
   * 2. Mantengan consistencia en los tipos
   * 3. Eviten duplicación de lógica
   * 
   * VENTAJAS DE LA DELEGACIÓN:
   * - Un solo punto de entrada para creación
   * - Garantiza encriptación de contraseña
   * - Mantiene DRY (Don't Repeat Yourself)
   * - Facilita futuras mejoras (ej: upserts)
   * 
   * @param employee - Datos completos del empleado con contraseña
   * @returns Empleado creado con ID asignado
   */
  async createEmployee(employee: CreateEmployee): Promise<Employee> {
    // Delegar a createEmployeeWithPassword para asegurar hashing y tipos correctos
    return this.createEmployeeWithPassword(employee);
  }

  /**
   * ACTUALIZAR EMPLEADO
   * ==================
   * 
   * Actualiza campos específicos de un empleado existente.
   * Permite actualización parcial - solo los campos proporcionados se modifican.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * UPDATE employees 
   * SET firstName = $1, lastName = $2, ... 
   * WHERE id = $N 
   * RETURNING *;
   * 
   * CAMPOS ACTUALIZABLES:
   * - Información personal (firstName, lastName)
   * - Datos laborales (department, position)
   * - Estado (isActive)
   * - Email (debe ser único)
   * 
   * NOTA: La contraseña NO se debe actualizar por este método ya que
   * InsertEmployee excluye el campo password. Para cambiar contraseñas
   * usar createEmployeeWithPassword o implementar método específico.
   * 
   * @param id - ID del empleado a actualizar
   * @param employee - Campos a modificar (actualización parcial)
   * @returns Empleado actualizado o undefined si no existía
   */
  async updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined> {
    // Preparar datos para actualización en tabla usuarios
    const updateData: any = {};
    
    if (employee.employeeNumber !== undefined) updateData.numEmpleado = employee.employeeNumber;
    if (employee.firstName !== undefined) updateData.firstName = employee.firstName;
    if (employee.lastName !== undefined) updateData.lastName = employee.lastName;
    if (employee.email !== undefined) updateData.email = employee.email;
    if (employee.hireDate !== undefined) updateData.fechaContratacion = employee.hireDate;
    if (employee.isActive !== undefined) updateData.activo = employee.isActive;
    // Note: role is not in InsertEmployee type, handled separately if needed
    
    // Si se actualiza el departamento, buscar o crear el ID correspondiente
    if (employee.department !== undefined) {
      updateData.idDepartamento = await getDepartamentoId(employee.department);
    }
    
    const [updatedUsuario] = await db
      .update(usuarios)
      .set(updateData)
      .where(eq(usuarios.idUsuario, id))
      .returning();
    
    if (!updatedUsuario) return undefined;
    
    // Obtener departamento para mapear correctamente
    let departamento: Departamento | undefined;
    if (updatedUsuario.idDepartamento) {
      const [dept] = await db
        .select()
        .from(departamentos)
        .where(eq(departamentos.idDepartamento, updatedUsuario.idDepartamento))
        .limit(1);
      departamento = dept;
    }
    
    return mapUsuarioToEmployee(updatedUsuario, departamento);
  }

  /**
   * ELIMINAR EMPLEADO
   * ================
   * 
   * Elimina permanentemente un empleado de la base de datos.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * DELETE FROM employees WHERE id = $1;
   * 
   * CONSIDERACIONES IMPORTANTES:
   * - Esta operación es IRREVERSIBLE
   * - Puede fallar si existen registros relacionados (foreign keys)
   * - En producción, considerar "soft delete" (isActive = false)
   * - Verificar cascadas en tablas relacionadas (timeEntries, schedules, incidents)
   * 
   * ALTERNATIVA RECOMENDADA:
   * En lugar de DELETE, usar: updateEmployee(id, { isActive: false })
   * 
   * @param id - ID del empleado a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db.delete(usuarios).where(eq(usuarios.idUsuario, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================
  // MÉTODOS DE REGISTROS DE TIEMPO
  // ==========================================
  
  /**
   * OBTENER REGISTRO DE TIEMPO POR ID
   * ================================
   * 
   * Recupera un registro específico de clock-in/clock-out.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM time_entries WHERE id = $1 LIMIT 1;
   * 
   * @param id - ID único del registro de tiempo
   * @returns Registro encontrado o undefined si no existe
   */
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [fichaje] = await db.select().from(fichajes).where(eq(fichajes.idFichaje, id));
    return fichaje ? mapFichajeToTimeEntry(fichaje) : undefined;
  }

  /**
   * OBTENER TODOS LOS REGISTROS DE TIEMPO
   * ====================================
   * 
   * Recupera todos los registros de tiempo del sistema.
   * Útil para reportes generales y dashboards administrativos.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM time_entries ORDER BY id;
   * 
   * NOTA: En sistemas grandes, considerar paginación o filtros por fecha
   * para evitar cargar demasiados registros en memoria.
   * 
   * @returns Array con todos los registros de tiempo
   */
  async getTimeEntries(): Promise<TimeEntry[]> {
    const fichajesData = await db.select().from(fichajes);
    return fichajesData.map(mapFichajeToTimeEntry);
  }

  /**
   * OBTENER REGISTROS DE TIEMPO POR EMPLEADO
   * =======================================
   * 
   * Recupera todos los registros de un empleado específico.
   * Útil para cálculos de nómina y reportes individuales.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM time_entries WHERE employeeId = $1 ORDER BY date DESC;
   * 
   * USO TÍPICO:
   * - Vista de historial del empleado
   * - Cálculos de horas trabajadas por periodo
   * - Reportes de asistencia individual
   * 
   * @param employeeId - ID del empleado
   * @returns Array con todos los registros del empleado (ordenados por fecha)
   */
  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    const fichajesData = await db.select().from(fichajes).where(eq(fichajes.idUsuario, employeeId));
    return fichajesData.map(mapFichajeToTimeEntry);
  }

  /**
   * OBTENER REGISTROS DE TIEMPO POR FECHA
   * ====================================
   * 
   * Recupera todos los registros de una fecha específica.
   * Útil para reportes diarios y dashboards de asistencia.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM time_entries WHERE date = $1 ORDER BY clockIn;
   * 
   * FORMATO DE FECHA:
   * Debe ser string en formato ISO (YYYY-MM-DD)
   * Ejemplo: "2024-03-15"
   * 
   * USO TÍPICO:
   * - Dashboard de asistencia diaria
   * - Reportes de quién está presente/ausente
   * - Control de horarios por día
   * 
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Array con todos los registros de esa fecha
   */
  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    const fichajesData = await db.select().from(fichajes).where(eq(fichajes.fecha, date));
    return fichajesData.map(mapFichajeToTimeEntry);
  }

  /**
   * CREAR REGISTRO DE TIEMPO CON CÁLCULO AUTOMÁTICO
   * =============================================
   * 
   * Crea un nuevo registro de tiempo con cálculo automático de horas trabajadas.
   * 
   * FLUJO DE PROCESAMIENTO:
   * 1. Verifica si hay clockOut para determinar si calcular horas
   * 2. Si clockOut existe: calcula diferencia en minutos entre clockIn y clockOut
   * 3. Si clockOut es null: deja totalHours como null (entrada sin salida)
   * 4. Inserta en base de datos con el cálculo ya hecho
   * 
   * CÁLCULO DE HORAS:
   * - Se calcula en MINUTOS, no horas decimales
   * - Fórmula: (clockOut.getTime() - clockIn.getTime()) / (1000 * 60)
   * - Math.floor() redondea hacia abajo para evitar fracciones de minuto
   * 
   * CASOS DE USO:
   * - Clock-in: solo clockIn, clockOut = null, totalHours = null
   * - Clock-out: clockIn y clockOut ambos presentes, totalHours calculado
   * - Corrección manual: ambos timestamps + cálculo automático
   * 
   * CONSULTA SQL EQUIVALENTE:
   * INSERT INTO time_entries (employeeId, clockIn, clockOut, date, totalHours)
   * VALUES ($1, $2, $3, $4, $5)
   * RETURNING *;
   * 
   * @param insertTimeEntry - Datos del registro (clockIn requerido, clockOut opcional)
   * @returns Registro creado con totalHours calculado automáticamente
   */
  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    // Usar función helper para mapear a formato español
    const fichajeData = await toFichajeInsert(insertTimeEntry);
    
    // Buscar horario planificado correspondiente si existe
    const horarioMatch = await db
      .select()
      .from(horariosPlanificados)
      .where(
        and(
          eq(horariosPlanificados.idUsuario, insertTimeEntry.employeeId),
          eq(horariosPlanificados.fecha, insertTimeEntry.date)
        )
      )
      .limit(1);
    
    if (horarioMatch.length > 0) {
      fichajeData.idHorario = horarioMatch[0].idHorario;
    }
    
    // Insertar en tabla fichajes (español)
    const [fichaje] = await db
      .insert(fichajes)
      .values(fichajeData)
      .returning();
      
    // Mapear de vuelta a TimeEntry (inglés) para compatibilidad
    return mapFichajeToTimeEntry(fichaje);
  }

  /**
   * ACTUALIZAR REGISTRO DE TIEMPO CON RECÁLCULO
   * =========================================
   * 
   * Actualiza un registro existente y recalcula automáticamente las horas trabajadas.
   * 
   * PROCESO COMPLEJO EN 3 ETAPAS:
   * 1. RECUPERAR: Busca el registro actual en base de datos
   * 2. COMBINAR: Mezcla datos existentes con cambios proporcionados
   * 3. RECALCULAR: Recalcula totalHours con los datos combinados
   * 4. ACTUALIZAR: Guarda en base de datos con nuevo cálculo
   * 
   * LÓGICA DE RECÁLCULO:
   * - Si ambos clockIn y clockOut están presentes después de la mezcla: calcular
   * - Si alguno falta: totalHours = null
   * - Siempre usa los valores FINALES (existentes + actualizaciones)
   * 
   * CASOS COMUNES:
   * - Agregar clockOut a entrada existente (clock-out)
   * - Corregir timestamps incorrectos
   * - Cambiar fecha del registro
   * - Ajustes manuales por administrador
   * 
   * CONSULTA SQL EQUIVALENTE:
   * UPDATE time_entries 
   * SET clockOut = $1, totalHours = $2 
   * WHERE id = $3 
   * RETURNING *;
   * 
   * @param id - ID del registro a actualizar
   * @param timeEntryData - Campos a modificar (actualización parcial)
   * @returns Registro actualizado con horas recalculadas o undefined si no existía
   */
  async updateTimeEntry(id: string, timeEntryData: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    // ETAPA 1: Recuperar registro existente
    const existingEntry = await this.getTimeEntry(id);
    if (!existingEntry) return undefined;

    // ETAPA 2: Combinar datos existentes con cambios
    const updatedData = { ...existingEntry, ...timeEntryData };
    
    // ETAPA 3: Recalcular horas trabajadas con datos combinados
    let totalHours = null;
    if (updatedData.clockIn && updatedData.clockOut) {
      const clockIn = new Date(updatedData.clockIn);
      const clockOut = new Date(updatedData.clockOut);
      totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60));
    }

    // ETAPA 4: Actualizar en base de datos (tabla fichajes)
    const updateData: any = {};
    
    if (timeEntryData.clockIn !== undefined) updateData.horaEntrada = timeEntryData.clockIn;
    if (timeEntryData.clockOut !== undefined) updateData.horaSalida = timeEntryData.clockOut;
    if (timeEntryData.date !== undefined) updateData.fecha = timeEntryData.date;
    if (timeEntryData.employeeId !== undefined) updateData.idUsuario = timeEntryData.employeeId;
    
    // Calcular horas trabajadas y estado
    if (totalHours !== null) {
      updateData.horasTrabajadas = totalHours;
      updateData.estado = "completo";
    } else if (updatedData.clockIn && !updatedData.clockOut) {
      updateData.estado = "incompleto";
    }
    
    const [updatedFichaje] = await db
      .update(fichajes)
      .set(updateData)
      .where(eq(fichajes.idFichaje, id))
      .returning();
      
    if (!updatedFichaje) return undefined;
    
    return mapFichajeToTimeEntry(updatedFichaje);
  }

  /**
   * ELIMINAR REGISTRO DE TIEMPO
   * ==========================
   * 
   * Elimina permanentemente un registro de tiempo de la base de datos.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * DELETE FROM time_entries WHERE id = $1;
   * 
   * CONSIDERACIONES IMPORTANTES:
   * - Esta operación es IRREVERSIBLE
   * - Se pierde historial de horas trabajadas
   * - Puede afectar cálculos de nómina si ya se procesaron
   * - En producción, considerar audit logs antes de eliminar
   * 
   * CASOS DE USO VÁLIDOS:
   * - Corrección de errores de captura
   * - Registros duplicados accidentales
   * - Limpieza de datos de prueba
   * 
   * RESPUESTA:
   * - true: El registro existía y se eliminó correctamente
   * - false: El registro no existía (ID inválido)
   * 
   * @param id - ID del registro de tiempo a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteTimeEntry(id: string): Promise<boolean> {
    const result = await db.delete(fichajes).where(eq(fichajes.idFichaje, id));
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
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM incidents WHERE id = $1 LIMIT 1;
   * 
   * @param id - ID único de la incidencia
   * @returns Incidencia encontrada o undefined si no existe
   */
  async getIncident(id: string): Promise<Incident | undefined> {
    const [incidencia] = await db.select().from(incidencias).where(eq(incidencias.idIncidencia, id));
    return incidencia ? mapIncidenciaToIncident(incidencia) : undefined;
  }

  /**
   * OBTENER TODAS LAS INCIDENCIAS
   * ============================
   * 
   * Recupera todas las incidencias registradas en el sistema.
   * Incluye incidencias de todos los empleados y todos los estados.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM incidents ORDER BY incidentDate DESC;
   * 
   * TIPOS DE INCIDENCIA:
   * - Tardanza: Llegada fuera de horario establecido
   * - Falta: Ausencia sin justificar
   * - Accidente: Incidente de seguridad laboral
   * - Disciplinaria: Violación de políticas
   * - Other: Otros tipos de incidencia
   * 
   * USO TÍPICO:
   * - Dashboard de recursos humanos
   * - Reportes de incidencias generales
   * - Análisis de tendencias de comportamiento
   * 
   * @returns Array con todas las incidencias del sistema
   */
  async getIncidents(): Promise<Incident[]> {
    const incidenciasList = await db.select().from(incidencias);
    return incidenciasList.map(mapIncidenciaToIncident);
  }

  /**
   * OBTENER INCIDENCIAS POR EMPLEADO
   * ===============================
   * 
   * Recupera todas las incidencias de un empleado específico.
   * Útil para evaluar el historial individual.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM incidents WHERE employeeId = $1 ORDER BY incidentDate DESC;
   * 
   * USO TÍPICO:
   * - Historial disciplinario del empleado
   * - Evaluación de desempeño
   * - Procesos administrativos
   * - Documentación para escalaciones
   * 
   * CASOS DE ANÁLISIS:
   * - Frecuencia de tardanzas
   * - Patrones de comportamiento
   * - Progreso en medidas correctivas
   * - Justificación para acciones disciplinarias
   * 
   * @param employeeId - ID del empleado
   * @returns Array con incidencias del empleado ordenadas por fecha
   */
  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    const incidenciasList = await db.select().from(incidencias).where(eq(incidencias.idUsuario, employeeId));
    return incidenciasList.map(mapIncidenciaToIncident);
  }

  /**
   * CREAR INCIDENCIA
   * ===============
   * 
   * Registra una nueva incidencia en el sistema.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * INSERT INTO incidents (employeeId, incidentType, incidentDate, description, status)
   * VALUES ($1, $2, $3, $4, $5)
   * RETURNING *;
   * 
   * DATOS REQUERIDOS:
   * - employeeId: ID del empleado involucrado
   * - incidentType: Tipo de incidencia (enum)
   * - incidentDate: Fecha del incidente
   * - description: Descripción detallada
   * - status: Estado (pending, resolved, escalated)
   * 
   * FLUJO TÍPICO:
   * 1. Se detecta incidencia (manual o automático)
   * 2. Se documenta con detalles
   * 3. Se asigna estado inicial (pending)
   * 4. Se almacena para seguimiento
   * 
   * CASOS AUTOMÁTICOS:
   * - Tardanza detectada por sistema de asistencia
   * - Ausencia sin justificar
   * 
   * CASOS MANUALES:
   * - Reportes de supervisores
   * - Incidentes de seguridad
   * - Violaciones disciplinarias
   * 
   * @param insertIncident - Datos de la incidencia
   * @returns Incidencia creada con ID asignado
   */
  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const incidenciaData = toIncidenciaInsert(insertIncident);
    const [incidencia] = await db
      .insert(incidencias)
      .values(incidenciaData)
      .returning();
    return mapIncidenciaToIncident(incidencia);
  }

  /**
   * ACTUALIZAR INCIDENCIA
   * ====================
   * 
   * Actualiza el estado o detalles de una incidencia existente.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * UPDATE incidents 
   * SET status = $1, description = $2 
   * WHERE id = $3 
   * RETURNING *;
   * 
   * CAMPOS ACTUALIZABLES:
   * - status: Cambio de estado (pending → resolved → escalated)
   * - description: Añadir detalles o aclaraciones
   * - incidentDate: Corrección de fecha (casos excepcionales)
   * 
   * FLUJO DE ESTADOS:
   * pending → under_review → resolved
   *     ↓
   * escalated (casos graves)
   * 
   * USO TÍPICO:
   * - Seguimiento por parte de RRHH
   * - Documentación de acciones tomadas
   * - Actualización de progreso
   * - Cierre de casos resueltos
   * 
   * @param id - ID de la incidencia a actualizar
   * @param incidentData - Campos a modificar
   * @returns Incidencia actualizada o undefined si no existía
   */
  async updateIncident(id: string, incidentData: Partial<InsertIncident>): Promise<Incident | undefined> {
    // Preparar datos para actualización en incidencias
    const updateData: any = {};
    
    if (incidentData.employeeId !== undefined) updateData.idUsuario = incidentData.employeeId;
    if (incidentData.description !== undefined) updateData.descripcion = incidentData.description;
    if (incidentData.date !== undefined) updateData.fechaRegistro = incidentData.date;
    
    // Mapear tipo de incidencia
    if (incidentData.type !== undefined) {
      const typeMap: Record<string, string> = {
        "late": "retraso",
        "absence": "ausencia",
        "early_departure": "otro",
        "forgot_clock_in": "olvido_fichar",
        "forgot_clock_out": "olvido_fichar",
      };
      updateData.tipoIncidencia = typeMap[incidentData.type] || "otro";
    }
    
    // Mapear estado
    if (incidentData.status !== undefined) {
      const statusMap: Record<string, string> = {
        "pending": "pendiente",
        "approved": "justificada",
        "rejected": "no_justificada",
      };
      updateData.estado = statusMap[incidentData.status] || "pendiente";
    }
    
    const [updatedIncidencia] = await db
      .update(incidencias)
      .set(updateData)
      .where(eq(incidencias.idIncidencia, id))
      .returning();
    
    return updatedIncidencia ? mapIncidenciaToIncident(updatedIncidencia) : undefined;
  }

  /**
   * ELIMINAR INCIDENCIA
   * ==================
   * 
   * Elimina permanentemente una incidencia del sistema.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * DELETE FROM incidents WHERE id = $1;
   * 
   * CONSIDERACIONES LEGALES:
   * - Las incidencias pueden ser documentación legal importante
   * - En muchas jurisdicciones, los registros laborales deben conservarse
   * - Considerar archivo en lugar de eliminación
   * - Verificar políticas de retención de datos
   * 
   * CASOS VÁLIDOS PARA ELIMINACIÓN:
   * - Registros duplicados
   * - Errores de captura
   * - Datos de prueba
   * - Incidencias registradas por error
   * 
   * ALTERNATIVA RECOMENDADA:
   * updateIncident(id, { status: 'archived' })
   * 
   * @param id - ID de la incidencia a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteIncident(id: string): Promise<boolean> {
    const result = await db.delete(incidencias).where(eq(incidencias.idIncidencia, id));
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
    
    // Validar que la hora de fin sea posterior a la de inicio
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
   * Estos horarios sobrescriben los horarios semanales normales.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM date_schedules ORDER BY employeeId, date;
   * 
   * USO TÍPICO:
   * - Vista global de excepciones de horarios
   * - Reportes de cobertura por fecha
   * - Dashboard administrativo de calendario
   * 
   * @returns Array con todos los horarios por fecha del sistema
   */
  async getDateSchedules(): Promise<DateSchedule[]> {
    const horarios = await db.select().from(horariosPlanificados);
    return horarios.map(mapHorarioPlanificadoToDateSchedule);
  }

  /**
   * OBTENER HORARIOS POR FECHA DE EMPLEADO
   * =====================================
   * 
   * Recupera horarios específicos por fecha de un empleado.
   * Útil para mostrar calendario personalizado del empleado.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * SELECT * FROM date_schedules WHERE employeeId = $1 ORDER BY date;
   * 
   * USO TÍPICO:
   * - Calendario personal del empleado
   * - Vista de horarios excepcionales
   * - Validación de asistencia vs horario esperado
   * 
   * @param employeeId - ID del empleado
   * @returns Array con horarios por fecha del empleado
   */
  async getDateSchedulesByEmployee(employeeId: string): Promise<DateSchedule[]> {
    const horarios = await db.select().from(horariosPlanificados).where(eq(horariosPlanificados.idUsuario, employeeId));
    return horarios.map(mapHorarioPlanificadoToDateSchedule);
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
    const conditions = [eq(horariosPlanificados.idUsuario, employeeId)];
    
    // Agregar filtros de fecha si están presentes
    if (startDate && endDate) {
      conditions.push(gte(horariosPlanificados.fecha, startDate));
      conditions.push(lte(horariosPlanificados.fecha, endDate));
    } else if (startDate) {
      conditions.push(gte(horariosPlanificados.fecha, startDate));
    } else if (endDate) {
      conditions.push(lte(horariosPlanificados.fecha, endDate));
    }
    
    const horarios = await db.select().from(horariosPlanificados).where(and(...conditions));
    return horarios.map(mapHorarioPlanificadoToDateSchedule);
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
      const horarios = await db.select().from(horariosPlanificados);
      return horarios.map(mapHorarioPlanificadoToDateSchedule);
    }
    
    const conditions = [];
    
    // Agregar filtros de fecha si están presentes
    if (startDate && endDate) {
      conditions.push(gte(horariosPlanificados.fecha, startDate));
      conditions.push(lte(horariosPlanificados.fecha, endDate));
    } else if (startDate) {
      conditions.push(gte(horariosPlanificados.fecha, startDate));
    } else if (endDate) {
      conditions.push(lte(horariosPlanificados.fecha, endDate));
    }
    
    const horarios = await db.select().from(horariosPlanificados).where(and(...conditions));
    return horarios.map(mapHorarioPlanificadoToDateSchedule);
  }

  /**
   * CREAR HORARIO ESPECÍFICO POR FECHA
   * =================================
   * 
   * Crea un horario para una fecha específica (sobrescribe horario semanal).
   * 
   * CONSULTA SQL EQUIVALENTE:
   * INSERT INTO date_schedules (employeeId, date, startTime, endTime, workHours, isActive)
   * VALUES ($1, $2, $3, $4, $5, $6)
   * RETURNING *;
   * 
   * DATOS REQUERIDOS:
   * - employeeId: ID del empleado
   * - date: Fecha específica (formato YYYY-MM-DD)
   * - startTime: Hora de inicio (formato HH:MM)
   * - endTime: Hora de finalización (formato HH:MM)
   * - workHours: Se calcula automáticamente en minutos
   * - isActive: Si el horario está activo (default: true)
   * 
   * USO TÍPICO:
   * - Horarios de días festivos
   * - Horas extras programadas
   * - Turnos especiales por eventos
   * - Excepciones temporales de horario
   * 
   * @param insertDateSchedule - Datos del horario para fecha específica
   * @returns Horario por fecha creado con ID asignado
   */
  async createDateSchedule(insertDateSchedule: InsertDateSchedule): Promise<DateSchedule> {
    // Calcular workHours automáticamente si no está presente
    const scheduleWithHours = {
      ...insertDateSchedule,
      workHours: (insertDateSchedule as any).workHours ?? this.calculateWorkHours(insertDateSchedule.startTime, insertDateSchedule.endTime)
    };
    
    // Convertir a formato HorarioPlanificado
    const horarioPlanificadoData = toHorarioPlanificadoInsert(scheduleWithHours);
    
    const [horario] = await db
      .insert(horariosPlanificados)
      .values(horarioPlanificadoData)
      .returning();
    
    return mapHorarioPlanificadoToDateSchedule(horario);
  }

  /**
   * ACTUALIZAR HORARIO POR FECHA
   * ===========================
   * 
   * Actualiza campos específicos de un horario por fecha existente.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * UPDATE date_schedules 
   * SET startTime = $1, endTime = $2, isActive = $3, workHours = $4
   * WHERE id = $5 
   * RETURNING *;
   * 
   * CAMPOS ACTUALIZABLES:
   * - startTime: Cambiar hora de inicio
   * - endTime: Cambiar hora de finalización
   * - date: Mover a otra fecha (cuidado con duplicados)
   * - isActive: Activar/desactivar horario
   * - workHours: Se recalcula automáticamente
   * 
   * CASOS COMUNES:
   * - Ajustar horarios por cambios de última hora
   * - Extender/reducir jornada específica
   * - Desactivar temporalmente un horario especial
   * 
   * @param id - ID del horario por fecha a actualizar
   * @param dateScheduleData - Campos a modificar
   * @returns Horario por fecha actualizado o undefined si no existía
   */
  async updateDateSchedule(id: string, dateScheduleData: Partial<InsertDateSchedule>): Promise<DateSchedule | undefined> {
    // Preparar datos para actualización en horariosPlanificados
    const updateData: any = {};
    
    if (dateScheduleData.employeeId !== undefined) updateData.idUsuario = dateScheduleData.employeeId;
    if (dateScheduleData.date !== undefined) updateData.fecha = dateScheduleData.date;
    if (dateScheduleData.startTime !== undefined) updateData.horaInicioProgramada = dateScheduleData.startTime;
    if (dateScheduleData.endTime !== undefined) updateData.horaFinProgramada = dateScheduleData.endTime;
    
    // Si se actualiza start/endTime, recalcular descansoMinutos
    if (dateScheduleData.startTime !== undefined || dateScheduleData.endTime !== undefined) {
      // Obtener el horario actual para tener valores completos
      const [current] = await db.select().from(horariosPlanificados).where(eq(horariosPlanificados.idHorario, id)).limit(1);
      if (current) {
        const startTime = dateScheduleData.startTime ?? current.horaInicioProgramada;
        const endTime = dateScheduleData.endTime ?? current.horaFinProgramada;
        
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        const workHours = this.calculateWorkHours(startTime, endTime);
        const descansoMinutos = totalMinutes - workHours;
        updateData.descansoMinutos = descansoMinutos > 0 ? descansoMinutos : 0;
      }
    }
    
    const [updatedHorario] = await db
      .update(horariosPlanificados)
      .set(updateData)
      .where(eq(horariosPlanificados.idHorario, id))
      .returning();
    
    return updatedHorario ? mapHorarioPlanificadoToDateSchedule(updatedHorario) : undefined;
  }

  /**
   * ELIMINAR HORARIO POR FECHA
   * =========================
   * 
   * Elimina permanentemente un horario específico por fecha.
   * Al eliminarlo, se vuelve al horario semanal normal para esa fecha.
   * 
   * CONSULTA SQL EQUIVALENTE:
   * DELETE FROM date_schedules WHERE id = $1;
   * 
   * CONSIDERACIONES:
   * - Operación irreversible
   * - El empleado usará el horario semanal normal para esa fecha
   * - Puede afectar cálculos de horas programadas
   * - Alternativa: updateDateSchedule(id, { isActive: false })
   * 
   * @param id - ID del horario por fecha a eliminar
   * @returns true si se eliminó, false si no existía
   */
  async deleteDateSchedule(id: string): Promise<boolean> {
    const result = await db.delete(horariosPlanificados).where(eq(horariosPlanificados.idHorario, id));
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * CREAR HORARIOS MASIVOS POR FECHA CON ANTI-DUPLICADOS
   * ===================================================
   * 
   * Crea múltiples horarios específicos por fecha en una operación.
   * Ideal para planificación de calendario anual con lógica anti-duplicados.
   * 
   * PROCESO EN 4 ETAPAS:
   * 
   * 1. VALIDACIÓN: Verifica que hay horarios para crear
   * 2. CONSULTA EXISTENTES: Busca horarios existentes para evitar duplicados
   * 3. FILTRADO: Identifica cuáles horarios NO existen ya
   * 4. INSERCIÓN MASIVA: Crea solo los horarios únicos
   * 
   * LÓGICA ANTI-DUPLICADOS:
   * Un horario se considera duplicado si COINCIDEN:
   * - employeeId (mismo empleado)
   * - date (misma fecha específica)
   * - startTime (misma hora inicio)
   * - endTime (misma hora fin)
   * - isActive = true (solo horarios activos)
   * 
   * EJEMPLO DE USO:
   * bulkData = {
   *   schedules: [
   *     {
   *       employeeId: "123",
   *       date: "2024-12-25",
   *       startTime: "08:00",
   *       endTime: "14:00"
   *     },
   *     {
   *       employeeId: "123",
   *       date: "2024-12-26",
   *       startTime: "09:00",
   *       endTime: "15:00"
   *     }
   *   ]
   * }
   * 
   * VENTAJAS:
   * - Una sola operación de insert para múltiples horarios
   * - Prevención automática de duplicados
   * - Ideal para calendarios anuales
   * - Manejo eficiente de grandes volúmenes
   * 
   * @param bulkData - Datos con array de horarios por fecha
   * @returns Array de horarios por fecha creados (solo los nuevos)
   */
  async createBulkDateSchedules(bulkData: BulkDateScheduleCreate): Promise<DateSchedule[]> {
    if (!bulkData.schedules || bulkData.schedules.length === 0) {
      return [];
    }

    // PASO 1: Transformar datos bulk en array de horarios individuales con horas calculadas
    const schedulesToCreate = bulkData.schedules.map(schedule => {
      const workHours = (schedule as any).workHours ?? this.calculateWorkHours(schedule.startTime, schedule.endTime);
      return {
        employeeId: schedule.employeeId,
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        workHours: workHours,
        isActive: schedule.isActive ?? true
      };
    });

    // PASO 2: Obtener todos los empleados únicos de los horarios a crear
    const employeeIds = Array.from(new Set(schedulesToCreate.map(s => s.employeeId)));
    
    // PASO 3: Obtener horarios existentes para todos los empleados
    const existingSchedules = await db.select()
      .from(horariosPlanificados)
      .where(inArray(horariosPlanificados.idUsuario, employeeIds));

    // PASO 4: Filtrar horarios que NO existen (evitar duplicados)
    const uniqueSchedules = schedulesToCreate.filter(newSchedule => {
      return !existingSchedules.some(existing => 
        existing.idUsuario === newSchedule.employeeId &&
        existing.fecha === newSchedule.date &&
        existing.horaInicioProgramada === newSchedule.startTime &&
        existing.horaFinProgramada === newSchedule.endTime
      );
    });

    // PASO 5: Si no hay horarios únicos que crear, retornar array vacío
    if (uniqueSchedules.length === 0) {
      return [];
    }

    // PASO 6: Convertir a formato HorarioPlanificado para inserción
    const horariosToInsert = uniqueSchedules.map(schedule => toHorarioPlanificadoInsert(schedule));

    // PASO 7: Inserción masiva de horarios únicos
    const createdHorarios = await db
      .insert(horariosPlanificados)
      .values(horariosToInsert)
      .returning();

    return createdHorarios.map(mapHorarioPlanificadoToDateSchedule);
  }
}

/**
 * ============================================================================
 * NUEVA LÓGICA DE FICHAJES Y JORNADA DIARIA
 * ============================================================================
 * 
 * Sistema basado en eventos individuales de fichaje que actualiza
 * automáticamente la tabla jornada_diaria consolidada.
 */

/**
 * Calcula y actualiza la jornada diaria basándose en todos los fichajes del día
 */
async function calcularYActualizarJornada(employeeId: string, fecha: string): Promise<void> {
  // 1. Obtener todos los fichajes del día ordenados por timestamp
  const fichajesDelDia = await db
    .select()
    .from(fichajes)
    .where(
      sql`DATE(${fichajes.timestampRegistro}) = ${fecha} AND ${fichajes.idEmpleado} = ${employeeId}`
    )
    .orderBy(fichajes.timestampRegistro);

  // 2. Calcular valores consolidados
  let horaInicio: Date | null = null;
  let horaFin: Date | null = null;
  let horasTrabajadas = 0; // en minutos
  let horasPausas = 0; // en minutos
  let estado: 'abierta' | 'cerrada' = 'abierta';

  // Variables para emparejar entradas/salidas y pausas
  let ultimaEntrada: Date | null = null;
  let ultimaPausaInicio: Date | null = null;

  for (const fichaje of fichajesDelDia) {
    const timestamp = fichaje.timestampRegistro;

    if (fichaje.tipoRegistro === 'entrada') {
      if (!horaInicio) horaInicio = timestamp;
      ultimaEntrada = timestamp;
    } else if (fichaje.tipoRegistro === 'salida') {
      horaFin = timestamp;
      // Si hay una entrada previa, calcular tiempo trabajado
      if (ultimaEntrada) {
        const minutos = Math.floor((timestamp.getTime() - ultimaEntrada.getTime()) / (1000 * 60));
        horasTrabajadas += minutos;
        ultimaEntrada = null;
      }
    } else if (fichaje.tipoRegistro === 'pausa_inicio') {
      ultimaPausaInicio = timestamp;
    } else if (fichaje.tipoRegistro === 'pausa_fin') {
      // Si hay un inicio de pausa previo, calcular tiempo de pausa
      if (ultimaPausaInicio) {
        const minutos = Math.floor((timestamp.getTime() - ultimaPausaInicio.getTime()) / (1000 * 60));
        horasPausas += minutos;
        ultimaPausaInicio = null;
      }
    }
  }

  // Determinar estado (abierta si hay entrada sin salida o pausa sin fin)
  if (ultimaEntrada !== null || ultimaPausaInicio !== null) {
    estado = 'abierta';
  } else if (horaFin !== null) {
    estado = 'cerrada';
  }

  // 3. Calcular horas extra (si hay turno asignado)
  let horasExtra = 0;
  const turnoDelDia = await db
    .select()
    .from(horariosPlanificados)
    .where(
      and(
        eq(horariosPlanificados.idEmpleado, employeeId),
        eq(horariosPlanificados.fecha, fecha)
      )
    )
    .limit(1);

  if (turnoDelDia.length > 0 && horasTrabajadas > 0) {
    const turno = turnoDelDia[0];
    const [startHour, startMin] = turno.horaInicioPrevista.split(':').map(Number);
    const [endHour, endMin] = turno.horaFinPrevista.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const minutosPrevistos = endMinutes - startMinutes;

    if (horasTrabajadas > minutosPrevistos) {
      horasExtra = horasTrabajadas - minutosPrevistos;
    }
  }

  // 4. Hacer upsert en jornada_diaria
  const existingJornada = await db
    .select()
    .from(jornadaDiaria)
    .where(
      and(
        eq(jornadaDiaria.idEmpleado, employeeId),
        eq(jornadaDiaria.fecha, fecha)
      )
    )
    .limit(1);

  const jornadaData = {
    idEmpleado: employeeId,
    fecha,
    horaInicio,
    horaFin,
    horasTrabajadas,
    horasPausas,
    horasExtra,
    estado,
  };

  if (existingJornada.length > 0) {
    // Update
    await db
      .update(jornadaDiaria)
      .set(jornadaData)
      .where(eq(jornadaDiaria.idJornada, existingJornada[0].idJornada));
  } else {
    // Insert
    await db
      .insert(jornadaDiaria)
      .values(jornadaData);
  }
}

/**
 * Funciones públicas exportadas para fichajes y jornadas
 */
export const fichajesService = {
  /**
   * Crear un nuevo fichaje y actualizar jornada automáticamente
   */
  async crearFichaje(data: InsertFichaje): Promise<Fichaje> {
    // 1. Insertar fichaje
    const [nuevoFichaje] = await db
      .insert(fichajes)
      .values(data)
      .returning();

    // 2. Obtener fecha del fichaje
    const fecha = nuevoFichaje.timestampRegistro.toISOString().split('T')[0];

    // 3. Actualizar jornada diaria
    await calcularYActualizarJornada(nuevoFichaje.idEmpleado, fecha);

    return nuevoFichaje;
  },

  /**
   * Obtener fichajes de un empleado en un rango de fechas
   */
  async obtenerFichajes(employeeId: string, startDate?: string, endDate?: string): Promise<Fichaje[]> {
    let conditions = [eq(fichajes.idEmpleado, employeeId)];

    if (startDate) {
      conditions.push(sql`DATE(${fichajes.timestampRegistro}) >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`DATE(${fichajes.timestampRegistro}) <= ${endDate}`);
    }

    return await db
      .select()
      .from(fichajes)
      .where(and(...conditions))
      .orderBy(fichajes.timestampRegistro);
  },

  /**
   * Obtener jornadas de un empleado en un rango de fechas
   */
  async obtenerJornadas(employeeId: string, startDate?: string, endDate?: string): Promise<JornadaDiaria[]> {
    let conditions = [eq(jornadaDiaria.idEmpleado, employeeId)];

    if (startDate) {
      conditions.push(gte(jornadaDiaria.fecha, startDate));
    }
    if (endDate) {
      conditions.push(lte(jornadaDiaria.fecha, endDate));
    }

    return await db
      .select()
      .from(jornadaDiaria)
      .where(and(...conditions))
      .orderBy(jornadaDiaria.fecha);
  },

  /**
   * Obtener jornada actual (hoy) de un empleado
   */
  async obtenerJornadaActual(employeeId: string): Promise<JornadaDiaria | null> {
    const hoy = new Date().toISOString().split('T')[0];
    
    const jornadas = await db
      .select()
      .from(jornadaDiaria)
      .where(
        and(
          eq(jornadaDiaria.idEmpleado, employeeId),
          eq(jornadaDiaria.fecha, hoy)
        )
      )
      .limit(1);

    return jornadas[0] || null;
  },

  /**
   * Obtener último fichaje de un empleado (para determinar si debe fichar entrada o salida)
   */
  async obtenerUltimoFichaje(employeeId: string): Promise<Fichaje | null> {
    const hoy = new Date().toISOString().split('T')[0];
    
    const fichajesHoy = await db
      .select()
      .from(fichajes)
      .where(
        and(
          eq(fichajes.idEmpleado, employeeId),
          sql`DATE(${fichajes.timestampRegistro}) = ${hoy}`
        )
      )
      .orderBy(sql`${fichajes.timestampRegistro} DESC`)
      .limit(1);

    return fichajesHoy[0] || null;
  }
};

/**
 * INSTANCIA GLOBAL DE ALMACENAMIENTO
 * =================================
 * 
 * Se exporta una instancia única de DatabaseStorage para usar en todo el sistema.
 * Esta instancia mantiene la configuración de conexión y proporciona acceso
 * centralizado a todas las operaciones de base de datos.
 * 
 * PATRÓN SINGLETON:
 * - Una sola instancia para toda la aplicación
 * - Evita múltiples conexiones innecesarias
 * - Facilita el testing (se puede mockear esta instancia)
 * - Consistencia en el acceso a datos
 * 
 * USO EN EL SISTEMA:
 * - Las rutas API importan esta instancia
 * - Los procesos de semilla la utilizan
 * - Tests pueden crear mocks sobre esta instancia
 * 
 * CONFIGURACIÓN:
 * La conexión a base de datos se configura en './db' y se
 * inyecta automáticamente al crear la instancia.
 */
export const storage = new DatabaseStorage();