import { useState, useMemo } from 'react'
import { Input } from '../../../shared/components'
import './WeekSelector.css'

export interface WeekSelectorProps {
  value: string | null
  onChange: (weekStart: string) => void
}

/**
 * Get next Monday from today
 */
function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 1 : 8 - day // If Sunday, next day is Monday; otherwise days until next Monday
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + diff)
  return formatDate(nextMonday)
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
 * Check if date is a Monday
 */
function isMonday(date: Date): boolean {
  return date.getDay() === 1
}

/**
 * Get week range string (e.g., "Jan 6 - Jan 12, 2026")
 */
function getWeekRange(weekStart: string): string {
  const start = parseDate(weekStart)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  const startStr = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const endStr = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return `${startStr} - ${endStr}`
}

/**
 * Navigate to previous week (Monday)
 */
function getPreviousWeek(weekStart: string): string {
  const date = parseDate(weekStart)
  date.setDate(date.getDate() - 7)
  return formatDate(date)
}

/**
 * Navigate to next week (Monday)
 */
function getNextWeek(weekStart: string): string {
  const date = parseDate(weekStart)
  date.setDate(date.getDate() + 7)
  return formatDate(date)
}

export function WeekSelector({ value, onChange }: WeekSelectorProps) {
  const [inputValue, setInputValue] = useState(value || getNextMonday())
  const weekStart = value || getNextMonday()

  const weekRange = useMemo(() => getWeekRange(weekStart), [weekStart])

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (newValue) {
      const date = parseDate(newValue)
      if (isMonday(date)) {
        onChange(newValue)
      } else {
        // Find previous Monday
        const day = date.getDay()
        const daysToMonday = day === 0 ? 6 : day - 1
        const monday = new Date(date)
        monday.setDate(date.getDate() - daysToMonday)
        const mondayStr = formatDate(monday)
        setInputValue(mondayStr)
        onChange(mondayStr)
      }
    }
  }

  const handlePreviousWeek = () => {
    const prevWeek = getPreviousWeek(weekStart)
    setInputValue(prevWeek)
    onChange(prevWeek)
  }

  const handleNextWeek = () => {
    const nextWeek = getNextWeek(weekStart)
    setInputValue(nextWeek)
    onChange(nextWeek)
  }

  return (
    <div className="week-selector">
      <div className="week-selector-controls">
        <button
          type="button"
          className="week-selector-nav"
          onClick={handlePreviousWeek}
          aria-label="Previous week"
        >
          ←
        </button>
        <div className="week-selector-display">
          <Input
            type="date"
            value={inputValue}
            onChange={handleDateChange}
            className="week-selector-input"
          />
          <span className="week-selector-range">{weekRange}</span>
        </div>
        <button
          type="button"
          className="week-selector-nav"
          onClick={handleNextWeek}
          aria-label="Next week"
        >
          →
        </button>
      </div>
    </div>
  )
}

