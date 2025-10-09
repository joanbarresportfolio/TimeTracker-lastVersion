/**
 * RUTAS DE REPORTES Y ANÁLISIS
 * =============================
 * 
 * Generación de reportes y análisis de datos laborales.
 */

import type { Express } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { users, dailyWorkday, schedules, incidents } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export function registerReportRoutes(app: Express) {
  /**
   * GET /api/reports/period-analysis
   * ==================================
   * 
   * Genera un informe detallado por período (día, semana, mes, trimestre, año).
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * QUERY PARAMS:
   * - startDate: Fecha de inicio (YYYY-MM-DD) (requerido)
   * - endDate: Fecha de fin (YYYY-MM-DD) (requerido)
   * - periodType: Tipo de período (day, week, month, quarter, year) (opcional)
   * - employeeId: (opcional) ID del empleado
   * - departmentId: (opcional) ID del departamento
   * 
   * RESPONSES:
   * - 200: Datos de análisis del período
   * - 400: Parámetros faltantes
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/reports/period-analysis", requireAuth, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        periodType = "day",
        employeeId,
        departmentId,
      } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Se requieren startDate y endDate" });
      }

      let employeesQuery = db.select().from(users);

      if (employeeId) {
        employeesQuery = employeesQuery.where(
          eq(users.id, employeeId as string),
        ) as any;
      } else if (departmentId) {
        employeesQuery = employeesQuery.where(
          eq(users.departmentId, departmentId as string),
        ) as any;
      }

      const employees = await employeesQuery;

      const reportData = [];

      for (const employee of employees) {
        const workdays = await db
          .select()
          .from(dailyWorkday)
          .where(
            eq(dailyWorkday.idUser, employee.id)
          );

        const scheduledShiftsData = await db
          .select()
          .from(schedules)
          .where(
            and(
              eq(schedules.idUser, employee.id),
              sql`${schedules.date} >= ${startDate as string}`,
              sql`${schedules.date} <= ${endDate as string}`,
            ),
          );

        const incidentsData = await db
          .select()
          .from(incidents)
          .where(
            and(
              eq(incidents.idUser, employee.id),
              sql`DATE(${incidents.createdAt}) >= ${startDate as string}`,
              sql`DATE(${incidents.createdAt}) <= ${endDate as string}`,
            ),
          );

        const totalWorkedMinutes = workdays.reduce(
          (sum, wd) => sum + (wd.workedMinutes || 0),
          0,
        );
        const totalPlannedMinutes = scheduledShiftsData.reduce((sum, shift) => {
          if (shift.startTime && shift.endTime) {
            const [startH, startM] = shift.startTime
              .split(":")
              .map(Number);
            const [endH, endM] = shift.endTime.split(":").map(Number);
            return sum + (endH * 60 + endM - (startH * 60 + startM));
          }
          return sum;
        }, 0);

        const daysWorked = workdays.length;
        const daysScheduled = scheduledShiftsData.length;

        const workdayDates = new Set(workdays.map((wd) => wd.date));
        const scheduledDates = new Set(scheduledShiftsData.map((s) => s.date));
        const absences = Array.from(scheduledDates).filter(
          (date) => !workdayDates.has(date),
        );

        reportData.push({
          employeeId: employee.id,
          employeeNumber: employee.numEmployee,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          period: periodType,
          periodStart: startDate,
          periodEnd: endDate,
          hoursWorked: Math.floor(totalWorkedMinutes / 60),
          minutesWorked: totalWorkedMinutes % 60,
          hoursPlanned: Math.floor(totalPlannedMinutes / 60),
          minutesPlanned: totalPlannedMinutes % 60,
          hoursDifference: Math.floor(
            (totalWorkedMinutes - totalPlannedMinutes) / 60,
          ),
          minutesDifference:
            Math.abs(totalWorkedMinutes - totalPlannedMinutes) % 60,
          daysWorked,
          daysScheduled,
          absences: absences.length,
          absenceDates: absences,
          incidents: incidentsData.map((inc) => ({
            id: inc.id,
            description: inc.description,
            date: inc.createdAt,
          })),
        });
      }

      res.json(reportData);
    } catch (error) {
      console.error("Error al generar informe por período:", error);
      res.status(500).json({ message: "Error al generar informe" });
    }
  });
}
