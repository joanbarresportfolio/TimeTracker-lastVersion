import { db } from "./db";
import { employees, timeEntries, schedules, incidents } from "@shared/schema";
import { storage } from "./storage";
import { and, eq } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if employees already exist
    const existingEmployees = await db.select().from(employees);
    if (existingEmployees.length >= 13) {
      console.log("Database already seeded with all employees");
      return;
    }

    console.log("Seeding database...");

    // Create admin user if not exists
    let adminEmployee = await storage.getEmployeeByNumber("ADMIN001");
    if (!adminEmployee) {
      adminEmployee = await storage.createEmployeeWithPassword({
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
      console.log("Created admin user");
    } else {
      console.log("Admin user already exists");
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

    const createdEmployees = [];
    for (const employeeData of sampleEmployees) {
      // Check if this specific employee already exists
      const existingEmployee = await storage.getEmployeeByNumber(employeeData.employeeNumber);
      if (!existingEmployee) {
        const employee = await storage.createEmployeeWithPassword(employeeData);
        createdEmployees.push(employee);
        console.log(`Created employee: ${employeeData.firstName} ${employeeData.lastName}`);
      } else {
        createdEmployees.push(existingEmployee);
        console.log(`Employee already exists: ${employeeData.firstName} ${employeeData.lastName}`);
      }
    }

    // Create historical time entries for all employees (3 shifts each)
    const today = new Date();
    const dates = [
      new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    ];

    for (const employee of createdEmployees) {
      for (let i = 0; i < dates.length; i++) {
        const workDate = dates[i].toISOString().split('T')[0];
        
        // Check if time entry already exists for this employee and date
        const existingEntry = await db.select()
          .from(timeEntries)
          .where(and(
            eq(timeEntries.employeeId, employee.id),
            eq(timeEntries.date, workDate)
          ));

        if (existingEntry.length === 0) {
          const startHour = 8 + Math.floor(Math.random() * 2); // 8 or 9 AM
          const startMinute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, or 45
          const endHour = 17 + Math.floor(Math.random() * 2); // 5 or 6 PM
          const endMinute = Math.floor(Math.random() * 4) * 15;

          const clockIn = new Date(`${workDate}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`);
          const clockOut = new Date(`${workDate}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`);
          const totalHours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60)); // minutes

          await db.insert(timeEntries).values({
            employeeId: employee.id,
            clockIn,
            clockOut,
            date: workDate,
            totalHours,
          });

          console.log(`Created time entry for ${employee.firstName} ${employee.lastName} on ${workDate}`);
        }
      }
    }

    // Create current day entry for some employees (if not exists)
    const todayStr = today.toISOString().split('T')[0];
    if (createdEmployees.length > 0) {
      const existingTodayEntry = await db.select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.employeeId, createdEmployees[0].id),
          eq(timeEntries.date, todayStr)
        ));

      if (existingTodayEntry.length === 0) {
        // Ana García - Present (if she's the first employee)
        await db.insert(timeEntries).values({
          employeeId: createdEmployees[0].id,
          clockIn: new Date(`${todayStr}T08:00:00`),
          date: todayStr,
          clockOut: null,
          totalHours: null,
        });
      }
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}