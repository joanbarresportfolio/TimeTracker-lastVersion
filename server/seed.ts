/**
 * PROCESO DE SEMILLA DE BASE DE DATOS - NUEVA ESTRUCTURA
 * =======================================================
 * 
 * Crea datos iniciales para el sistema cuando la base de datos está vacía.
 * Usa la nueva estructura de tablas: empleado, horario_planificado, fichaje, jornada_diaria.
 */

import { db } from "./db";
import { empleado } from "@shared/schema";
import { storage } from "./storage";
import { eq, or } from "drizzle-orm";

/**
 * FUNCIÓN PRINCIPAL DE SEMILLA
 */
export async function seedDatabase() {
  try {
    console.log("🌱 Iniciando proceso de semilla de base de datos...");

    // PASO 1: Crear usuario administrador si no existe
    let adminEmployee = await db.select()
      .from(empleado)
      .where(
        or(
          eq(empleado.email, "admin@admin.com")
        )
      )
      .limit(1);

    if (adminEmployee.length === 0) {
      const newAdmin = await storage.createEmployeeWithPassword({
        employeeNumber: "ADMIN001",
        firstName: "Administrador",
        lastName: "Sistema",
        email: "admin@admin.com",
        password: "admin",
        role: "admin",
        department: "Administración",
        position: "Administrador del Sistema",
        hireDate: new Date("2024-01-01"),
        isActive: true,
      });
      console.log("✅ Usuario administrador creado exitosamente");
    } else {
      console.log("ℹ️  Usuario administrador ya existe");
    }

    // PASO 2: Crear empleados de muestra si no existen
    const sampleEmployees = [
      {
        employeeNumber: "000001",
        firstName: "ANTONIO",
        lastName: "CHOVA FELIX",
        email: "antonio.chova@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2022-01-15"),
        isActive: true,
      },
      {
        employeeNumber: "000034",
        firstName: "EDUARDO",
        lastName: "CHOVA FELIX",
        email: "eduardo.chova@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2021-06-20"),
        isActive: true,
      },
      {
        employeeNumber: "000035",
        firstName: "SARA ISABEL",
        lastName: "SANTOS MIÑANA",
        email: "sara.santos@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2023-03-10"),
        isActive: true,
      },
      {
        employeeNumber: "000036",
        firstName: "ELEGIDO Mª MAR",
        lastName: "CHOVA GOMEZ",
        email: "mar.chova@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2022-08-15"),
        isActive: true,
      },
      {
        employeeNumber: "000037",
        firstName: "MONICA VICTO",
        lastName: "SERER PALOMARES",
        email: "monica.serer@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2023-11-05"),
        isActive: true,
      },
      {
        employeeNumber: "000038",
        firstName: "LARRY ALVIN",
        lastName: "MEJIA NACES",
        email: "larry.mejia@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2022-04-12"),
        isActive: true,
      },
      {
        employeeNumber: "000039",
        firstName: "JUAN ENRIQUE",
        lastName: "BARRES MAGRANER",
        email: "juan.barres@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2021-09-18"),
        isActive: true,
      },
      {
        employeeNumber: "000040",
        firstName: "ELEGIDO EDUA",
        lastName: "CHOVA GOMEZ",
        email: "eduardo.chova2@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleado",
        hireDate: new Date("2023-05-22"),
        isActive: true,
      },
      {
        employeeNumber: "000041",
        firstName: "ELONAH JANE",
        lastName: "OCHINANG NACES",
        email: "elonah.ochinang@grupochovafelix.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Grupo Chova Felix",
        position: "Empleada",
        hireDate: new Date("2024-01-08"),
        isActive: true,
      },
      {
        employeeNumber: "MF001",
        firstName: "JUAN MARCIAL",
        lastName: "COMPANY PEREZ",
        email: "juan.company@marinafruit.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Marina Fruit",
        position: "Empleado",
        hireDate: new Date("2021-10-15"),
        isActive: true,
      },
      {
        employeeNumber: "MF002",
        firstName: "JAVIER",
        lastName: "SOLANES CAMARA",
        email: "javier.solanes@marinafruit.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Marina Fruit",
        position: "Empleado",
        hireDate: new Date("2022-12-01"),
        isActive: true,
      },
      {
        employeeNumber: "MF003",
        firstName: "ARTUR ISMAEL",
        lastName: "COMPANY RIBELLES",
        email: "artur.company@marinafruit.com",
        password: "empleado123",
        role: "employee" as const,
        department: "Marina Fruit",
        position: "Empleado",
        hireDate: new Date("2023-07-30"),
        isActive: true,
      },
    ];

    let createdCount = 0;
    for (const employeeData of sampleEmployees) {
      const existingEmployee = await storage.getEmployeeByEmail(employeeData.email);

      if (!existingEmployee) {
        try {
          await storage.createEmployeeWithPassword(employeeData);
          console.log(`✅ Empleado creado: ${employeeData.firstName} ${employeeData.lastName}`);
          createdCount++;
        } catch (error: any) {
          console.log(`ℹ️  Empleado ya existe: ${employeeData.firstName} ${employeeData.lastName}`);
        }
      } else {
        console.log(`ℹ️  Empleado ya existe: ${employeeData.firstName} ${employeeData.lastName}`);
      }
    }

    console.log("🎉 Base de datos inicializada exitosamente!");
    console.log(`ℹ️  ${createdCount} nuevos empleados creados`);
    
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error);
  }
}
