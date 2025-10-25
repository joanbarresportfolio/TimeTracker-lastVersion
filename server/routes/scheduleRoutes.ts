/**
 * RUTAS DE GESTIÓN DE HORARIOS
 * =============================
 *
 * Gestión de horarios programados y horarios específicos por fecha.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { insertScheduleSchema, bulkScheduleCreateSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { z } from "zod";

export function registerScheduleRoutes(app: Express) {
  app.get("/api/schedules-by-date", requireAuth, async (req, res) => {
    try {
      // Validamos el parámetro de query "date"
      const querySchema = z.object({
        date: z
          .string()
          .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "Formato de fecha inválido (YYYY-MM-DD)",
          ),
      });

      const queryResult = querySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({
          message: "Parámetros de query inválidos",
          errors: queryResult.error.errors,
        });
      }

      const { date } = queryResult.data;

      // Recupera los turnos del día
      const scheduledShifts = await storage.getScheduledShiftsByDate(date);
      console.log(scheduledShifts);
      // Estructura los datos antes de devolverlos
      const daySchedules = scheduledShifts.map((shift) => {
        const [startHour, startMin] = shift.startTime.split(":").map(Number);
        const [endHour, endMin] = shift.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const workMinutes = endMinutes - startMinutes;

        return {
          id: shift.id,
          employeeId: shift.employeeId,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          startBreak: shift.startBreak || null,
          endBreak: shift.endBreak || null,
          workHours: workMinutes,
          isActive: true,
        };
      });

      res.json(daySchedules);
    } catch (error) {
      console.error("Error al obtener horarios por fecha:", error);
      res.status(500).json({ message: "Error al obtener horarios por fecha" });
    }
  });
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

      if (employeeId) {
        if (startDate && endDate) {
          scheduledShifts = await storage.getScheduledShiftsByEmployeeAndRange(
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
          console.log("entra");
          scheduledShifts = await storage.getScheduledShiftsByRange(
            startDate,
            endDate,
          );
        } else {
          scheduledShifts = await storage.getScheduledShifts();
        }
      }

      const dateSchedules = scheduledShifts.map((shift) => {
        const [startHour, startMin] = shift.startTime.split(":").map(Number);
        const [endHour, endMin] = shift.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const workMinutes = endMinutes - startMinutes;

        return {
          id: shift.id,
          employeeId: shift.employeeId,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          startBreak: shift.startBreak || null,
          endBreak: shift.endBreak || null,
          workHours: workMinutes,
          isActive: true,
        };
      });

      res.json(dateSchedules);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener horarios por fecha" });
    }
  });

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

  app.put("/api/date-schedules/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const shiftUpdateData = insertScheduleSchema.partial().parse(req.body);

      const updateData: any = {};

      if (shiftUpdateData.idUser) updateData.idUser = shiftUpdateData.idUser;
      if (shiftUpdateData.date) updateData.date = shiftUpdateData.date;
      if (shiftUpdateData.startTime)
        updateData.startTime = shiftUpdateData.startTime;
      if (shiftUpdateData.endTime) updateData.endTime = shiftUpdateData.endTime;
      if (shiftUpdateData.startBreak !== undefined)
        updateData.startBreak = shiftUpdateData.startBreak || null;
      if (shiftUpdateData.endBreak !== undefined)
        updateData.endBreak = shiftUpdateData.endBreak || null;
      if (shiftUpdateData.scheduleType)
        updateData.scheduleType = shiftUpdateData.scheduleType;

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
