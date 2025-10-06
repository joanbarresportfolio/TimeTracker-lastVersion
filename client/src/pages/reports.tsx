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
  TrendingUp,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Employee, TimeEntry, Incident, DailyWorkday } from "@shared/schema";

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("this_month");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>(
    {
      queryKey: ["/api/employees"],
    },
  );

  const { data: timeEntries, isLoading: timeEntriesLoading } = useQuery<
    TimeEntry[]
  >({
    queryKey: ["/api/time-entries"],
  });

  const { data: incidents, isLoading: incidentsLoading } = useQuery<Incident[]>(
    {
      queryKey: ["/api/incidents"],
    },
  );

  const isLoading = employeesLoading || timeEntriesLoading || incidentsLoading;

  // Calculate report data
  const getReportData = () => {
    if (!employees || !timeEntries || !incidents) return null;

    const now = new Date();
    let periodStart = new Date();
    let periodEnd = new Date();

    switch (selectedPeriod) {
      case "this_week":
        periodStart.setDate(now.getDate() - now.getDay());
        break;
      case "this_month":
        periodStart.setDate(1);
        break;
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        periodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        periodEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
        break;
      case "custom":
        if (startDate && endDate) {
          periodStart = new Date(startDate);
          periodEnd = new Date(endDate);
        }
        break;
    }

    const periodStartStr = periodStart.toISOString().split("T")[0];
    const periodEndStr = periodEnd.toISOString().split("T")[0];

    const filteredEntries = timeEntries.filter((entry) => {
      const entryDate = entry.date;
      return entryDate >= periodStartStr && entryDate <= periodEndStr;
    });

    const filteredIncidents = incidents.filter((incident) => {
      const incidentDate = new Date(incident.createdAt)
        .toISOString()
        .split("T")[0];
      return incidentDate >= periodStartStr && incidentDate <= periodEndStr;
    });

    const totalHours = filteredEntries.reduce(
      (sum, entry) => sum + (entry.totalHours || 0),
      0,
    );
    const averageHoursPerDay =
      filteredEntries.length > 0 ? totalHours / filteredEntries.length : 0;

    const employeesWithData = employees.map((employee) => {
      const employeeEntries = filteredEntries.filter(
        (entry) => entry.employeeId === employee.id,
      );
      const employeeIncidents = filteredIncidents.filter(
        (incident) => incident.userId === employee.id,
      );
      const employeeHours = employeeEntries.reduce(
        (sum, entry) => sum + (entry.totalHours || 0),
        0,
      );

      return {
        ...employee,
        totalHours: employeeHours,
        totalDays: employeeEntries.length,
        totalIncidents: employeeIncidents.length,
        averageHours:
          employeeEntries.length > 0
            ? employeeHours / employeeEntries.length
            : 0,
      };
    });

    return {
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      totalEmployees: employees.length,
      totalHours: Math.floor(totalHours / 60), // Convert to hours
      totalDays: filteredEntries.length,
      totalIncidents: filteredIncidents.length,
      averageHoursPerDay: Math.floor(averageHoursPerDay / 60),
      employeesWithData,
      topPerformers: employeesWithData
        .filter((emp) => emp.totalHours > 0)
        .sort((a, b) => b.averageHours - a.averageHours)
        .slice(0, 5),
    };
  };

  const reportData = getReportData();

  const exportReport = async (format: "pdf" | "excel") => {
    if (!reportData || !employees) return;

    // Get period dates
    const now = new Date();
    let periodStart = new Date();
    let periodEnd = new Date();

    switch (selectedPeriod) {
      case "this_week":
        periodStart.setDate(now.getDate() - now.getDay());
        break;
      case "this_month":
        periodStart.setDate(1);
        break;
      case "last_month":
        periodStart.setMonth(now.getMonth() - 1, 1);
        periodEnd.setDate(0);
        break;
      case "custom":
        if (startDate && endDate) {
          periodStart = new Date(startDate);
          periodEnd = new Date(endDate);
        }
        break;
    }

    const startDateStr = periodStart.toISOString().split("T")[0];
    const endDateStr = periodEnd.toISOString().split("T")[0];

    // Filter employees based on selection
    const employeesToExport = selectedEmployee === "all" 
      ? employees 
      : employees.filter(emp => emp.id === selectedEmployee);

    // Fetch daily_workday data for each employee
    const allWorkdayData: Array<{ employee: Employee; workdays: DailyWorkday[] }> = [];
    
    for (const employee of employeesToExport) {
      try {
        const response = await fetch(
          `/api/daily-workday/history?employeeId=${employee.id}&startDate=${startDateStr}&endDate=${endDateStr}`,
          { credentials: 'include' }
        );
        if (response.ok) {
          const workdays = await response.json();
          allWorkdayData.push({ employee, workdays });
        }
      } catch (error) {
        console.error(`Error fetching workdays for ${employee.firstName}:`, error);
      }
    }

    if (format === "pdf") {
      exportToPDF(allWorkdayData, startDateStr, endDateStr);
    } else {
      exportToExcel(allWorkdayData, startDateStr, endDateStr);
    }
  };

  const exportToPDF = (
    data: Array<{ employee: Employee; workdays: DailyWorkday[] }>,
    startDate: string,
    endDate: string
  ) => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Reporte de Jornadas Laborales", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 28);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 34);
    
    let yPosition = 45;

    data.forEach((employeeData, index) => {
      const { employee, workdays } = employeeData;
      
      // Add new page if needed
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Employee header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${employee.firstName} ${employee.lastName}`, 14, yPosition);
      yPosition += 2;

      // Summary for this employee
      const totalMinutes = workdays.reduce((sum, wd) => sum + (wd.workedMinutes || 0), 0);
      const totalBreakMinutes = workdays.reduce((sum, wd) => sum + (wd.breakMinutes || 0), 0);
      const totalDays = workdays.length;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total días: ${totalDays} | Total horas: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m | Pausas: ${Math.floor(totalBreakMinutes / 60)}h ${totalBreakMinutes % 60}m`, 14, yPosition + 5);
      
      yPosition += 10;

      // Table with workday details
      const tableData = workdays.map(wd => {
        // Format times safely - startTime and endTime are timestamps (Date objects)
        const formatTime = (timestamp: Date | null) => {
          if (!timestamp) return '-';
          try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          } catch {
            return '-';
          }
        };

        return [
          wd.date,
          formatTime(wd.startTime),
          formatTime(wd.endTime),
          `${Math.floor((wd.workedMinutes || 0) / 60)}h ${(wd.workedMinutes || 0) % 60}m`,
          `${Math.floor((wd.breakMinutes || 0) / 60)}h ${(wd.breakMinutes || 0) % 60}m`,
          wd.status === 'closed' ? 'Cerrada' : 'Abierta'
        ];
      });

      autoTable(doc, {
        startY: yPosition,
        head: [['Fecha', 'Entrada', 'Salida', 'Horas', 'Pausas', 'Estado']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;

      // Add page break between employees if not the last one
      if (index < data.length - 1 && yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
    });

    doc.save(`reporte-jornadas-${startDate}-${endDate}.pdf`);
  };

  const exportToExcel = (
    data: Array<{ employee: Employee; workdays: DailyWorkday[] }>,
    startDate: string,
    endDate: string
  ) => {
    const workbook = XLSX.utils.book_new();

    data.forEach((employeeData) => {
      const { employee, workdays } = employeeData;
      
      // Create worksheet data
      const worksheetData = [
        [`Empleado: ${employee.firstName} ${employee.lastName}`],
        [`Departamento: ${employee.department || 'N/A'}`],
        [`Período: ${startDate} a ${endDate}`],
        [],
        ['Fecha', 'Entrada', 'Salida', 'Horas Trabajadas', 'Pausas', 'Horas Extra', 'Estado']
      ];

      workdays.forEach(wd => {
        // Format times safely - startTime and endTime are timestamps
        const formatTime = (timestamp: Date | null) => {
          if (!timestamp) return '-';
          try {
            const date = new Date(timestamp);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          } catch {
            return '-';
          }
        };

        worksheetData.push([
          wd.date,
          formatTime(wd.startTime),
          formatTime(wd.endTime),
          `${Math.floor((wd.workedMinutes || 0) / 60)}h ${(wd.workedMinutes || 0) % 60}m`,
          `${Math.floor((wd.breakMinutes || 0) / 60)}h ${(wd.breakMinutes || 0) % 60}m`,
          `${Math.floor((wd.overtimeMinutes || 0) / 60)}h ${(wd.overtimeMinutes || 0) % 60}m`,
          wd.status === 'closed' ? 'Cerrada' : 'Abierta'
        ]);
      });

      // Add summary row
      const totalMinutes = workdays.reduce((sum, wd) => sum + (wd.workedMinutes || 0), 0);
      const totalBreakMinutes = workdays.reduce((sum, wd) => sum + (wd.breakMinutes || 0), 0);
      
      worksheetData.push([]);
      worksheetData.push([
        'TOTALES',
        '',
        '',
        `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`,
        `${Math.floor(totalBreakMinutes / 60)}h ${totalBreakMinutes % 60}m`,
        '',
        `${workdays.length} días`
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 10 }, // Entrada
        { wch: 10 }, // Salida
        { wch: 16 }, // Horas
        { wch: 12 }, // Pausas
        { wch: 12 }, // Horas Extra
        { wch: 10 }  // Estado
      ];

      // Use employee name as sheet name (sanitize for Excel)
      const sheetName = `${employee.firstName} ${employee.lastName}`.substring(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `reporte-jornadas-${startDate}-${endDate}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Reportes</h2>
          <p className="text-muted-foreground">
            Genera y exporta reportes detallados
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Reportes</h2>
        <p className="text-muted-foreground">
          Genera y exporta reportes detallados
        </p>
      </div>

      {/* Filtros de reporte */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select
                value={selectedPeriod}
                onValueChange={setSelectedPeriod}
                data-testid="select-report-period"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_week">Esta semana</SelectItem>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="last_month">Mes pasado</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Fecha inicio
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
                    Fecha fin
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Empleado</label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
                data-testid="select-employee-filter"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={() => exportReport("pdf")}
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => exportReport("excel")}
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del reporte */}
      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Empleados
                    </p>
                    <p
                      className="text-2xl font-bold"
                      data-testid="report-total-employees"
                    >
                      {reportData.totalEmployees}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Horas
                    </p>
                    <p
                      className="text-2xl font-bold"
                      data-testid="report-total-hours"
                    >
                      {reportData.totalHours}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Días Trabajados
                    </p>
                    <p
                      className="text-2xl font-bold"
                      data-testid="report-total-days"
                    >
                      {reportData.totalDays}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Incidencias
                    </p>
                    <p
                      className="text-2xl font-bold"
                      data-testid="report-total-incidents"
                    >
                      {reportData.totalIncidents}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Empleados Destacados</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.topPerformers.map((employee, index) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                    data-testid={`top-performer-${index}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          #{index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {employee.department}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {Math.floor(employee.averageHours / 60)}h{" "}
                        {employee.averageHours % 60}m
                      </p>
                      <p className="text-sm text-muted-foreground">
                        promedio/día
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabla detallada */}
          <Card>
            <CardHeader>
              <CardTitle>Reporte Detallado por Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Empleado
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Departamento
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Total Horas
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Días Trabajados
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Promedio/Día
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                        Incidencias
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.employeesWithData
                      .filter(
                        (emp) =>
                          selectedEmployee === "all" ||
                          emp.id === selectedEmployee,
                      )
                      .map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b border-border hover:bg-muted/50"
                          data-testid={`employee-report-row-${employee.id}`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-foreground">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {employee.employeeNumber}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {employee.department}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {Math.floor(employee.totalHours / 60)}h{" "}
                            {employee.totalHours % 60}m
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {employee.totalDays}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {Math.floor(employee.averageHours / 60)}h{" "}
                            {employee.averageHours % 60}m
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {employee.totalIncidents}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
