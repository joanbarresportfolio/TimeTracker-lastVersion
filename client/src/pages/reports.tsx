import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Calendar,
  Clock,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ExcelJS from "exceljs";
import type { User, Department } from "@shared/schema";

interface ReportData {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  period: string;
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
    type: string;
    description: string;
    date: string;
  }>;
}

export default function Reports() {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];

  const [periodType, setPeriodType] = useState<string>("month");
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: employees } = useQuery<User[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: reportData, isLoading } = useQuery<ReportData[]>({
    queryKey: [
      "/api/reports/period-analysis",
      startDate,
      endDate,
      periodType,
      selectedEmployee,
      selectedDepartment,
    ],
    enabled: !!startDate && !!endDate,
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        periodType,
      });

      if (selectedEmployee !== "all") {
        params.append("employeeId", selectedEmployee);
      }
      if (selectedDepartment !== "all") {
        params.append("departmentId", selectedDepartment);
      }

      const response = await fetch(`/api/reports/period-analysis?${params}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Error al obtener datos del informe");
      return response.json();
    },
  });

  const handlePeriodChange = (value: string) => {
    setPeriodType(value);
    const now = new Date();

    switch (value) {
      case "day":
        setStartDate(today);
        setEndDate(today);
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        setStartDate(weekStart.toISOString().split("T")[0]);
        setEndDate(today);
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(monthStart.toISOString().split("T")[0]);
        setEndDate(today);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        setStartDate(quarterStart.toISOString().split("T")[0]);
        setEndDate(today);
        break;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        setStartDate(yearStart.toISOString().split("T")[0]);
        setEndDate(today);
        break;
    }
  };


  const exportToExcel = async () => {
    if (!reportData) return;

    try {
      // Obtener datos detallados del servidor
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (selectedEmployee !== "all") {
        params.append("employeeId", selectedEmployee);
      }
      if (selectedDepartment !== "all") {
        params.append("departmentId", selectedDepartment);
      }

      const response = await fetch(`/api/reports/detailed-export?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Error al obtener datos detallados");
      }

      const detailedData = await response.json();

      // Crear workbook con ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Obtener año y mes del rango
      const startDateObj = new Date(startDate);
      const year = startDateObj.getFullYear();
      const monthName = startDateObj.toLocaleDateString("es-ES", {
        month: "long",
      }).toUpperCase();

      // Crear una hoja por empleado
      for (const employeeData of detailedData) {
        const { employee, dailyData } = employeeData;

        const worksheet = workbook.addWorksheet(
          `${employee.number} - ${employee.firstName}`,
        );

        // Fila 1: Año
        worksheet.getCell("A1").value = year;
        worksheet.getCell("A1").font = { bold: true, size: 14 };

        // Fila 3: Encabezados de grupo
        worksheet.mergeCells("B3:F3");
        worksheet.getCell("B3").value = "HORARIO ASIGNADO";
        worksheet.getCell("B3").alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        worksheet.getCell("B3").font = { bold: true };
        worksheet.getCell("B3").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        worksheet.mergeCells("G3:M3");
        worksheet.getCell("G3").value = "HORARIO REALIZADO";
        worksheet.getCell("G3").alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        worksheet.getCell("G3").font = { bold: true };
        worksheet.getCell("G3").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        worksheet.mergeCells("O3:O3");
        worksheet.getCell("O3").value = "DIFERENCIA";
        worksheet.getCell("O3").alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        worksheet.getCell("O3").font = { bold: true };
        worksheet.getCell("O3").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Fila 4: Encabezados de columna
        const headers = [
          monthName,
          "Entrada",
          "Inicio pausa",
          "Fin pausa",
          "Salida",
          "Horas asignadas",
          "Entrada",
          "Inicio pausa",
          "Fin pausa",
          "Horas pausa",
          "Salida",
          "Horas Realizadas",
          "Pausas Extraordinarias",
          "Incidencias",
          "HORAS",
        ];

        headers.forEach((header, index) => {
          const cell = worksheet.getCell(4, index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F0F0" },
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // Datos diarios (desde fila 5)
        let rowIndex = 5;
        for (const day of dailyData) {
          const row = worksheet.getRow(rowIndex);

          // Columna A: Día del mes
          row.getCell(1).value = day.dayOfMonth;

          // HORARIO ASIGNADO (columnas B-F)
          if (day.schedule) {
            row.getCell(2).value = day.schedule.startTime || "";
            row.getCell(3).value = day.schedule.startBreak || "";
            row.getCell(4).value = day.schedule.endBreak || "";
            row.getCell(5).value = day.schedule.endTime || "";

            // Calcular horas asignadas
            if (day.schedule.startTime && day.schedule.endTime) {
              const [startH, startM] = day.schedule.startTime
                .split(":")
                .map(Number);
              const [endH, endM] = day.schedule.endTime.split(":").map(Number);
              const totalMinutes =
                endH * 60 + endM - (startH * 60 + startM);

              // Restar pausa de comida
              let breakMinutes = 0;
              if (day.schedule.startBreak && day.schedule.endBreak) {
                const [bStartH, bStartM] = day.schedule.startBreak
                  .split(":")
                  .map(Number);
                const [bEndH, bEndM] = day.schedule.endBreak
                  .split(":")
                  .map(Number);
                breakMinutes = bEndH * 60 + bEndM - (bStartH * 60 + bStartM);
              }

              const workedMinutes = totalMinutes - breakMinutes;
              const hours = Math.floor(workedMinutes / 60);
              const minutes = workedMinutes % 60;
              row.getCell(6).value = `${hours}:${minutes.toString().padStart(2, "0")}`;
            }
          }

          // HORARIO REALIZADO (columnas G-L)
          if (day.clockEntries && day.clockEntries.length > 0) {
            const clockIn = day.clockEntries.find(
              (e: any) => e.entryType === "clock_in",
            );
            const clockOut = day.clockEntries.find(
              (e: any) => e.entryType === "clock_out",
            );
            const breakStart = day.clockEntries.find(
              (e: any) => e.entryType === "break_start",
            );
            const breakEnd = day.clockEntries.find(
              (e: any) => e.entryType === "break_end",
            );

            if (clockIn) {
              const time = new Date(clockIn.timestamp);
              const spanishTime = time.toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              row.getCell(7).value = spanishTime;
            }
            if (breakStart) {
              const time = new Date(breakStart.timestamp);
              const spanishTime = time.toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              row.getCell(8).value = spanishTime;
            }
            if (breakEnd) {
              const time = new Date(breakEnd.timestamp);
              const spanishTime = time.toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              row.getCell(9).value = spanishTime;
            }

            // Horas pausa total (en minutos -> formato HH:MM)
            const pausaHours = Math.floor(day.totalBreakMinutes / 60);
            const pausaMinutes = Math.floor(day.totalBreakMinutes % 60);
            row.getCell(10).value = `${pausaHours}:${pausaMinutes.toString().padStart(2, "0")}`;

            if (clockOut) {
              const time = new Date(clockOut.timestamp);
              const spanishTime = time.toLocaleString("es-ES", {
                timeZone: "Europe/Madrid",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              row.getCell(11).value = spanishTime;
            }
          }

          // Horas realizadas (de workday)
          if (day.workday) {
            const hours = Math.floor(day.workday.workedMinutes / 60);
            const minutes = day.workday.workedMinutes % 60;
            row.getCell(12).value = `${hours}:${minutes.toString().padStart(2, "0")}`;
          }

          // Pausas extraordinarias (columna M) - puede ser positivo o negativo
          if (day.extraordinaryBreakMinutes !== 0) {
            const absMinutes = Math.abs(day.extraordinaryBreakMinutes);
            const hours = Math.floor(absMinutes / 60);
            const minutes = Math.floor(absMinutes % 60);
            const sign = day.extraordinaryBreakMinutes < 0 ? "-" : "";
            row.getCell(13).value = `${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
          }

          // Incidencias (columna N)
          if (day.incidents && day.incidents.length > 0) {
            row.getCell(14).value = day.incidents.length;
          }

          // DIFERENCIA HORAS (columna O)
          if (day.workday && day.schedule) {
            // Calcular diferencia entre horas realizadas y asignadas
            const workedMinutes = day.workday.workedMinutes;

            let assignedMinutes = 0;
            if (day.schedule.startTime && day.schedule.endTime) {
              const [startH, startM] = day.schedule.startTime
                .split(":")
                .map(Number);
              const [endH, endM] = day.schedule.endTime.split(":").map(Number);
              assignedMinutes = endH * 60 + endM - (startH * 60 + startM);

              // Restar pausa de comida
              if (day.schedule.startBreak && day.schedule.endBreak) {
                const [bStartH, bStartM] = day.schedule.startBreak
                  .split(":")
                  .map(Number);
                const [bEndH, bEndM] = day.schedule.endBreak
                  .split(":")
                  .map(Number);
                const breakMinutes =
                  bEndH * 60 + bEndM - (bStartH * 60 + bStartM);
                assignedMinutes -= breakMinutes;
              }
            }

            const diff = workedMinutes - assignedMinutes;
            const diffHours = Math.floor(Math.abs(diff) / 60);
            const diffMinutes = Math.abs(diff) % 60;
            const sign = diff >= 0 ? "" : "-";
            row.getCell(15).value = `${sign}${diffHours}:${diffMinutes.toString().padStart(2, "0")}`;
          }

          // Aplicar bordes a toda la fila
          for (let col = 1; col <= 15; col++) {
            row.getCell(col).border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }

          rowIndex++;
        }

        // Ajustar anchos de columna
        worksheet.columns = [
          { width: 10 }, // Día
          { width: 10 }, // Entrada asignada
          { width: 12 }, // Inicio pausa asignada
          { width: 12 }, // Fin pausa asignada
          { width: 10 }, // Salida asignada
          { width: 15 }, // Horas asignadas
          { width: 10 }, // Entrada realizada
          { width: 12 }, // Inicio pausa realizada
          { width: 12 }, // Fin pausa realizada
          { width: 12 }, // Horas pausa
          { width: 10 }, // Salida realizada
          { width: 15 }, // Horas realizadas
          { width: 18 }, // Pausas extraordinarias
          { width: 12 }, // Incidencias
          { width: 10 }, // Diferencia
        ];
      }

      // Guardar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `informe-fichadas-${startDate}-${endDate}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      alert("Error al generar el archivo Excel");
    }
  };

  const totalHoursWorked =
    reportData?.reduce(
      (sum, item) => sum + item.hoursWorked * 60 + item.minutesWorked,
      0,
    ) || 0;
  const totalHoursPlanned =
    reportData?.reduce(
      (sum, item) => sum + item.hoursPlanned * 60 + item.minutesPlanned,
      0,
    ) || 0;
  const totalIncidents =
    reportData?.reduce((sum, item) => sum + item.incidents.length, 0) || 0;
  const totalAbsences =
    reportData?.reduce((sum, item) => sum + item.absences, 0) || 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          Informes por Período
        </h2>
        <p className="text-muted-foreground">
          Análisis detallado de jornadas laborales por día, semana, mes,
          trimestre o año
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Informe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tipo de Período
              </label>
              <Select
                value={periodType}
                onValueChange={handlePeriodChange}
                data-testid="select-period-type"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="quarter">Trimestre</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Fecha Inicio
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Fecha Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Empleado</label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
                data-testid="select-employee"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Departamento
              </label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
                data-testid="select-department"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={exportToExcel}
              disabled={!reportData || reportData.length === 0}
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Horas Trabajadas
                </p>
                <p
                  className="text-2xl font-bold"
                  data-testid="total-hours-worked"
                >
                  {Math.floor(totalHoursWorked / 60)}h {totalHoursWorked % 60}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Horas Planificadas
                </p>
                <p
                  className="text-2xl font-bold"
                  data-testid="total-hours-planned"
                >
                  {Math.floor(totalHoursPlanned / 60)}h {totalHoursPlanned % 60}
                  m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Incidencias
                </p>
                <p className="text-2xl font-bold" data-testid="total-incidents">
                  {totalIncidents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Ausencias
                </p>
                <p className="text-2xl font-bold" data-testid="total-absences">
                  {totalAbsences}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla detallada */}
      <Card>
        <CardHeader>
          <CardTitle>Informe Detallado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando informe...</p>
            </div>
          ) : !reportData || reportData.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay datos para mostrar en este período
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Nº
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Empleado
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Período
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Horas Trabajadas
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Días Trabajados
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Horas Planificadas
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Diferencia
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Incidencias
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Ausencias
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => {
                    const diffIsPositive =
                      item.hoursDifference * 60 + item.minutesDifference >= 0;

                    return (
                      <tr
                        key={item.employeeId}
                        className="border-b border-border hover-elevate"
                        data-testid={`report-row-${index}`}
                      >
                        <td className="py-3 px-4 text-foreground">
                          {item.employeeNumber}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.employeeName}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {periodType === "day"
                              ? "Día"
                              : periodType === "week"
                                ? "Semana"
                                : periodType === "month"
                                  ? "Mes"
                                  : periodType === "quarter"
                                    ? "Trimestre"
                                    : "Año"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.hoursWorked}h {item.minutesWorked}m
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.daysWorked}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.hoursPlanned}h {item.minutesPlanned}m
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={
                              diffIsPositive ? "text-green-600" : "text-red-600"
                            }
                          >
                            {diffIsPositive ? "+" : ""}
                            {item.hoursDifference}h {item.minutesDifference}m
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {item.incidents.length > 0 ? (
                            <Badge variant="destructive">
                              {item.incidents.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {item.absences > 0 ? (
                            <Badge variant="secondary">{item.absences}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
