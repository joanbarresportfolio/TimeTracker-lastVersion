import { type Request, type Response, type NextFunction } from "express";
import { type User } from "@shared/schema";
import jwt from "jsonwebtoken";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Middleware to check if user is authenticated (supports both session and JWT)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Check session first (for web)
  if (req.session?.user) {
    req.user = req.session.user;
    return next();
  }
  
  // Check JWT token (for mobile)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyJWTToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }
  
  return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
}

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Use requireAuth first to set req.user
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
    }
    next();
  });
}

// Middleware to check if user can access employee data (admin or own data)
export function requireEmployeeAccess(req: Request, res: Response, next: NextFunction) {
  // Use requireAuth first to set req.user
  requireAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
    }
    
    const user = req.user;
    const employeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;
    
    // Admin can access all employee data
    if (user.role === "admin") {
      return next();
    }
    
    // Employee can only access their own data
    if (employeeId && employeeId !== user.id) {
      return res.status(403).json({ message: "Acceso denegado. Solo puede acceder a sus propios datos." });
    }
    
    next();
  });
}

// JWT Secret (must be provided via environment variable)
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  console.warn("Warning: Using default JWT_SECRET for development. Set JWT_SECRET environment variable.");
  return "dev-jwt-secret-change-in-production";
})();

// Helper function to verify JWT token
function verifyJWTToken(token: string): User | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as User;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Helper function to generate JWT token
export function generateJWTToken(user: User): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
}