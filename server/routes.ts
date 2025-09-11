/**
 * SISTEMA DE RUTAS API DEL SERVIDOR
 * ================================
 * 
 * Este archivo define todas las rutas API del sistema de seguimiento de empleados.
 * Actúa como la capa de presentación que recibe requests HTTP del frontend,
 * valida datos, aplica autorizaciones, y coordina operaciones de negocio.
 * 
 * ARQUITECTURA DE RUTAS API:
 * 
 * Frontend (HTTP Request) → Express Routes (este archivo) → Middleware Auth → Storage Layer → Database
 * 
 * FLUJO DE PROCESAMIENTO TÍPICO:
 * 1. RECEPCIÓN: Express recibe request HTTP con datos JSON
 * 2. MIDDLEWARE: Se aplican middlewares de autenticación (requireAuth/requireAdmin/requireEmployeeAccess)
 * 3. VALIDACIÓN: Se validan datos usando schemas Zod desde @shared/schema
 * 4. AUTORIZACIÓN: Se verifica que el usuario tenga permisos para la operación
 * 5. LÓGICA DE NEGOCIO: Se ejecuta lógica específica (ej: validación de horarios)
 * 6. PERSISTENCIA: Se llama al storage layer para operaciones de BD
 * 7. RESPUESTA: Se devuelve JSON response con resultado o errores
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Type Safety: Validación exhaustiva con Zod schemas
 * - Security: Middleware de autenticación y autorización por roles
 * - Error Handling: Manejo consistente de errores con mensajes en español
 * - Data Sanitization: Eliminación automática de campos sensibles (passwords)
 * - Business Logic: Validaciones complejas como horarios de fichaje
 * 
 * ESTRUCTURA DE RUTAS:
 * - /api/auth/*: Autenticación (login, logout, verificación sesión)
 * - /api/employees/*: Gestión CRUD de empleados (solo admins)
 * - /api/time-entries/*: Registros de tiempo y fichaje (clock-in/out)
 * - /api/schedules/*: Horarios de trabajo (individuales y masivos)
 * - /api/incidents/*: Incidencias laborales
 * - /api/dashboard/*: Estadísticas y métricas del dashboard
 * 
 * MIDDLEWARE DE SEGURIDAD:
 * - requireAuth: Requiere usuario autenticado (admin o employee)
 * - requireAdmin: Solo administradores
 * - requireEmployeeAccess: Empleado puede ver sus propios datos o admin todo
 * 
 * VALIDACIÓN DE DATOS:
 * Todos los endpoints usan schemas Zod para validar:
 * - Tipos correctos de datos
 * - Campos requeridos vs opcionales
 * - Reglas de negocio (ej: horarios válidos)
 * - Formato de datos (emails, fechas, etc.)
 * 
 * CONTROL DE ACCESO POR ROLES:
 * - Employees: Solo pueden ver/modificar sus propios datos
 * - Admins: Acceso completo a todos los recursos del sistema
 * - Validaciones específicas por endpoint según nivel de acceso
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmployeeSchema, insertTimeEntrySchema, insertScheduleSchema, insertScheduleSchemaBase, insertIncidentSchema, loginSchema, createEmployeeSchema, updateEmployeeSchema, bulkScheduleCreateSchema } from "@shared/schema";
import { requireAuth, requireAdmin, requireEmployeeAccess } from "./middleware/auth";
import { z } from "zod";

/**
 * FUNCIÓN AUXILIAR DE VALIDACIÓN DE HORARIOS DE FICHAJE
 * ====================================================
 * 
 * Valida si un empleado puede fichar (clock-in/clock-out) según sus horarios asignados.
 * Implementa una ventana de tolerancia de 20 minutos antes y después del horario.
 * 
 * LÓGICA DE VALIDACIÓN:
 * 1. VERIFICAR HORARIOS: Busca horarios activos del empleado
 * 2. FILTRAR POR DÍA: Identifica horarios para el día actual
 * 3. CALCULAR VENTANA: Permite fichaje ±20 minutos del horario oficial
 * 4. VALIDAR ACCIÓN: Diferencia entre horarios de entrada y salida
 * 
 * VENTANA DE TOLERANCIA:
 * - Clock-in: Puede fichar desde 20 min antes hasta 20 min después de hora inicio
 * - Clock-out: Puede fichar desde 20 min antes hasta 20 min después de hora fin
 * 
 * CASOS ESPECIALES:
 * - Sin horarios asignados: Rechaza fichaje
 * - Sin horario para hoy: Rechaza fichaje
 * - Múltiples horarios: Acepta si cualquiera está en ventana válida
 * - Errores de BD: Mensaje genérico de error
 * 
 * @param employeeId - ID del empleado que intenta fichar
 * @param currentTime - Timestamp actual del intento de fichaje
 * @param action - Tipo de acción: "clock-in" (entrada) o "clock-out" (salida)
 * @returns Objeto con resultado de validación y mensaje explicativo
 */
async function validateClockingTime(employeeId: string, currentTime: Date, action: "clock-in" | "clock-out"): Promise<{isValid: boolean, message: string}> {
  try {
    // PASO 1: Obtener horarios asignados al empleado
    const schedules = await storage.getSchedulesByEmployee(employeeId);
    
    if (schedules.length === 0) {
      return {
        isValid: false,
        message: "No tienes horarios asignados. Contacta con tu supervisor para configurar tus horarios de trabajo."
      };
    }

    // PASO 2: Determinar día actual y filtrar horarios
    const currentDayOfWeek = currentTime.getDay(); // 0=Domingo, 1=Lunes, etc.
    
    // Filtrar solo horarios activos para hoy
    const todaySchedules = schedules.filter(schedule => 
      schedule.dayOfWeek === currentDayOfWeek && schedule.isActive
    );
    
    if (todaySchedules.length === 0) {
      return {
        isValid: false,
        message: "No tienes horarios asignados para hoy. Contacta con tu supervisor."
      };
    }

    // PASO 3: Validar hora actual contra horarios con ventana de tolerancia
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // PASO 4: Verificar cada horario del día para encontrar uno válido
    for (const schedule of todaySchedules) {
      const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
      
      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      // VENTANA DE TOLERANCIA: ±20 minutos
      const windowMinutes = 20;
      
      if (action === "clock-in") {
        // Para entrada: 20 min antes y después de hora inicio
        const earliestTime = startTimeInMinutes - windowMinutes;
        const latestTime = startTimeInMinutes + windowMinutes;
        
        if (currentTimeInMinutes >= earliestTime && currentTimeInMinutes <= latestTime) {
          return { isValid: true, message: "" };
        }
      } else { // clock-out
        // Para salida: 20 min antes y después de hora fin
        const earliestTime = endTimeInMinutes - windowMinutes;
        const latestTime = endTimeInMinutes + windowMinutes;
        
        if (currentTimeInMinutes >= earliestTime && currentTimeInMinutes <= latestTime) {
          return { isValid: true, message: "" };
        }
      }
    }

    // PASO 5: Si llegamos aquí, no hay horarios válidos para la hora actual
    const scheduleInfo = todaySchedules.map(s => `${s.startTime} - ${s.endTime}`).join(", ");
    const actionText = action === "clock-in" ? "entrada" : "salida";
    
    return {
      isValid: false,
      message: `Solo puedes fichar ${actionText} dentro de los 20 minutos antes o después de tu horario asignado (${scheduleInfo}).`
    };

  } catch (error) {
    // MANEJO DE ERRORES: Error genérico para no exponer detalles técnicos
    return {
      isValid: false,
      message: "Error al validar horarios. Contacta con tu supervisor."
    };
  }
}

/**
 * FUNCIÓN PRINCIPAL DE REGISTRO DE RUTAS
 * ====================================
 * 
 * Registra todas las rutas API del sistema en la aplicación Express.
 * Organiza rutas por funcionalidad y aplica middlewares apropiados.
 * 
 * ESTRUCTURA ORGANIZATIVA:
 * 1. Rutas de Autenticación (/api/auth/*)
 * 2. Rutas de Empleados (/api/employees/*)
 * 3. Rutas de Registros de Tiempo (/api/time-entries/*)
 * 4. Rutas de Horarios (/api/schedules/*)
 * 5. Rutas de Incidencias (/api/incidents/*)
 * 6. Rutas de Dashboard (/api/dashboard/*)
 * 
 * @param app - Instancia de Express donde registrar las rutas
 * @returns Servidor HTTP creado con las rutas configuradas
 */
export async function registerRoutes(app: Express): Promise<Server> {
  
  // ==========================================
  // RUTAS DE AUTENTICACIÓN
  // ==========================================
  
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
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }
      
      // PASO 3: Establecer sesión de usuario
      req.session.user = user;
      
      // PASO 4: Responder con datos seguros (sin password)
      res.json({ user, message: "Inicio de sesión exitoso" });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de inicio de sesión inválidos", errors: error.errors });
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
  
  // ==========================================
  // RUTAS DE GESTIÓN DE EMPLEADOS
  // ==========================================
  
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
   * FLUJO DE PROCESAMIENTO:
   * 1. VERIFICAR PERMISOS: Middleware valida rol admin
   * 2. CONSULTAR BD: Obtiene todos los empleados
   * 3. SANITIZAR DATOS: Remueve passwords de respuesta
   * 4. DEVOLVER LISTA: Array con empleados seguros
   * 
   * RESPONSES:
   * - 200: Lista de empleados (sin passwords)
   * - 401: No autorizado (no admin)
   * - 500: Error interno del servidor
   */
  app.get("/api/employees", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Obtener todos los empleados de la base de datos
      const employees = await storage.getEmployees();
      
      // PASO 2: SEGURIDAD - Eliminar campo password de respuesta
      const safeEmployees = employees.map(emp => {
        const { password, ...safeEmployee } = emp;
        return safeEmployee;
      });
      
      // PASO 3: Devolver lista sanitizada
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
   * CONTROL DE ACCESO:
   * - Employee: Solo puede ver sus propios datos
   * - Admin: Puede ver datos de cualquier empleado
   * 
   * SEGURIDAD:
   * - Elimina campo 'password' de la respuesta
   * - Validación de acceso por middleware
   * 
   * RESPONSES:
   * - 200: Datos del empleado (sin password)
   * - 401: No autorizado
   * - 404: Empleado no encontrado
   * - 500: Error interno del servidor
   */
  app.get("/api/employees/:id", requireEmployeeAccess, async (req, res) => {
    try {
      // PASO 1: Buscar empleado por ID
      const employee = await storage.getEmployee(req.params.id);
      
      if (!employee) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      // PASO 2: SEGURIDAD - Eliminar password de respuesta
      const { password, ...safeEmployee } = employee;
      
      // PASO 3: Devolver datos seguros
      res.json(safeEmployee);
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
   * FLUJO DE CREACIÓN:
   * 1. VALIDACIÓN: Verifica datos con createEmployeeSchema
   * 2. CREACIÓN: Crea empleado con password encriptado automáticamente
   * 3. SEGURIDAD: Elimina password del response
   * 4. RESPUESTA: Devuelve empleado creado
   * 
   * VALIDACIONES ZOD:
   * - Email válido y único
   * - Password seguro
   * - Campos requeridos presentes
   * - Formato de datos correcto
   * 
   * REQUEST BODY:
   * {
   *   "employeeNumber": "EMP001",
   *   "firstName": "Juan",
   *   "lastName": "Pérez",
   *   "email": "juan@company.com",
   *   "password": "contraseña_segura",
   *   "role": "employee",
   *   "department": "IT",
   *   "position": "Desarrollador",
   *   "hireDate": "2024-01-15"
   * }
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
      
      // PASO 1: Validar datos de entrada
      const employeeData = createEmployeeSchema.parse(req.body);
      console.log("Datos después de validación:", employeeData);
      
      // PASO 2: Crear empleado (password se encripta automáticamente)
      const employee = await storage.createEmployeeWithPassword(employeeData);
      
      // PASO 3: SEGURIDAD - Eliminar password de respuesta
      const { password, ...safeEmployee } = employee;
      
      // PASO 4: Responder con empleado creado
      res.status(201).json(safeEmployee);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Errores de validación Zod:", error.errors);
        return res.status(400).json({ message: "Datos de empleado inválidos", errors: error.errors });
      }
      console.log("Error al crear empleado:", error);
      res.status(500).json({ message: "Error al crear empleado" });
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
   * FLUJO DE ACTUALIZACIÓN:
   * 1. VALIDACIÓN: Verifica datos con updateEmployeeSchema
   * 2. ACTUALIZACIÓN: Modifica solo campos proporcionados (partial update)
   * 3. VERIFICACIÓN: Confirma que empleado existe
   * 4. SEGURIDAD: Elimina password del response
   * 
   * NOTA IMPORTANTE:
   * Esta ruta NO permite cambiar passwords. Para cambio de contraseñas
   * se debería implementar endpoint específico con validaciones adicionales.
   * 
   * VALIDACIONES:
   * - Solo campos válidos del schema
   * - Email único si se cambia
   * - Tipos de datos correctos
   * 
   * REQUEST BODY (todos los campos opcionales):
   * {
   *   "firstName": "Nuevo Nombre",
   *   "lastName": "Nuevo Apellido",
   *   "email": "nuevo@email.com",
   *   "department": "Nuevo Departamento",
   *   "position": "Nueva Posición",
   *   "isActive": false
   * }
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
      
      // PASO 1: Validar datos de entrada (actualización parcial)
      const employeeData = updateEmployeeSchema.parse(req.body);
      console.log("Datos después de validación Zod:", employeeData);
      
      // PASO 2: Actualizar empleado en base de datos
      const employee = await storage.updateEmployee(req.params.id, employeeData);
      
      if (!employee) {
        console.log("❌ Error: Empleado no encontrado con ID:", req.params.id);
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      console.log("✅ Empleado actualizado exitosamente:", employee.id);
      
      // PASO 3: SEGURIDAD - Eliminar password de respuesta
      const { password, ...safeEmployee } = employee;
      
      // PASO 4: Responder con empleado actualizado
      res.json(safeEmployee);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("❌ Errores de validación Zod en actualización:", error.errors);
        return res.status(400).json({ message: "Datos de empleado inválidos", errors: error.errors });
      }
      console.log("❌ Error al actualizar empleado:", error);
      res.status(500).json({ message: "Error al actualizar empleado" });
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
   * ⚠️  CONSIDERACIONES CRÍTICAS:
   * - Esta operación es IRREVERSIBLE
   * - Puede fallar si hay registros relacionados (foreign keys)
   * - Se recomienda usar "soft delete" (isActive = false) en lugar de DELETE
   * 
   * FLUJO DE ELIMINACIÓN:
   * 1. VERIFICACIÓN: Confirma que empleado existe
   * 2. ELIMINACIÓN: Remueve registro de base de datos
   * 3. RESPUESTA: Status 204 (No Content) si exitoso
   * 
   * ALTERNATIVA RECOMENDADA:
   * PUT /api/employees/:id con { "isActive": false }
   * 
   * RESPONSES:
   * - 204: Empleado eliminado exitosamente (sin contenido)
   * - 401: No autorizado
   * - 404: Empleado no encontrado
   * - 500: Error interno (ej: foreign key constraint)
   */
  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Intentar eliminar empleado
      const success = await storage.deleteEmployee(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Empleado no encontrado" });
      }
      
      // PASO 2: Responder sin contenido (eliminación exitosa)
      res.status(204).send();
      
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar empleado" });
    }
  });

  
  // ==========================================
  // RUTAS DE REGISTROS DE TIEMPO
  // ==========================================
  
  /**
   * GET /api/time-entries
   * ====================
   * 
   * Obtiene registros de tiempo con filtrado por roles y parámetros.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado (admin o employee)
   * 
   * CONTROL DE ACCESO POR ROLES:
   * - Employee: Solo puede ver sus propios registros
   * - Admin: Puede ver todos los registros con filtros opcionales
   * 
   * PARÁMETROS DE QUERY OPCIONALES:
   * - employeeId: Filtra por empleado específico (solo admin)
   * - date: Filtra por fecha específica (formato YYYY-MM-DD)
   * 
   * EJEMPLOS DE USO:
   * - GET /api/time-entries (admin: todos, employee: propios)
   * - GET /api/time-entries?employeeId=123 (admin: de empleado 123)
   * - GET /api/time-entries?date=2024-03-15 (admin: de fecha específica)
   * - GET /api/time-entries?date=2024-03-15 (employee: propios de fecha)
   * 
   * RESPONSES:
   * - 200: Array de registros de tiempo
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/time-entries", requireAuth, async (req, res) => {
    try {
      const { employeeId, date } = req.query;
      let timeEntries;
      
      // CONTROL DE ACCESO: Employees solo ven sus registros, admins todos
      if (req.user!.role === "employee") {
        // EMPLOYEE: Solo registros propios
        timeEntries = await storage.getTimeEntriesByEmployee(req.user!.id);
        
        // Filtro adicional por fecha si se proporciona
        if (date) {
          timeEntries = timeEntries.filter(entry => entry.date === date);
        }
        
      } else {
        // ADMIN: Puede filtrar por empleado o fecha
        if (employeeId) {
          timeEntries = await storage.getTimeEntriesByEmployee(employeeId as string);
        } else if (date) {
          timeEntries = await storage.getTimeEntriesByDate(date as string);
        } else {
          timeEntries = await storage.getTimeEntries();
        }
      }
      
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener registros de tiempo" });
    }
  });

  /**
   * POST /api/time-entries
   * ======================
   * 
   * Crea un registro de tiempo manual (solo administradores).
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear registros manuales
   * 
   * DIFERENCIA CON CLOCK-IN/OUT:
   * - Esta ruta es para registros manuales/correcciones
   * - clock-in/clock-out tienen validación de horarios
   * - Esta ruta omite validaciones de ventana de tiempo
   * 
   * FUNCIONALIDAD:
   * - Cálculo automático de totalHours si clockIn y clockOut presentes
   * - Permite crear registros completos o parciales
   * - Validación de esquema con Zod
   * 
   * REQUEST BODY:
   * {
   *   "employeeId": "emp-id",
   *   "clockIn": "2024-03-15T08:00:00Z",
   *   "clockOut": "2024-03-15T17:00:00Z", // opcional
   *   "date": "2024-03-15"
   * }
   * 
   * RESPONSES:
   * - 201: Registro creado exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado (no admin)
   * - 500: Error interno del servidor
   */
  app.post("/api/time-entries", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Validar datos de entrada
      const timeEntryData = insertTimeEntrySchema.parse(req.body);
      
      // PASO 2: Crear registro (con cálculo automático de horas)
      const timeEntry = await storage.createTimeEntry(timeEntryData);
      
      // PASO 3: Responder con registro creado
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de registro de tiempo inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear registro de tiempo" });
    }
  });

  /**
   * PUT /api/time-entries/:id
   * =========================
   * 
   * Actualiza un registro de tiempo existente (solo administradores).
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden modificar registros
   * 
   * FUNCIONALIDAD AUTOMÁTICA:
   * - Recalcula totalHours automáticamente si se cambian timestamps
   * - Permite actualización parcial de campos
   * - Mantiene integridad de datos
   * 
   * CASOS DE USO:
   * - Correcciones de timestamps incorrectos
   * - Agregar clockOut a registros pendientes
   * - Ajustes por solicitudes de empleados
   * - Corrección de errores de captura
   * 
   * REQUEST BODY (todos los campos opcionales):
   * {
   *   "clockIn": "2024-03-15T08:15:00Z",
   *   "clockOut": "2024-03-15T17:30:00Z",
   *   "date": "2024-03-15"
   * }
   * 
   * RESPONSES:
   * - 200: Registro actualizado con horas recalculadas
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 404: Registro no encontrado
   * - 500: Error interno del servidor
   */
  app.put("/api/time-entries/:id", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Validar datos (schema parcial para actualización)
      const timeEntryData = insertTimeEntrySchema.partial().parse(req.body);
      
      // PASO 2: Actualizar registro (con recálculo automático)
      const timeEntry = await storage.updateTimeEntry(req.params.id, timeEntryData);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Registro de tiempo no encontrado" });
      }
      
      // PASO 3: Responder con registro actualizado
      res.json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de registro de tiempo inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar registro de tiempo" });
    }
  });

  /**
   * POST /api/time-entries/clock-in
   * ==============================
   * 
   * Permite a empleados fichar entrada (clock-in) con validación de horarios.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Empleados y admins pueden usar esta función
   * 
   * LÓGICA DE NEGOCIO:
   * 1. VERIFICAR DUPLICADOS: No permite múltiples entradas el mismo día
   * 2. VALIDAR HORARIOS: Empleados deben estar en ventana de ±20 min
   * 3. CREAR REGISTRO: Inserta clockIn con fecha actual
   * 
   * DIFERENCIAS POR ROL:
   * - Employee: Debe fichar en ventana de horario asignado
   * - Admin: Puede fichar a cualquier hora (sin validación)
   * - Admin: Puede especificar employeeId para fichar por otro empleado
   * 
   * VALIDACIONES:
   * - Solo una entrada por día por empleado
   * - Horario dentro de ventana permitida (empleados)
   * - Empleado tiene horarios asignados
   * 
   * REQUEST BODY (opcional para admin):
   * {
   *   "employeeId": "emp-id" // Solo para admins, opcional
   * }
   * 
   * RESPONSES:
   * - 201: Clock-in exitoso con registro creado
   * - 400: Ya fichado hoy / fuera de horario
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/time-entries/clock-in", requireAuth, async (req, res) => {
    try {
      // PASO 1: Determinar empleado objetivo
      let employeeId = req.user!.id;
      if (req.user!.role === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      // PASO 2: Verificar que no haya entrada duplicada hoy
      const today = new Date().toISOString().split('T')[0];
      const existingEntries = await storage.getTimeEntriesByEmployee(employeeId);
      const todayEntry = existingEntries.find(entry => entry.date === today && !entry.clockOut);
      
      if (todayEntry) {
        return res.status(400).json({ message: "El empleado ya ha marcado entrada hoy" });
      }

      // PASO 3: Validar horarios SOLO para empleados (admins tienen acceso libre)
      if (req.user!.role === "employee") {
        const validationResult = await validateClockingTime(employeeId, new Date(), "clock-in");
        if (!validationResult.isValid) {
          return res.status(400).json({ message: validationResult.message });
        }
      }

      // PASO 4: Crear registro de entrada
      const timeEntry = await storage.createTimeEntry({
        employeeId,
        clockIn: new Date(),
        date: today,
        // clockOut y totalHours serán null hasta que haga clock-out
      });

      // PASO 5: Responder con registro creado
      res.status(201).json(timeEntry);
    } catch (error) {
      res.status(500).json({ message: "Error al marcar entrada" });
    }
  });

  /**
   * POST /api/time-entries/clock-out
   * ===============================
   * 
   * Permite a empleados fichar salida (clock-out) completando registro del día.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Empleados y admins pueden usar esta función
   * 
   * LÓGICA DE NEGOCIO:
   * 1. VERIFICAR ENTRADA: Debe existir clock-in del día sin clock-out
   * 2. VALIDAR HORARIOS: Empleados deben estar en ventana de ±20 min
   * 3. COMPLETAR REGISTRO: Actualiza clockOut y calcula horas automáticamente
   * 
   * DIFERENCIAS POR ROL:
   * - Employee: Debe fichar en ventana de horario de salida
   * - Admin: Puede fichar a cualquier hora (sin validación)
   * - Admin: Puede especificar employeeId para fichar por otro empleado
   * 
   * VALIDACIONES:
   * - Debe existir entrada previa del día
   * - No debe haber salida ya registrada
   * - Horario dentro de ventana permitida (empleados)
   * 
   * AUTOMATISMO:
   * - totalHours se calcula automáticamente en el storage layer
   * 
   * REQUEST BODY (opcional para admin):
   * {
   *   "employeeId": "emp-id" // Solo para admins, opcional
   * }
   * 
   * RESPONSES:
   * - 200: Clock-out exitoso con registro completado
   * - 400: No hay entrada previa / fuera de horario
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/time-entries/clock-out", requireAuth, async (req, res) => {
    try {
      // PASO 1: Determinar empleado objetivo
      let employeeId = req.user!.id;
      if (req.user!.role === "admin" && req.body.employeeId) {
        employeeId = req.body.employeeId;
      }

      // PASO 2: Buscar entrada pendiente del día (sin clockOut)
      const today = new Date().toISOString().split('T')[0];
      const existingEntries = await storage.getTimeEntriesByEmployee(employeeId);
      const todayEntry = existingEntries.find(entry => entry.date === today && !entry.clockOut);
      
      if (!todayEntry) {
        return res.status(400).json({ message: "El empleado no ha marcado entrada hoy" });
      }

      // PASO 3: Validar horarios SOLO para empleados (admins tienen acceso libre)
      if (req.user!.role === "employee") {
        const validationResult = await validateClockingTime(employeeId, new Date(), "clock-out");
        if (!validationResult.isValid) {
          return res.status(400).json({ message: validationResult.message });
        }
      }

      // PASO 4: Completar registro agregando clockOut
      const updatedEntry = await storage.updateTimeEntry(todayEntry.id, {
        clockOut: new Date(),
        // totalHours se calcula automáticamente en updateTimeEntry
      });

      // PASO 5: Responder con registro completo
      res.json(updatedEntry);
    } catch (error) {
      res.status(500).json({ message: "Error al marcar salida" });
    }
  });

  
  // ==========================================
  // RUTAS DE GESTIÓN DE HORARIOS
  // ==========================================
  
  /**
   * GET /api/schedules
   * =================
   * 
   * Obtiene horarios con control de acceso por roles y filtrado.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado (admin o employee)
   * 
   * CONTROL DE ACCESO POR ROLES:
   * - Employee: Solo puede ver sus propios horarios
   * - Admin: Puede ver todos los horarios con filtro opcional
   * 
   * PARÁMETROS DE QUERY OPCIONALES:
   * - employeeId: Filtra horarios de empleado específico (solo admin)
   * 
   * ESTRUCTURA DE HORARIOS:
   * Cada horario define un día de la semana con horas de inicio y fin:
   * - dayOfWeek: 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado
   * - startTime/endTime: formato HH:MM (24 horas)
   * - isActive: permite desactivar horarios sin eliminarlos
   * 
   * EJEMPLOS DE USO:
   * - GET /api/schedules (admin: todos, employee: propios)
   * - GET /api/schedules?employeeId=123 (admin: de empleado específico)
   * 
   * RESPONSES:
   * - 200: Array de horarios
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.query;
      let schedules;
      
      // CONTROL DE ACCESO: Employees solo ven sus horarios, admins todos
      if (req.user!.role === "employee") {
        // EMPLOYEE: Solo horarios propios
        schedules = await storage.getSchedulesByEmployee(req.user!.id);
      } else {
        // ADMIN: Puede filtrar por empleado o ver todos
        if (employeeId) {
          schedules = await storage.getSchedulesByEmployee(employeeId as string);
        } else {
          schedules = await storage.getSchedules();
        }
      }
      
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener horarios" });
    }
  });

  /**
   * POST /api/schedules
   * ==================
   * 
   * Crea un horario individual para un día específico.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear horarios
   * 
   * FUNCIONALIDAD:
   * - Crea horario para un solo día de la semana
   * - Validación de datos con Zod schema
   * - Para horarios completos de semana usar /api/schedules/bulk
   * 
   * VALIDACIONES:
   * - dayOfWeek válido (0-6)
   * - Formato de tiempo HH:MM
   * - startTime < endTime
   * - empleado existe
   * 
   * REQUEST BODY:
   * {
   *   "employeeId": "emp-id",
   *   "dayOfWeek": 1, // 1=Lunes
   *   "startTime": "08:00",
   *   "endTime": "17:00",
   *   "isActive": true
   * }
   * 
   * RESPONSES:
   * - 201: Horario creado exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/schedules", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Validar datos de entrada
      const scheduleData = insertScheduleSchema.parse(req.body);
      
      // PASO 2: Crear horario individual
      const schedule = await storage.createSchedule(scheduleData);
      
      // PASO 3: Responder con horario creado
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de horario inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear horario" });
    }
  });

  /**
   * POST /api/schedules/bulk
   * =======================
   * 
   * Crea múltiples horarios para un empleado de forma masiva y eficiente.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden crear horarios masivos
   * 
   * FUNCIONALIDAD AVANZADA:
   * - Crea horarios para múltiples días con una sola request
   * - Anti-duplicados automático: no crea horarios que ya existen
   * - Transaccional: crea todos o ninguno si hay error
   * - Optimizado para asignación de horarios completos de semana
   * 
   * LÓGICA ANTI-DUPLICADOS:
   * Verifica por employeeId + dayOfWeek + startTime + endTime + isActive
   * Solo crea los horarios que no existen ya
   * 
   * CASO DE USO TÍPICO:
   * Asignar horario L-V 8:00-17:00 a un empleado nuevo
   * 
   * REQUEST BODY:
   * {
   *   "employeeId": "emp-id",
   *   "daysOfWeek": [1, 2, 3, 4, 5], // Lunes a Viernes
   *   "startTime": "08:00",
   *   "endTime": "17:00",
   *   "isActive": true
   * }
   * 
   * RESPONSES:
   * - 201: Horarios creados (array puede estar vacío si todos existían)
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/schedules/bulk", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Validar datos de entrada bulk
      const bulkData = bulkScheduleCreateSchema.parse(req.body);
      
      // PASO 2: Crear horarios masivos (con lógica anti-duplicados)
      const schedules = await storage.createBulkSchedules(bulkData);
      
      // PASO 3: Responder con horarios creados
      // NOTA: Array puede estar vacío si todos los horarios ya existían
      res.status(201).json(schedules);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de horarios inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear horarios masivos" });
    }
  });

  /**
   * PUT /api/schedules/:id
   * =====================
   * 
   * Actualiza un horario existente con validación de consistencia.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden actualizar horarios
   * 
   * VALIDACIÓN INTELIGENTE:
   * - Usa superRefine para validaciones complejas
   * - Solo valida startTime vs endTime si ambos están presentes
   * - Permite actualización parcial de campos
   * 
   * LÓGICA DE VALIDACIÓN:
   * Si se proporcionan ambos tiempos, verifica que startTime < endTime
   * Si solo se proporciona uno, no valida contra el otro
   * 
   * CAMPOS ACTUALIZABLES:
   * - dayOfWeek: Cambiar día del horario
   * - startTime/endTime: Modificar horario
   * - isActive: Activar/desactivar sin eliminar
   * 
   * REQUEST BODY (todos los campos opcionales):
   * {
   *   "dayOfWeek": 2, // Cambiar a Martes
   *   "startTime": "09:00",
   *   "endTime": "18:00",
   *   "isActive": false
   * }
   * 
   * RESPONSES:
   * - 200: Horario actualizado exitosamente
   * - 400: Datos inválidos (ej: startTime >= endTime)
   * - 401: No autorizado
   * - 404: Horario no encontrado
   * - 500: Error interno del servidor
   */
  app.put("/api/schedules/:id", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Crear schema de validación con lógica condicional
      const updateSchema = insertScheduleSchemaBase.partial().superRefine((data, ctx) => {
        // VALIDACIÓN INTELIGENTE: Solo validar tiempo si ambos campos están presentes
        if (data.startTime && data.endTime) {
          const [startHour, startMinute] = data.startTime.split(':').map(Number);
          const [endHour, endMinute] = data.endTime.split(':').map(Number);
          
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          
          if (startTotalMinutes >= endTotalMinutes) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "La hora de inicio debe ser anterior a la hora de fin",
              path: ["endTime"],
            });
          }
        }
      });

      // PASO 2: Validar datos de entrada
      const scheduleData = updateSchema.parse(req.body);
      
      // PASO 3: Actualizar horario en base de datos
      const schedule = await storage.updateSchedule(req.params.id, scheduleData);
      
      if (!schedule) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      
      // PASO 4: Responder con horario actualizado
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de horario inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar horario" });
    }
  });

  /**
   * DELETE /api/schedules/:id
   * ========================
   * 
   * Elimina permanentemente un horario del sistema.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar horarios
   * 
   * ⚠️  CONSIDERACIONES IMPORTANTES:
   * - Operación irreversible
   * - El empleado quedará sin horario para ese día
   * - Puede afectar validaciones de fichaje si empleados intentan clock-in/out
   * 
   * ALTERNATIVA RECOMENDADA:
   * PUT /api/schedules/:id con { "isActive": false }
   * 
   * CASOS VÁLIDOS:
   * - Corrección de horarios erróneos
   * - Limpieza de horarios duplicados
   * - Empleado cambia completamente de turno
   * 
   * RESPONSES:
   * - 204: Horario eliminado exitosamente (sin contenido)
   * - 401: No autorizado
   * - 404: Horario no encontrado
   * - 500: Error interno del servidor
   */
  app.delete("/api/schedules/:id", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Intentar eliminar horario
      const success = await storage.deleteSchedule(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Horario no encontrado" });
      }
      
      // PASO 2: Responder sin contenido (eliminación exitosa)
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar horario" });
    }
  });

  
  // ==========================================
  // RUTAS DE GESTIÓN DE INCIDENCIAS
  // ==========================================
  
  /**
   * GET /api/incidents
   * =================
   * 
   * Obtiene incidencias con control de acceso por roles.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Requiere usuario autenticado (admin o employee)
   * 
   * CONTROL DE ACCESO POR ROLES:
   * - Employee: Solo puede ver sus propias incidencias
   * - Admin: Puede ver todas las incidencias con filtro opcional
   * 
   * TIPOS DE INCIDENCIA:
   * - Tardanza: Llegada fuera de horario
   * - Falta: Ausencia sin justificar
   * - Accidente: Incidente de seguridad laboral
   * - Disciplinaria: Violación de políticas
   * - Other: Otros tipos de incidencia
   * 
   * ESTADOS:
   * - pending: Pendiente de revisión
   * - under_review: En proceso de investigación
   * - resolved: Resuelta
   * - escalated: Escalada a nivel superior
   * 
   * PARÁMETROS DE QUERY OPCIONALES:
   * - employeeId: Filtra incidencias de empleado específico (solo admin)
   * 
   * RESPONSES:
   * - 200: Array de incidencias
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/incidents", requireAuth, async (req, res) => {
    try {
      const { employeeId } = req.query;
      let incidents;
      
      // CONTROL DE ACCESO: Employees solo ven sus incidencias, admins todas
      if (req.user!.role === "employee") {
        // EMPLOYEE: Solo incidencias propias
        incidents = await storage.getIncidentsByEmployee(req.user!.id);
      } else {
        // ADMIN: Puede filtrar por empleado o ver todas
        if (employeeId) {
          incidents = await storage.getIncidentsByEmployee(employeeId as string);
        } else {
          incidents = await storage.getIncidents();
        }
      }
      
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener incidencias" });
    }
  });

  /**
   * POST /api/incidents
   * ==================
   * 
   * Crea una nueva incidencia con control de acceso por roles.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Ambos roles pueden crear incidencias
   * 
   * DIFERENCIAS POR ROL:
   * - Employee: Solo puede crear incidencias sobre sí mismo
   * - Admin: Puede crear incidencias sobre cualquier empleado
   * 
   * FORZADO DE SEGURIDAD:
   * Si el usuario es empleado, se fuerza employeeId al ID del usuario actual
   * ignorando cualquier valor enviado en el body
   * 
   * FLUJO TÍPICO:
   * 1. Empleado reporta su propia incidencia
   * 2. Admin documenta incidencia observada
   * 3. Sistema automático genera incidencia (tardanza detectada)
   * 
   * REQUEST BODY:
   * {
   *   "employeeId": "emp-id", // Ignorado si usuario es employee
   *   "incidentType": "tardanza",
   *   "incidentDate": "2024-03-15",
   *   "description": "Descripción detallada",
   *   "status": "pending"
   * }
   * 
   * RESPONSES:
   * - 201: Incidencia creada exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.post("/api/incidents", requireAuth, async (req, res) => {
    try {
      // PASO 1: Validar datos de entrada
      const incidentData = insertIncidentSchema.parse(req.body);
      
      // PASO 2: SEGURIDAD - Empleados solo pueden crear incidencias sobre sí mismos
      if (req.user!.role === "employee") {
        incidentData.employeeId = req.user!.id; // Forzar al ID del usuario actual
      }
      
      // PASO 3: Crear incidencia en base de datos
      const incident = await storage.createIncident(incidentData);
      
      // PASO 4: Responder con incidencia creada
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de incidencia inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al crear incidencia" });
    }
  });

  /**
   * PUT /api/incidents/:id
   * =====================
   * 
   * Actualiza una incidencia existente (solo administradores).
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden modificar incidencias
   * 
   * FUNCIONALIDAD:
   * - Permite actualización parcial de campos
   * - Usado principalmente para cambios de estado
   * - Seguimiento y resolución de incidencias
   * 
   * FLUJO DE ESTADOS TÍPICO:
   * pending → under_review → resolved
   *     ↓
   * escalated (casos graves)
   * 
   * CAMPOS ACTUALIZABLES:
   * - status: Cambio de estado del proceso
   * - description: Añadir detalles o notas de seguimiento
   * - incidentDate: Corrección de fecha (casos excepcionales)
   * 
   * USO TÍPICO POR RRHH:
   * - Marcar incidencia como "under_review"
   * - Añadir notas de investigación
   * - Cambiar a "resolved" al finalizar
   * - Escalar casos graves
   * 
   * REQUEST BODY (todos los campos opcionales):
   * {
   *   "status": "resolved",
   *   "description": "Resuelto tras conversación con empleado"
   * }
   * 
   * RESPONSES:
   * - 200: Incidencia actualizada exitosamente
   * - 400: Datos inválidos
   * - 401: No autorizado
   * - 404: Incidencia no encontrada
   * - 500: Error interno del servidor
   */
  app.put("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Validar datos (schema parcial para actualización)
      const incidentData = insertIncidentSchema.partial().parse(req.body);
      
      // PASO 2: Actualizar incidencia en base de datos
      const incident = await storage.updateIncident(req.params.id, incidentData);
      
      if (!incident) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
      
      // PASO 3: Responder con incidencia actualizada
      res.json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de incidencia inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error al actualizar incidencia" });
    }
  });

  /**
   * DELETE /api/incidents/:id
   * ========================
   * 
   * Elimina permanentemente una incidencia del sistema.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAdmin: Solo administradores pueden eliminar incidencias
   * 
   * ⚠️  CONSIDERACIONES LEGALES CRÍTICAS:
   * - Las incidencias pueden ser documentación legal importante
   * - Muchas jurisdicciones requieren conservar registros laborales
   * - Eliminar puede violar políticas de retención de datos
   * - Considerar auditorías internas y externas
   * 
   * ALTERNATIVA RECOMENDADA:
   * PUT /api/incidents/:id con { "status": "archived" }
   * 
   * CASOS VÁLIDOS PARA ELIMINACIÓN:
   * - Registros duplicados por error
   * - Datos de prueba/desarrollo
   * - Incidencias registradas por error absoluto
   * - Cumplimiento de solicitud legal de eliminación (GDPR)
   * 
   * RECOMENDACIÓN:
   * Implementar "soft delete" o archivado en lugar de eliminación física
   * 
   * RESPONSES:
   * - 204: Incidencia eliminada exitosamente (sin contenido)
   * - 401: No autorizado
   * - 404: Incidencia no encontrada
   * - 500: Error interno del servidor
   */
  app.delete("/api/incidents/:id", requireAdmin, async (req, res) => {
    try {
      // PASO 1: Intentar eliminar incidencia
      const success = await storage.deleteIncident(req.params.id);
      
      if (!success) {
        return res.status(404).json({ message: "Incidencia no encontrada" });
      }
      
      // PASO 2: Responder sin contenido (eliminación exitosa)
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error al eliminar incidencia" });
    }
  });

  
  // ==========================================
  // RUTA DE ESTADÍSTICAS DEL DASHBOARD
  // ==========================================
  
  /**
   * GET /api/dashboard/stats
   * =======================
   * 
   * Obtiene estadísticas personalizadas según el rol del usuario.
   * 
   * MIDDLEWARE APLICADO:
   * - requireAuth: Tanto empleados como admins pueden acceder
   * 
   * DIFERENCIACIÓN POR ROL:
   * Esta ruta implementa respuestas completamente diferentes según el rol:
   * 
   * EMPLEADO (isEmployee: true):
   * - isClockedIn: Si está fichado hoy (entrada sin salida)
   * - hoursWorked: Horas trabajadas esta semana (solo propias)
   * - incidents: Número de incidencias pendientes (solo propias)
   * 
   * ADMINISTRADOR (isEmployee: false):
   * - totalEmployees: Total empleados activos
   * - presentToday: Empleados fichados ahora (entrada sin salida)
   * - hoursWorked: Total horas trabajadas por todos esta semana
   * - incidents: Total incidencias pendientes del sistema
   * 
   * LÓGICA DE CÁLCULO DE SEMANA:
   * - Semana comienza en domingo (día 0)
   * - Usa fecha actual para calcular inicio de semana
   * - Solo cuenta registros con totalHours calculadas
   * - Convierte minutos a horas con Math.floor()
   * 
   * CASOS DE USO:
   * - Widgets de dashboard principal
   * - Información rápida al iniciar sesión
   * - Métricas en tiempo real
   * - KPIs personalizados por rol
   * 
   * RESPONSES:
   * - 200: Objeto con estadísticas personalizadas por rol
   * - 401: No autorizado
   * - 500: Error interno del servidor
   */
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      // BIFURCACIÓN POR ROL: Lógica completamente diferente
      if (req.user!.role === "employee") {
        
        // ==== VISTA DE EMPLEADO: Solo datos propios ====
        
        // PASO 1: Verificar si está fichado hoy
        const userEntries = await storage.getTimeEntriesByEmployee(req.user!.id);
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = userEntries.find(entry => entry.date === today);
        
        // PASO 2: Calcular horas trabajadas esta semana (solo empleado)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo = inicio
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const weekEntries = userEntries.filter(entry => entry.date >= weekStartStr && entry.totalHours);
        const userHoursThisWeek = Math.floor(weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0) / 60);
        
        // PASO 3: Contar incidencias pendientes propias
        const userIncidents = await storage.getIncidentsByEmployee(req.user!.id);
        const pendingIncidents = userIncidents.filter(inc => inc.status === "pending").length;
        
        // PASO 4: Respuesta personalizada para empleado
        res.json({
          isEmployee: true,
          isClockedIn: todayEntry && !todayEntry.clockOut, // True si fichado sin salida
          hoursWorked: userHoursThisWeek,
          incidents: pendingIncidents,
        });
      } else {
        
        // ==== VISTA DE ADMINISTRADOR: Métricas globales del sistema ====
        
        // PASO 1: Obtener datos base de todas las entidades
        const employees = await storage.getEmployees();
        const today = new Date().toISOString().split('T')[0];
        const todayEntries = await storage.getTimeEntriesByDate(today);
        const incidents = await storage.getIncidents();
        
        // PASO 2: Calcular métricas de empleados
        const totalEmployees = employees.filter(emp => emp.isActive).length;
        const presentToday = todayEntries.filter(entry => entry.clockIn && !entry.clockOut).length;
        
        // PASO 3: Calcular horas totales trabajadas esta semana (todos los empleados)
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo = inicio
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const allEntries = await storage.getTimeEntries();
        const weekEntries = allEntries.filter(entry => entry.date >= weekStartStr && entry.totalHours);
        const totalHoursThisWeek = Math.floor(weekEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0) / 60);
        
        // PASO 4: Contar incidencias pendientes del sistema
        const pendingIncidents = incidents.filter(inc => inc.status === "pending").length;

        // PASO 5: Respuesta con métricas administrativas
        res.json({
          isEmployee: false,
          totalEmployees, // Total empleados activos
          presentToday, // Empleados actualmente fichados
          hoursWorked: totalHoursThisWeek, // Horas de toda la organización
          incidents: pendingIncidents, // Incidencias pendientes globales
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Error al obtener estadísticas del dashboard" });
    }
  });

  // ==========================================
  // FINALIZAR CONFIGURACIÓN DEL SERVIDOR
  // ==========================================
  
  /**
   * CREAR Y RETORNAR SERVIDOR HTTP
   * 
   * El servidor HTTP wrappea la aplicación Express configurada con todas las rutas.
   * Esto permite que el servidor sea iniciado por el archivo principal (index.ts)
   * y facilita testing al poder crear múltiples instancias de servidor.
   * 
   * CONFIGURACIÓN FINAL:
   * - Todas las rutas API registradas y documentadas
   * - Middleware de seguridad aplicado
   * - Validaciones Zod configuradas
   * - Control de acceso por roles implementado
   * - Manejo de errores centralizado
   * - Lógica de negocio completa
   * 
   * ENDPOINTS DISPONIBLES:
   * - 3 rutas de autenticación (/api/auth/*)
   * - 5 rutas CRUD de empleados (/api/employees/*)
   * - 5 rutas de registros de tiempo (/api/time-entries/*)
   * - 5 rutas de horarios (/api/schedules/*)
   * - 4 rutas de incidencias (/api/incidents/*)
   * - 1 ruta de dashboard personalizada (/api/dashboard/stats)
   * 
   * TOTAL: 23 endpoints API completamente documentados en español
   * 
   * MIDDLEWARE STACK APLICADO:
   * - Express session management
   * - CORS habilitado para desarrollo
   * - JSON parsing automático
   * - Middleware de autenticación personalizado
   * - Logging y manejo de errores
   * 
   * SEGURIDAD IMPLEMENTADA:
   * - Autenticación basada en sesiones
   * - Control de acceso por roles (admin/employee)
   * - Validación exhaustiva con Zod
   * - Sanitización de datos (elimina passwords de responses)
   * - Protección contra acceso no autorizado
   */
  const httpServer = createServer(app);
  return httpServer;
}
