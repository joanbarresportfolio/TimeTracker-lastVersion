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
  // Obtener incidencias (filtradas por empleado si no es admin)
  app.get("/api/incidents", requireAuth, async (req, res) => {
    try {
      const { UserId } = req.query;
      let incidents;

      if (req.user!.roleSystem === "employee") {
        incidents = await storage.getIncidentsByUser(req.user!.id);
      } else {
        if (UserId) {
          incidents = await storage.getIncidentsByUser(UserId as string);
        } else {
          incidents = await storage.getIncidents();
        }
      }

      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener incidencias" });
    }
  });

  app.get("/api/incidents/all", requireAdmin, async (req, res) => {
    try {
      const incidents = await storage.getIncidents();
      if (!incidents) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al obtener incidencia" });
    }
  });
  // Obtener incidencia por ID
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

  // Crear nueva incidencia
  app.post("/api/incidents", requireAuth, async (req, res) => {
    try {
      const formData = incidentFormSchema.parse(req.body);

      // Si es empleado, solo puede crear incidencias para sí mismo
      if (req.user!.roleSystem === "employee") {
        formData.idUser = req.user!.id;
      }

      // Buscar o crear daily_workday para este usuario+fecha
      let dailyWorkday = await storage.getDailyWorkdayByUserAndDate(
        formData.idUser,
        formData.date,
      );

      if (!dailyWorkday) {
        dailyWorkday = await storage.createManualDailyWorkday({
          userId: formData.idUser,
          date: formData.date,
          startTime: "00:00",
          endTime: "00:00",
        });
      }

      // Crear la incidencia
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
        return res
          .status(400)
          .json({
            message: "Datos de incidencia inválidos",
            errors: error.errors,
          });
      }
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Error al crear incidencia" });
    }
  });

  // Actualizar incidencia
  app.put("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      const formData = incidentFormSchema.partial().parse(req.body);
      
      // Si viene date, buscar o crear daily_workday
      let updateData: any = {
        idIncidentsType: formData.idIncidentsType,
        description: formData.description,
        status: formData.status,
      };

      if (formData.date && formData.idUser) {
        let dailyWorkday = await storage.getDailyWorkdayByUserAndDate(
          formData.idUser,
          formData.date,
        );

        if (!dailyWorkday) {
          dailyWorkday = await storage.createManualDailyWorkday({
            userId: formData.idUser,
            date: formData.date,
            startTime: "00:00",
            endTime: "00:00",
          });
        }
        updateData.idDailyWorkday = dailyWorkday.id;
      }

      const incident = await storage.updateIncident(
        req.params.id,
        updateData,
      );

      if (!incident) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }

      res.json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({
            message: "Datos de incidencia inválidos",
            errors: error.errors,
          });
      }
      res.status(500).json({ message: "Error al actualizar incidencia" });
    }
  });

  // Eliminar incidencia
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
