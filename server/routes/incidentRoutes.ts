/**
 * RUTAS DE GESTIÓN DE INCIDENCIAS
 * ================================
 * 
 * CRUD de incidencias laborales (tardanzas, ausencias, etc).
 */

import type { Express } from "express";
import { storage } from "../storage";
import { insertIncidentSchema, incidentFormSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { z } from "zod";

export function registerIncidentRoutes(app: Express) {
  /**
   * GET /api/incidents
   * =================
   * 
   * Obtiene incidencias con control de acceso por roles.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado (admin o employee)
   * 
   * CONTROL DE ACCESO POR ROLES:
   * - Employee: Solo puede ver sus propias incidencias
   * - Admin: Puede ver todas las incidencias con filtro opcional
   * 
   * PARÁMETROS DE QUERY OPCIONALES:
   * - employeeId: Filtra incidencias de empleado específico (solo admin)
   * 
   * RESPONSES:
   * - 200: Array de incidencias
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/incidents", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.query;
      let incidents;

      if (req.user!.role === "employee") {
        incidents = await storage.getIncidentsByEmployee(req.user!.id);
      } else {
        if (employeeId) {
          incidents = await storage.getIncidentsByEmployee(
            employeeId as string,
          );
        } else {
          incidents = await storage.getIncidents();
        }
      }

      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener incidencias" });
    }
  });

  /**
   * GET /api/incidents/:id
   * =====================
   * 
   * Obtiene una incidencia específica por ID.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * RESPONSES:
   * - 200: Datos de la incidencia
   * - 401: No autorizado
   * - 404: Incidencia no encontrada
   * - 500: Error interno del servidor
   */
  app.get("/api/incidents/:id", requireAuth, async (req, res) => {
    try {
      const incident = await storage.getIncident(req.params.id);
      if (!incident) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener incidencia" });
    }
  });

  /**
   * POST /api/incidents
   * ==================
   * 
   * Crea una nueva incidencia con control de acceso por roles.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Ambos roles pueden crear incidencias
   * 
   * DIFERENCIAS POR ROL:
   * - Employee: Solo puede crear incidencias sobre sí mismo
   * - Admin: Puede crear incidencias sobre cualquier empleado
   * 
   * RESPONSES:
   * - 201: Incidencia creada exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/incidents", requireAuth, async (req, res) => {
    try {
      const formData = incidentFormSchema.parse(req.body);

      // If employee, only allow creating incidents for themselves
      if (req.user!.role === "employee") {
        formData.idUser = req.user!.id;
      }

      // Find or create daily_workday for this user+date
      let dailyWorkday = await storage.getDailyWorkdayByUserAndDate(
        formData.idUser,
        formData.date
      );

      if (!dailyWorkday) {
        // Create a new daily_workday entry for this date
        dailyWorkday = await storage.createDailyWorkday({
          idUser: formData.idUser,
          date: formData.date,
          status: 'open',
          startTime: null,
          endTime: null,
          workedMinutes: 0,
          breakMinutes: 0,
          overtimeMinutes: 0,
        });
      }

      // Create the incident with the daily_workday reference
      const incidentData = {
        idUser: formData.idUser,
        idDailyWorkday: dailyWorkday.id,
        idIncidentsType: formData.idIncidentsType,
        description: formData.description,
        status: formData.status,
        registeredBy: formData.registeredBy || req.user!.id,
      };

      const incident = await storage.createIncident(incidentData);
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de incidencia inválidos",
          errors: error.errors,
        });
      }
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Error al crear incidencia" });
    }
  });

  /**
   * PUT /api/incidents/:id
   * =====================
   * 
   * Actualiza una incidencia existente (solo administradores).
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden modificar incidencias
   * 
   * RESPONSES:
   * - 200: Incidencia actualizada exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 404: Incidencia no encontrada
   * - 500: Error interno del servidor
   */
  app.put("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      const incidentData = insertIncidentSchema.partial().parse(req.body);
      const incident = await storage.updateIncident(
        req.params.id,
        incidentData,
      );

      if (!incident) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }

      res.json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de incidencia inválidos",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Error al actualizar incidencia" });
    }
  });

  /**
   * DELETE /api/incidents/:id
   * ========================
   * 
   * Elimina permanentemente una incidencia del sistema.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar incidencias
   * 
   * RESPONSES:
   * - 204: Incidencia eliminada exitosamente (sin contenido)
   * - 401: No autorizado
   * - 404: Incidencia no encontrada
   * - 500: Error interno del servidor
   */
  app.delete("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteIncident(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar incidencia" });
    }
  });
}
