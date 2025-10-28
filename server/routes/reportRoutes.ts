/**
 * RUTAS DE REPORTES Y ANÁLISIS
 * =============================
 *
 * Generación de reportes y análisis de datos laborales.
 */

import type { Express } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "../db";
import { users, dailyWorkday, schedules, incidents, clockEntries } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSpanishDate } from "../utils/timezone";

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
          .where(eq(dailyWorkday.idUser, employee.id));

        const scheduledShiftsData = await db
          .select()
          .from(schedules)
          .where(
            and(
              eq(schedules.employeeId, employee.id),
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
            const [startH, startM] = shift.startTime.split(":").map(Number);
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

  /**
   * GET /api/reports/detailed-export
   * ==================================
   *
   * Genera datos detallados por día para exportación a Excel.
   * Devuelve para cada empleado, todos los días del rango con:
   * - Horario asignado (schedule)
   * - Horario realizado (clock entries)
   * - Pausas asignadas vs realizadas
   * - Incidencias del día
   *
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   *
   * QUERY PARAMS:
   * - startDate: Fecha de inicio (YYYY-MM-DD) (requerido)
   * - endDate: Fecha de fin (YYYY-MM-DD) (requerido)
   * - employeeId: (opcional) ID del empleado
   * - departmentId: (opcional) ID del departamento
   *
   * RESPONSES:
   * - 200: Datos detallados por empleado y día
   * - 400: Parámetros faltantes
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/reports/detailed-export", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate, employeeId, departmentId } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: "Se requieren startDate y endDate" });
      }

      // Obtener empleados según filtros
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

      // Generar array de fechas en el rango
      const dates: string[] = [];
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      const employeesData = [];

      for (const employee of employees) {
        // Batch fetch: Obtener todos los datos del empleado de una vez
        const employeeSchedules = await db
          .select()
          .from(schedules)
          .where(
            and(
              eq(schedules.employeeId, employee.id),
              sql`${schedules.date} >= ${startDate as string}`,
              sql`${schedules.date} <= ${endDate as string}`
            )
          );

        const employeeClockEntries = await db
          .select()
          .from(clockEntries)
          .where(
            and(
              eq(clockEntries.idUser, employee.id),
              sql`DATE(${clockEntries.timestamp} AT TIME ZONE 'Europe/Madrid') >= ${startDate as string}`,
              sql`DATE(${clockEntries.timestamp} AT TIME ZONE 'Europe/Madrid') <= ${endDate as string}`
            )
          )
          .orderBy(clockEntries.timestamp);

        const employeeWorkdays = await db
          .select()
          .from(dailyWorkday)
          .where(
            and(
              eq(dailyWorkday.idUser, employee.id),
              sql`${dailyWorkday.date} >= ${startDate as string}`,
              sql`${dailyWorkday.date} <= ${endDate as string}`
            )
          );

        const employeeIncidents = await db
          .select()
          .from(incidents)
          .where(
            and(
              eq(incidents.idUser, employee.id),
              sql`DATE(${incidents.createdAt} AT TIME ZONE 'Europe/Madrid') >= ${startDate as string}`,
              sql`DATE(${incidents.createdAt} AT TIME ZONE 'Europe/Madrid') <= ${endDate as string}`
            )
          );

        // Crear maps por fecha para acceso rápido
        const schedulesByDate = new Map(
          employeeSchedules.map(s => [s.date, s])
        );

        const clockEntriesByDate = new Map<string, typeof employeeClockEntries>();
        for (const entry of employeeClockEntries) {
          // Extraer fecha española del timestamp usando helper
          const date = getSpanishDate(entry.timestamp);
          if (!clockEntriesByDate.has(date)) {
            clockEntriesByDate.set(date, []);
          }
          clockEntriesByDate.get(date)!.push(entry);
        }

        const workdaysByDate = new Map(
          employeeWorkdays.map(w => [w.date, w])
        );

        const incidentsByDate = new Map<string, typeof employeeIncidents>();
        for (const incident of employeeIncidents) {
          // Extraer fecha española del timestamp usando helper
          const date = getSpanishDate(incident.createdAt!);
          if (!incidentsByDate.has(date)) {
            incidentsByDate.set(date, []);
          }
          incidentsByDate.get(date)!.push(incident);
        }

        const dailyData = [];

        for (const date of dates) {
          const schedule = schedulesByDate.get(date) || null;
          const clockEntriesData = clockEntriesByDate.get(date) || [];
          const workday = workdaysByDate.get(date) || null;
          const incidentsData = incidentsByDate.get(date) || [];

          // Calcular pausas realizadas a partir de clock entries
          const breaks = clockEntriesData.filter(
            (entry) => entry.entryType === 'break_start' || entry.entryType === 'break_end'
          );

          let totalBreakMinutes = 0;
          for (let i = 0; i < breaks.length; i += 2) {
            if (breaks[i]?.entryType === 'break_start' && breaks[i + 1]?.entryType === 'break_end') {
              const start = new Date(breaks[i].timestamp);
              const end = new Date(breaks[i + 1].timestamp);
              totalBreakMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
            }
          }

          // Calcular pausa asignada (del schedule)
          let assignedBreakMinutes = 0;
          if (schedule?.startBreak && schedule?.endBreak) {
            const [startH, startM] = schedule.startBreak.split(':').map(Number);
            const [endH, endM] = schedule.endBreak.split(':').map(Number);
            assignedBreakMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          }

          // Pausas extraordinarias = pausas realizadas - pausa asignada (puede ser negativo)
          const extraordinaryBreakMinutes = totalBreakMinutes - assignedBreakMinutes;

          dailyData.push({
            date,
            dayOfMonth: parseInt(date.split('-')[2], 10), // Extraer día del formato YYYY-MM-DD
            schedule: schedule || null,
            clockEntries: clockEntriesData,
            workday: workday || null,
            incidents: incidentsData,
            totalBreakMinutes,
            assignedBreakMinutes,
            extraordinaryBreakMinutes,
          });
        }

        employeesData.push({
          employee: {
            id: employee.id,
            number: employee.numEmployee,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: `${employee.firstName} ${employee.lastName}`,
          },
          dailyData,
        });
      }

      res.json(employeesData);
    } catch (error) {
      console.error("Error al generar datos detallados de exportación:", error);
      res.status(500).json({ message: "Error al generar datos de exportación" });
    }
  });
}
