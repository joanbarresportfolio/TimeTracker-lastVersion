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
