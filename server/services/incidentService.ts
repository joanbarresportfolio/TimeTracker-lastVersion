/**
 * INCIDENT SERVICE - LÓGICA DE NEGOCIO DE INCIDENCIAS
 * ====================================================
 * 
 * Maneja toda la lógica de negocio relacionada con incidencias laborales.
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import type { Incident, DailyWorkday } from "@shared/schema";

export type IncidentType = 
  | "tardanza" 
  | "ausencia" 
  | "salida_anticipada" 
  | "falta_fichaje" 
  | "otro";

export interface IncidentImpact {
  affectsHours: boolean;
  deductedMinutes: number;
  severity: "low" | "medium" | "high";
}

export class IncidentService {
  /**
   * VALIDAR TIPO DE INCIDENCIA
   * ===========================
   * 
   * Valida que el tipo de incidencia sea válido.
   * 
   * @param type - Tipo de incidencia
   * @returns true si es válido
   */
  validateIncidentType(type: string): boolean {
    const validTypes: IncidentType[] = [
      "tardanza",
      "ausencia",
      "salida_anticipada",
      "falta_fichaje",
      "otro"
    ];

    return validTypes.includes(type as IncidentType);
  }

  /**
   * ASOCIAR INCIDENCIA CON JORNADA
   * ===============================
   * 
   * Encuentra la jornada diaria correspondiente a una incidencia.
   * Ahora busca directamente por fecha y usuario en DailyWorkday.
   * 
   * @param incidentDate - Fecha de la incidencia
   * @param employeeId - ID del empleado
   * @param workdays - Jornadas existentes
   * @returns ID de la jornada o null
   */
  associateWithWorkday(
    incidentDate: Date,
    employeeId: string,
    workdays: DailyWorkday[]
  ): string | null {
    const dateStr = incidentDate.toISOString().split('T')[0];
    
    const matchingWorkday = workdays.find(
      wd => wd.idUser === employeeId && wd.date === dateStr
    );

    return matchingWorkday?.id || null;
  }

  /**
   * CALCULAR IMPACTO EN HORAS
   * =========================
   * 
   * Calcula el impacto de una incidencia en las horas trabajadas.
   * 
   * @param incidentType - Tipo de incidencia
   * @param description - Descripción (puede contener minutos)
   * @returns Impacto calculado
   */
  calculateHoursImpact(
    incidentType: string,
    description?: string
  ): IncidentImpact {
    switch (incidentType) {
      case "tardanza":
        const tardanzaMinutes = this.extractMinutesFromDescription(description);
        return {
          affectsHours: tardanzaMinutes > 0,
          deductedMinutes: tardanzaMinutes,
          severity: tardanzaMinutes > 30 ? "medium" : "low"
        };

      case "salida_anticipada":
        const salidaMinutes = this.extractMinutesFromDescription(description);
        return {
          affectsHours: salidaMinutes > 0,
          deductedMinutes: salidaMinutes,
          severity: salidaMinutes > 60 ? "high" : "medium"
        };

      case "ausencia":
        return {
          affectsHours: true,
          deductedMinutes: 480,
          severity: "high"
        };

      case "falta_fichaje":
        return {
          affectsHours: true,
          deductedMinutes: 0,
          severity: "medium"
        };

      default:
        return {
          affectsHours: false,
          deductedMinutes: 0,
          severity: "low"
        };
    }
  }

  /**
   * EXTRAER MINUTOS DE DESCRIPCIÓN
   * ===============================
   * 
   * Extrae minutos mencionados en la descripción.
   * Busca patrones como "30 minutos" o "1 hora".
   * 
   * @param description - Descripción de la incidencia
   * @returns Minutos extraídos
   */
  private extractMinutesFromDescription(description?: string): number {
    if (!description) return 0;

    const minutesMatch = description.match(/(\d+)\s*min/i);
    if (minutesMatch) {
      return parseInt(minutesMatch[1]);
    }

    const hoursMatch = description.match(/(\d+)\s*hora/i);
    if (hoursMatch) {
      return parseInt(hoursMatch[1]) * 60;
    }

    return 0;
  }

  /**
   * VALIDAR INCIDENCIA
   * ==================
   * 
   * Valida que los datos de una incidencia sean correctos.
   * 
   * @param incidentData - Datos de la incidencia
   * @returns Resultado de validación
   */
  validateIncident(incidentData: {
    type: string;
    description?: string;
    userId: string;
  }): { isValid: boolean; message: string } {
    if (!this.validateIncidentType(incidentData.type)) {
      return {
        isValid: false,
        message: "Tipo de incidencia inválido"
      };
    }

    if (!incidentData.userId || incidentData.userId.trim() === "") {
      return {
        isValid: false,
        message: "El ID del usuario es requerido"
      };
    }

    if (incidentData.type === "otro" && !incidentData.description) {
      return {
        isValid: false,
        message: "La descripción es requerida para incidencias de tipo 'otro'"
      };
    }

    return {
      isValid: true,
      message: "Incidencia válida"
    };
  }

  /**
   * CLASIFICAR SEVERIDAD
   * ====================
   * 
   * Clasifica la severidad de una incidencia.
   * 
   * @param incidentType - Tipo de incidencia
   * @param count - Número de incidencias del mismo tipo en el mes
   * @returns Nivel de severidad
   */
  classifySeverity(
    incidentType: string,
    count: number
  ): "low" | "medium" | "high" {
    if (incidentType === "ausencia") {
      if (count >= 3) return "high";
      if (count === 2) return "medium";
      return "low";
    }

    if (incidentType === "tardanza") {
      if (count >= 5) return "high";
      if (count >= 3) return "medium";
      return "low";
    }

    if (incidentType === "falta_fichaje") {
      if (count >= 3) return "high";
      if (count === 2) return "medium";
      return "low";
    }

    return "low";
  }

  /**
   * AGRUPAR INCIDENCIAS POR TIPO
   * ============================
   * 
   * Agrupa incidencias por tipo.
   * 
   * @param incidents - Array de incidencias
   * @returns Map con incidencias agrupadas por tipo
   */
  groupByType(incidents: Incident[]): Map<string, Incident[]> {
    const grouped = new Map<string, Incident[]>();

    for (const incident of incidents) {
      const type = incident.idIncidentsType || "otro";
      const existing = grouped.get(type) || [];
      existing.push(incident);
      grouped.set(type, existing);
    }

    return grouped;
  }

  /**
   * CONTAR INCIDENCIAS POR PERÍODO
   * ===============================
   * 
   * Cuenta incidencias en un período de tiempo.
   * 
   * @param incidents - Array de incidencias
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   * @returns Número de incidencias en el período
   */
  countIncidentsInPeriod(
    incidents: Incident[],
    startDate: string,
    endDate: string
  ): number {
    return incidents.filter(incident => {
      if (!incident.createdAt) return false;
      const incidentDate = new Date(incident.createdAt).toISOString().split('T')[0];
      return incidentDate >= startDate && incidentDate <= endDate;
    }).length;
  }

  /**
   * OBTENER INCIDENCIAS PENDIENTES
   * ===============================
   * 
   * Filtra incidencias pendientes de resolución.
   * 
   * @param incidents - Array de incidencias
   * @returns Incidencias pendientes
   */
  getPendingIncidents(incidents: Incident[]): Incident[] {
    return incidents.filter(
      incident => incident.status === "pending"
    );
  }

  /**
   * OBTENER INCIDENCIAS RESUELTAS
   * ==============================
   * 
   * Filtra incidencias resueltas.
   * 
   * @param incidents - Array de incidencias
   * @returns Incidencias resueltas
   */
  getResolvedIncidents(incidents: Incident[]): Incident[] {
    return incidents.filter(
      incident => incident.status === "resolved"
    );
  }

  /**
   * FORMATEAR TIPO DE INCIDENCIA
   * =============================
   * 
   * Formatea el tipo de incidencia para mostrar.
   * 
   * @param type - Tipo de incidencia
   * @returns Texto formateado
   */
  formatIncidentType(type: string): string {
    const typeMap: Record<string, string> = {
      tardanza: "Tardanza",
      ausencia: "Ausencia",
      salida_anticipada: "Salida Anticipada",
      falta_fichaje: "Falta de Fichaje",
      otro: "Otro"
    };

    return typeMap[type] || type;
  }

  /**
   * GENERAR RESUMEN DE INCIDENCIAS
   * ===============================
   * 
   * Genera un resumen estadístico de incidencias.
   * 
   * @param incidents - Array de incidencias
   * @returns Resumen con contadores por tipo y estado
   */
  generateIncidentSummary(incidents: Incident[]): {
    total: number;
    pending: number;
    resolved: number;
    byType: Record<string, number>;
  } {
    const summary = {
      total: incidents.length,
      pending: this.getPendingIncidents(incidents).length,
      resolved: this.getResolvedIncidents(incidents).length,
      byType: {} as Record<string, number>
    };

    const grouped = this.groupByType(incidents);
    grouped.forEach((incidents, type) => {
      summary.byType[type] = incidents.length;
    });

    return summary;
  }
}

export const incidentService = new IncidentService();
