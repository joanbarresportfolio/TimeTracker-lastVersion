import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configurar WebSocket solo en desarrollo
// En producción (Replit Deployments), usar fetch nativo
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Configurando WebSocket para desarrollo');
  neonConfig.webSocketConstructor = ws;
} else {
  console.log('🚀 Usando fetch nativo para producción');
  // En producción, Neon usa fetch automáticamente
  neonConfig.fetchConnectionCache = true;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('📊 Conectando a base de datos PostgreSQL...');

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });