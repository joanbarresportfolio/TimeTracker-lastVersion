import { type Request, type Response, type NextFunction } from "express";
import { type User } from "@shared/schema";
import jwt from "jsonwebtoken";

// JWT secret key - in production this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Helper function to verify JWT token
function verifyToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Middleware to check if user is authenticated (supports both session and JWT)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // First check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    
    if (user) {
      req.user = user;
      return next();
    }
  }
  
  // Fallback to session-based authentication
  if (!req.session.user) {
    return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
  }
  
  req.user = req.session.user;
  next();
}

// Helper function to generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware to check if user is admin (supports both session and JWT)
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // First check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    
    if (user) {
      if (user.rol !== "admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
      }
      req.user = user;
      return next();
    }
  }
  
  // Fallback to session-based authentication
  if (!req.session.user) {
    return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
  }
  
  if (req.session.user.rol !== "admin") {
    return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
  }
  
  req.user = req.session.user;
  next();
}

// Middleware to check if user can access employee data (admin or own data, supports both session and JWT)
export function requireEmployeeAccess(req: Request, res: Response, next: NextFunction) {
  let user: User | undefined;
  
  // First check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    user = verifyToken(token) || undefined;
  }
  
  // Fallback to session-based authentication
  if (!user && req.session.user) {
    user = req.session.user;
  }
  
  if (!user) {
    return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
  }
  
  const employeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;
  
  // Admin can access all employee data
  if (user.rol === "admin") {
    req.user = user;
    return next();
  }
  
  // Employee can only access their own data
  if (employeeId && employeeId !== user.id) {
    return res.status(403).json({ message: "Acceso denegado. Solo puede acceder a sus propios datos." });
  }
  
  req.user = user;
  next();
}