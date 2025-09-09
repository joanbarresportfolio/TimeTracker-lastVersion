import { db } from "./db";
import { employees, timeEntries, schedules, incidents } from "@shared/schema";

export async function seedDatabase() {
  try {
    // Check if employees already exist
    const existingEmployees = await db.select().from(employees);
    if (existingEmployees.length > 0) {
      console.log("Database already seeded");
      return;
    }

    console.log("Seeding database...");

    // Create sample employees
    const sampleEmployees = [
      {
        employeeNumber: "EMP001",
        firstName: "Ana",
        lastName: "García",
        email: "ana.garcia@company.com",
        department: "Desarrollo",
        position: "Desarrolladora Senior",
        hireDate: new Date("2022-03-15"),
        isActive: true,
      },
      {
        employeeNumber: "EMP002",
        firstName: "María",
        lastName: "Rodríguez",
        email: "maria.rodriguez@company.com",
        department: "Marketing",
        position: "Especialista en Marketing",
        hireDate: new Date("2023-01-10"),
        isActive: true,
      },
      {
        employeeNumber: "EMP003",
        firstName: "Carlos",
        lastName: "López",
        email: "carlos.lopez@company.com",
        department: "Ventas",
        position: "Ejecutivo de Ventas",
        hireDate: new Date("2021-11-20"),
        isActive: true,
      },
      {
        employeeNumber: "EMP004",
        firstName: "Juan",
        lastName: "Pérez",
        email: "juan.perez@company.com",
        department: "Ventas",
        position: "Representante de Ventas",
        hireDate: new Date("2023-12-01"),
        isActive: true,
      },
    ];

    const createdEmployees = await db
      .insert(employees)
      .values(sampleEmployees)
      .returning();

    // Create sample time entries for today
    const today = new Date().toISOString().split('T')[0];
    
    if (createdEmployees.length > 0) {
      // Ana García - Present
      await db.insert(timeEntries).values({
        employeeId: createdEmployees[0].id,
        clockIn: new Date(`${today}T08:00:00`),
        date: today,
        clockOut: null,
        totalHours: null,
      });

      // Carlos López - Present with late entry
      await db.insert(timeEntries).values({
        employeeId: createdEmployees[2].id,
        clockIn: new Date(`${today}T09:15:00`),
        date: today,
        clockOut: null,
        totalHours: null,
      });
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}