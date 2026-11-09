/**
 * Date and Time utilities for HRMS Time & Attendance
 * System documented timezone: UTC (with documented offset indicators)
 */

export const DOCUMENTED_TIMEZONE = 'UTC';

/**
 * Formats a date string (YYYY-MM-DD) avoiding silent local timezone shifting.
 * If date is ISO like 2026-10-06T00:00:00.000Z, extracts the UTC date portion.
 */
export const formatDateOnly = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Formats a timestamp in documented UTC timezone: YYYY-MM-DD HH:mm UTC
 */
export const formatTimestamp = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Formats time only in UTC: HH:mm UTC
 */
export const formatTimeOnly = (dateStr?: string | Date | null): string => {
  if (!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes} UTC`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Formats working duration in minutes to hours and minutes (e.g. 480 -> 8h 00m)
 */
export const formatWorkingDuration = (minutes?: number | null): string => {
  if (minutes === undefined || minutes === null) return '0h 00m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
};
