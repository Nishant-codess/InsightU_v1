/**
 * Vacation Predictor Service
 * Requirements: 23.1, 23.2, 23.3, 23.6
 */

export interface CalendarDay {
  date: Date;
  dayOrder: number | null; // null = Holiday
  name?: string | null;
  isActive: boolean;
  isCancelled: boolean;
}

/**
 * Counts the number of working days (non-holiday, active, non-cancelled days)
 * within [startDate, endDate] inclusive, based on the provided calendar.
 * Requirement 23.1: excludes holidays from the Academic_Calendar within the date range.
 */
export function countWorkingDays(
  startDate: Date,
  endDate: Date,
  calendar: CalendarDay[]
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  for (const day of calendar) {
    const d = new Date(day.date);
    d.setHours(0, 0, 0, 0);

    if (d >= start && d <= end) {
      // A working day: has a dayOrder (not a holiday), is active, and not cancelled
      if (day.dayOrder !== null && day.isActive && !day.isCancelled) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Computes a Survival Risk Score on a scale of 0–10.
 * Higher score = greater risk to academic standing.
 * Monotonically non-increasing as attendance increases (Property 92).
 * Requirement 23.3
 *
 * Formula: score = clamp(round((75 - projectedAttendance) / 5 + 5), 0, 10)
 * - At 75% attendance → score = 5
 * - At 100% attendance → score = 0
 * - At 50% attendance → score = 10
 */
export function computeRiskScore(projectedAttendance: number): number {
  const raw = (75 - projectedAttendance) / 5 + 5;
  return Math.round(Math.max(0, Math.min(10, raw)));
}
