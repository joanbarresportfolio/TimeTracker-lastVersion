/**
 * RUTAS DE GESTIÓN DE FICHAJES (CLOCK ENTRIES)
 * =============================================
 * 
 * Gestión completa del sistema de fichajes: entradas, salidas, pausas, y consultas.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireEmployeeAccess } from "../middleware/auth";
import { validateClockingTime } from "./utils";
import { db } from "../db";
import { clockEntries } from "@shared/schema";
import { sql } from "drizzle-orm";

export function registerClockEntryRoutes(app: Express) {
  /**
   * GET /api/time-entries
   * ====================
   * 
   * Obtiene registros de tiempo con filtrado por roles y parámetros.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado (admin o employee)
   * 
   * CONTROL DE ACCESO POR ROLES:
   * - Employee: Solo puede ver sus propios registros
   * - Admin: Puede ver todos los registros con filtros opcionales
   * 
   * PARÁMETROS DE QUERY OPCIONALES:
   * - employeeId: Filtra por empleado específico (solo admin)
   * - date: Filtra por fecha específica (formato YYYY-MM-DD)
   * 
   * RESPONSES:
   * - 200: Array de registros de tiempo
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/time-entries", requireAuth, async (req, res) => {
    try {
      const { employeeId, date } = req.query;

      const targetEmployeeId =
        req.user!.roleSystem === "employee"
          ? req.user!.id
          : (employeeId as string | undefined);

      if (targetEmployeeId) {
        const timeEntries =
          await storage.getTimeEntriesByEmployee(targetEmployeeId);

        const filteredEntries = date
          ? timeEntries.filter((entry) => entry.date === date)
          : timeEntries;

        res.json(filteredEntries);
      } else {
        const allEntries = await storage.getTimeEntries();

        const filteredEntries = date
          ? allEntries.filter((entry) => entry.date === date)
          : allEntries;

        res.json(filteredEntries);
      }
    } catch (error) {
      res.status(500).json({ message: "Error al obtener registros de tiempo" });
    }
  });

  /**
   * POST /api/time-entries/clock-in
   * ==============================
   * 
   * Permite a empleados fichar entrada (clock-in) con validación de horarios.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Empleados y admins pueden usar esta función
   * 
   * RESPONSES:
   * - 201: Clock-in exitoso con registro creado
   * - 400: Ya fichado hoy / fuera de horario
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/time-entries/clock-in", requireAuth, async (req, res) => {
    try {
      let employeeId = req.user!.id;
      if (req.user!.roleSystem === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      const today = new Date().toISOString().split("T")[0];
      const existingEntries =
        await storage.getTimeEntriesByEmployee(employeeId);
      const todayEntry = existingEntries.find(
        (entry) => entry.date === today && !entry.clockOut,
      );

      if (todayEntry) {
        return res
          .status(400)
          .json({ message: "El empleado ya ha marcado entrada hoy" });
      }

      if (req.user!.roleSystem === "employee") {
        const validationResult = await validateClockingTime(
          employeeId,
          new Date(),
          "clock-in",
        );
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

  /**
   * POST /api/time-entries/clock-out
   * ===============================
   * 
   * Permite a empleados fichar salida (clock-out) completando registro del día.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Empleados y admins pueden usar esta función
   * 
   * RESPONSES:
   * - 200: Clock-out exitoso con registro completado
   * - 400: No hay entrada previa / fuera de horario
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/time-entries/clock-out", requireAuth, async (req, res) => {
    try {
      let employeeId = req.user!.id;
      if (req.user!.roleSystem === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      const today = new Date().toISOString().split("T")[0];
      const existingEntries =
        await storage.getTimeEntriesByEmployee(employeeId);
      const todayEntry = existingEntries.find(
        (entry) => entry.date === today && !entry.clockOut,
      );

      if (!todayEntry) {
        return res
          .status(400)
          .json({ message: "El empleado no ha marcado entrada hoy" });
      }

      if (req.user!.roleSystem === "employee") {
        const validationResult = await validateClockingTime(
          employeeId,
          new Date(),
          "clock-out",
        );
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

  /**
   * POST /api/fichajes
   * ==================
   * 
   * Crea un nuevo fichaje (entrada, salida, pausa_inicio, pausa_fin)
   * y actualiza automáticamente la jornada diaria.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * RESPONSES:
   * - 201: Fichaje creado exitosamente
   * - 400: Tipo de registro inválido
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/fichajes", requireAuth, async (req, res) => {
    try {
      let employeeId = req.user!.id;
      if (req.user!.roleSystem === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      const tipoRegistro = req.body.tipoRegistro || req.body.tipo_registro;

      if (!tipoRegistro) {
        return res.status(400).json({
          message:
            "El campo 'tipoRegistro' es requerido. Valores válidos: clock_in, clock_out, break_start, break_end",
        });
      }

      const validTypes = ["clock_in", "clock_out", "break_start", "break_end"];
      if (!validTypes.includes(tipoRegistro)) {
        return res.status(400).json({
          message: `Tipo de registro inválido. Debe ser uno de: ${validTypes.join(", ")}`,
        });
      }

      const entryType = tipoRegistro as
        | "clock_in"
        | "clock_out"
        | "break_start"
        | "break_end";
      const shiftId = req.body.idTurno || null;
      const source = (req.body.origen || "web") as
        | "mobile_app"
        | "physical_terminal"
        | "web";
      const notes = req.body.observaciones || null;

      const fichaje = await storage.crearFichaje(
        employeeId,
        entryType,
        shiftId,
        source,
        notes,
      );
      res.status(201).json(fichaje);
    } catch (error) {
      console.error("Error al crear fichaje:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al crear fichaje";
      res.status(500).json({ message: errorMessage });
    }
  });

  /**
   * GET /api/fichajes/all
   * =====================
   * 
   * Obtiene todos los fichajes de todos los empleados para una fecha.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * QUERY PARAMS:
   * - date: Fecha en formato YYYY-MM-DD (requerido)
   * 
   * RESPONSES:
   * - 200: Lista de fichajes
   * - 400: Parámetro date faltante
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/fichajes/all", requireAuth, async (req, res) => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          message: "El parámetro 'date' es requerido (formato YYYY-MM-DD)",
        });
      }

      const fichajes = await db
        .select()
        .from(clockEntries)
        .where(sql`DATE(${clockEntries.timestamp}) = ${date}`)
        .orderBy(clockEntries.timestamp);

      res.json(fichajes);
    } catch (error) {
      console.error("Error al obtener todos los fichajes:", error);
      res.status(500).json({ message: "Error al obtener fichajes" });
    }
  });

  /**
   * GET /api/fichajes/:employeeId
   * ==============================
   * 
   * Obtiene fichajes de un empleado específico.
   * 
   * MIDDLEWARE APLICADO:
   * - requireEmployeeAccess: Empleado ve sus datos, admin ve cualquiera
   * 
   * QUERY PARAMS:
   * - date: Fecha en formato YYYY-MM-DD (requerido)
   * 
   * RESPONSES:
   * - 200: Lista de fichajes del empleado
   * - 400: Parámetro date faltante
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get(
    "/api/fichajes/:employeeId",
    requireEmployeeAccess,
    async (req, res) => {
      try {
        const { date } = req.query;

        if (!date) {
          return res.status(400).json({
            message: "El parámetro 'date' es requerido (formato YYYY-MM-DD)",
          });
        }

        const fichajes = await storage.obtenerFichajesDelDia(
          req.params.employeeId,
          date as string,
        );

        res.json(fichajes);
      } catch (error) {
        console.error("Error al obtener fichajes:", error);
        res.status(500).json({ message: "Error al obtener fichajes" });
      }
    },
  );

  /**
   * GET /api/jornadas/:employeeId
   * ==============================
   * 
   * Obtiene jornadas consolidadas de un empleado.
   * 
   * MIDDLEWARE APLICADO:
   * - requireEmployeeAccess: Empleado ve sus datos, admin ve cualquiera
   * 
   * QUERY PARAMS:
   * - date: Fecha en formato YYYY-MM-DD (requerido)
   * 
   * RESPONSES:
   * - 200: Jornada diaria del empleado
   * - 400: Parámetro date faltante
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get(
    "/api/jornadas/:employeeId",
    requireEmployeeAccess,
    async (req, res) => {
      try {
        const { date } = req.query;

        if (!date) {
          return res.status(400).json({
            message: "El parámetro 'date' es requerido (formato YYYY-MM-DD)",
          });
        }

        const jornada = await storage.obtenerJornadaDiaria(
          req.params.employeeId,
          date as string,
        );

        res.json(jornada || null);
      } catch (error) {
        console.error("Error al obtener jornadas:", error);
        res.status(500).json({ message: "Error al obtener jornadas" });
      }
    },
  );

  /**
   * GET /api/jornadas/:employeeId/actual
   * =====================================
   * 
   * Obtiene la jornada actual (hoy) de un empleado.
   * 
   * MIDDLEWARE APLICADO:
   * - requireEmployeeAccess: Empleado ve sus datos, admin ve cualquiera
   * 
   * RESPONSES:
   * - 200: Jornada actual del empleado
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get(
    "/api/jornadas/:employeeId/actual",
    requireEmployeeAccess,
    async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const jornada = await storage.obtenerJornadaDiaria(
          req.params.employeeId,
          today,
        );

        res.json(jornada || null);
      } catch (error) {
        console.error("Error al obtener jornada actual:", error);
        res.status(500).json({ message: "Error al obtener jornada actual" });
      }
    },
  );

  /**
   * GET /api/fichajes/:employeeId/ultimo
   * =====================================
   * 
   * Obtiene el último fichaje del empleado (para determinar próxima acción).
   * 
   * MIDDLEWARE APLICADO:
   * - requireEmployeeAccess: Empleado ve sus datos, admin ve cualquiera
   * 
   * RESPONSES:
   * - 200: Último fichaje del empleado
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get(
    "/api/fichajes/:employeeId/ultimo",
    requireEmployeeAccess,
    async (req, res) => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const fichajes = await storage.obtenerFichajesDelDia(
          req.params.employeeId,
          today,
        );

        const ultimoFichaje =
          fichajes.length > 0 ? fichajes[fichajes.length - 1] : null;

        res.json(ultimoFichaje);
      } catch (error) {
        console.error("Error al obtener último fichaje:", error);
        res.status(500).json({ message: "Error al obtener último fichaje" });
      }
    },
  );
}
