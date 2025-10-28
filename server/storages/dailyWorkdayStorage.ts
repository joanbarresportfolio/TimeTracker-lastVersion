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
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Madrid";

/**
 * DAILY WORKDAY STORAGE MODULE
 * ============================
 *
 * Módulo de almacenamiento para operaciones relacionadas con jornadas diarias.
 */
export async function getDailyWorkdaysLastWeek(): Promise<DailyWorkday[]> {
  const startDate = format(startOfWeek(new Date()), "yyyy-MM-dd");
  const endDate = format(endOfWeek(new Date()), "yyyy-MM-dd");

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
    status: wd.status,
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
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (hora española)
  endTime: string;
  startBreak?: string;
  endBreak?: string;
}): Promise<DailyWorkday> {
  // 🔥 1. Eliminar clock entries anteriores de ese usuario y fecha
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

  // --- 2. Insertar o actualizar dailyWorkday ---
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

  // --- 3. Crear clock entries en hora española ---
  // Convertir las horas locales españolas a timestamps UTC
  const clockInTimestamp = toZonedTime(
    new Date(`${data.date}T${data.startTime}:00`),
    TIMEZONE
  );
  const clockOutTimestamp = toZonedTime(
    new Date(`${data.date}T${data.endTime}:00`),
    TIMEZONE
  );

  const entriesToInsert = [
    {
      idUser: data.userId,
      idDailyWorkday: workday.id,
      entryType: "clock_in",
      timestamp: clockInTimestamp,
      source: "web",
    },
    ...(data.startBreak && data.endBreak
      ? [
          {
            idUser: data.userId,
            idDailyWorkday: workday.id,
            entryType: "break_start",
            timestamp: toZonedTime(
              new Date(`${data.date}T${data.startBreak}:00`),
              TIMEZONE
            ),
            source: "web",
          },
          {
            idUser: data.userId,
            idDailyWorkday: workday.id,
            entryType: "break_end",
            timestamp: toZonedTime(
              new Date(`${data.date}T${data.endBreak}:00`),
              TIMEZONE
            ),
            source: "web",
          },
        ]
      : []),
    {
      idUser: data.userId,
      idDailyWorkday: workday.id,
      entryType: "clock_out",
      timestamp: clockOutTimestamp,
      source: "web",
    },
  ];

  await db.insert(clockEntries).values(entriesToInsert);

  return workday;
}

export async function deleteClockEntriesByDailyWorkday(
  dailyWorkdayId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(clockEntries)
    .where(eq(clockEntries.idDailyWorkday, dailyWorkdayId));
  return !deleted;
}

export async function deleteDailyWorkday(id: string): Promise<boolean> {
  await deleteIncidentsByDailyWorkday(id);

  const deleted = await db
    .delete(dailyWorkday)
    .where(eq(dailyWorkday.id, id))
    .returning();

  return !deleted;
}
