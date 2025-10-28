import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import cron from "node-cron"; // 🧭 NUEVO
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { clockEntries, ClockEntry, type User } from "@shared/schema";
import "dotenv/config";
import { storage } from "./storage";
import { db } from "./db";

import { sql } from "drizzle-orm";
import { format } from "date-fns";

// Extend Express session interface
declare module "express-session" {
  interface SessionData {
    user?: User;
  }
}

const app = express();
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: "http://localhost:8081",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "employee-tracking-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  }),
);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => {
    log(`✅ Servidor en ejecución en puerto ${port}`);
  });

  // 🕛 CRON JOB — cierra fichajes y pausas abiertas cada noche

  cron.schedule(
    "59 23 * * *",
    async () => {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      try {
        // 1️⃣ Obtener todos los clock entries de hoy
        const entries: ClockEntry[] =
          await storage.getClockEntriesByDate(todayStr);

        // 2️⃣ Detectar clock-ins abiertos (sin clock-out posterior)
        const openClockIns = entries.filter(
          (e) =>
            e.entryType === "clock_in" &&
            !entries.some(
              (other) =>
                other.idUser === e.idUser &&
                other.idDailyWorkday === e.idDailyWorkday &&
                other.entryType === "clock_out" &&
                other.timestamp > e.timestamp,
            ),
        );

        // 3️⃣ Detectar pausas abiertas (break_start sin break_end posterior)
        const openBreaks = entries.filter(
          (e) =>
            e.entryType === "break_start" &&
            !entries.some(
              (other) =>
                other.idUser === e.idUser &&
                other.idDailyWorkday === e.idDailyWorkday &&
                other.entryType === "break_end" &&
                other.timestamp > e.timestamp,
            ),
        );

        // 4️⃣ Cerrar clock-ins abiertos con createClockEntry
        for (const entry of openClockIns) {
          await storage.createClockEntry(
            entry.idUser,
            "clock_out",
            todayStr,
            "web", // o "mobile_device", dependiendo de cómo quieras marcarlo
          );
        }

        // 5️⃣ Cerrar pausas abiertas con createClockEntry
        for (const entry of openBreaks) {
          await storage.createClockEntry(
            entry.idUser,
            "break_end",
            todayStr,
            "web",
          );
        }

        log(
          `✅ Cierre automático completado: ${openClockIns.length} clock-outs y ${openBreaks.length} break-ends generados.`,
        );
      } catch (err) {
        console.error("❌ Error en cron nocturno:", err);
      }
    },
    {
      timezone: "Europe/Madrid",
    },
  );
})();
