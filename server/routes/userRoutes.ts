/**
 * RUTAS DE GESTIÓN DE USUARIOS/EMPLEADOS
 * =======================================
 *
 * CRUD completo de empleados del sistema usando DatabaseStorage.
 */

import type { Express } from "express";
import { storage } from "../storage";
import { insertUserSchema, updateUserSchema } from "@shared/schema";
import { requireAdmin, requireEmployeeAccess } from "../middleware/auth";
import { handleApiError } from "./utils";

export function registerUserRoutes(app: Express) {
  // Obtener todos los empleados
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(
        users.map((u) => {
          const { passwordHash, ...safeUser } = u;
          return safeUser;
        }),
      );
    } catch (error) {
      handleApiError(res, error, "Error al obtener empleados");
    }
  });

  // Obtener un empleado por ID
  app.get("/api/users/:id", requireEmployeeAccess, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user)
        return res.status(404).json({ message: "Empleado no encontrado" });

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      handleApiError(res, error, "Error al obtener empleado");
    }
  });

  // Crear un nuevo empleado
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Validar que se haya seleccionado departamento si es requerido
      if (!userData.departmentId) {
        return res.status(400).json({
          errors: [{
            path: ["departmentId"],
            message: "Debe seleccionar un departamento"
          }]
        });
      }

      // Validar que se haya seleccionado rol si es requerido
      if (!userData.roleEnterpriseId) {
        return res.status(400).json({
          errors: [{
            path: ["roleEnterpriseId"],
            message: "Debe seleccionar un rol"
          }]
        });
      }

      // Verificar si el DNI ya existe
      if (userData.dni) {
        const existingUserByDNI = await storage.getUserByDNI(userData.dni);
        if (existingUserByDNI) {
          return res.status(400).json({
            errors: [{
              path: ["dni"],
              message: "Este DNI ya está registrado"
            }]
          });
        }
      }

      // Verificar si el email ya existe
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({
          errors: [{
            path: ["email"],
            message: "Este correo electrónico ya está registrado"
          }]
        });
      }

      // Verificar si el número de empleado ya existe
      const existingUserByNumber = await storage.getUserByNumber(userData.numEmployee);
      if (existingUserByNumber) {
        return res.status(400).json({
          errors: [{
            path: ["numEmployee"],
            message: "Este número de empleado ya está registrado"
          }]
        });
      }

      const newUser = await storage.createUser(userData);
      const { passwordHash, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      handleApiError(res, error, "Error al crear empleado");
    }
  });

  // Actualizar un empleado existente
  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      // Validar los datos recibidos (todos opcionales)
      const userData = updateUserSchema.parse(req.body);

      // Buscar el usuario actual
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser)
        return res.status(404).json({ message: "Empleado no encontrado" });

      // Preparar los datos de actualización
      const updateData: any = { ...userData };
      delete updateData.password; // Quitar password del objeto base

      // Si se envió una nueva contraseña, hashearla
      if (userData.password && userData.password.trim() !== "") {
        const bcrypt = await import("bcryptjs");
        const hash = await bcrypt.hash(userData.password, 10);
        updateData.passwordHash = hash; // Guardar como passwordHash
      }

      // Actualizar el usuario
      const updatedUser = await storage.updateUser(req.params.id, updateData);
      if (!updatedUser)
        return res.status(404).json({ message: "Empleado no encontrado" });

      // Quitar el hash del resultado
      const { passwordHash, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      handleApiError(res, error, "Error al actualizar empleado");
    }
  });

  // Eliminar un empleado
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: "Empleado no encontrado" });

      res.status(204).send();
    } catch (error) {
      handleApiError(res, error, "Error al eliminar empleado");
    }
  });
}
