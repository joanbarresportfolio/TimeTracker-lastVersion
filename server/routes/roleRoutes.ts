/**
 * RUTAS DE GESTIÓN DE ROLES
 * ==========================
 *
 * CRUD de roles empresariales (posiciones) usando DatabaseStorage.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { handleApiError } from "./utils";

export function registerRoleRoutes(app: Express) {
  // Obtener todos los roles
  app.get("/api/roles", requireAuth, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      handleApiError(res, error, "Error al obtener roles");
    }
  });

  // Crear un nuevo rol
  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ message: "El nombre del rol es requerido" });
      }

      const role = await storage.createRole({ name, description });
      res.status(201).json(role);
    } catch (error) {
      handleApiError(res, error, "Error al crear rol");
    }
  });

  // Eliminar un rol por ID
  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, "Error al eliminar rol");
    }
  });
}
