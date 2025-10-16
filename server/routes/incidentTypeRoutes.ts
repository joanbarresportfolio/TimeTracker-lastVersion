/**
 * RUTAS DE GESTIÓN DE TIPOS DE INCIDENCIAS
 * =========================================
 * 
 * CRUD de tipos de incidencias configurables del sistema.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { insertIncidentsTypeSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "../middleware/auth";

export function registerIncidentTypeRoutes(app: Express) {
  /**
   * GET /api/incident-types
   * =======================
   * 
   * Obtiene todos los tipos de incidencias configurados.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * RESPONSES:
   * - 200: Lista de tipos de incidencias
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/incident-types", requireAuth, async (req, res) => {
    try {
      const types = await storage.getIncidentTypes();
      res.json(types);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al obtener tipos de incidencias" });
    }
  });

  /**
   * POST /api/incident-types
   * ========================
   * 
   * Crea un nuevo tipo de incidencia.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear tipos
   * 
   * RESPONSES:
   * - 201: Tipo de incidencia creado
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/incident-types", requireAdmin, async (req, res) => {
    try {
      const validation = insertIncidentsTypeSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          message: "Datos inválidos",
          errors: validation.error.errors,
        });
      }

      const incidentType = await storage.createIncidentType(validation.data);
      res.status(201).json(incidentType);
    } catch (error) {
      console.error("Error al crear tipo de incidencia:", error);
      res.status(500).json({ message: "Error al crear tipo de incidencia" });
    }
  });

  /**
   * PUT /api/incident-types/:id
   * ===========================
   * 
   * Actualiza un tipo de incidencia.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden actualizar tipos
   * 
   * RESPONSES:
   * - 200: Tipo de incidencia actualizado
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.put("/api/incident-types/:id", requireAdmin, async (req, res) => {
    try {
      const validation = insertIncidentsTypeSchema.partial().safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          message: "Datos inválidos",
          errors: validation.error.errors,
        });
      }

      const incidentType = await storage.updateIncidentType(
        req.params.id,
        validation.data,
      );
      res.json(incidentType);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al actualizar tipo de incidencia" });
    }
  });

  /**
   * DELETE /api/incident-types/:id
   * ==============================
   * 
   * Elimina un tipo de incidencia.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar tipos
   * 
   * RESPONSES:
   * - 204: Tipo de incidencia eliminado
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.delete("/api/incident-types/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteIncidentType(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar tipo de incidencia" });
    }
  });
}
