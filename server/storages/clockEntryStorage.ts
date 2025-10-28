import {
  BreakEntry,
  type ClockEntry,
  TimeEntry,
  clockEntries,
  dailyWorkday,
  schedules,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export async function createClockEntry(
  employeeId: string,
  entryType: string,
  date: string, // YYYY-MM-DD (puede ser vacío si se pasa timestamp)
  source: string,
  providedTimestamp?: Date | string, // Timestamp opcional para precisión
): Promise<ClockEntry> {
  // 🔹 Determinar el timestamp preciso del evento
  let timestamp: Date;

  if (providedTimestamp) {
    // Caso 1: Cliente móvil proporciona timestamp preciso (nueva funcionalidad)
    timestamp = new Date(providedTimestamp);
  } else if (date) {
    // Caso 2: Admin proporciona fecha (comportamiento legacy)
    // Combinar la fecha proporcionada con la hora actual del servidor
    timestamp = dateToTimestamp(date);
  } else {
    // Caso 3: Ni timestamp ni fecha (fallback)
    timestamp = new Date();
  }
  console.log(timestamp)
  // 🔹 Extraer la fecha del timestamp para la lógica de workday
  const eventDate = timestampToDateString(timestamp);

  let workdayId: string | undefined;
  const existingWorkday = await db
    .select()
    .from(dailyWorkday)
    .where(
      sql`${dailyWorkday.idUser} = ${employeeId} AND ${dailyWorkday.date} = ${eventDate}`,
    )
    .limit(1)
    .then((rows) => rows[0]);
  // 🔹 CLOCK IN: crear dailyWorkday nuevo
  if (entryType === "clock_in") {
    if (!existingWorkday) {
      const insertedWorkday = await db
        .insert(dailyWorkday)
        .values({
          idUser: employeeId,
          date: eventDate,
          status: "open",
        })
        .returning();
      workdayId = insertedWorkday[0].id;
    } else {
      workdayId = existingWorkday.id;
    }
  } else {
    if (!existingWorkday) {
      throw new Error(
        `No existe un dailyWorkday para este usuario y fecha: ${eventDate}`,
      );
    }
    workdayId = existingWorkday.id;
  }

  // 🔹 Insertar el clockEntry
  const insertedClockEntry = await db
    .insert(clockEntries)
    .values({
      idUser: employeeId,
      idDailyWorkday: workdayId,
      entryType,
      timestamp,
      source,
    })
    .returning();

  // 🔹 Solo actualizar timeEntry y dailyWorkday si es CLOCK OUT
  if (entryType === "clock_out") {
    // Obtener todos los clockEntries del usuario para esta fecha
    const userClockEntries = await db
      .select()
      .from(clockEntries)
      .where(
        sql`${clockEntries.idUser} = ${employeeId} AND DATE(${clockEntries.timestamp}) = ${eventDate}`,
      )
      .orderBy(clockEntries.timestamp);

    // Generar timeEntries usando clockToTimeEntries
    const timeEntries = clockToTimeEntries(userClockEntries);
    const todayTimeEntry = timeEntries.find((te) => te.date === eventDate);

    // Actualizar dailyWorkday con los minutos calculados
    if (todayTimeEntry) {
      await db
        .update(dailyWorkday)
        .set({
          workedMinutes: Math.round(todayTimeEntry.totalHours * 60),
          breakMinutes: todayTimeEntry.breakMinutes,
          status: "closed"
        })
        .where(sql`${dailyWorkday.id} = ${workdayId}`);
    }
  }

  return insertedClockEntry[0];
}

export async function getClockEntriesByDate(
  date: string,
): Promise<ClockEntry[]> {
  return await db
    .select()
    .from(clockEntries)
    .where(sql`DATE(${clockEntries.timestamp}) = ${date} `)
    .orderBy(clockEntries.timestamp);
}

export async function getClockEntriesUserByRange(
  idUser: string,
  startDate: string,
  endDate: string,
): Promise<ClockEntry[]> {
  return await db
    .select()
    .from(clockEntries)
    .where(
      and(
        sql`DATE(${clockEntries.timestamp}) >= ${startDate}`,
        sql`DATE(${clockEntries.timestamp}) <= ${endDate}`,
        eq(clockEntries.idUser, idUser)
      )
    )
    .orderBy(clockEntries.timestamp);
}

export async function getTimeEntriesByDate(date: string) {
  // 1️⃣ Obtener todos los clock entries del día
  const entries = await getClockEntriesByDate(date);

  const timeEntries = await clockToTimeEntries(entries);

  return timeEntries;
}

export async function getTimeEntriesUserByRange(idUser: string, dateStart: string, dateEnd: string):Promise<TimeEntry[]> {
  // 1️⃣ Obtener todos los clock entries del día
  const entries = await getClockEntriesUserByRange(idUser, dateStart, dateEnd);

  const timeEntries = await clockToTimeEntries(entries);

  return timeEntries;
}

export function clockToTimeEntries(clockEntries: ClockEntry[]): TimeEntry[] {
  // 1️⃣ Agrupar los clock entries por usuario
  const groupedByUser: Record<string, ClockEntry[]> = {};
  for (const entry of clockEntries) {
    if (!groupedByUser[entry.idUser]) {
      groupedByUser[entry.idUser] = [];
    }
    groupedByUser[entry.idUser].push(entry);
  }

  const timeEntries: TimeEntry[] = [];

  // 2️⃣ Procesar cada grupo (usuario)
  for (const [employeeId, userEntries] of Object.entries(groupedByUser)) {
    // Agrupar también por fecha, ya que puede haber varios días
    const groupedByDate: Record<string, ClockEntry[]> = {};

    for (const entry of userEntries) {
      const dateKey = new Date(entry.timestamp).toISOString().split("T")[0]; // YYYY-MM-DD
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(entry);
    }

    // 3️⃣ Crear los timeEntries finales por día
    for (const [date, entriesOfDay] of Object.entries(groupedByDate)) {
      // Ordenar los eventos cronológicamente
      entriesOfDay.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      let clockIn: Date | null = null;
      let clockOut: Date | null = null;
      let breaks: BreakEntry[] = [];
      let currentBreak: BreakEntry | null = null;

      // Procesar los eventos
      for (const entry of entriesOfDay) {
        const timestamp = new Date(entry.timestamp);

        switch (entry.entryType) {
          case "clock_in":
            clockIn = timestamp;
            break;

          case "clock_out":
            clockOut = timestamp;
            break;

          case "break_start":
            currentBreak = { start: timestamp, end: null };
            breaks.push(currentBreak);
            break;

          case "break_end":
            if (currentBreak && !currentBreak.end) {
              currentBreak.end = timestamp;
            }
            break;
        }
      }

      // Calcular tiempos si hay clockIn y clockOut
      // Calcular tiempos si hay clockIn y clockOut
      let totalHours = 0;
      let breakMinutes = 0;

      for (const br of breaks) {
        if (br.start && br.end) {
          breakMinutes += (br.end.getTime() - br.start.getTime()) / (1000 * 60);
        }
      }

      if (clockIn && clockOut) {
        const totalMs = clockOut.getTime() - clockIn.getTime();
        totalHours = (totalMs - breakMinutes * 60 * 1000) / (1000 * 60 * 60);
      }

      // Crear el registro final
      timeEntries.push({
        id: `${employeeId}-${date}`,
        employeeId,
        clockIn: clockIn ?? new Date(date),
        clockOut,
        totalHours: Number(totalHours.toFixed(2)),
        breakMinutes: Math.round(breakMinutes),
        breaks,
        date,
      });
    }
  }

  return timeEntries;
}
//UTIL FUNCTION
export function timestampToDateString(timestamp: string | Date): string {
  const date = new Date(timestamp);
  // Usar UTC para evitar problemas de zona horaria entre cliente y servidor
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Los meses empiezan en 0
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function dateToTimestamp(dateStr: string | Date): Date {
  const now = new Date(); // Hora actual
  let date: Date;

  if (typeof dateStr === "string") {
    const [year, month, day] = dateStr.split("-").map(Number);
    date = new Date(year, month - 1, day); // month-1 porque los meses empiezan en 0
  } else {
    date = new Date(
      dateStr.getFullYear(),
      dateStr.getMonth(),
      dateStr.getDate(),
    );
  }

  // Ajustar la hora a la hora actual
  date.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );

  return date;
}
export async function getTimeEntriesByUserMonth(
  userId: string,
  date: string,
): Promise<TimeEntry[]> {
  // Convertimos la fecha a objeto Date
  const refDate = new Date(date);

  // Calcular rango de inicio y fin del mes
  const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const endOfMonth = new Date(
    refDate.getFullYear(),
    refDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  // 🔹 Obtener todos los clock entries del usuario dentro del rango
  const entries = await db
    .select()
    .from(clockEntries)
    .where(
      sql`${clockEntries.idUser} = ${userId} 
        AND ${clockEntries.timestamp} BETWEEN ${startOfMonth.toISOString()} AND ${endOfMonth.toISOString()}`,
    )
    .orderBy(clockEntries.timestamp);

  // 🔹 Transformar clock entries → time entries
  const timeEntries = clockToTimeEntries(entries);

  return timeEntries;
}
