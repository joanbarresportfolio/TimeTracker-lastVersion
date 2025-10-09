/**
 * REPORT SERVICE - LÓGICA DE NEGOCIO DE REPORTES
 * ===============================================
 * 
 * Maneja toda la lógica de negocio relacionada con reportes y análisis.
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import type { DailyWorkday, Schedule, Incident, Employee } from "@shared/schema";

export type PeriodType = "day" | "week" | "month" | "quarter" | "year";

export interface PeriodAnalysis {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  hoursWorked: number;
  minutesWorked: number;
  hoursPlanned: number;
  minutesPlanned: number;
  hoursDifference: number;
  minutesDifference: number;
  daysWorked: number;
  daysScheduled: number;
  absences: number;
  absenceDates: string[];
  incidents: Array<{
    id: string;
    description: string;
    date: Date | null;
  }>;
}

export interface AggregatedStats {
  totalHoursWorked: number;
  totalHoursPlanned: number;
  averageHoursPerDay: number;
  totalDaysWorked: number;
  totalAbsences: number;
  totalIncidents: number;
}

export class ReportService {
  /**
   * GENERAR ANÁLISIS POR PERÍODO
   * =============================
   * 
   * Genera un análisis completo para un empleado en un período.
   * 
   * @param employee - Datos del empleado
   * @param workdays - Jornadas del período
   * @param schedules - Horarios programados del período
   * @param incidents - Incidencias del período
   * @param periodType - Tipo de período
   * @param startDate - Fecha inicio
   * @param endDate - Fecha fin
   * @returns Análisis del período
   */
  generatePeriodAnalysis(
    employee: Employee,
    workdays: DailyWorkday[],
    schedules: Schedule[],
    incidents: Incident[],
    periodType: PeriodType,
    startDate: string,
    endDate: string
  ): PeriodAnalysis {
    const totalWorkedMinutes = workdays.reduce(
      (sum, wd) => sum + (wd.workedMinutes || 0),
      0
    );

    const totalPlannedMinutes = schedules.reduce((sum, shift) => {
      if (shift.expectedStartTime && shift.expectedEndTime) {
        const [startH, startM] = shift.expectedStartTime.split(":").map(Number);
        const [endH, endM] = shift.expectedEndTime.split(":").map(Number);
        return sum + (endH * 60 + endM - (startH * 60 + startM));
      }
      return sum;
    }, 0);

    const workdayDates = new Set(workdays.map((wd) => wd.date));
    const scheduledDates = new Set(schedules.map((s) => s.date));
    const absences = Array.from(scheduledDates).filter(
      (date) => !workdayDates.has(date)
    );

    const difference = totalWorkedMinutes - totalPlannedMinutes;

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: employee.numEmployee,
      periodType,
      periodStart: startDate,
      periodEnd: endDate,
      hoursWorked: Math.floor(totalWorkedMinutes / 60),
      minutesWorked: totalWorkedMinutes % 60,
      hoursPlanned: Math.floor(totalPlannedMinutes / 60),
      minutesPlanned: totalPlannedMinutes % 60,
      hoursDifference: Math.floor(Math.abs(difference) / 60),
      minutesDifference: Math.abs(difference) % 60,
      daysWorked: workdays.length,
      daysScheduled: schedules.length,
      absences: absences.length,
      absenceDates: absences,
      incidents: incidents.map((inc) => ({
        id: inc.id,
        description: inc.description || "",
        date: inc.createdAt,
      })),
    };
  }

  /**
   * CALCULAR ESTADÍSTICAS AGREGADAS
   * ================================
   * 
   * Calcula estadísticas agregadas de múltiples análisis.
   * 
   * @param analyses - Array de análisis de período
   * @returns Estadísticas agregadas
   */
  calculateAggregatedStats(analyses: PeriodAnalysis[]): AggregatedStats {
    const totalHoursWorked = analyses.reduce(
      (sum, analysis) => sum + analysis.hoursWorked * 60 + analysis.minutesWorked,
      0
    );

    const totalHoursPlanned = analyses.reduce(
      (sum, analysis) => sum + analysis.hoursPlanned * 60 + analysis.minutesPlanned,
      0
    );

    const totalDaysWorked = analyses.reduce(
      (sum, analysis) => sum + analysis.daysWorked,
      0
    );

    const totalAbsences = analyses.reduce(
      (sum, analysis) => sum + analysis.absences,
      0
    );

    const totalIncidents = analyses.reduce(
      (sum, analysis) => sum + analysis.incidents.length,
      0
    );

    const averageHoursPerDay =
      totalDaysWorked > 0
        ? Math.floor(totalHoursWorked / totalDaysWorked)
        : 0;

    return {
      totalHoursWorked: Math.floor(totalHoursWorked / 60),
      totalHoursPlanned: Math.floor(totalHoursPlanned / 60),
      averageHoursPerDay,
      totalDaysWorked,
      totalAbsences,
      totalIncidents,
    };
  }

  /**
   * GENERAR DATOS PARA EXPORTACIÓN
   * ===============================
   * 
   * Genera datos formateados para exportar a PDF/Excel.
   * 
   * @param analyses - Array de análisis
   * @returns Array de datos para exportación
   */
  generateExportData(analyses: PeriodAnalysis[]): Array<{
    empleado: string;
    numeroEmpleado: string;
    periodo: string;
    horasTrabajadas: string;
    horasProgramadas: string;
    diferencia: string;
    diasTrabajados: number;
    ausencias: number;
    incidencias: number;
  }> {
    return analyses.map((analysis) => ({
      empleado: analysis.employeeName,
      numeroEmpleado: analysis.employeeNumber,
      periodo: `${analysis.periodStart} - ${analysis.periodEnd}`,
      horasTrabajadas: `${analysis.hoursWorked}h ${analysis.minutesWorked}m`,
      horasProgramadas: `${analysis.hoursPlanned}h ${analysis.minutesPlanned}m`,
      diferencia: `${analysis.hoursDifference}h ${analysis.minutesDifference}m`,
      diasTrabajados: analysis.daysWorked,
      ausencias: analysis.absences,
      incidencias: analysis.incidents.length,
    }));
  }

  /**
   * CALCULAR PROMEDIO POR EMPLEADO
   * ===============================
   * 
   * Calcula el promedio de horas por empleado.
   * 
   * @param analyses - Array de análisis
   * @returns Map con promedio por empleado
   */
  calculateAverageByEmployee(
    analyses: PeriodAnalysis[]
  ): Map<string, { hours: number; minutes: number }> {
    const employeeMap = new Map<
      string,
      { totalMinutes: number; count: number }
    >();

    for (const analysis of analyses) {
      const totalMinutes = analysis.hoursWorked * 60 + analysis.minutesWorked;
      const existing = employeeMap.get(analysis.employeeId) || {
        totalMinutes: 0,
        count: 0,
      };

      employeeMap.set(analysis.employeeId, {
        totalMinutes: existing.totalMinutes + totalMinutes,
        count: existing.count + 1,
      });
    }

    const averageMap = new Map<string, { hours: number; minutes: number }>();

    employeeMap.forEach((value, employeeId) => {
      const avgMinutes = Math.floor(value.totalMinutes / value.count);
      averageMap.set(employeeId, {
        hours: Math.floor(avgMinutes / 60),
        minutes: avgMinutes % 60,
      });
    });

    return averageMap;
  }

  /**
   * AGRUPAR POR DEPARTAMENTO
   * ========================
   * 
   * Agrupa análisis por departamento.
   * 
   * @param analyses - Array de análisis
   * @param employees - Array de empleados con departamento
   * @returns Map agrupado por departamento
   */
  groupByDepartment(
    analyses: PeriodAnalysis[],
    employees: Employee[]
  ): Map<string, PeriodAnalysis[]> {
    const employeeMap = new Map(employees.map((e) => [e.id, e.departmentId]));
    const departmentMap = new Map<string, PeriodAnalysis[]>();

    for (const analysis of analyses) {
      const departmentId = employeeMap.get(analysis.employeeId) || "sin_departamento";
      const existing = departmentMap.get(departmentId) || [];
      existing.push(analysis);
      departmentMap.set(departmentId, existing);
    }

    return departmentMap;
  }

  /**
   * IDENTIFICAR EMPLEADOS CON BAJO RENDIMIENTO
   * ===========================================
   * 
   * Identifica empleados con horas trabajadas por debajo del promedio.
   * 
   * @param analyses - Array de análisis
   * @param thresholdPercentage - Porcentaje bajo el promedio (ej: 80)
   * @returns Array de empleados con bajo rendimiento
   */
  identifyUnderperformers(
    analyses: PeriodAnalysis[],
    thresholdPercentage: number = 80
  ): PeriodAnalysis[] {
    const totalMinutes = analyses.reduce(
      (sum, a) => sum + a.hoursWorked * 60 + a.minutesWorked,
      0
    );
    const avgMinutes = totalMinutes / analyses.length;
    const threshold = (avgMinutes * thresholdPercentage) / 100;

    return analyses.filter((analysis) => {
      const workedMinutes = analysis.hoursWorked * 60 + analysis.minutesWorked;
      return workedMinutes < threshold;
    });
  }

  /**
   * IDENTIFICAR EMPLEADOS CON EXCESO DE HORAS
   * ==========================================
   * 
   * Identifica empleados con muchas horas extras.
   * 
   * @param analyses - Array de análisis
   * @param overtimeThreshold - Umbral de horas extras en minutos
   * @returns Array de empleados con exceso de horas
   */
  identifyOverworkers(
    analyses: PeriodAnalysis[],
    overtimeThreshold: number = 120
  ): PeriodAnalysis[] {
    return analyses.filter((analysis) => {
      const difference =
        analysis.hoursWorked * 60 +
        analysis.minutesWorked -
        (analysis.hoursPlanned * 60 + analysis.minutesPlanned);
      return difference > overtimeThreshold;
    });
  }

  /**
   * GENERAR RESUMEN EJECUTIVO
   * ==========================
   * 
   * Genera un resumen ejecutivo del período.
   * 
   * @param analyses - Array de análisis
   * @returns Resumen ejecutivo
   */
  generateExecutiveSummary(analyses: PeriodAnalysis[]): {
    totalEmployees: number;
    totalHoursWorked: string;
    totalHoursPlanned: string;
    averageHoursPerEmployee: string;
    totalAbsences: number;
    totalIncidents: number;
    complianceRate: number;
  } {
    const stats = this.calculateAggregatedStats(analyses);

    const totalWorkedMinutes = analyses.reduce(
      (sum, a) => sum + a.hoursWorked * 60 + a.minutesWorked,
      0
    );
    const totalPlannedMinutes = analyses.reduce(
      (sum, a) => sum + a.hoursPlanned * 60 + a.minutesPlanned,
      0
    );

    const avgMinutes =
      analyses.length > 0 ? totalWorkedMinutes / analyses.length : 0;

    const complianceRate =
      totalPlannedMinutes > 0
        ? Math.round((totalWorkedMinutes / totalPlannedMinutes) * 100)
        : 100;

    return {
      totalEmployees: analyses.length,
      totalHoursWorked: `${stats.totalHoursWorked}h`,
      totalHoursPlanned: `${stats.totalHoursPlanned}h`,
      averageHoursPerEmployee: `${Math.floor(avgMinutes / 60)}h ${Math.floor(avgMinutes % 60)}m`,
      totalAbsences: stats.totalAbsences,
      totalIncidents: stats.totalIncidents,
      complianceRate,
    };
  }

  /**
   * CALCULAR TENDENCIAS
   * ===================
   * 
   * Calcula tendencias comparando dos períodos.
   * 
   * @param currentPeriod - Análisis del período actual
   * @param previousPeriod - Análisis del período anterior
   * @returns Tendencias calculadas
   */
  calculateTrends(
    currentPeriod: PeriodAnalysis[],
    previousPeriod: PeriodAnalysis[]
  ): {
    hoursWorkedTrend: number;
    absencesTrend: number;
    incidentsTrend: number;
  } {
    const currentStats = this.calculateAggregatedStats(currentPeriod);
    const previousStats = this.calculateAggregatedStats(previousPeriod);

    const hoursWorkedTrend =
      previousStats.totalHoursWorked > 0
        ? Math.round(
            ((currentStats.totalHoursWorked - previousStats.totalHoursWorked) /
              previousStats.totalHoursWorked) *
              100
          )
        : 0;

    const absencesTrend =
      previousStats.totalAbsences > 0
        ? Math.round(
            ((currentStats.totalAbsences - previousStats.totalAbsences) /
              previousStats.totalAbsences) *
              100
          )
        : 0;

    const incidentsTrend =
      previousStats.totalIncidents > 0
        ? Math.round(
            ((currentStats.totalIncidents - previousStats.totalIncidents) /
              previousStats.totalIncidents) *
              100
          )
        : 0;

    return {
      hoursWorkedTrend,
      absencesTrend,
      incidentsTrend,
    };
  }
}

export const reportService = new ReportService();
