/**
 * RUTAS DE GESTIÓN DE ROLES
 * ==========================
 * 
 * CRUD de roles empresariales (posiciones).
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../middleware/auth";

export function registerRoleRoutes(app: Express) {
  /**
   * GET /api/roles
   * ==============
   * 
   * Obtiene lista completa de roles del sistema.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * RESPONSES:
   * - 200: Lista de roles
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/roles", requireAuth, async (req, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener roles" });
    }
  });

  /**
   * POST /api/roles
   * ===============
   * 
   * Crea un nuevo rol.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear roles
   * 
   * BODY ESPERADO:
   * {
   *   "name": "Nombre del rol",
   *   "description": "Descripción opcional"
   * }
   * 
   * RESPONSES:
   * - 201: Rol creado
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
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
      res.status(500).json({ message: "Error al crear rol" });
    }
  });

  /**
   * DELETE /api/roles/:id
   * =====================
   * 
   * Elimina un rol y desasigna de todos los empleados.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar roles
   * 
   * RESPONSES:
   * - 204: Rol eliminado exitosamente
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar rol" });
    }
  });
}
