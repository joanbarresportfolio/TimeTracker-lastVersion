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
import { handleApiError } from "./utils";

export function registerIncidentTypeRoutes(app: Express) {
  // Obtener todos los tipos de incidencias
  app.get("/api/incident-types", requireAuth, async (req, res) => {
    try {
      const types = await storage.getIncidentTypes();
      res.json(types);
    } catch (error) {
      handleApiError(res, error, "Error al obtener tipos de incidencias");
    }
  });

  // Crear un nuevo tipo de incidencia
  app.post("/api/incident-types", requireAdmin, async (req, res) => {
    try {
      const parsed = insertIncidentsTypeSchema.parse(req.body);
      const incidentType = await storage.createIncidentType(parsed);
      res.status(201).json(incidentType);
    } catch (error) {
      handleApiError(res, error, "Error al crear tipo de incidencia");
    }
  });

  // Actualizar un tipo de incidencia
  app.put("/api/incident-types/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = insertIncidentsTypeSchema.partial().parse(req.body);
      const incidentType = await storage.updateIncidentType(
        req.params.id,
        parsed,
      );
      res.json(incidentType);
    } catch (error) {
      handleApiError(res, error, "Error al actualizar tipo de incidencia");
    }
  });

  // Eliminar un tipo de incidencia
  app.delete("/api/incident-types/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteIncidentType(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, "Error al eliminar tipo de incidencia");
    }
  });
}
