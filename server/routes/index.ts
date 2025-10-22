/**
 * REGISTRO CENTRAL DE RUTAS
 * =========================
 *
 * Este archivo centraliza el registro de todas las rutas modulares de la aplicación.
 * Cada módulo de rutas se encarga de un dominio funcional específico.
 */

import type { Express } from "express";
import { createServer } from "http";
import { registerAuthRoutes } from "./authRoutes";
import { registerUserRoutes } from "./userRoutes";
import { registerDepartmentRoutes } from "./departmentRoutes";
import { registerRoleRoutes } from "./roleRoutes";
import { registerIncidentTypeRoutes } from "./incidentTypeRoutes";
import { registerIncidentRoutes } from "./incidentRoutes";
import { registerClockEntryRoutes } from "./clockEntryRoutes";
import { registerScheduleRoutes } from "./scheduleRoutes";
import { registerDailyWorkdayRoutes } from "./dailyWorkdayRoutes";
import { registerDashboardRoutes } from "./dashboardRoutes";
import { registerReportRoutes } from "./reportRoutes";

/**
 * FUNCIÓN PRINCIPAL DE REGISTRO DE RUTAS
 * ======================================
 *
 * Registra todas las rutas modulares de la aplicación y crea el servidor HTTP.
 *
 * MÓDULOS DE RUTAS:
 * 1. Autenticación - Login, logout, verificación de sesión
 * 2. Usuarios/Empleados - CRUD de empleados
 * 3. Departamentos - Gestión de departamentos
 * 4. Roles - Gestión de roles
 * 5. Tipos de Incidencias - Configuración de tipos de incidencias
 * 6. Incidencias - Gestión de incidencias laborales
 * 7. Fichajes - Sistema de entradas, salidas y pausas
 * 8. Horarios - Gestión de horarios programados
 * 9. Jornadas Diarias - Registro manual de jornadas laborales
 * 10. Reportes - Generación de análisis e informes
 *
 * @param app - Instancia de Express application
 * @returns HTTP Server instance
 */
export function registerRoutes(app: Express) {
  // Registrar rutas de autenticación
  registerAuthRoutes(app);

  // Registrar rutas de gestión de usuarios/empleados
  registerUserRoutes(app);

  // Registrar rutas de gestión de departamentos
  registerDepartmentRoutes(app);

  // Registrar rutas de gestión de roles
  registerRoleRoutes(app);

  // Registrar rutas de tipos de incidencias
  registerIncidentTypeRoutes(app);

  // Registrar rutas de incidencias
  registerIncidentRoutes(app);

  // Registrar rutas de fichajes (clock entries)
  registerClockEntryRoutes(app);

  // Registrar rutas de horarios programados
  registerScheduleRoutes(app);

  // Registrar rutas de jornadas diarias
  registerDailyWorkdayRoutes(app);

  // Registrar rutas de dashboard
  registerDashboardRoutes(app);

  // Registrar rutas de reportes y análisis
  registerReportRoutes(app);

  // Crear y retornar servidor HTTP
  const httpServer = createServer(app);
  return httpServer;
}
