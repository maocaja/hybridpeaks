import { useMemo } from 'react'
import type { WeeklyPlanSession } from '../hooks/useWeeklyPlan'
import { SessionCard } from './SessionCard'
import './WeeklyCalendar.css'

export interface WeeklyCalendarProps {
  weekStart: string // YYYY-MM-DD (Monday)
  sessions: WeeklyPlanSession[]
  onSessionClick?: (session: WeeklyPlanSession) => void
  onSessionEdit?: (session: WeeklyPlanSession) => void
  onSessionDelete?: (session: WeeklyPlanSession) => void
  onDayClick?: (date: string) => void
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse YYYY-MM-DD to Date
 */
function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Get all dates in week (Monday-Sunday)
 */
function getWeekDates(weekStart: string): string[] {
  const start = parseDate(weekStart)
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(formatDate(date))
  }
  return dates
}

/**
 * Get day name (Mon, Tue, etc.)
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Get day number (1, 2, etc.)
 */
function getDayNumber(date: Date): number {
  return date.getDate()
}

/**
 * Group sessions by date
 */
function groupSessionsByDate(sessions: WeeklyPlanSession[]): Record<string, WeeklyPlanSession[]> {
  return sessions.reduce((acc, session) => {
    const date = session.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(session)
    return acc
  }, {} as Record<string, WeeklyPlanSession[]>)
}

export function WeeklyCalendar({
  weekStart,
  sessions,
  onSessionClick,
  onSessionEdit,
  onSessionDelete,
  onDayClick,
}: WeeklyCalendarProps) {
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const sessionsByDate = useMemo(() => groupSessionsByDate(sessions), [sessions])

  return (
    <div className="weekly-calendar">
      <div className="weekly-calendar-grid">
        {weekDates.map((date) => {
          const dateObj = parseDate(date)
          const daySessions = sessionsByDate[date] || []
          const isToday = formatDate(new Date()) === date

          return (
            <div
              key={date}
              className={`weekly-calendar-day ${isToday ? 'weekly-calendar-day-today' : ''}`}
            >
              <div className="weekly-calendar-day-header">
                <div className="weekly-calendar-day-name">{getDayName(dateObj)}</div>
                <div className={`weekly-calendar-day-number ${isToday ? 'weekly-calendar-day-number-today' : ''}`}>
                  {getDayNumber(dateObj)}
                </div>
              </div>
              <div className="weekly-calendar-day-sessions">
                {daySessions.length === 0 ? (
                  <button
                    type="button"
                    className="weekly-calendar-add-session"
                    onClick={() => onDayClick?.(date)}
                    aria-label={`Add session on ${date}`}
                  >
                    + Add Session
                  </button>
                ) : (
                  <>
                    {daySessions.map((session) => (
                      <SessionCard
                        key={session.id || `${session.date}-${session.type}-${session.title}`}
                        session={session}
                        onClick={() => onSessionClick?.(session)}
                        onEdit={() => onSessionEdit?.(session)}
                        onDelete={() => onSessionDelete?.(session)}
                      />
                    ))}
                    <button
                      type="button"
                      className="weekly-calendar-add-session"
                      onClick={() => onDayClick?.(date)}
                      aria-label={`Add another session on ${date}`}
                    >
                      + Add Session
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

