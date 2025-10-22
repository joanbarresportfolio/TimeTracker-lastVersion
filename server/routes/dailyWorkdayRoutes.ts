/**
 * RUTAS DE GESTIÓN DE JORNADAS LABORALES DIARIAS
 * ===============================================
 *
 * Gestión manual de jornadas laborales consolidadas por día.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAdmin } from "../middleware/auth";
import { handleApiError } from "./utils";
import { z } from "zod";
import { workdayFormSchema } from "@shared/schema";

const manualDailyWorkdaySchema = z.object({
  userId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakMinutes: z.number().optional(),
  startBreak: z.string().optional(),
  endBreak: z.string().optional(),
});

export function registerDailyWorkdayRoutes(app: Express) {
  // Obtener jornadas del usuario autenticado (para app móvil) - NO requiere admin
  app.get("/api/daily-workdays", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "No autenticado" });
      }

      const { startDate, endDate } = req.query;
      const userId = req.session.userId;

      if (startDate && endDate) {
        // Obtener por rango de fechas
        const workdays = await storage.getDailyWorkdaysByUserAndRange(
          userId,
          startDate as string,
          endDate as string,
        );
        return res.json(workdays);
      } else {
        // Obtener todas las jornadas del usuario
        const workdays = await storage.getDailyWorkdays();
        const userWorkdays = workdays.filter((w) => w.idUser === userId);
        return res.json(userWorkdays);
      }
    } catch (error) {
      handleApiError(res, error, "Error al obtener jornadas laborales");
    }
  });

  // Obtener jornada laboral por usuario y fecha
  app.get("/api/daily-workday", requireAdmin, async (req, res) => {
    try {
      const { userId, date } = req.query;
      if (!userId || !date) {
        return res
          .status(400)
          .json({ message: "userId y date son requeridos" });
      }

      const workday = await storage.getDailyWorkdayByUserAndDate(
        userId as string,
        date as string,
      );
      res.json(workday || null);
    } catch (error) {
      handleApiError(res, error, "Error al obtener jornada laboral");
    }
  });

  app.get("/api/daily-workday/all", requireAdmin, async (req, res) => {
    try {
      const workdays = await storage.getDailyWorkdays();
      res.status(200).json(workdays);
    } catch (error) {
      handleApiError(
        res,
        error,
        "Error al obtener todas las jornadas laborales",
      );
    }
  });

  // Obtener historial de jornadas por rango de fechas
  app.get("/api/daily-workday/history", requireAdmin, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      if (!userId || !startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "userId, startDate y endDate son requeridos" });
      }

      const workdays = await storage.getDailyWorkdaysByUserAndRange(
        userId as string,
        startDate as string,
        endDate as string,
      );

      res.json(workdays);
    } catch (error) {
      handleApiError(
        res,
        error,
        "Error al obtener historial de jornadas laborales",
      );
    }
  });

  app.post("/api/daily-workday", requireAdmin, async (req, res) => {
    try {
      const data = workdayFormSchema.parse(req.body);

      const workday = await storage.createManualDailyWorkday({
        userId: data.userId, // mapear employeeId a userId
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        startBreak: data.startBreak, // mapear breakStartTime
        endBreak: data.endBreak, // mapear breakEndTime
      });

      res.status(201).json(workday);
    } catch (error) {
      handleApiError(res, error, "Error al crear jornada laboral");
    }
  });

  // Eliminar jornada laboral manual
  app.delete("/api/daily-workday/:id", requireAdmin, async (req, res) => {
    try {
      const workdayId = req.params.id;

      const existingWorkday = await storage.getDailyWorkdayById(workdayId);
      if (!existingWorkday) {
        return res
          .status(404)
          .json({ message: "Jornada laboral no encontrada" });
      }

      await storage.deleteClockEntriesByDailyWorkday(workdayId);
      await storage.deleteDailyWorkday(workdayId);

      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, "Error al eliminar jornada laboral");
    }
  });
}
