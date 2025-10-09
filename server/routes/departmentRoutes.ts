/**
 * RUTAS DE GESTIÓN DE DEPARTAMENTOS
 * ==================================
 * 
 * CRUD de departamentos de la empresa.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../middleware/auth";

export function registerDepartmentRoutes(app: Express) {
  /**
   * GET /api/departments
   * ====================
   * 
   * Obtiene lista completa de departamentos del sistema.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado
   * 
   * RESPONSES:
   * - 200: Lista de departamentos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener departamentos" });
    }
  });

  /**
   * POST /api/departments
   * =====================
   * 
   * Crea un nuevo departamento.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear departamentos
   * 
   * BODY ESPERADO:
   * {
   *   "name": "Nombre del departamento",
   *   "description": "Descripción opcional"
   * }
   * 
   * RESPONSES:
   * - 201: Departamento creado
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/departments", requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name || typeof name !== "string") {
        return res
          .status(400)
          .json({ message: "El nombre del departamento es requerido" });
      }

      const department = await storage.createDepartment({ name, description });
      res.status(201).json(department);
    } catch (error) {
      res.status(500).json({ message: "Error al crear departamento" });
    }
  });

  /**
   * DELETE /api/departments/:id
   * ===========================
   * 
   * Elimina un departamento y desasigna a todos los empleados.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar departamentos
   * 
   * RESPONSES:
   * - 204: Departamento eliminado exitosamente
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.delete("/api/departments/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteDepartment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar departamento" });
    }
  });
}
