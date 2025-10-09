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
  /**
   * POST /api/auth/login
   * ===================
   * 
   * Autentica usuario y establece sesión.
   * 
   * FLUJO DE AUTENTICACIÓN:
   * 1. VALIDACIÓN: Verifica formato de email y contraseña con Zod
   * 2. AUTENTICACIÓN: Busca empleado y valida contraseña con bcrypt
   * 3. SESIÓN: Guarda datos de usuario en sesión Express
   * 4. RESPUESTA: Devuelve usuario sin campos sensibles
   * 
   * SEGURIDAD:
   * - Contraseñas se comparan usando bcrypt (resist timing attacks)
   * - Solo se devuelve información no sensible
   * - Sesión se almacena de manera segura
   * 
   * REQUEST BODY:
   * {
   *   "email": "usuario@email.com",
   *   "password": "contraseña_texto_plano"
   * }
   * 
   * RESPONSES:
   * - 200: Login exitoso con datos de usuario
   * - 400: Datos inválidos (errores de validación Zod)
   * - 401: Credenciales incorrectas
   * - 500: Error interno del servidor
   */
  app.post("/api/auth/login", async (req, res) => {
    try {
      // PASO 1: Validar formato de datos de entrada
      const { email, password } = loginSchema.parse(req.body);

      // PASO 2: Autenticar empleado contra base de datos
      const user = await storage.authenticateEmployee(email, password);

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

  /**
   * POST /api/auth/logout
   * ====================
   * 
   * Cierra sesión del usuario destruyendo la sesión.
   * 
   * PROCESO DE LOGOUT:
   * 1. DESTRUIR SESIÓN: Elimina datos de sesión del store
   * 2. LIMPIAR COOKIE: Remueve cookie de sesión del cliente
   * 3. CONFIRMAR: Responde con mensaje de éxito
   * 
   * NO REQUIERE AUTENTICACIÓN:
   * Permite logout incluso si la sesión está corrupta
   * 
   * RESPONSES:
   * - 200: Logout exitoso
   * - 500: Error al destruir sesión
   */
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  /**
   * GET /api/auth/me
   * ===============
   * 
   * Verifica sesión activa y devuelve datos del usuario actual.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Verifica que el usuario esté autenticado
   * 
   * USO TÍPICO:
   * - Verificación de sesión al cargar la aplicación
   * - Obtener datos del usuario logueado
   * - Validar permisos en el frontend
   * 
   * RESPONSES:
   * - 200: Usuario autenticado con sus datos
   * - 401: No autenticado (middleware rechaza request)
   */
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
}
