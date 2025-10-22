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
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getUsers();
      const today = new Date().toISOString().split("T")[0];
      const todayEntries = await storage.getTimeEntriesByDate(today);
      console.log(todayEntries);
      const incidents = await storage.getIncidents();
      const dailyWorkdays = await storage.getDailyWorkdaysLastWeek();

      const totalEmployees = employees.filter((emp) => emp.isActive).length;
      const presentToday = todayEntries.filter(
        (entry) => entry.clockIn && !entry.clockOut,
      ).length;

      // Calcular horas totales trabajadas esta semana (todos los empleados)
      const totalMinutesThisWeek = dailyWorkdays.reduce((sum, wd) => {
        const worked = wd.workedMinutes || 0;
        const breaks = wd.breakMinutes || 0;
        return sum + (worked - breaks);
      }, 0);

      const totalHoursThisWeek = totalMinutesThisWeek / 60;

      // Contar incidencias pendientes
      const pendingIncidents = incidents.filter(
        (inc) => inc.status?.trim().toLowerCase() === "pending",
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
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener estadísticas del dashboard" });
    }
  });
}
