// Utilities for weekly date calculations (Sunday to Sunday, UTC)

/**
 * Get the start of a week (Sunday 00:00:00 UTC) for a given date
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = d.getUTCDay()
  
  // Subtract days to get to Sunday
  d.setUTCDate(d.getUTCDate() - dayOfWeek)
  
  return d
}

/**
 * Get the end of a week (next Sunday 00:00:00 UTC) for a given date
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const weekStart = getWeekStart(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  return weekEnd
}

/**
 * Get the start date for N weeks ago
 */
export function getWeekStartNWeeksAgo(weeksAgo: number): Date {
  const weekStart = getWeekStart()
  const targetDate = new Date(weekStart)
  targetDate.setUTCDate(targetDate.getUTCDate() - (weeksAgo * 7))
  return targetDate
}

/**
 * Get an array of week start dates for the last N weeks
 */
export function getLastNWeeks(n: number): Date[] {
  const weeks: Date[] = []
  for (let i = 0; i < n; i++) {
    weeks.push(getWeekStartNWeeksAgo(i))
  }
  return weeks
}

/**
 * Format a date as YYYY-MM-DD for display
 */
export function formatWeekDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

