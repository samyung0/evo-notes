export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** 6×7 grid of dates (Mon-first) covering the month containing `d`. */
export function monthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const weekday = (first.getDay() + 6) % 7; // Mon = 0
  const start = new Date(first);
  start.setDate(first.getDate() - weekday);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/** Mon-first week containing `d`. */
export function weekDays(d: Date): Date[] {
  const weekday = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - weekday);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function hourOf(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

/** "1 AM", "12 PM" — bare-hour label for the time gutter. */
export function fmtHour(h: number): string {
  const ap = h % 24 < 12 ? 'AM' : 'PM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${ap}`;
}

/** Midnight of the given date — strips the time component. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
