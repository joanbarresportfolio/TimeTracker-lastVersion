/**
 * RUTAS DE ESTADÍSTICAS DEL DASHBOARD
 * ====================================
 * 
 * Dashboard con métricas personalizadas según rol del usuario.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware/auth";

export function registerDashboardRoutes(app: Express) {
  /**
   * GET /api/dashboard/stats
   * =======================
   * 
   * Obtiene estadísticas personalizadas según el rol del usuario.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Tanto empleados como admins pueden acceder
   * 
   * DIFERENCIACIÓN POR ROL:
   * 
   * EMPLEADO (isEmployee: true):
   * - isClockedIn: Si está fichado hoy (entrada sin salida)
   * - hoursWorked: Horas trabajadas esta semana (solo propias)
   * - incidents: Número de incidencias pendientes (solo propias)
   * 
   * ADMINISTRADOR (isEmployee: false):
   * - totalEmployees: Total empleados activos
   * - presentToday: Empleados fichados ahora (entrada sin salida)
   * - hoursWorked: Total horas trabajadas por todos esta semana
   * - incidents: Total incidencias pendientes del sistema
   * - newEmployeesLastWeek: Empleados contratados última semana
   * - newIncidentsLastWeek: Incidencias nuevas última semana
   * 
   * RESPONSES:
   * - 200: Objeto con estadísticas personalizadas por rol
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      if (req.user!.role === "employee") {
        // ==== VISTA DE EMPLEADO: Solo datos propios ====

        const userEntries = await storage.getTimeEntriesByEmployee(
          req.user!.id,
        );
        const today = new Date().toISOString().split("T")[0];
        const todayEntry = userEntries.find((entry) => entry.date === today);

        // Calcular horas trabajadas esta semana (solo empleado)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split("T")[0];

        const weekEntries = userEntries.filter(
          (entry) => entry.date >= weekStartStr && entry.totalHours,
        );
        const userHoursThisWeek = Math.floor(
          weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0) /
            60,
        );

        // Contar incidencias pendientes propias
        const userIncidents = await storage.getIncidentsByEmployee(
          req.user!.id,
        );
        const pendingIncidents = userIncidents.filter(
          (inc) => inc.status === "pending",
        ).length;

        res.json({
          isEmployee: true,
          isClockedIn: todayEntry && !todayEntry.clockOut,
          hoursWorked: userHoursThisWeek,
          incidents: pendingIncidents,
        });
      } else {
        // ==== VISTA DE ADMINISTRADOR: Métricas globales del sistema ====

        const employees = await storage.getEmployees();
        const today = new Date().toISOString().split("T")[0];
        const todayEntries = await storage.getTimeEntriesByDate(today);
        const incidents = await storage.getIncidents();

        const totalEmployees = employees.filter((emp) => emp.isActive).length;
        const presentToday = todayEntries.filter(
          (entry) => entry.clockIn && !entry.clockOut,
        ).length;

        // Calcular horas totales trabajadas esta semana (todos los empleados)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split("T")[0];

        const allEntries = await storage.getTimeEntries();
        const weekEntries = allEntries.filter(
          (entry) => entry.date >= weekStartStr && entry.totalHours,
        );
        const totalHoursThisWeek = Math.floor(
          weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0) /
            60,
        );

        const pendingIncidents = incidents.filter(
          (inc) => inc.status === "pending",
        ).length;

        // Calcular empleados nuevos de la última semana
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);

        const newIncidentsLastWeek = incidents.filter((inc) => {
          if (!inc.createdAt) return false;
          const createdAt = new Date(inc.createdAt);
          createdAt.setHours(0, 0, 0, 0);
          return createdAt >= oneWeekAgo;
        }).length;

        const newEmployeesLastWeek = employees.filter((emp) => {
          if (!emp.isActive || !emp.hireDate) return false;
          const hireDate = new Date(emp.hireDate);
          hireDate.setHours(0, 0, 0, 0);
          return hireDate >= oneWeekAgo;
        }).length;

        res.json({
          isEmployee: false,
          totalEmployees,
          presentToday,
          hoursWorked: totalHoursThisWeek,
          incidents: pendingIncidents,
          newEmployeesLastWeek,
          newIncidentsLastWeek,
        });
      }
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener estadísticas del dashboard" });
    }
  });
}
