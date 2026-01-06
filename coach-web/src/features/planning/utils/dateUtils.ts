/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD to Date
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Get next Monday from today
 */
export function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + diff)
  return formatDate(nextMonday)
}

