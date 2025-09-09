import { type Request, type Response, type NextFunction } from "express";
import { type User } from "@shared/schema";

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
  }
  
  req.user = req.session.user;
  next();
}

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
  }
  
  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
  }
  
  req.user = req.session.user;
  next();
}

// Middleware to check if user can access employee data (admin or own data)
export function requireEmployeeAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: "No autorizado. Debe iniciar sesión." });
  }
  
  const user = req.session.user;
  const employeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;
  
  // Admin can access all employee data
  if (user.role === "admin") {
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