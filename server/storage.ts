/**
 * SISTEMA DE ALMACENAMIENTO - NUEVA ESTRUCTURA
 * ============================================
 * 
 * Implementación del storage layer usando las nuevas tablas:
 * - empleado
 * - horario_planificado
 * - fichaje
 * - jornada_diaria
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
  empleado,
  horarioPlanificado,
  fichaje,
  jornadaDiaria,
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

// ============================================================================
// FUNCIONES DE MAPEO: Nueva estructura ↔ Tipos de compatibilidad
// ============================================================================

/**
 * Mapea Empleado (nuevo) a Employee (tipo de compatibilidad)
 */
function mapEmpleadoToEmployee(emp: typeof empleado.$inferSelect): Employee {
  return {
    id: String(emp.idEmpleado),
    employeeNumber: String(emp.idEmpleado), // Usar ID como número de empleado
    firstName: emp.nombre,
    lastName: emp.apellido,
    email: emp.email,
    password: emp.passwordHash,
    role: emp.rol === "admin" ? "admin" : "employee",
    department: emp.departamento || "",
    position: emp.puesto || "",
    hireDate: new Date(emp.fechaAlta),
    conventionHours: 1752,
    isActive: emp.activo,
  };
}

/**
 * Mapea Jornada Diaria a TimeEntry (tipo de compatibilidad)
 */
function mapJornadaDiariaToTimeEntry(jornada: typeof jornadaDiaria.$inferSelect): TimeEntry {
  return {
    id: String(jornada.idJornada),
    employeeId: String(jornada.idEmpleado),
    clockIn: jornada.horaInicio || new Date(jornada.fecha),
    clockOut: jornada.horaFin || null,
    totalHours: jornada.horasTrabajadas ? Number(jornada.horasTrabajadas) * 60 : null, // Convertir a minutos
    date: jornada.fecha,
  };
}

/**
 * Mapea HorarioPlanificado a DateSchedule (tipo de compatibilidad)
 */
function mapHorarioPlanificadoToDateSchedule(horario: typeof horarioPlanificado.$inferSelect): DateSchedule {
  // Calcular workHours en minutos
  const [startHour, startMin] = horario.horaInicioPrevista.split(":").map(Number);
  const [endHour, endMin] = horario.horaFinPrevista.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const workMinutes = endMinutes - startMinutes;
  
  return {
    id: String(horario.idTurno),
    employeeId: String(horario.idEmpleado),
    date: horario.fecha,
    startTime: horario.horaInicioPrevista,
    endTime: horario.horaFinPrevista,
    workHours: workMinutes,
    isActive: true,
  };
}

// ============================================================================
// INTERFAZ DE ALMACENAMIENTO
// ============================================================================

export interface IStorage {
  // Autenticación
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  authenticateEmployee(email: string, password: string): Promise<User | null>;
  createEmployeeWithPassword(employee: CreateEmployee): Promise<Employee>;

  // Empleados
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployees(): Promise<Employee[]>;
  getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined>;
  createEmployee(employee: CreateEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;

  // Registros de tiempo
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getTimeEntries(): Promise<TimeEntry[]>;
  getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]>;
  getTimeEntriesByDate(date: string): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: string): Promise<boolean>;

  // Incidencias (stubs por ahora)
  getIncident(id: string): Promise<Incident | undefined>;
  getIncidents(): Promise<Incident[]>;
  getIncidentsByEmployee(employeeId: string): Promise<Incident[]>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined>;
  deleteIncident(id: string): Promise<boolean>;

  // Métodos específicos para fichaje
  clockOut(employeeId: string, date: string): Promise<TimeEntry>;
}

// ============================================================================
// IMPLEMENTACIÓN DE ALMACENAMIENTO
// ============================================================================

export class DatabaseStorage implements IStorage {
  
  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================
  
  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    const [result] = await db
      .select()
      .from(empleado)
      .where(eq(empleado.email, email))
      .limit(1);
    
    return result ? mapEmpleadoToEmployee(result) : undefined;
  }

  async authenticateEmployee(email: string, password: string): Promise<User | null> {
    const employee = await this.getEmployeeByEmail(email);
    if (!employee) return null;

    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) return null;

    return {
      id: Number(employee.id),
      email: employee.email,
      nombre: employee.firstName,
      apellido: employee.lastName,
      rol: employee.role as "admin" | "empleado",
    };
  }

  async createEmployeeWithPassword(employeeData: CreateEmployee): Promise<Employee> {
    const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    
    const [newEmpleado] = await db
      .insert(empleado)
      .values({
        idEmpresa: 1,
        nombre: employeeData.firstName,
        apellido: employeeData.lastName,
        email: employeeData.email,
        passwordHash: hashedPassword,
        rol: employeeData.role === "admin" ? "admin" : "empleado",
        departamento: employeeData.department,
        puesto: employeeData.position,
        fechaAlta: new Date(employeeData.hireDate).toISOString().split("T")[0],
        activo: employeeData.isActive ?? true,
      })
      .returning();
      
    return mapEmpleadoToEmployee(newEmpleado);
  }

  // ==========================================
  // MÉTODOS DE EMPLEADOS
  // ==========================================
  
  async getEmployee(id: string): Promise<Employee | undefined> {
    const [result] = await db
      .select()
      .from(empleado)
      .where(eq(empleado.idEmpleado, Number(id)))
      .limit(1);
    
    return result ? mapEmpleadoToEmployee(result) : undefined;
  }

  async getEmployees(): Promise<Employee[]> {
    const results = await db.select().from(empleado);
    return results.map(mapEmpleadoToEmployee);
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    return this.getEmployee(employeeNumber);
  }

  async createEmployee(employee: CreateEmployee): Promise<Employee> {
    return this.createEmployeeWithPassword(employee);
  }

  async updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const updateData: any = {};
    
    if (employeeData.firstName) updateData.nombre = employeeData.firstName;
    if (employeeData.lastName) updateData.apellido = employeeData.lastName;
    if (employeeData.email) updateData.email = employeeData.email;
    if (employeeData.department !== undefined) updateData.departamento = employeeData.department;
    if (employeeData.position !== undefined) updateData.puesto = employeeData.position;
    if (employeeData.hireDate) updateData.fechaAlta = new Date(employeeData.hireDate).toISOString().split("T")[0];
    if (employeeData.isActive !== undefined) updateData.activo = employeeData.isActive;
    
    const [updated] = await db
      .update(empleado)
      .set(updateData)
      .where(eq(empleado.idEmpleado, Number(id)))
      .returning();
    
    return updated ? mapEmpleadoToEmployee(updated) : undefined;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const result = await db
      .delete(empleado)
      .where(eq(empleado.idEmpleado, Number(id)));
    
    return true;
  }

  // ==========================================
  // MÉTODOS DE REGISTROS DE TIEMPO
  // ==========================================
  
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const [result] = await db
      .select()
      .from(jornadaDiaria)
      .where(eq(jornadaDiaria.idJornada, Number(id)))
      .limit(1);
    
    return result ? mapJornadaDiariaToTimeEntry(result) : undefined;
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    const results = await db.select().from(jornadaDiaria);
    return results.map(mapJornadaDiariaToTimeEntry);
  }

  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    const results = await db
      .select()
      .from(jornadaDiaria)
      .where(eq(jornadaDiaria.idEmpleado, Number(employeeId)))
      .orderBy(desc(jornadaDiaria.fecha));
    
    return results.map(mapJornadaDiariaToTimeEntry);
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    const results = await db
      .select()
      .from(jornadaDiaria)
      .where(eq(jornadaDiaria.fecha, date));
    
    return results.map(mapJornadaDiariaToTimeEntry);
  }

  /**
   * Crea un registro de tiempo usando el nuevo sistema de fichajes
   * - Si es un clock-in, crea un fichaje tipo "entrada"
   * - Si es un clock-out, crea un fichaje tipo "salida"
   * - El trigger de la BD actualiza automáticamente jornada_diaria
   */
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const fecha = timeEntry.date;
    const idEmpleado = Number(timeEntry.employeeId);
    
    // Registrar fichaje de entrada
    await db.insert(fichaje).values({
      idEmpleado,
      tipoRegistro: "entrada",
      timestampRegistro: timeEntry.clockIn,
      origen: "web",
    });
    
    // Si hay clock-out, registrar fichaje de salida
    if (timeEntry.clockOut) {
      await db.insert(fichaje).values({
        idEmpleado,
        tipoRegistro: "salida",
        timestampRegistro: timeEntry.clockOut,
        origen: "web",
      });
    }
    
    // El trigger ya creó/actualizó jornada_diaria, ahora la obtenemos
    const [jornada] = await db
      .select()
      .from(jornadaDiaria)
      .where(
        and(
          eq(jornadaDiaria.idEmpleado, idEmpleado),
          eq(jornadaDiaria.fecha, fecha)
        )
      )
      .limit(1);
    
    if (!jornada) {
      throw new Error("Error al crear registro de tiempo");
    }
    
    return mapJornadaDiariaToTimeEntry(jornada);
  }

  async updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    // Por ahora retornar el registro existente sin modificar
    // En un sistema real, esto requeriría actualizar los fichajes correspondientes
    return this.getTimeEntry(id);
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    await db
      .delete(jornadaDiaria)
      .where(eq(jornadaDiaria.idJornada, Number(id)));
    
    return true;
  }

  /**
   * Método específico para clock-out
   * Crea un fichaje de tipo "salida" y devuelve la jornada diaria actualizada
   */
  async clockOut(employeeId: string, date: string): Promise<TimeEntry> {
    try {
      const idEmpleado = Number(employeeId);
      console.log(`[clockOut] Iniciando clock-out para empleado ${idEmpleado} en fecha ${date}`);
      
      // Crear fichaje de salida
      const [fichajeSalida] = await db.insert(fichaje).values({
        idEmpleado,
        tipoRegistro: "salida",
        timestampRegistro: new Date(),
        origen: "web",
      }).returning();
      
      console.log(`[clockOut] Fichaje de salida creado:`, fichajeSalida);
      
      // El trigger ya actualizó jornada_diaria, ahora la obtenemos
      const [jornada] = await db
        .select()
        .from(jornadaDiaria)
        .where(
          and(
            eq(jornadaDiaria.idEmpleado, idEmpleado),
            eq(jornadaDiaria.fecha, date)
          )
        )
        .limit(1);
      
      console.log(`[clockOut] Jornada diaria obtenida:`, jornada);
      
      if (!jornada) {
        throw new Error("Error al registrar salida - jornada no encontrada");
      }
      
      const timeEntry = mapJornadaDiariaToTimeEntry(jornada);
      console.log(`[clockOut] TimeEntry mapeado:`, timeEntry);
      
      return timeEntry;
    } catch (error) {
      console.error(`[clockOut] Error en clock-out:`, error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE INCIDENCIAS (STUBS)
  // ==========================================
  
  async getIncident(id: string): Promise<Incident | undefined> {
    // Stub - retornar undefined por ahora
    return undefined;
  }

  async getIncidents(): Promise<Incident[]> {
    return [];
  }

  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    return [];
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    // Stub - retornar un incidente básico
    return {
      id: "1",
      employeeId: incident.employeeId,
      type: incident.type,
      description: incident.description,
      date: incident.date,
      status: incident.status || "pending",
      createdAt: new Date(),
    };
  }

  async updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined> {
    return undefined;
  }

  async deleteIncident(id: string): Promise<boolean> {
    return false;
  }
}

// ============================================================================
// CLASE DE ALMACENAMIENTO EN MEMORIA (PARA DESARROLLO)
// ============================================================================

export class MemStorage implements IStorage {
  private employees: Map<string, Employee> = new Map();
  private timeEntries: Map<string, TimeEntry> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private nextId = 1;

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find((e) => e.email === email);
  }

  async authenticateEmployee(email: string, password: string): Promise<User | null> {
    const employee = await this.getEmployeeByEmail(email);
    if (!employee) return null;

    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) return null;

    return {
      id: Number(employee.id),
      email: employee.email,
      nombre: employee.firstName,
      apellido: employee.lastName,
      rol: employee.role as "admin" | "empleado",
    };
  }

  async createEmployeeWithPassword(employeeData: CreateEmployee): Promise<Employee> {
    const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    const id = String(this.nextId++);
    
    const employee: Employee = {
      id,
      employeeNumber: id,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      password: hashedPassword,
      role: employeeData.role,
      department: employeeData.department,
      position: employeeData.position,
      hireDate: employeeData.hireDate,
      conventionHours: employeeData.conventionHours || 1752,
      isActive: employeeData.isActive ?? true,
    };
    
    this.employees.set(id, employee);
    return employee;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployeeByNumber(employeeNumber: string): Promise<Employee | undefined> {
    return this.getEmployee(employeeNumber);
  }

  async createEmployee(employee: CreateEmployee): Promise<Employee> {
    return this.createEmployeeWithPassword(employee);
  }

  async updateEmployee(id: string, employeeData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;

    const updated = { ...employee, ...employeeData };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employees.delete(id);
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values());
  }

  async getTimeEntriesByEmployee(employeeId: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter((e) => e.employeeId === employeeId);
  }

  async getTimeEntriesByDate(date: string): Promise<TimeEntry[]> {
    return Array.from(this.timeEntries.values()).filter((e) => e.date === date);
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = String(this.nextId++);
    let totalHours = null;
    
    if (timeEntry.clockOut) {
      const diff = timeEntry.clockOut.getTime() - timeEntry.clockIn.getTime();
      totalHours = Math.floor(diff / (1000 * 60));
    }
    
    const entry: TimeEntry = {
      id,
      employeeId: timeEntry.employeeId,
      clockIn: timeEntry.clockIn,
      clockOut: timeEntry.clockOut || null,
      totalHours,
      date: timeEntry.date,
    };
    
    this.timeEntries.set(id, entry);
    return entry;
  }

  async updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const entry = this.timeEntries.get(id);
    if (!entry) return undefined;

    const updated = { ...entry, ...timeEntry };
    if (updated.clockOut) {
      const diff = updated.clockOut.getTime() - updated.clockIn.getTime();
      updated.totalHours = Math.floor(diff / (1000 * 60));
    }
    
    this.timeEntries.set(id, updated);
    return updated;
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    return this.incidents.get(id);
  }

  async getIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }

  async getIncidentsByEmployee(employeeId: string): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter((i) => i.employeeId === employeeId);
  }

  async createIncident(incident: InsertIncident): Promise<Incident> {
    const id = String(this.nextId++);
    const newIncident: Incident = {
      id,
      employeeId: incident.employeeId,
      type: incident.type,
      description: incident.description,
      date: incident.date,
      status: incident.status || "pending",
      createdAt: new Date(),
    };
    
    this.incidents.set(id, newIncident);
    return newIncident;
  }

  async updateIncident(id: string, incident: Partial<InsertIncident>): Promise<Incident | undefined> {
    const existing = this.incidents.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...incident };
    this.incidents.set(id, updated);
    return updated;
  }

  async deleteIncident(id: string): Promise<boolean> {
    return this.incidents.delete(id);
  }

  async clockOut(employeeId: string, date: string): Promise<TimeEntry> {
    // Buscar entrada del día
    const entries = await this.getTimeEntriesByEmployee(employeeId);
    const todayEntry = entries.find(e => e.date === date && !e.clockOut);
    
    if (!todayEntry) {
      throw new Error("No hay entrada registrada para este día");
    }
    
    // Actualizar con clock-out
    const clockOutTime = new Date();
    const diff = clockOutTime.getTime() - todayEntry.clockIn.getTime();
    const totalMinutes = Math.floor(diff / (1000 * 60));
    
    todayEntry.clockOut = clockOutTime;
    todayEntry.totalHours = totalMinutes;
    
    this.timeEntries.set(todayEntry.id, todayEntry);
    return todayEntry;
  }
}

// Exportar instancia única
export const storage = new DatabaseStorage();
