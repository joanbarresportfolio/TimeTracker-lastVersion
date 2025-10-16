/**
 * RUTAS DE GESTIÓN DE JORNADAS LABORALES DIARIAS
 * ===============================================
 * 
 * Gestión manual de jornadas laborales consolidadas por día.
 */

import type { Express } from "express";
import { storage } from "../storage";
import {
  manualDailyWorkdaySchema,
  updateManualDailyWorkdaySchema,
} from "@shared/schema";
import { requireAdmin } from "../middleware/auth";
import { handleApiError } from "./utils";

export function registerDailyWorkdayRoutes(app: Express) {
  /**
   * GET /api/daily-workday
   * =====================
   * 
   * Obtiene una jornada laboral específica por empleado y fecha.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores
   * 
   * QUERY PARAMS:
   * - employeeId: ID del empleado (requerido)
   * - date: Fecha en formato YYYY-MM-DD (requerido)
   * 
   * RESPONSES:
   * - 200: Datos de la jornada laboral
   * - 400: Parámetros faltantes
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/daily-workday", requireAdmin, async (req, res) => {
    try {
      const { employeeId, date } = req.query;

      if (!employeeId || !date) {
        return res
          .status(400)
          .json({ message: "employeeId y date son requeridos" });
      }

      const workday = await storage.getDailyWorkdayByEmployeeAndDate(
        employeeId as string,
        date as string,
      );
      const hasClockEntries = await storage.hasClockEntriesForDate(
        employeeId as string,
        date as string,
      );

      res.json({
        workday: workday || null,
        hasClockEntries,
        canEdit: !hasClockEntries,
      });
    } catch (error) {
      handleApiError(res, error, "Error al obtener jornada laboral");
    }
  });

  /**
   * GET /api/daily-workday/history
   * ==============================
   * 
   * Obtiene el historial de jornadas laborales de un empleado por rango de fechas.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores
   * 
   * QUERY PARAMS:
   * - employeeId: ID del empleado (requerido)
   * - startDate: Fecha inicial en formato YYYY-MM-DD (requerido)
   * - endDate: Fecha final en formato YYYY-MM-DD (requerido)
   * 
   * RESPONSES:
   * - 200: Array de jornadas laborales
   * - 400: Parámetros faltantes
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/daily-workday/history", requireAdmin, async (req, res) => {
    try {
      const { employeeId, startDate, endDate } = req.query;

      if (!employeeId || !startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "employeeId, startDate y endDate son requeridos" });
      }

      const workdays = await storage.getDailyWorkdaysByEmployeeAndRange(
        employeeId as string,
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

  /**
   * POST /api/daily-workday
   * ======================
   * 
   * Crea manualmente una jornada laboral.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores
   * 
   * REQUEST BODY:
   * {
   *   "employeeId": "emp-id",
   *   "date": "2024-03-15",
   *   "startTime": "09:00",
   *   "endTime": "17:00",
   *   "breakMinutes": 30
   * }
   * 
   * RESPONSES:
   * - 201: Jornada creada exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/daily-workday", requireAdmin, async (req, res) => {
    try {
      const data = manualDailyWorkdaySchema.parse(req.body);

      const startDateTime = new Date(`${data.date}T${data.startTime}:00`);
      const endDateTime = new Date(`${data.date}T${data.endTime}:00`);

      const workday = await storage.createDailyWorkdayWithAutoClockEntries(
        data.employeeId,
        data.date,
        startDateTime,
        endDateTime,
        data.breakMinutes || 0,
        null,
      );
      res.status(201).json(workday);
    } catch (error) {
      handleApiError(res, error, "Error al crear jornada laboral");
    }
  });

  /**
   * PUT /api/daily-workday/:id
   * =========================
   * 
   * Actualiza una jornada laboral manual existente.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores
   * 
   * RESPONSES:
   * - 200: Jornada actualizada exitosamente
   * - 400: Datos inválidos / Jornada tiene fichajes
   * - 401: No autorizado
   * - 404: Jornada no encontrada
   * - 500: Error interno del servidor
   */
  app.put("/api/daily-workday/:id", requireAdmin, async (req, res) => {
    try {
      const data = updateManualDailyWorkdaySchema.parse(req.body);
      const workdayId = req.params.id;

      const existingWorkday = await storage.getDailyWorkdayById(workdayId);
      if (!existingWorkday) {
        return res
          .status(404)
          .json({ message: "Jornada laboral no encontrada" });
      }

      const hasClockEntries = await storage.hasClockEntriesForDate(
        existingWorkday.idUser,
        existingWorkday.date,
      );

      const startDateTime = new Date(
        `${existingWorkday.date}T${data.startTime}:00`,
      );
      const endDateTime = new Date(
        `${existingWorkday.date}T${data.endTime}:00`,
      );

      const updatedWorkday = await storage.updateDailyWorkdayWithAutoClockEntries(
        workdayId,
        existingWorkday.idUser,
        existingWorkday.date,
        startDateTime,
        endDateTime,
        data.breakMinutes || 0,
        null
      );

      res.json(updatedWorkday);
    } catch (error) {
      handleApiError(res, error, "Error al actualizar jornada laboral");
    }
  });

  /**
   * DELETE /api/daily-workday/:id
   * ============================
   * 
   * Elimina una jornada laboral manual.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores
   * 
   * RESPONSES:
   * - 204: Jornada eliminada exitosamente
   * - 400: Jornada tiene fichajes
   * - 401: No autorizado
   * - 404: Jornada no encontrada
   * - 500: Error interno del servidor
   */
  app.delete("/api/daily-workday/:id", requireAdmin, async (req, res) => {
    try {
      const workdayId = req.params.id;

      const existingWorkday = await storage.getDailyWorkdayById(workdayId);
      if (!existingWorkday) {
        return res
          .status(404)
          .json({ message: "Jornada laboral no encontrada" });
      }

      // Eliminar la jornada y sus fichajes asociados automáticamente
      await storage.deleteDailyWorkdayWithAutoClockEntries(
        workdayId,
        existingWorkday.idUser,
        existingWorkday.date
      );
      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, "Error al eliminar jornada laboral");
    }
  });
}
