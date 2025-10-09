/**
 * RUTAS DE GESTIÓN DE HORARIOS
 * =============================
 * 
 * Gestión de horarios programados y horarios específicos por fecha.
 */

import type { Express } from "express";
import { storage } from "../storage";
import {
  insertScheduleSchema,
  bulkScheduleCreateSchema,
} from "@shared/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { z } from "zod";

export function registerScheduleRoutes(app: Express) {
  /**
   * GET /api/date-schedules
   * =======================
   * 
   * Obtiene horarios específicos por fecha con control de acceso por roles.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * CONTROL DE ACCESO POR ROLES:
   * - Employee: Solo puede ver sus propios horarios
   * - Admin: Puede ver todos los horarios con filtro opcional
   * 
   * PARÁMETROS DE QUERY OPCIONALES:
   * - employeeId: Filtra horarios de empleado específico (solo admin)
   * - startDate y endDate: Deben proporcionarse ambos o ninguno (formato YYYY-MM-DD)
   * 
   * RESPONSES:
   * - 200: Array de horarios específicos por fecha
   * - 400: Parámetros de query inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/date-schedules", requireAuth, async (req, res) => {
    try {
      const querySchema = z
        .object({
          employeeId: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .refine(
          (data) => {
            return (
              (!data.startDate && !data.endDate) ||
              (data.startDate && data.endDate)
            );
          },
          {
            message: "startDate y endDate deben proporcionarse ambos o ninguno",
          },
        );

      const queryResult = querySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          message: "Parámetros de query inválidos",
          errors: queryResult.error.errors,
        });
      }

      const { employeeId, startDate, endDate } = queryResult.data;
      let scheduledShifts;

      if (req.user!.role === "employee") {
        if (startDate && endDate) {
          scheduledShifts = await storage.getScheduledShiftsByEmployeeAndRange(
            req.user!.id,
            startDate,
            endDate,
          );
        } else {
          scheduledShifts = await storage.getScheduledShiftsByEmployee(
            req.user!.id,
          );
        }
      } else {
        if (employeeId) {
          if (startDate && endDate) {
            scheduledShifts =
              await storage.getScheduledShiftsByEmployeeAndRange(
                employeeId,
                startDate,
                endDate,
              );
          } else {
            scheduledShifts =
              await storage.getScheduledShiftsByEmployee(employeeId);
          }
        } else {
          if (startDate && endDate) {
            scheduledShifts = await storage.getScheduledShiftsByRange(
              startDate,
              endDate,
            );
          } else {
            scheduledShifts = await storage.getScheduledShifts();
          }
        }
      }

      const dateSchedules = scheduledShifts.map((shift) => {
        const [startHour, startMin] = shift.expectedStartTime
          .split(":")
          .map(Number);
        const [endHour, endMin] = shift.expectedEndTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const workMinutes = endMinutes - startMinutes;

        return {
          id: shift.id,
          employeeId: shift.employeeId,
          date: shift.date,
          startTime: shift.expectedStartTime,
          endTime: shift.expectedEndTime,
          workHours: workMinutes,
          isActive:
            shift.status === "scheduled" || shift.status === "confirmed",
          expectedStartTime: shift.expectedStartTime,
          expectedEndTime: shift.expectedEndTime,
          status: shift.status,
        };
      });

      res.json(dateSchedules);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener horarios por fecha" });
    }
  });

  /**
   * POST /api/date-schedules
   * ======================
   * 
   * Crea un horario específico para una fecha determinada.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear horarios por fecha
   * 
   * RESPONSES:
   * - 201: Horario creado exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/date-schedules", requireAdmin, async (req, res) => {
    try {
      const shiftData = insertScheduleSchema.parse(req.body);

      const [startHour, startMin] = shiftData.expectedStartTime
        .split(":")
        .map(Number);
      const [endHour, endMin] = shiftData.expectedEndTime
        .split(":")
        .map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      const workMinutes = endMinutes - startMinutes;

      const dateScheduleData = {
        employeeId: shiftData.employeeId,
        date: shiftData.date,
        startTime: shiftData.expectedStartTime,
        endTime: shiftData.expectedEndTime,
        workHours: workMinutes,
        isActive:
          shiftData.status === "scheduled" || shiftData.status === "confirmed",
      };

      const newDateSchedule =
        await storage.createDateSchedule(dateScheduleData);
      res.json(newDateSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de horario por fecha inválidos",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Error al crear horario por fecha" });
    }
  });

  /**
   * POST /api/date-schedules/bulk
   * ===========================
   * 
   * Crea múltiples horarios específicos por fecha en una sola operación.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear horarios masivos
   * 
   * RESPONSES:
   * - 200: Horarios creados exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/date-schedules/bulk", requireAdmin, async (req, res) => {
    try {
      const bulkData = bulkScheduleCreateSchema.parse(req.body);

      const createdSchedules = await storage.createBulkDateSchedules(bulkData);
      res.json({
        message: "Horarios por fecha creados exitosamente",
        count: createdSchedules.length,
        schedules: createdSchedules,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de horarios masivos inválidos",
          errors: error.errors,
        });
      }
      res
        .status(500)
        .json({ message: "Error al crear horarios masivos por fecha" });
    }
  });

  /**
   * PUT /api/date-schedules/:id
   * =========================
   * 
   * Actualiza un horario específico por fecha existente.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden modificar horarios
   * 
   * RESPONSES:
   * - 200: Horario actualizado exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 404: Horario no encontrado
   * - 500: Error interno del servidor
   */
  app.put("/api/date-schedules/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const shiftUpdateData = insertScheduleSchema
        .partial()
        .parse(req.body);

      const updateData: any = {};

      if (shiftUpdateData.employeeId)
        updateData.employeeId = shiftUpdateData.employeeId;
      if (shiftUpdateData.date) updateData.date = shiftUpdateData.date;
      if (shiftUpdateData.expectedStartTime)
        updateData.startTime = shiftUpdateData.expectedStartTime;
      if (shiftUpdateData.expectedEndTime)
        updateData.endTime = shiftUpdateData.expectedEndTime;

      if (
        shiftUpdateData.expectedStartTime &&
        shiftUpdateData.expectedEndTime
      ) {
        const [startHour, startMin] = shiftUpdateData.expectedStartTime
          .split(":")
          .map(Number);
        const [endHour, endMin] = shiftUpdateData.expectedEndTime
          .split(":")
          .map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        updateData.workHours = endMinutes - startMinutes;
      }

      if (shiftUpdateData.status !== undefined) {
        updateData.isActive =
          shiftUpdateData.status === "scheduled" ||
          shiftUpdateData.status === "confirmed";
      }

      const updatedSchedule = await storage.updateDateSchedule(id, updateData);

      if (!updatedSchedule) {
        return res
          .status(404)
          .json({ message: "Horario por fecha no encontrado" });
      }

      res.json(updatedSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de actualización inválidos",
          errors: error.errors,
        });
      }
      res
        .status(500)
        .json({ message: "Error al actualizar horario por fecha" });
    }
  });

  /**
   * DELETE /api/date-schedules/:id
   * ============================
   * 
   * Elimina un horario específico por fecha.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar horarios
   * 
   * RESPONSES:
   * - 200: Horario eliminado exitosamente
   * - 401: No autorizado
   * - 404: Horario no encontrado
   * - 500: Error interno del servidor
   */
  app.delete("/api/date-schedules/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDateSchedule(id);

      if (!deleted) {
        return res
          .status(404)
          .json({ message: "Horario por fecha no encontrado" });
      }

      res.json({ message: "Horario por fecha eliminado exitosamente" });
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar horario por fecha" });
    }
  });
}
