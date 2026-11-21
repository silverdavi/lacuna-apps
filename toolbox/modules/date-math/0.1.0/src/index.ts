// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/date-math 0.1.0: snapshot of lacuna-components dateMath at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export interface DiffResult {
  years: number;
  months: number;
  days: number;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInMonth));
  return result;
}

export function diff(a: Date, b: Date): DiffResult {
  if (b < a) {
    const swapped = diff(b, a);
    return { years: swapped.years, months: swapped.months, days: swapped.days };
  }
  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();
  while (days < 0) {
    months -= 1;
    const anchorMonth = (a.getMonth() + months) % 12;
    days += new Date(a.getFullYear(), anchorMonth, 0).getDate();
  }
  while (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export function startOfDay(date: Date): Date {
  const result = new Date(date.getTime());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date.getTime());
  result.setHours(23, 59, 59, 999);
  return result;
}

export function startOfWeek(date: Date, firstDay: 0 | 1 = 0): Date {
  const result = startOfDay(date);
  const currentDay = result.getDay();
  const offset = (currentDay - firstDay + 7) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

export function endOfWeek(date: Date, firstDay: 0 | 1 = 0): Date {
  return endOfDay(addDays(startOfWeek(date, firstDay), 6));
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date.getTime());
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfMonth(date: Date): Date {
  const result = new Date(date.getTime());
  result.setDate(new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate());
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isoWeek(date: Date): number {
  const result = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(result.getUTCFullYear(), 0, 1));
  return Math.ceil(((result.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function age(birth: Date, reference: Date = new Date()): number {
  let years = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

export function relativeTime(date: Date, reference: Date = new Date()): string {
  const ms = reference.getTime() - date.getTime();
  const abs = Math.abs(ms);
  const prefix = ms >= 0 ? '' : 'in ';
  const suffix = ms >= 0 ? ' ago' : '';

  const seconds = Math.floor(abs / 1000);
  if (seconds < 60) return `${prefix}${seconds} second${seconds === 1 ? '' : 's'}${suffix}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${prefix}${minutes} minute${minutes === 1 ? '' : 's'}${suffix}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${prefix}${hours} hour${hours === 1 ? '' : 's'}${suffix}`;
  const totalDays = Math.floor(hours / 24);
  if (totalDays < 30) return `${prefix}${totalDays} day${totalDays === 1 ? '' : 's'}${suffix}`;
  const totalMonths = Math.floor(totalDays / 30);
  if (totalMonths < 12) return `${prefix}${totalMonths} month${totalMonths === 1 ? '' : 's'}${suffix}`;
  const totalYears = Math.floor(totalDays / 365);
  return `${prefix}${totalYears} year${totalYears === 1 ? '' : 's'}${suffix}`;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return null;
  return new Date(year, month - 1, day);
}
