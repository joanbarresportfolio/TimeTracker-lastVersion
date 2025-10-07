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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Employee, Department } from "@shared/schema";

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
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  
  const [periodType, setPeriodType] = useState<string>("month");
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const { data: reportData, isLoading } = useQuery<ReportData[]>({
    queryKey: ["/api/reports/period-analysis", startDate, endDate, periodType, selectedEmployee, selectedDepartment],
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
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error("Error al obtener datos del informe");
      return response.json();
    }
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
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3);
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
        setStartDate(quarterStart.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case "year":
        const yearStart = new Date(now.getFullYear(), 0, 1);
        setStartDate(yearStart.toISOString().split('T')[0]);
        setEndDate(today);
        break;
    }
  };

  const exportToPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Informe de Jornadas Laborales", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 28);
    doc.text(`Tipo: ${periodType === 'day' ? 'Día' : periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : periodType === 'quarter' ? 'Trimestre' : 'Año'}`, 14, 34);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 40);

    const tableData = reportData.map(item => {
      const diffIsPositive = (item.hoursDifference * 60 + item.minutesDifference) >= 0;
      return [
        item.employeeNumber,
        item.employeeName,
        `${item.hoursWorked}h ${item.minutesWorked}m`,
        item.daysWorked.toString(),
        `${item.hoursPlanned}h ${item.minutesPlanned}m`,
        `${diffIsPositive ? '+' : ''}${item.hoursDifference}h ${item.minutesDifference}m`,
        item.incidents.length.toString(),
        item.absences.toString()
      ];
    });

    autoTable(doc, {
      startY: 50,
      head: [['Nº', 'Empleado', 'Horas Trab.', 'Días Trab.', 'Horas Plan.', 'Diferencia', 'Incidencias', 'Ausencias']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    doc.save(`informe-${periodType}-${startDate}-${endDate}.pdf`);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const worksheetData = [
      ['Informe de Jornadas Laborales'],
      [`Período: ${startDate} a ${endDate}`],
      [`Tipo: ${periodType === 'day' ? 'Día' : periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : periodType === 'quarter' ? 'Trimestre' : 'Año'}`],
      [],
      ['Número', 'Empleado', 'Horas Trabajadas', 'Días Trabajados', 'Horas Planificadas', 'Diferencia Horas', 'Incidencias', 'Ausencias']
    ];

    reportData.forEach(item => {
      worksheetData.push([
        item.employeeNumber,
        item.employeeName,
        `${item.hoursWorked}h ${item.minutesWorked}m`,
        item.daysWorked,
        `${item.hoursPlanned}h ${item.minutesPlanned}m`,
        `${item.hoursDifference >= 0 ? '+' : ''}${item.hoursDifference}h ${item.minutesDifference}m`,
        item.incidents.length,
        item.absences
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Informe');
    
    XLSX.writeFile(workbook, `informe-${periodType}-${startDate}-${endDate}.xlsx`);
  };

  const totalHoursWorked = reportData?.reduce((sum, item) => sum + item.hoursWorked * 60 + item.minutesWorked, 0) || 0;
  const totalHoursPlanned = reportData?.reduce((sum, item) => sum + item.hoursPlanned * 60 + item.minutesPlanned, 0) || 0;
  const totalIncidents = reportData?.reduce((sum, item) => sum + item.incidents.length, 0) || 0;
  const totalAbsences = reportData?.reduce((sum, item) => sum + item.absences, 0) || 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Informes por Período</h2>
        <p className="text-muted-foreground">
          Análisis detallado de jornadas laborales por día, semana, mes, trimestre o año
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
              <label className="text-sm font-medium mb-2 block">Tipo de Período</label>
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
              <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
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
              <label className="text-sm font-medium mb-2 block">Departamento</label>
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
              onClick={exportToPDF}
              disabled={!reportData || reportData.length === 0}
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
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
                <p className="text-sm font-medium text-muted-foreground">Horas Trabajadas</p>
                <p className="text-2xl font-bold" data-testid="total-hours-worked">
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
                <p className="text-sm font-medium text-muted-foreground">Horas Planificadas</p>
                <p className="text-2xl font-bold" data-testid="total-hours-planned">
                  {Math.floor(totalHoursPlanned / 60)}h {totalHoursPlanned % 60}m
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
                <p className="text-sm font-medium text-muted-foreground">Incidencias</p>
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
                <p className="text-sm font-medium text-muted-foreground">Ausencias</p>
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
              <p className="text-muted-foreground">No hay datos para mostrar en este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nº</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Empleado</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Período</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horas Trabajadas</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Días Trabajados</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Horas Planificadas</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Diferencia</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Incidencias</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ausencias</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => {
                    const diffIsPositive = (item.hoursDifference * 60 + item.minutesDifference) >= 0;
                    
                    return (
                      <tr 
                        key={item.employeeId} 
                        className="border-b border-border hover-elevate"
                        data-testid={`report-row-${index}`}
                      >
                        <td className="py-3 px-4 text-foreground">{item.employeeNumber}</td>
                        <td className="py-3 px-4 text-foreground">{item.employeeName}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {periodType === 'day' ? 'Día' : periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : periodType === 'quarter' ? 'Trimestre' : 'Año'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.hoursWorked}h {item.minutesWorked}m
                        </td>
                        <td className="py-3 px-4 text-foreground">{item.daysWorked}</td>
                        <td className="py-3 px-4 text-foreground">
                          {item.hoursPlanned}h {item.minutesPlanned}m
                        </td>
                        <td className="py-3 px-4">
                          <span className={diffIsPositive ? 'text-green-600' : 'text-red-600'}>
                            {diffIsPositive ? '+' : ''}{item.hoursDifference}h {item.minutesDifference}m
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {item.incidents.length > 0 ? (
                            <Badge variant="destructive">{item.incidents.length}</Badge>
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
