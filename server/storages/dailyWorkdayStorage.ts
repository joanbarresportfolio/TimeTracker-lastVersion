import {
  type DailyWorkday,
  dailyWorkday,
  clockEntries,
  schedules,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { deleteIncidentsByDailyWorkday } from "./incidentStorage";
import { fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Madrid";

/**
 * DAILY WORKDAY STORAGE MODULE
 * ============================
 *
 * Módulo de almacenamiento para operaciones relacionadas con jornadas diarias.
 */
export async function getDailyWorkdaysLastWeek(): Promise<DailyWorkday[]> {
  // Obtener fechas de inicio y fin de la semana actual
  const startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
  const endDate = format(endOfWeek(new Date()), "yyyy-MM-dd");

  // Selecciona los registros dentro del rango de fechas
  const workdays = await db
    .select()
    .from(dailyWorkday)
    .where(
      sql`${dailyWorkday.date} >= ${startDate} AND ${dailyWorkday.date} <= ${endDate}`,
    );

  return workdays.map((wd) => ({
    id: wd.id,
    idUser: wd.idUser,
    date: wd.date,
    workedMinutes: wd.workedMinutes,
    breakMinutes: wd.breakMinutes,
    overtimeMinutes: wd.overtimeMinutes,
    status: wd.status, // 'closed' o 'open'
  }));
}

export async function getDailyWorkdayById(
  id: string,
): Promise<DailyWorkday | undefined> {
  const [workday] = await db
    .select()
    .from(dailyWorkday)
    .where(eq(dailyWorkday.id, id));
  return workday;
}

/**
 * OBTENER JORNADA LABORAL POR EMPLEADO Y FECHA
 */
export async function getDailyWorkdayByUserAndDate(
  UserId: string,
  date: string,
): Promise<DailyWorkday | undefined> {
  const [workday] = await db
    .select()
    .from(dailyWorkday)
    .where(and(eq(dailyWorkday.idUser, UserId), eq(dailyWorkday.date, date)));
  return workday;
}

/**
 * OBTENER JORNADAS LABORALES POR EMPLEADO Y RANGO
 */
export async function getDailyWorkdaysByUserAndRange(
  UserId: string,
  startDate: string,
  endDate: string,
): Promise<DailyWorkday[]> {
  return await db
    .select()
    .from(dailyWorkday)
    .where(
      and(
        eq(dailyWorkday.idUser, UserId),
        sql`${dailyWorkday.date} >= ${startDate} AND ${dailyWorkday.date} <= ${endDate}`,
      ),
    );
}

export async function getDailyWorkdays(): Promise<DailyWorkday[]> {
  return await db.select().from(dailyWorkday);
}

export async function createManualDailyWorkday(data: {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  startBreak?: string;
  endBreak?: string;
}): Promise<DailyWorkday> {
  // 🔥 1. Eliminar clock entries anteriores de ese usuario y fecha (usando timezone española)
  await db.execute(sql`
    DELETE FROM clock_entries
    WHERE id_user = ${data.userId}
    AND DATE(timestamp AT TIME ZONE 'Europe/Madrid') = ${data.date}
  `);

  // --- Calcular minutos trabajados ---
  const [startHour, startMin] = data.startTime.split(":").map(Number);
  const [endHour, endMin] = data.endTime.split(":").map(Number);
  const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

  // --- Calcular minutos de pausa ---
  let breakMinutes = 0;
  if (data.startBreak && data.endBreak) {
    const [breakStartHour, breakStartMin] = data.startBreak
      .split(":")
      .map(Number);
    const [breakEndHour, breakEndMin] = data.endBreak.split(":").map(Number);
    breakMinutes =
      breakEndHour * 60 + breakEndMin - (breakStartHour * 60 + breakStartMin);
  }

  const workedMinutes = totalMinutes - breakMinutes;

  // --- 2. Insertar o actualizar jornada laboral ---
  const [workday] = await db
    .insert(dailyWorkday)
    .values({
      idUser: data.userId,
      date: data.date,
      workedMinutes,
      breakMinutes,
      overtimeMinutes: 0,
      status: "closed",
    })
    .onConflictDoUpdate({
      target: [dailyWorkday.idUser, dailyWorkday.date],
      set: {
        workedMinutes,
        breakMinutes,
        overtimeMinutes: 0,
        status: "closed",
      },
    })
    .returning();

  // --- 3. Crear clock entries en UTC (interpretando las horas como hora española) ---
  // Cuando el admin introduce 9:00, debe interpretarse como 9:00 hora española
  // Usar fromZonedTime (v3) para convertir correctamente hora española a UTC
  const parseSpanishTimeToUTC = (dateStr: string, timeStr: string): Date => {
    // Crear string de fecha-hora en formato ISO
    const spanishDateTime = `${dateStr}T${timeStr}:00`;
    // fromZonedTime interpreta la fecha-hora como si estuviera en la zona horaria especificada
    // y devuelve el Date UTC equivalente
    return fromZonedTime(spanishDateTime, TIMEZONE);
  };

  const entriesToInsert = [
    {
      idUser: data.userId,
      idDailyWorkday: workday.id,
      entryType: "clock_in",
      timestamp: parseSpanishTimeToUTC(data.date, data.startTime),
      source: "web",
    },
    ...(data.startBreak && data.endBreak
      ? [
          {
            idUser: data.userId,
            idDailyWorkday: workday.id,
            entryType: "break_start",
            timestamp: parseSpanishTimeToUTC(data.date, data.startBreak),
            source: "web",
          },
          {
            idUser: data.userId,
            idDailyWorkday: workday.id,
            entryType: "break_end",
            timestamp: parseSpanishTimeToUTC(data.date, data.endBreak),
            source: "web",
          },
        ]
      : []),
    {
      idUser: data.userId,
      idDailyWorkday: workday.id,
      entryType: "clock_out",
      timestamp: parseSpanishTimeToUTC(data.date, data.endTime),
      source: "web",
    },
  ];
  
  await db.insert(clockEntries).values(entriesToInsert);

  return workday;
}

// En storage (dailyWorkdayStorage.ts o index.ts)
export async function deleteClockEntriesByDailyWorkday(
  dailyWorkdayId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(clockEntries)
    .where(eq(clockEntries.idDailyWorkday, dailyWorkdayId));
  return !deleted;
}

export async function deleteDailyWorkday(id: string): Promise<boolean> {
  // Primero eliminar las incidencias asociadas
  await deleteIncidentsByDailyWorkday(id);

  // Luego eliminar la jornada laboral
  const deleted = await db
    .delete(dailyWorkday)
    .where(eq(dailyWorkday.id, id))
    .returning();

  return !deleted;
}
