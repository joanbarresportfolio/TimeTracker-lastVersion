/**
 * SCRIPT DE MIGRACIÓN A ESTRUCTURA ESPAÑOLA
 * ==========================================
 * 
 * Este script migra todos los datos existentes de las tablas antiguas
 * (employees, timeEntries, dateSchedules, incidents) a las nuevas tablas españolas
 * (usuarios, fichajes, horarios_planificados, incidencias).
 * 
 * ES IDEMPOTENTE: Puede ejecutarse múltiples veces sin crear duplicados.
 */

import { db } from "./db";
import { 
  employees, 
  timeEntries, 
  dateSchedules, 
  incidents,
  departamentos,
  usuarios,
  horariosPlanificados,
  fichajes,
  incidencias
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * PASO 1: Migrar departamentos desde employees.department
 */
async function migrateDepartamentos() {
  console.log("\n📁 PASO 1: Migrando departamentos...");
  
  // Obtener departamentos únicos de employees
  const uniqueDepartments = await db
    .selectDistinct({ department: employees.department })
    .from(employees);
  
  const departmentMap = new Map<string, string>(); // nombre -> id
  
  for (const { department } of uniqueDepartments) {
    // Verificar si ya existe
    const existing = await db.select()
      .from(departamentos)
      .where(eq(departamentos.nombreDepartamento, department))
      .limit(1);
    
    if (existing.length > 0) {
      departmentMap.set(department, existing[0].idDepartamento);
      console.log(`  ℹ️  Departamento ya existe: ${department}`);
    } else {
      const [newDept] = await db.insert(departamentos)
        .values({
          nombreDepartamento: department,
          descripcion: null,
        })
        .returning();
      
      departmentMap.set(department, newDept.idDepartamento);
      console.log(`  ✅ Departamento creado: ${department}`);
    }
  }
  
  return departmentMap;
}

/**
 * PASO 2: Migrar employees → usuarios
 */
async function migrateUsuarios(departmentMap: Map<string, string>) {
  console.log("\n👥 PASO 2: Migrando empleados a usuarios...");
  
  const allEmployees = await db.select().from(employees);
  const employeeIdMap = new Map<string, string>(); // old id -> new id
  
  for (const emp of allEmployees) {
    // Verificar si ya existe
    const existing = await db.select()
      .from(usuarios)
      .where(eq(usuarios.numEmpleado, emp.employeeNumber))
      .limit(1);
    
    if (existing.length > 0) {
      employeeIdMap.set(emp.id, existing[0].idUsuario);
      console.log(`  ℹ️  Usuario ya existe: ${emp.firstName} ${emp.lastName}`);
      continue;
    }
    
    // Mapear rol: "admin" -> "administrador", "employee" -> "empleado"
    const rol = emp.role === "admin" ? "administrador" : "empleado";
    
    const [newUser] = await db.insert(usuarios)
      .values({
        numEmpleado: emp.employeeNumber,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        passwordHash: emp.password, // Ya está hasheado
        fechaContratacion: emp.hireDate,
        activo: emp.isActive,
        rol: rol,
        idDepartamento: departmentMap.get(emp.department) || null,
      })
      .returning();
    
    employeeIdMap.set(emp.id, newUser.idUsuario);
    console.log(`  ✅ Usuario creado: ${emp.firstName} ${emp.lastName} (${rol})`);
  }
  
  return employeeIdMap;
}

/**
 * PASO 3: Migrar dateSchedules → horarios_planificados
 */
async function migrateHorariosPlanificados(employeeIdMap: Map<string, string>) {
  console.log("\n📅 PASO 3: Migrando horarios específicos por fecha...");
  
  // Obtener el ID del admin para creadoPor
  const adminUsers = await db.select()
    .from(usuarios)
    .where(eq(usuarios.rol, "administrador"))
    .limit(1);
  
  const adminId = adminUsers.length > 0 ? adminUsers[0].idUsuario : null;
  
  const allDateSchedules = await db.select().from(dateSchedules);
  let created = 0;
  let existing = 0;
  
  for (const schedule of allDateSchedules) {
    const newUserId = employeeIdMap.get(schedule.employeeId);
    if (!newUserId) {
      console.log(`  ⚠️  Usuario no encontrado para schedule: ${schedule.employeeId}`);
      continue;
    }
    
    // Verificar si ya existe
    const exists = await db.select()
      .from(horariosPlanificados)
      .where(
        sql`${horariosPlanificados.idUsuario} = ${newUserId} 
            AND ${horariosPlanificados.fecha} = ${schedule.date}
            AND ${horariosPlanificados.horaInicioProgramada} = ${schedule.startTime}`
      )
      .limit(1);
    
    if (exists.length > 0) {
      existing++;
      continue;
    }
    
    await db.insert(horariosPlanificados)
      .values({
        idUsuario: newUserId,
        fecha: schedule.date,
        horaInicioProgramada: schedule.startTime,
        horaFinProgramada: schedule.endTime,
        descansoMinutos: 0,
        creadoPor: adminId,
        observaciones: null,
      });
    
    created++;
  }
  
  console.log(`  ✅ Horarios planificados creados: ${created}`);
  console.log(`  ℹ️  Horarios ya existentes: ${existing}`);
}

/**
 * PASO 4: Migrar timeEntries → fichajes
 */
async function migrateFichajes(employeeIdMap: Map<string, string>) {
  console.log("\n⏰ PASO 4: Migrando registros de tiempo a fichajes...");
  
  const allTimeEntries = await db.select().from(timeEntries);
  let created = 0;
  let existing = 0;
  
  for (const entry of allTimeEntries) {
    const newUserId = employeeIdMap.get(entry.employeeId);
    if (!newUserId) {
      console.log(`  ⚠️  Usuario no encontrado para time entry: ${entry.employeeId}`);
      continue;
    }
    
    // Verificar si ya existe
    const exists = await db.select()
      .from(fichajes)
      .where(
        sql`${fichajes.idUsuario} = ${newUserId} 
            AND ${fichajes.fecha} = ${entry.date}`
      )
      .limit(1);
    
    if (exists.length > 0) {
      existing++;
      continue;
    }
    
    // Determinar estado basado en clockIn/clockOut
    let estado = "pendiente";
    if (entry.clockOut) {
      estado = "completo";
    } else {
      estado = "incompleto";
    }
    
    // Buscar horario planificado correspondiente
    const matchingSchedule = await db.select()
      .from(horariosPlanificados)
      .where(
        sql`${horariosPlanificados.idUsuario} = ${newUserId} 
            AND ${horariosPlanificados.fecha} = ${entry.date}`
      )
      .limit(1);
    
    await db.insert(fichajes)
      .values({
        idUsuario: newUserId,
        idHorario: matchingSchedule.length > 0 ? matchingSchedule[0].idHorario : null,
        fecha: entry.date,
        horaEntrada: entry.clockIn,
        horaSalida: entry.clockOut || null,
        horasTrabajadas: entry.totalHours || null,
        estado: estado,
      });
    
    created++;
  }
  
  console.log(`  ✅ Fichajes creados: ${created}`);
  console.log(`  ℹ️  Fichajes ya existentes: ${existing}`);
}

/**
 * PASO 5: Migrar incidents → incidencias
 */
async function migrateIncidencias(employeeIdMap: Map<string, string>) {
  console.log("\n⚠️  PASO 5: Migrando incidencias...");
  
  const allIncidents = await db.select().from(incidents);
  let created = 0;
  let existing = 0;
  
  // Mapeo de tipos de incidencias
  const tipoMap: Record<string, string> = {
    "late": "retraso",
    "absence": "ausencia",
    "early_departure": "otro",
    "forgot_clock_in": "olvido_fichar",
    "forgot_clock_out": "olvido_fichar",
  };
  
  // Mapeo de estados
  const estadoMap: Record<string, string> = {
    "pending": "pendiente",
    "approved": "justificada",
    "rejected": "no_justificada",
  };
  
  // Obtener ID de admin para registradoPor
  const adminUsers = await db.select()
    .from(usuarios)
    .where(eq(usuarios.rol, "administrador"))
    .limit(1);
  
  const adminId = adminUsers.length > 0 ? adminUsers[0].idUsuario : null;
  
  for (const incident of allIncidents) {
    const newUserId = employeeIdMap.get(incident.employeeId);
    if (!newUserId) {
      console.log(`  ⚠️  Usuario no encontrado para incident: ${incident.employeeId}`);
      continue;
    }
    
    // Verificar si ya existe (por descripción y fecha para evitar duplicados)
    const exists = await db.select()
      .from(incidencias)
      .where(
        sql`${incidencias.idUsuario} = ${newUserId} 
            AND ${incidencias.descripcion} = ${incident.description}
            AND DATE(${incidencias.fechaRegistro}) = DATE(${incident.createdAt})`
      )
      .limit(1);
    
    if (exists.length > 0) {
      existing++;
      continue;
    }
    
    const tipoIncidencia = tipoMap[incident.type] || "otro";
    const estado = estadoMap[incident.status] || "pendiente";
    
    await db.insert(incidencias)
      .values({
        idUsuario: newUserId,
        idFichaje: null, // No tenemos mapeo de fichaje específico
        tipoIncidencia: tipoIncidencia,
        descripcion: incident.description,
        registradoPor: adminId,
        fechaRegistro: incident.createdAt,
        estado: estado,
      });
    
    created++;
  }
  
  console.log(`  ✅ Incidencias creadas: ${created}`);
  console.log(`  ℹ️  Incidencias ya existentes: ${existing}`);
}

/**
 * FUNCIÓN PRINCIPAL DE MIGRACIÓN
 */
export async function migrateToSpanishSchema() {
  try {
    console.log("🚀 INICIANDO MIGRACIÓN A ESTRUCTURA ESPAÑOLA");
    console.log("============================================");
    
    const departmentMap = await migrateDepartamentos();
    const employeeIdMap = await migrateUsuarios(departmentMap);
    await migrateHorariosPlanificados(employeeIdMap);
    await migrateFichajes(employeeIdMap);
    await migrateIncidencias(employeeIdMap);
    
    console.log("\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE");
    console.log("=====================================");
    console.log("Todas las tablas han sido migradas correctamente.");
    console.log("Las tablas antiguas siguen existiendo para compatibilidad.");
    
  } catch (error) {
    console.error("❌ ERROR EN MIGRACIÓN:", error);
    throw error;
  }
}

// Ejecutar migración si se llama directamente
migrateToSpanishSchema()
  .then(() => {
    console.log("\n🎉 Proceso completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  });
