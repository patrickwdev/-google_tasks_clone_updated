import {
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  getDay,
  format,
} from 'date-fns';

/** Sunday = 0, Monday = 1, ... Saturday = 6 */
const MONDAY = 1;
const THURSDAY = 4;

export interface Holiday {
  date: Date;
  name: string;
}

/**
 * Get the nth occurrence of a weekday in a month (1-based).
 * E.g. 3rd Monday of January for year 2026.
 */
function nthWeekdayInMonth(year: number, month: number, weekday: number, n: number): Date {
  let d = startOfMonth(new Date(year, month, 1));
  let count = 0;
  while (count < n) {
    if (getDay(d) === weekday) count++;
    if (count < n) d = addDays(d, 1);
  }
  return d;
}

/**
 * Get the last occurrence of a weekday in a month.
 */
function lastWeekdayInMonth(year: number, month: number, weekday: number): Date {
  let d = endOfMonth(new Date(year, month, 1));
  while (getDay(d) !== weekday) {
    d = subDays(d, 1);
  }
  return d;
}

/**
 * US federal holidays for a given year.
 * Returns array of { date, name } for quick lookup and display.
 */
export function getHolidaysForYear(year: number): Holiday[] {
  const y = year;
  const holidays: Holiday[] = [];

  // New Year's Day - Jan 1
  holidays.push({ date: new Date(y, 0, 1), name: "New Year's Day" });

  // Martin Luther King Jr. Day - 3rd Monday of January
  holidays.push({
    date: nthWeekdayInMonth(y, 0, MONDAY, 3),
    name: "Martin Luther King Jr. Day",
  });

  // Presidents' Day - 3rd Monday of February
  holidays.push({
    date: nthWeekdayInMonth(y, 1, MONDAY, 3),
    name: "Presidents' Day",
  });

  // Memorial Day - last Monday of May
  holidays.push({
    date: lastWeekdayInMonth(y, 4, MONDAY),
    name: "Memorial Day",
  });

  // Juneteenth - June 19
  holidays.push({ date: new Date(y, 5, 19), name: "Juneteenth" });

  // Independence Day - July 4
  holidays.push({ date: new Date(y, 6, 4), name: "Independence Day" });

  // Labor Day - 1st Monday of September
  holidays.push({
    date: nthWeekdayInMonth(y, 8, MONDAY, 1),
    name: "Labor Day",
  });

  // Columbus Day - 2nd Monday of October
  holidays.push({
    date: nthWeekdayInMonth(y, 9, MONDAY, 2),
    name: "Columbus Day",
  });

  // Veterans Day - November 11
  holidays.push({ date: new Date(y, 10, 11), name: "Veterans Day" });

  // Thanksgiving - 4th Thursday of November
  holidays.push({
    date: nthWeekdayInMonth(y, 10, THURSDAY, 4),
    name: "Thanksgiving",
  });

  // Christmas - December 25
  holidays.push({ date: new Date(y, 11, 25), name: "Christmas Day" });

  return holidays;
}

const DATE_KEY = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Build a map of date string (yyyy-MM-dd) -> holiday name for fast lookup.
 * Covers viewMonth's year (and adjacent year if grid spills into Jan/Dec).
 */
export function getHolidayMapForMonth(viewMonth: Date): Map<string, string> {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const map = new Map<string, string>();

  const years = month === 0 ? [year - 1, year] : month === 11 ? [year, year + 1] : [year];
  for (const y of years) {
    for (const h of getHolidaysForYear(y)) {
      map.set(DATE_KEY(h.date), h.name);
    }
  }
  return map;
}

/** Get holiday name for a date, or null if not a holiday. */
export function getHolidayName(date: Date, holidayMap: Map<string, string>): string | null {
  return holidayMap.get(DATE_KEY(date)) ?? null;
}

/** Check if a date is a holiday. */
export function isHoliday(date: Date, holidayMap: Map<string, string>): boolean {
  return holidayMap.has(DATE_KEY(date));
}
