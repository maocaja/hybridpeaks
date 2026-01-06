import { useState } from 'react'
import type { WeeklyPlanSession } from '../hooks/useWeeklyPlan'
import './SessionCard.css'

export interface SessionCardProps {
  session: WeeklyPlanSession
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

/**
 * Extract key details from session prescription for display
 */
function getSessionDetails(session: WeeklyPlanSession): {
  summary: string
  type: 'STRENGTH' | 'ENDURANCE'
} {
  if (session.type === 'STRENGTH') {
    const prescription = session.prescription as {
      exercises?: Array<{ name?: string; sets?: number }>
    }
    const exercises = prescription?.exercises || []
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0)
    return {
      summary: `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}, ${totalSets} sets`,
      type: 'STRENGTH',
    }
  } else {
    // ENDURANCE
    const prescription = session.prescription as {
      sport?: string
      durationMinutes?: number
      steps?: Array<{ durationSeconds?: number }>
    }
    const duration = prescription?.durationMinutes || 0
    return {
      summary: `${duration} min`,
      type: 'ENDURANCE',
    }
  }
}

export function SessionCard({ session, onClick, onEdit, onDelete }: SessionCardProps) {
  const details = getSessionDetails(session)
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`session-card session-card-${details.type.toLowerCase()}`}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="session-card-header">
        <span className={`session-card-badge session-card-badge-${details.type.toLowerCase()}`}>
          {details.type}
        </span>
        {showActions && (onEdit || onDelete) && (
          <div className="session-card-actions" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                type="button"
                className="session-card-action"
                onClick={onEdit}
                aria-label="Edit session"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="session-card-action session-card-action-delete"
                onClick={onDelete}
                aria-label="Delete session"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
      <div className="session-card-title">{session.title}</div>
      <div className="session-card-details">{details.summary}</div>
    </div>
  )
}

