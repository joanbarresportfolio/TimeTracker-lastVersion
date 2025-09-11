import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmployeeSchema, insertTimeEntrySchema, insertScheduleSchema, insertIncidentSchema, loginSchema, createEmployeeSchema, updateEmployeeSchema, bulkScheduleCreateSchema } from "@shared/schema";
import { requireAuth, requireAdmin, requireEmployeeAccess } from "./middleware/auth";
import { z } from "zod";

// Helper function to validate clocking time
async function validateClockingTime(employeeId: string, currentTime: Date, action: "clock-in" | "clock-out"): Promise<{isValid: boolean, message: string}> {
  try {
    // Get employee schedules
    const schedules = await storage.getSchedulesByEmployee(employeeId);
    
    if (schedules.length === 0) {
      return {
        isValid: false,
        message: "No tienes horarios asignados. Contacta con tu supervisor para configurar tus horarios de trabajo."
      };
    }

    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = currentTime.getDay();
    
    // Find schedule for today
    const todaySchedules = schedules.filter(schedule => 
      schedule.dayOfWeek === currentDayOfWeek && schedule.isActive
    );
    
    if (todaySchedules.length === 0) {
      return {
        isValid: false,
        message: "No tienes horarios asignados para hoy. Contacta con tu supervisor."
      };
    }

    // Check if current time is within any of today's schedules (with 20-minute window)
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    for (const schedule of todaySchedules) {
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      // 20-minute window (before and after)
      const windowMinutes = 20;
      
      if (action === "clock-in") {
        const earliestTime = startTimeInMinutes - windowMinutes;
        const latestTime = startTimeInMinutes + windowMinutes;
        
        if (currentTimeInMinutes >= earliestTime && currentTimeInMinutes <= latestTime) {
          return { isValid: true, message: "" };
        }
      } else { // clock-out
        const earliestTime = endTimeInMinutes - windowMinutes;
        const latestTime = endTimeInMinutes + windowMinutes;
        
        if (currentTimeInMinutes >= earliestTime && currentTimeInMinutes <= latestTime) {
          return { isValid: true, message: "" };
        }
      }
    }

    // If we get here, current time is not within any valid window
    const scheduleInfo = todaySchedules.map(s => `${s.startTime} - ${s.endTime}`).join(", ");
    const actionText = action === "clock-in" ? "entrada" : "salida";
    
    return {
      isValid: false,
      message: `Solo puedes fichar ${actionText} dentro de los 20 minutos antes o después de tu horario asignado (${scheduleInfo}).`
    };

  } catch (error) {
    return {
      isValid: false,
      message: "Error al validar horarios. Contacta con tu supervisor."
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateEmployee(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }
      
      req.session.user = user;
      res.json({ user, message: "Inicio de sesión exitoso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de inicio de sesión inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error en el servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
  // Employee routes (Admin only for list and CRUD operations)
  app.get("/api/employees", requireAdmin, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      // Remove password from response
      const safeEmployees = employees.map(emp => {
        const { password, ...safeEmployee } = emp;
        return safeEmployee;
      });
      res.json(safeEmployees);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener empleados" });
    }
  });

  app.get("/api/employees/:id", requireEmployeeAccess, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      // Remove password from response
      const { password, ...safeEmployee } = employee;
      res.json(safeEmployee);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener empleado" });
    }
  });

  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      console.log("Datos recibidos en backend:", req.body);
      const employeeData = createEmployeeSchema.parse(req.body);
      console.log("Datos después de validación:", employeeData);
      const employee = await storage.createEmployeeWithPassword(employeeData);
      // Remove password from response
      const { password, ...safeEmployee } = employee;
      res.status(201).json(safeEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Errores de validación Zod:", error.errors);
        return res.status(400).json({ message: "Datos de empleado inválidos", errors: error.errors });
      }
      console.log("Error al crear empleado:", error);
      res.status(500).json({ message: "Error al crear empleado" });
    }
  });

  app.put("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      console.log("=== ACTUALIZACIÓN DE EMPLEADO ===");
      console.log("ID del empleado:", req.params.id);
      console.log("Datos recibidos para actualización:", req.body);
      
      const employeeData = updateEmployeeSchema.parse(req.body);
      console.log("Datos después de validación Zod:", employeeData);
      
      const employee = await storage.updateEmployee(req.params.id, employeeData);
      if (!employee) {
        console.log("❌ Error: Empleado no encontrado con ID:", req.params.id);
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      console.log("✅ Empleado actualizado exitosamente:", employee.id);
      // Remove password from response
      const { password, ...safeEmployee } = employee;
      res.json(safeEmployee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("❌ Errores de validación Zod en actualización:", error.errors);
        return res.status(400).json({ message: "Datos de empleado inválidos", errors: error.errors });
      }
      console.log("❌ Error al actualizar empleado:", error);
      res.status(500).json({ message: "Error al actualizar empleado" });
    }
  });

  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteEmployee(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar empleado" });
    }
  });

  // Time entry routes
  app.get("/api/time-entries", requireAuth, async (req, res) => {
    try {
      const { employeeId, date } = req.query;
      let timeEntries;
      
      // Employees can only see their own entries, admins can see all
      if (req.user!.role === "employee") {
        timeEntries = await storage.getTimeEntriesByEmployee(req.user!.id);
        if (date) {
          timeEntries = timeEntries.filter(entry => entry.date === date);
        }
      } else {
        // Admin can filter by employee or date
        if (employeeId) {
          timeEntries = await storage.getTimeEntriesByEmployee(employeeId as string);
        } else if (date) {
          timeEntries = await storage.getTimeEntriesByDate(date as string);
        } else {
          timeEntries = await storage.getTimeEntries();
        }
      }
      
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener registros de tiempo" });
    }
  });

  app.post("/api/time-entries", requireAdmin, async (req, res) => {
    try {
      const timeEntryData = insertTimeEntrySchema.parse(req.body);
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de registro de tiempo inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear registro de tiempo" });
    }
  });

  app.put("/api/time-entries/:id", requireAdmin, async (req, res) => {
    try {
      const timeEntryData = insertTimeEntrySchema.partial().parse(req.body);
      const timeEntry = await storage.updateTimeEntry(req.params.id, timeEntryData);
      if (!timeEntry) {
        return res.status(404).json({ message: "Registro de tiempo no encontrado" });
      }
      res.json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de registro de tiempo inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar registro de tiempo" });
    }
  });

  app.post("/api/time-entries/clock-in", requireAuth, async (req, res) => {
    try {
      // Use current user's ID for employees, allow admin to specify
      let employeeId = req.user!.id;
      if (req.user!.role === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      const today = new Date().toISOString().split('T')[0];
      const existingEntries = await storage.getTimeEntriesByEmployee(employeeId);
      const todayEntry = existingEntries.find(entry => entry.date === today && !entry.clockOut);
      
      if (todayEntry) {
        return res.status(400).json({ message: "El empleado ya ha marcado entrada hoy" });
      }

      // Validar horarios para empleados (no para admins)
      if (req.user!.role === "employee") {
        const validationResult = await validateClockingTime(employeeId, new Date(), "clock-in");
        if (!validationResult.isValid) {
          return res.status(400).json({ message: validationResult.message });
        }
      }

      const timeEntry = await storage.createTimeEntry({
        employeeId,
        clockIn: new Date(),
        date: today,
      });

      res.status(201).json(timeEntry);
    } catch (error) {
      res.status(500).json({ message: "Error al marcar entrada" });
    }
  });

  app.post("/api/time-entries/clock-out", requireAuth, async (req, res) => {
    try {
      // Use current user's ID for employees, allow admin to specify
      let employeeId = req.user!.id;
      if (req.user!.role === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      const today = new Date().toISOString().split('T')[0];
      const existingEntries = await storage.getTimeEntriesByEmployee(employeeId);
      const todayEntry = existingEntries.find(entry => entry.date === today && !entry.clockOut);
      
      if (!todayEntry) {
        return res.status(400).json({ message: "El empleado no ha marcado entrada hoy" });
      }

      // Validar horarios para empleados (no para admins)
      if (req.user!.role === "employee") {
        const validationResult = await validateClockingTime(employeeId, new Date(), "clock-out");
        if (!validationResult.isValid) {
          return res.status(400).json({ message: validationResult.message });
        }
      }

      const updatedEntry = await storage.updateTimeEntry(todayEntry.id, {
        clockOut: new Date(),
      });

      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Error al marcar salida" });
    }
  });

  // Schedule routes
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.query;
      let schedules;
      
      // Employees can only see their own schedules, admins can see all
      if (req.user!.role === "employee") {
        schedules = await storage.getSchedulesByEmployee(req.user!.id);
      } else {
        // Admin can filter by employee
        if (employeeId) {
          schedules = await storage.getSchedulesByEmployee(employeeId as string);
        } else {
          schedules = await storage.getSchedules();
        }
      }
      
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener horarios" });
    }
  });

  app.post("/api/schedules", requireAdmin, async (req, res) => {
    try {
      const scheduleData = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de horario inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear horario" });
    }
  });

  app.post("/api/schedules/bulk", requireAdmin, async (req, res) => {
    try {
      const bulkData = bulkScheduleCreateSchema.parse(req.body);
      const schedules = await storage.createBulkSchedules(bulkData);
      res.status(201).json(schedules);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de horarios inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear horarios masivos" });
    }
  });

  app.put("/api/schedules/:id", requireAdmin, async (req, res) => {
    try {
      const scheduleData = insertScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateSchedule(req.params.id, scheduleData);
      if (!schedule) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de horario inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar horario" });
    }
  });

  app.delete("/api/schedules/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteSchedule(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar horario" });
    }
  });

  // Incident routes
  app.get("/api/incidents", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.query;
      let incidents;
      
      // Employees can only see their own incidents, admins can see all
      if (req.user!.role === "employee") {
        incidents = await storage.getIncidentsByEmployee(req.user!.id);
      } else {
        // Admin can filter by employee
        if (employeeId) {
          incidents = await storage.getIncidentsByEmployee(employeeId as string);
        } else {
          incidents = await storage.getIncidents();
        }
      }
      
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener incidencias" });
    }
  });

  app.post("/api/incidents", requireAuth, async (req, res) => {
    try {
      const incidentData = insertIncidentSchema.parse(req.body);
      // Employees can only create incidents for themselves
      if (req.user!.role === "employee") {
        incidentData.employeeId = req.user!.id;
      }
      const incident = await storage.createIncident(incidentData);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de incidencia inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear incidencia" });
    }
  });

  app.put("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      const incidentData = insertIncidentSchema.partial().parse(req.body);
      const incident = await storage.updateIncident(req.params.id, incidentData);
      if (!incident) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
      res.json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de incidencia inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar incidencia" });
    }
  });

  app.delete("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteIncident(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar incidencia" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      // Employees see limited stats, admins see all
      if (req.user!.role === "employee") {
        const userEntries = await storage.getTimeEntriesByEmployee(req.user!.id);
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = userEntries.find(entry => entry.date === today);
        
        // Calculate user's hours this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const weekEntries = userEntries.filter(entry => entry.date >= weekStartStr && entry.totalHours);
        const userHoursThisWeek = Math.floor(weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0) / 60);
        
        const userIncidents = await storage.getIncidentsByEmployee(req.user!.id);
        const pendingIncidents = userIncidents.filter(inc => inc.status === "pending").length;
        
        res.json({
          isEmployee: true,
          isClockedIn: todayEntry && !todayEntry.clockOut,
          hoursWorked: userHoursThisWeek,
          incidents: pendingIncidents,
        });
      } else {
        // Admin dashboard
        const employees = await storage.getEmployees();
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = await storage.getTimeEntriesByDate(today);
        const incidents = await storage.getIncidents();
        
        const totalEmployees = employees.filter(emp => emp.isActive).length;
        const presentToday = todayEntries.filter(entry => entry.clockIn && !entry.clockOut).length;
        
        // Calculate total hours worked this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const allEntries = await storage.getTimeEntries();
        const weekEntries = allEntries.filter(entry => entry.date >= weekStartStr && entry.totalHours);
        const totalHoursThisWeek = Math.floor(weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0) / 60);
        
        const pendingIncidents = incidents.filter(inc => inc.status === "pending").length;

        res.json({
          isEmployee: false,
          totalEmployees,
          presentToday,
          hoursWorked: totalHoursThisWeek,
          incidents: pendingIncidents,
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
