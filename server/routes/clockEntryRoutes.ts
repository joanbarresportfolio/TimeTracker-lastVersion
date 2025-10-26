/**
 * RUTAS DE GESTIÓN DE FICHAJES (CLOCK ENTRIES)
 * =============================================
 *
 * Gestión completa del sistema de fichajes: entradas, salidas, pausas, y consultas.
 */

import type { Express } from "express";
import { storage } from "../storage";
import {
  requireAdmin,
  requireAuth,
  requireEmployeeAccess,
} from "../middleware/auth";
import { validateClockingTime } from "./utils";
import { db } from "../db";
import { clockEntries } from "@shared/schema";
import { sql } from "drizzle-orm";

export function registerClockEntryRoutes(app: Express) {
  /**
   * POST /api/clock-entries
   * Endpoint para que los empleados creen sus propias entradas de fichaje
   * Usar requireAuth para permitir que los empleados autenticados fichen
   */
  app.post("/api/clock-entries", requireAuth, async (req, res) => {
    try {
      const { entryType, source, timestamp } = req.body;
      const userId = req.user!.id; // Obtenemos el userId del usuario autenticado

      // Validar parámetros obligatorios
      if (!entryType) {
        return res.status(400).json({
          message: "Falta el parámetro obligatorio: entryType",
        });
      }

      // Validar tipo de registro
      const validTypes = ["clock_in", "clock_out", "break_start", "break_end"];
      if (!validTypes.includes(entryType)) {
        return res.status(400).json({ message: "entryType inválido." });
      }

      // Capturar timestamp: usar el proporcionado o dejar que storage use new Date()
      // El parámetro date ya no es necesario, se deriva del timestamp
      const newClockEntry = await storage.createClockEntry(
        userId,
        entryType,
        "", // date vacío, se derivará del timestamp
        source || "mobile_app",
        timestamp, // timestamp opcional del cliente
      );

      res.status(201).json(newClockEntry);
    } catch (error) {
      console.error("Error al crear clock entry:", error);
      res.status(500).json({
        message: "Error al registrar el clock entry.",
        error: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/clock-entries/today
   * Obtiene el daily workday y clock entries de hoy para el empleado autenticado
   */
  app.get("/api/clock-entries/today", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const today = new Date().toISOString().split("T")[0];

      // Obtener la jornada diaria de hoy
      const dailyWorkday = await storage.getDailyWorkdayByUserAndDate(
        userId,
        today,
      );

      if (!dailyWorkday) {
        return res.json({ dailyWorkday: null, clockEntries: [] });
      }

      // Obtener todas las entradas de reloj de hoy y filtrar por usuario
      const allClockEntries = await storage.getClockEntriesByDate(today);
      const userClockEntries = allClockEntries.filter(
        (entry) => entry.idUser === userId,
      );

      res.json({
        dailyWorkday,
        clockEntries: userClockEntries,
      });
    } catch (error) {
      console.error("Error al obtener clock entries de hoy:", error);
      res.status(500).json({
        message: "Error al obtener registros de hoy.",
        error: (error as Error).message,
      });
    }
  });

  app.post("/api/clock-entry", requireAdmin, async (req, res) => {
    try {
      const { employeeId, tipoRegistro, date, origen } = req.body;

      // Validar parámetros obligatorios
      if (!employeeId || !tipoRegistro || !date) {
        return res.status(400).json({
          message:
            "Faltan parámetros obligatorios: employeeId, tipoRegistro o date.",
        });
      }

      // Validar tipo de registro
      const validTypes = ["clock_in", "clock_out", "break_start", "break_end"];
      if (!validTypes.includes(tipoRegistro)) {
        return res.status(400).json({ message: "tipoRegistro inválido." });
      }

      // Llamar al método del storage
      const newClockEntry = await storage.createClockEntry(
        employeeId,
        tipoRegistro,
        date,
        origen,
      );

      res.status(201).json({
        message: "Clock entry registrado correctamente",
        clockEntry: newClockEntry,
      });
    } catch (error) {
      console.error("Error al crear clock entry:", error);
      res.status(500).json({
        message: "Error al registrar el clock entry.",
        error: (error as Error).message,
      });
    }
  });

  app.get("/api/time-entries/day/:date", requireAdmin, async (req, res) => {
    try {
      const { date } = req.params;

      if (!date) {
        return res.status(400).json({ message: "Falta el parámetro 'date'." });
      }

      // Obtener los time entries del día (calculados a partir de los clock entries)
      const timeEntries = await storage.getTimeEntriesByDate(date);

      if (!timeEntries || timeEntries.length === 0) {
        return res.status(404).json({
          message: "No se encontraron registros de tiempo para ese día.",
        });
      }

      res.status(200).json(timeEntries);
    } catch (error) {
      console.error("Error al obtener los time entries del día:", error);
      res.status(500).json({
        message:
          "Error al obtener los registros de tiempo para la fecha indicada.",
        error: (error as Error).message,
      });
    }
  });

  app.get(
    "/api/time-entries/user/:userId/month/:date",
    requireAdmin,
    async (req, res) => {
      try {
        const { userId, date } = req.params;

        // Validar parámetros
        if (!userId || !date) {
          return res
            .status(400)
            .json({ message: "Faltan los parámetros 'userId' o 'date'." });
        }

        // Obtener los time entries del mes correspondiente al usuario
        const timeEntries = await storage.getTimeEntriesByUserMonth(
          userId,
          date,
        );

        if (!timeEntries || timeEntries.length === 0) {
          return res.status(404).json({
            message:
              "No se encontraron registros de tiempo para el usuario en el mes indicado.",
          });
        }

        // Enviar resultado
        res.status(200).json(timeEntries);
      } catch (error) {
        console.error(
          "Error al obtener los time entries del mes del usuario:",
          error,
        );
        res.status(500).json({
          message:
            "Error al obtener los registros de tiempo del usuario para el mes indicado.",
          error: (error as Error).message,
        });
      }
    },
  );
}
