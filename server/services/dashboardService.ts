/**
 * DASHBOARD SERVICE - LÓGICA DE NEGOCIO DEL DASHBOARD
 * ====================================================
 * 
 * Maneja toda la lógica de negocio relacionada con el dashboard.
 * NO accede directamente a la base de datos - recibe datos de storage.
 */

import type { Employee, ClockEntry, DailyWorkday, Incident, Department } from "@shared/schema";

export interface EmployeeDashboardStats {
  isEmployee: true;
  isClockedIn: boolean;
  hoursWorked: number;
  incidents: number;
}

export interface AdminDashboardStats {
  isEmployee: false;
  totalEmployees: number;
  presentToday: number;
  hoursWorked: number;
  incidents: number;
  newEmployeesLastWeek: number;
  newIncidentsLastWeek: number;
}

export interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  presentToday: number;
  hoursThisWeek: number;
  averageHoursPerEmployee: number;
}

export class DashboardService {
  /**
   * CALCULAR ESTADÍSTICAS PARA EMPLEADO
   * ====================================
   * 
   * Calcula métricas del dashboard para un empleado individual.
   * 
   * @param employeeId - ID del empleado
   * @param todayEntries - Fichajes de hoy del empleado
   * @param weekEntries - Entradas de la semana del empleado
   * @param userIncidents - Incidencias del empleado
   * @returns Estadísticas del empleado
   */
  calculateEmployeeStats(
    employeeId: string,
    todayEntries: ClockEntry[],
    weekEntries: DailyWorkday[],
    userIncidents: Incident[]
  ): EmployeeDashboardStats {
    const today = new Date().toISOString().split("T")[0];
    const todayEntry = todayEntries.find(
      (entry) => 
        entry.idUser === employeeId &&
        new Date(entry.timestamp).toISOString().split("T")[0] === today
    );

    const isClockedIn = todayEntry && 
      todayEntry.entryType === "clock_in" &&
      !todayEntries.some(
        e => 
          e.idUser === employeeId && 
          e.entryType === "clock_out" &&
          e.timestamp > todayEntry.timestamp
      );

    const userHoursThisWeek = Math.floor(
      weekEntries
        .filter(wd => wd.idUser === employeeId)
        .reduce((sum, entry) => sum + (entry.workedMinutes || 0), 0) / 60
    );

    const pendingIncidents = userIncidents.filter(
      (inc) => inc.status === "pending"
    ).length;

    return {
      isEmployee: true,
      isClockedIn: !!isClockedIn,
      hoursWorked: userHoursThisWeek,
      incidents: pendingIncidents,
    };
  }

  /**
   * CALCULAR ESTADÍSTICAS PARA ADMINISTRADOR
   * =========================================
   * 
   * Calcula métricas globales del dashboard para administradores.
   * 
   * @param employees - Todos los empleados
   * @param todayEntries - Fichajes de hoy
   * @param weekWorkdays - Jornadas de la semana
   * @param allIncidents - Todas las incidencias
   * @returns Estadísticas del administrador
   */
  calculateAdminStats(
    employees: Employee[],
    todayEntries: ClockEntry[],
    weekWorkdays: DailyWorkday[],
    allIncidents: Incident[]
  ): AdminDashboardStats {
    const today = new Date().toISOString().split("T")[0];

    const totalEmployees = employees.filter((emp) => emp.isActive).length;

    const presentToday = this.calculatePresentEmployees(
      todayEntries,
      today
    );

    const totalHoursThisWeek = Math.floor(
      weekWorkdays.reduce((sum, wd) => sum + (wd.workedMinutes || 0), 0) / 60
    );

    const pendingIncidents = allIncidents.filter(
      (inc) => inc.status === "pending"
    ).length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    const newIncidentsLastWeek = allIncidents.filter((inc) => {
      if (!inc.createdAt) return false;
      const createdAt = new Date(inc.createdAt);
      createdAt.setHours(0, 0, 0, 0);
      return createdAt >= oneWeekAgo;
    }).length;

    const newEmployeesLastWeek = employees.filter((emp) => {
      if (!emp.isActive || !emp.hireDate) return false;
      const hireDate = new Date(emp.hireDate);
      hireDate.setHours(0, 0, 0, 0);
      return hireDate >= oneWeekAgo;
    }).length;

    return {
      isEmployee: false,
      totalEmployees,
      presentToday,
      hoursWorked: totalHoursThisWeek,
      incidents: pendingIncidents,
      newEmployeesLastWeek,
      newIncidentsLastWeek,
    };
  }

  /**
   * CALCULAR EMPLEADOS PRESENTES HOY
   * =================================
   * 
   * Calcula cuántos empleados están presentes hoy (fichados sin salida).
   * 
   * @param todayEntries - Fichajes de hoy
   * @param today - Fecha de hoy
   * @returns Número de empleados presentes
   */
  private calculatePresentEmployees(
    todayEntries: ClockEntry[],
    today: string
  ): number {
    const employeeStatus = new Map<string, boolean>();

    for (const entry of todayEntries) {
      const entryDate = new Date(entry.timestamp).toISOString().split("T")[0];
      if (entryDate === today) {
        if (entry.entryType === "clock_in") {
          employeeStatus.set(entry.idUser, true);
        } else if (entry.entryType === "clock_out") {
          employeeStatus.set(entry.idUser, false);
        }
      }
    }

    return Array.from(employeeStatus.values()).filter(present => present).length;
  }

  /**
   * CALCULAR ESTADÍSTICAS POR DEPARTAMENTO
   * =======================================
   * 
   * Agrupa y calcula estadísticas por departamento.
   * 
   * @param employees - Todos los empleados
   * @param departments - Todos los departamentos
   * @param todayEntries - Fichajes de hoy
   * @param weekWorkdays - Jornadas de la semana
   * @returns Estadísticas por departamento
   */
  calculateDepartmentStats(
    employees: Employee[],
    departments: Department[],
    todayEntries: ClockEntry[],
    weekWorkdays: DailyWorkday[]
  ): DepartmentStats[] {
    const today = new Date().toISOString().split("T")[0];
    const stats: DepartmentStats[] = [];

    for (const dept of departments) {
      const deptEmployees = employees.filter(
        (emp) => emp.departmentId === dept.id && emp.isActive
      );

      const deptEmployeeIds = new Set(deptEmployees.map((e) => e.id));

      const presentToday = this.calculatePresentEmployees(
        todayEntries.filter((e) => deptEmployeeIds.has(e.idUser)),
        today
      );

      const deptWeekWorkdays = weekWorkdays.filter((wd) =>
        deptEmployeeIds.has(wd.idUser)
      );

      const totalMinutes = deptWeekWorkdays.reduce(
        (sum, wd) => sum + (wd.workedMinutes || 0),
        0
      );

      const hoursThisWeek = Math.floor(totalMinutes / 60);
      const averageHoursPerEmployee =
        deptEmployees.length > 0
          ? Math.floor(totalMinutes / 60 / deptEmployees.length)
          : 0;

      stats.push({
        departmentId: dept.id,
        departmentName: dept.name,
        totalEmployees: deptEmployees.length,
        presentToday,
        hoursThisWeek,
        averageHoursPerEmployee,
      });
    }

    return stats;
  }

  /**
   * CALCULAR MÉTRICAS DE NUEVOS EMPLEADOS
   * ======================================
   * 
   * Calcula estadísticas de empleados nuevos en un período.
   * 
   * @param employees - Todos los empleados
   * @param days - Número de días hacia atrás
   * @returns Número de empleados nuevos
   */
  calculateNewEmployees(employees: Employee[], days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    return employees.filter((emp) => {
      if (!emp.isActive || !emp.hireDate) return false;
      const hireDate = new Date(emp.hireDate);
      hireDate.setHours(0, 0, 0, 0);
      return hireDate >= cutoffDate;
    }).length;
  }

  /**
   * CALCULAR MÉTRICAS DE INCIDENCIAS RECIENTES
   * ===========================================
   * 
   * Calcula estadísticas de incidencias recientes.
   * 
   * @param incidents - Todas las incidencias
   * @param days - Número de días hacia atrás
   * @returns Número de incidencias recientes
   */
  calculateRecentIncidents(incidents: Incident[], days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);

    return incidents.filter((inc) => {
      if (!inc.createdAt) return false;
      const createdAt = new Date(inc.createdAt);
      createdAt.setHours(0, 0, 0, 0);
      return createdAt >= cutoffDate;
    }).length;
  }

  /**
   * OBTENER INICIO DE SEMANA
   * ========================
   * 
   * Obtiene la fecha de inicio de la semana actual (domingo).
   * 
   * @returns Fecha de inicio de semana en formato YYYY-MM-DD
   */
  getWeekStart(): string {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString().split("T")[0];
  }

  /**
   * CALCULAR TASA DE ASISTENCIA
   * ============================
   * 
   * Calcula la tasa de asistencia global.
   * 
   * @param employees - Empleados activos
   * @param presentToday - Empleados presentes hoy
   * @returns Tasa de asistencia en porcentaje
   */
  calculateAttendanceRate(
    employees: Employee[],
    presentToday: number
  ): number {
    const totalActive = employees.filter((emp) => emp.isActive).length;
    if (totalActive === 0) return 0;
    return Math.round((presentToday / totalActive) * 100);
  }

  /**
   * CALCULAR PROMEDIO DE HORAS POR DÍA
   * ===================================
   * 
   * Calcula el promedio de horas trabajadas por día en la semana.
   * Usa el campo date de DailyWorkday para agrupar por día.
   * 
   * @param weekWorkdays - Jornadas de la semana
   * @returns Promedio de horas por día
   */
  calculateAverageHoursPerDay(weekWorkdays: DailyWorkday[]): number {
    if (weekWorkdays.length === 0) return 0;

    const totalMinutes = weekWorkdays.reduce(
      (sum, wd) => sum + (wd.workedMinutes || 0),
      0
    );

    const uniqueDates = new Set(weekWorkdays.map((wd) => wd.date));
    const daysWithWork = uniqueDates.size;

    if (daysWithWork === 0) return 0;

    return Math.floor(totalMinutes / 60 / daysWithWork);
  }

  /**
   * IDENTIFICAR TENDENCIAS
   * ======================
   * 
   * Identifica tendencias comparando semanas.
   * 
   * @param currentWeekWorkdays - Jornadas semana actual
   * @param previousWeekWorkdays - Jornadas semana anterior
   * @returns Porcentaje de cambio
   */
  identifyTrends(
    currentWeekWorkdays: DailyWorkday[],
    previousWeekWorkdays: DailyWorkday[]
  ): number {
    const currentTotal = currentWeekWorkdays.reduce(
      (sum, wd) => sum + (wd.workedMinutes || 0),
      0
    );

    const previousTotal = previousWeekWorkdays.reduce(
      (sum, wd) => sum + (wd.workedMinutes || 0),
      0
    );

    if (previousTotal === 0) return 0;

    return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  }
}

export const dashboardService = new DashboardService();
