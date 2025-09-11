/**
 * PROCESO DE SEMILLA DE BASE DE DATOS
 * ===================================
 * 
 * Este archivo crea datos iniciales para el sistema cuando la base de datos está vacía.
 * Es idempotente - puede ejecutarse varias veces sin crear duplicados.
 * 
 * DATOS CREADOS:
 * - 1 usuario administrador (admin@admin.com / admin)
 * - 12 empleados de muestra en 4 departamentos (3 por departamento)
 * - Registros de tiempo históricos para los últimos 3 días
 * - Un registro de entrada para el día actual
 * 
 * ESTRATEGIA IDEMPOTENTE:
 * - Verifica existencia por employeeNumber Y email antes de crear
 * - Verifica registros de tiempo por employeeId + date antes de crear
 * - Si existe algún dato, lo omite y continúa con el siguiente
 */

import { db } from "./db";
import { employees, timeEntries, schedules, incidents } from "@shared/schema";
import { storage } from "./storage";
import { and, eq, or } from "drizzle-orm";

/**
 * FUNCIÓN PRINCIPAL DE SEMILLA
 * Ejecuta el proceso completo de inicialización de datos
 */
export async function seedDatabase() {
  try {
    console.log("🌱 Iniciando proceso de semilla de base de datos...");

    // PASO 1: Crear usuario administrador si no existe
    // Verifica por email Y employeeNumber para evitar duplicados
    let adminEmployee = await db.select()
      .from(employees)
      .where(
        or(
          eq(employees.employeeNumber, "ADMIN001"),
          eq(employees.email, "admin@admin.com")
        )
      )
      .limit(1);

    if (adminEmployee.length === 0) {
      // No existe admin, crearlo usando el storage para aprovechar el hashing
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

    // Create all employees (3 per department)
    const sampleEmployees = [
      // Desarrollo (3 empleados)
      {
        employeeNumber: "EMP001",
        firstName: "Ana",
        lastName: "García",
        email: "ana.garcia@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Desarrollo",
        position: "Desarrolladora Senior",
        hireDate: new Date("2022-03-15"),
        isActive: true,
      },
      {
        employeeNumber: "EMP002",
        firstName: "Diego",
        lastName: "Martínez",
        email: "diego.martinez@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Desarrollo",
        position: "Desarrollador Frontend",
        hireDate: new Date("2023-06-20"),
        isActive: true,
      },
      {
        employeeNumber: "EMP003",
        firstName: "Laura",
        lastName: "Hernández",
        email: "laura.hernandez@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Desarrollo",
        position: "Desarrolladora Backend",
        hireDate: new Date("2024-02-10"),
        isActive: true,
      },
      // Marketing (3 empleados)
      {
        employeeNumber: "EMP004",
        firstName: "María",
        lastName: "Rodríguez",
        email: "maria.rodriguez@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Marketing",
        position: "Especialista en Marketing",
        hireDate: new Date("2023-01-10"),
        isActive: true,
      },
      {
        employeeNumber: "EMP005",
        firstName: "Roberto",
        lastName: "Silva",
        email: "roberto.silva@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Marketing",
        position: "Analista de Marketing Digital",
        hireDate: new Date("2023-08-15"),
        isActive: true,
      },
      {
        employeeNumber: "EMP006",
        firstName: "Carmen",
        lastName: "Torres",
        email: "carmen.torres@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Marketing",
        position: "Coordinadora de Contenidos",
        hireDate: new Date("2024-01-05"),
        isActive: true,
      },
      // Ventas (3 empleados)
      {
        employeeNumber: "EMP007",
        firstName: "Carlos",
        lastName: "López",
        email: "carlos.lopez@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Ventas",
        position: "Ejecutivo de Ventas",
        hireDate: new Date("2021-11-20"),
        isActive: true,
      },
      {
        employeeNumber: "EMP008",
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan.perez@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Ventas",
        position: "Representante de Ventas",
        hireDate: new Date("2023-12-01"),
        isActive: true,
      },
      {
        employeeNumber: "EMP009",
        firstName: "Sofía",
        lastName: "Morales",
        email: "sofia.morales@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Ventas",
        position: "Gerente de Cuentas",
        hireDate: new Date("2022-09-30"),
        isActive: true,
      },
      // Administración (3 empleados)
      {
        employeeNumber: "EMP010",
        firstName: "Patricia",
        lastName: "Jiménez",
        email: "patricia.jimenez@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Administración",
        position: "Asistente Administrativa",
        hireDate: new Date("2023-04-12"),
        isActive: true,
      },
      {
        employeeNumber: "EMP011",
        firstName: "Fernando",
        lastName: "Castro",
        email: "fernando.castro@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Administración",
        position: "Coordinador de Recursos Humanos",
        hireDate: new Date("2022-07-18"),
        isActive: true,
      },
      {
        employeeNumber: "EMP012",
        firstName: "Valentina",
        lastName: "Mendoza",
        email: "valentina.mendoza@company.com",
        password: "password123",
        role: "employee" as const,
        department: "Administración",
        position: "Analista Financiero",
        hireDate: new Date("2024-03-08"),
        isActive: true,
      },
    ];

    // PASO 2: Crear empleados de muestra
    // Usa verificación doble: por email Y por employeeNumber
    const createdEmployees = [];
    
    for (const employeeData of sampleEmployees) {
      // Verificar si ya existe por email O employeeNumber
      const existingEmployee = await db.select()
        .from(employees)
        .where(
          or(
            eq(employees.email, employeeData.email),
            eq(employees.employeeNumber, employeeData.employeeNumber)
          )
        )
        .limit(1);

      if (existingEmployee.length === 0) {
        try {
          // No existe, crear empleado nuevo usando storage para hashing
          const newEmployee = await storage.createEmployeeWithPassword(employeeData);
          createdEmployees.push(newEmployee);
          console.log(`✅ Empleado creado: ${employeeData.firstName} ${employeeData.lastName}`);
        } catch (error: any) {
          console.log(`⚠️  Error creando ${employeeData.firstName} ${employeeData.lastName}:`, error.message);
          // Intentar obtener el empleado si se creó entre verificación y creación
          const retryEmployee = await db.select()
            .from(employees)
            .where(
              or(
                eq(employees.email, employeeData.email),
                eq(employees.employeeNumber, employeeData.employeeNumber)
              )
            )
            .limit(1);
          if (retryEmployee.length > 0) {
            createdEmployees.push(retryEmployee[0]);
            console.log(`ℹ️  Empleado ya existía: ${employeeData.firstName} ${employeeData.lastName}`);
          }
        }
      } else {
        // Ya existe, usar el existente
        createdEmployees.push(existingEmployee[0]);
        console.log(`ℹ️  Empleado ya existe: ${employeeData.firstName} ${employeeData.lastName}`);
      }
    }

    // PASO 3: Crear registros de tiempo históricos
    // Crea 3 días de historial de fichajes para todos los empleados
    const today = new Date();
    const dates = [
      new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // Hace 3 días
      new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // Hace 2 días
      new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // Ayer
    ];

    for (const employee of createdEmployees) {
      for (const workDate of dates) {
        const workDateStr = workDate.toISOString().split('T')[0];
        
        // Verificar si ya existe registro para este empleado en esta fecha
        const existingEntry = await db.select()
          .from(timeEntries)
          .where(and(
            eq(timeEntries.employeeId, employee.id),
            eq(timeEntries.date, workDateStr)
          ))
          .limit(1);

        if (existingEntry.length === 0) {
          // No existe registro, crear uno nuevo con horarios aleatorios realistas
          const startHour = 8 + Math.floor(Math.random() * 2); // 8:00 o 9:00 AM
          const startMinute = Math.floor(Math.random() * 4) * 15; // 00, 15, 30, o 45 minutos
          const endHour = 17 + Math.floor(Math.random() * 2); // 5:00 o 6:00 PM
          const endMinute = Math.floor(Math.random() * 4) * 15; // 00, 15, 30, o 45 minutos

          const clockIn = new Date(`${workDateStr}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`);
          const clockOut = new Date(`${workDateStr}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`);
          const totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60)); // en minutos

          await db.insert(timeEntries).values({
            employeeId: employee.id,
            clockIn,
            clockOut,
            date: workDateStr,
            totalHours,
          });

          console.log(`⏰ Registro de tiempo creado para ${employee.firstName} ${employee.lastName} el ${workDateStr}`);
        }
      }
    }

    // PASO 4: Crear entrada del día actual para simular empleado presente
    const todayStr = today.toISOString().split('T')[0];
    if (createdEmployees.length > 0) {
      // Verificar si ya hay registro para hoy
      const existingTodayEntry = await db.select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.employeeId, createdEmployees[0].id),
          eq(timeEntries.date, todayStr)
        ))
        .limit(1);

      if (existingTodayEntry.length === 0) {
        // Crear registro de "clock-in" para el primer empleado (simula que está presente)
        await db.insert(timeEntries).values({
          employeeId: createdEmployees[0].id,
          clockIn: new Date(`${todayStr}T08:00:00`),
          date: todayStr,
          clockOut: null,
          totalHours: null,
        });
        console.log(`📍 Registro de entrada de hoy creado para ${createdEmployees[0].firstName}`);
      }
    }

    console.log("🎉 Base de datos inicializada exitosamente!");
    console.log(`ℹ️  Total empleados en sistema: ${createdEmployees.length + 1}`);
    
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error);
    // No re-throw para evitar que crashee el servidor
  }
}