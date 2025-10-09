/**
 * SERVICES INDEX - EXPORTACIÓN CENTRALIZADA
 * ==========================================
 * 
 * Exporta todos los servicios de lógica de negocio desde un solo punto.
 */

export { userService, UserService } from "./userService";
export type { SafeEmployee } from "./userService";

export { clockService, ClockService } from "./clockService";
export type {
  ClockEntryType,
  ClockValidationResult,
  WorkedHoursCalculation,
  BreakTimeCalculation,
} from "./clockService";

export { workdayService, WorkdayService } from "./workdayService";
export type {
  WorkdayCalculation,
  WorkdayConsolidation,
} from "./workdayService";

export { scheduleService, ScheduleService } from "./scheduleService";
export type {
  DateRangeValidation,
  ScheduleConflict,
} from "./scheduleService";

export { incidentService, IncidentService } from "./incidentService";
export type {
  IncidentType,
  IncidentImpact,
} from "./incidentService";

export { reportService, ReportService } from "./reportService";
export type {
  PeriodType,
  PeriodAnalysis,
  AggregatedStats,
} from "./reportService";

export { dashboardService, DashboardService } from "./dashboardService";
export type {
  EmployeeDashboardStats,
  AdminDashboardStats,
  DepartmentStats,
} from "./dashboardService";
