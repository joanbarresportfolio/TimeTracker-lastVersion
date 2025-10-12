/**
 * RUTAS DE GESTIÓN DE USUARIOS/EMPLEADOS
 * =======================================
 *
 * CRUD completo de empleados del sistema.
 */

import type { Express } from "express";
import { storage } from "../storage";
import {
  createUserSchema as createEmployeeSchema,
  updateUserSchema as updateEmployeeSchema,
} from "@shared/schema";
import { requireAdmin, requireEmployeeAccess } from "../middleware/auth";
import { handleApiError } from "./utils";

export function registerUserRoutes(app: Express) {
  /**
   * GET /api/employees
   * =================
   *
   * Obtiene lista completa de empleados del sistema.
   *
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden ver lista completa
   *
   * SEGURIDAD:
   * - Elimina campo 'password' de todas las respuestas
   * - Solo administradores tienen acceso
   *
   * RESPONSES:
   * - 200: Lista de empleados (sin passwords)
   * - 401: No autorizado (no admin)
   * - 500: Error interno del servidor
   */
  app.get("/api/employees", requireAdmin, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      const safeEmployees = employees.map((emp) => {
        const { passwordHash, ...safeEmployee } = emp;
        return safeEmployee;
      });
      res.json(safeEmployees);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener empleados" });
    }
  });

  /**
   * GET /api/employees/:id
   * =====================
   *
   * Obtiene datos de un empleado específico.
   *
   * MIDDLEWARE APLICADO:
   * - requireEmployeeAccess: Empleado puede ver sus datos, admin ve cualquiera
   *
   * RESPONSES:
   * - 200: Datos del empleado (sin password)
   * - 401: No autorizado
   * - 404: Empleado no encontrado
   * - 500: Error interno del servidor
   */
  app.get("/api/employees/:id", requireEmployeeAccess, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      //const { passwordHash, ...safeEmployee } = employee;
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener empleado" });
    }
  });

  /**
   * POST /api/employees
   * ==================
   *
   * Crea un nuevo empleado en el sistema.
   *
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear empleados
   *
   * RESPONSES:
   * - 201: Empleado creado exitosamente
   * - 400: Datos inválidos (errores Zod)
   * - 401: No autorizado (no admin)
   * - 500: Error interno (ej: email duplicado)
   */
  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      console.log("Datos recibidos en backend:", req.body);
      const userData = createEmployeeSchema.parse(req.body);
      console.log("Datos después de validación:", userData);

      const employeeData = {
        numEmployee: userData.numEmployee,
        dni: userData.dni,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        roleSystem: userData.roleSystem,
        roleEnterpriseId: userData.roleEnterpriseId,
        departmentId: userData.departmentId,
        hireDate: userData.hireDate,
        isActive: userData.isActive ?? true,
      };

      const employee = await storage.createEmployeeWithPassword(employeeData);
      const { passwordHash, ...safeEmployee } = employee;
      res.status(201).json(safeEmployee);
    } catch (error) {
      handleApiError(res, error, "Error al crear empleado");
    }
  });

  /**
   * PUT /api/employees/:id
   * =====================
   *
   * Actualiza datos de un empleado existente.
   *
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden actualizar empleados
   *
   * RESPONSES:
   * - 200: Empleado actualizado exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 404: Empleado no encontrado
   * - 500: Error interno (ej: email duplicado)
   */
  app.put("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      console.log("=== ACTUALIZACIÓN DE EMPLEADO ===");
      console.log("ID del empleado:", req.params.id);
      console.log("Datos recibidos para actualización:", req.body);

      const employeeData = updateEmployeeSchema.parse(req.body);
      console.log("Datos después de validación Zod:", employeeData);

      const employee = await storage.updateEmployee(
        req.params.id,
        employeeData,
      );

      if (!employee) {
        console.log("❌ Error: Empleado no encontrado con ID:", req.params.id);
        return res.status(404).json({ message: "Empleado no encontrado" });
      }

      console.log("✅ Empleado actualizado exitosamente:", employee.id);
      const { passwordHash, ...safeEmployee } = employee;
      res.json(safeEmployee);
    } catch (error) {
      handleApiError(res, error, "Error al actualizar empleado");
    }
  });

  /**
   * DELETE /api/employees/:id
   * ========================
   *
   * Elimina permanentemente un empleado del sistema.
   *
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar empleados
   *
   * RESPONSES:
   * - 204: Empleado eliminado exitosamente (sin contenido)
   * - 401: No autorizado
   * - 404: Empleado no encontrado
   * - 500: Error interno (ej: foreign key constraint)
   */
  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const success = await storage.deleteEmployee(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar empleado" });
    }
  });
}
