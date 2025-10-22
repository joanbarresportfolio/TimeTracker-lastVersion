/**
 * RUTAS DE AUTENTICACIÓN
 * ======================
 *
 * Manejo de autenticación de usuarios (login, logout, verificación de sesión).
 */

import type { Express } from "express";
import { storage } from "../storage";
import { loginSchema } from "@shared/schema";
import { requireAuth, generateToken } from "../middleware/auth";
import { z } from "zod";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    try {
      // PASO 1: Validar formato de datos de entrada
      const { email, password } = loginSchema.parse(req.body);

      // PASO 2: Autenticar empleado contra base de datos
      const user = await storage.authenticateUser(email, password);

      if (!user) {
        return res
          .status(401)
          .json({ message: "Email o contraseña incorrectos" });
      }

      // PASO 3: Establecer sesión de usuario (para web app)
      req.session.user = user;

      // PASO 4: Generar token JWT (para mobile app)
      const token = generateToken(user);

      // PASO 5: Responder con datos seguros (sin password) y token
      res.json({ user, token, message: "Inicio de sesión exitoso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Datos de inicio de sesión inválidos",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Error en el servidor" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
}
