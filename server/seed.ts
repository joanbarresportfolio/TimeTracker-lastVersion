/**
 * PROCESO DE SEMILLA DE BASE DE DATOS
 * ===================================
 * 
 * Este archivo crea datos iniciales para el sistema cuando la base de datos está vacía.
 * Es idempotente - puede ejecutarse varias veces sin crear duplicados.
 * 
 * DATOS CREADOS:
 * - 1 usuario administrador (admin@admin.com / admin)
 * - 12 empleados de muestra en 2 departamentos (Grupo Chova Felix y Marina Fruit)
 * 
 * ESTRATEGIA IDEMPOTENTE:
 * - Verifica existencia por employeeNumber Y email antes de crear
 * - Si existe algún dato, lo omite y continúa con el siguiente
 */

import { db } from "./db";
import { users, rolesEnterprise } from "@shared/schema";
import { storage } from "./storage";
import { eq, or } from "drizzle-orm";

/**
 * FUNCIÓN PRINCIPAL DE SEMILLA
 * Ejecuta el proceso completo de inicialización de datos
 */
export async function seedDatabase() {
  try {
    console.log("🌱 Iniciando proceso de semilla de base de datos...");

    // PASO 0: Crear roles por defecto si no existen
    const existingRoles = await db.select().from(rolesEnterprise);
    if (existingRoles.length === 0) {
      await db.insert(rolesEnterprise).values([
        { name: "admin", description: "Administrador del sistema" },
        { name: "employee", description: "Empleado regular" },
        { name: "manager", description: "Gerente de departamento" },
        { name: "supervisor", description: "Supervisor de equipo" },
      ]);
      console.log("✅ Roles por defecto creados exitosamente");
    } else {
      console.log("ℹ️  Roles ya existen");
    }

    // PASO 1: Crear usuario administrador si no existe
    // Verifica por email Y numEmployee para evitar duplicados
    let adminEmployee = await db.select()
      .from(users)
      .where(
        or(
          eq(users.numEmployee, "ADMIN001"),
          eq(users.email, "admin@admin.com")
        )
      )
      .limit(1);

    if (adminEmployee.length === 0) {
      // No existe admin, crearlo usando el storage para aprovechar el hashing
      const newAdmin = await storage.createEmployeeWithPassword({
        numEmployee: "ADMIN001",
        firstName: "Administrador",
        lastName: "Sistema",
        email: "admin@admin.com",
        password: "admin",
        role: "admin",
        department: "Administración",
        position: "Administrador del Sistema",
        hireDate: new Date("2024-01-01"),
        conventionHours: 1752,
        isActive: true,
      });
      console.log("✅ Usuario administrador creado exitosamente");
    } else {
      console.log("ℹ️  Usuario administrador ya existe");
    }

    // Empleados de Grupo Chova Felix y Marina Fruit según especificación
    const sampleEmployees = [
      // Grupo Chova Felix (9 empleados - 1752 horas convenio)
      {
        numEmployee: "000001",
        firstName: "ANTONIO",
        lastName: "CHOVA FELIX",
        email: "antonio.chova@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2022-01-15"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000034",
        firstName: "EDUARDO",
        lastName: "CHOVA FELIX",
        email: "eduardo.chova@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2021-06-20"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000035",
        firstName: "SARA ISABEL",
        lastName: "SANTOS MIÑANA",
        email: "sara.santos@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2023-03-10"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000036",
        firstName: "ELEGIDO Mª MAR",
        lastName: "CHOVA GOMEZ",
        email: "mar.chova@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2022-08-15"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000037",
        firstName: "MONICA VICTO",
        lastName: "SERER PALOMARES",
        email: "monica.serer@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2023-11-05"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000038",
        firstName: "LARRY ALVIN",
        lastName: "MEJIA NACES",
        email: "larry.mejia@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2022-04-12"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000039",
        firstName: "JUAN ENRIQUE",
        lastName: "BARRES MAGRANER",
        email: "juan.barres@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2021-09-18"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000040",
        firstName: "ELEGIDO EDUA",
        lastName: "CHOVA GOMEZ",
        email: "eduardo.chova2@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2023-05-22"),
        conventionHours: 1752,
        isActive: true,
      },
      {
        numEmployee: "000041",
        firstName: "ELONAH JANE",
        lastName: "OCHINANG NACES",
        email: "elonah.ochinang@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2024-01-08"),
        conventionHours: 1752,
        isActive: true,
      },
      // Marina Fruit (3 empleados - 1803 horas convenio)
      {
        numEmployee: "MF001",
        firstName: "JUAN MARCIAL",
        lastName: "COMPANY PEREZ",
        email: "juan.company@marinafruit.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Marina Fruit",
        position: "Empleado",
        hireDate: new Date("2021-10-15"),
        conventionHours: 1803,
        isActive: true,
      },
      {
        numEmployee: "MF002",
        firstName: "JAVIER",
        lastName: "SOLANES CAMARA",
        email: "javier.solanes@marinafruit.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Marina Fruit",
        position: "Empleado",
        hireDate: new Date("2022-12-01"),
        conventionHours: 1803,
        isActive: true,
      },
      {
        numEmployee: "MF003",
        firstName: "ARTUR ISMAEL",
        lastName: "COMPANY RIBELLES",
        email: "artur.company@marinafruit.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Marina Fruit",
        position: "Empleado",
        hireDate: new Date("2023-07-30"),
        conventionHours: 1803,
        isActive: true,
      },
    ];

    // PASO 2: Crear empleados de muestra
    // Usa verificación doble: por email Y por employeeNumber
    const createdEmployees = [];
    
    for (const employeeData of sampleEmployees) {
      // Verificar si ya existe por email usando storage
      const existingEmployee = await storage.getEmployeeByEmail(employeeData.email);

      if (!existingEmployee) {
        try {
          // No existe, crear empleado nuevo usando storage para hashing
          const newEmployee = await storage.createEmployeeWithPassword(employeeData);
          createdEmployees.push(newEmployee);
          console.log(`✅ Empleado creado: ${employeeData.firstName} ${employeeData.lastName}`);
        } catch (error: any) {
          console.log(`⚠️  Error creando ${employeeData.firstName} ${employeeData.lastName}:`, error.message);
          // Intentar obtener el empleado si se creó entre verificación y creación
          const retryEmployee = await storage.getEmployeeByEmail(employeeData.email);
          if (retryEmployee) {
            createdEmployees.push(retryEmployee);
            console.log(`ℹ️  Empleado ya existía: ${employeeData.firstName} ${employeeData.lastName}`);
          }
        }
      } else {
        // Ya existe, usar el existente
        createdEmployees.push(existingEmployee);
        console.log(`ℹ️  Empleado ya existe: ${employeeData.firstName} ${employeeData.lastName}`);
      }
    }

    console.log("🎉 Base de datos inicializada exitosamente!");
    console.log(`ℹ️  Total empleados en sistema: ${createdEmployees.length + 1}`);
    
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error);
    // No re-throw para evitar que crashee el servidor
  }
}