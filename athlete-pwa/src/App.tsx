import { useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [weekSessions, setWeekSessions] = useState<WeekSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<TrainingSession | null>(
    null,
  )
  const [logForm, setLogForm] = useState<LogFormState>({
    rpe: '',
    notes: '',
    durationMinutes: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/today')
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchToday = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await apiFetch<TrainingSession[]>('/api/athlete/today')
        if (!isMounted) return
        const sorted = [...data].sort((a, b) => {
          const aTime = new Date(a.createdAt ?? a.date).getTime()
          const bTime = new Date(b.createdAt ?? b.date).getTime()
          return aTime - bTime
        })
        setSessions(sorted)
      } catch (err) {
        if (!isMounted) return
        setError(
          err instanceof Error ? err.message : 'Failed to load sessions',
        )
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }

    fetchToday()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchWeekSessions = async () => {
      try {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const dayOfWeek = today.getDay()
        const monday = new Date(today)
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        const fromStr = monday.toISOString().split('T')[0]
        const toStr = sunday.toISOString().split('T')[0]
        const todayStr = today.toISOString().split('T')[0]

        const data = await apiFetch<WeekSession[]>(
          `/api/athlete/sessions?from=${fromStr}&to=${toStr}`,
        )
        if (!isMounted) return

        // Filter out today's sessions and completed/missed sessions
        const remaining = data.filter(
          (session) =>
            session.date !== todayStr &&
            session.status !== 'COMPLETED' &&
            session.status !== 'MISSED',
        )
        setWeekSessions(remaining)
      } catch (err) {
        if (!isMounted) return
        // Silently fail for week overview - don't show error
        console.error('Failed to load week sessions:', err)
      }
    }

    fetchWeekSessions()

    return () => {
      isMounted = false
    }
  }, [])

  const todayLabel = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  const markStatus = async (sessionId: string, status: SessionStatus) => {
    setSubmitting(true)
    setError(null)

    try {
      await apiFetch(`/api/athlete/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status } : session,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setSubmitting(false)
    }
  }

  const openLog = (session: TrainingSession) => {
    setActiveSession(session)
    setLogForm({
      rpe: '',
      notes: '',
      durationMinutes: '',
    })
  }

  const closeLog = () => {
    if (submitting) return
    setActiveSession(null)
  }

  const submitLog = async () => {
    if (!activeSession) return
    setSubmitting(true)
    setError(null)

    try {
      const summary =
        activeSession.type === 'STRENGTH'
          ? buildStrengthSummary(logForm)
          : buildEnduranceSummary(logForm)

      await apiFetch(`/api/athlete/sessions/${activeSession.id}/log`, {
        method: 'POST',
        body: JSON.stringify({ summary }),
      })

      await apiFetch(`/api/athlete/sessions/${activeSession.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      })

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? { ...session, status: 'COMPLETED', hasLog: true }
            : session,
        ),
      )
      setActiveSession(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app">
      <header className="today-header">
        <p className="today-label">Today</p>
        <h1 className="today-date">{todayLabel}</h1>
        <p className="today-subtitle">Stay on track. One session at a time.</p>
      </header>

      <section className="today-content">
        {loading && <div className="card">Loading sessions...</div>}
        {!loading && error && <div className="card error">{error}</div>}
        {!loading && !error && sessions.length === 0 && (
          <div className="card empty">No sessions planned for today.</div>
        )}
        {!loading &&
          !error &&
          sessions.map((session) => (
            <div className="session-card" key={session.id}>
              <div className="session-top">
                <div>
                  <h2 className="session-title">{session.title}</h2>
                  <p className="session-prescription">
                    {summarizePrescription(session)}
                  </p>
                </div>
                <span className={`chip chip-${session.type.toLowerCase()}`}>
                  {session.type}
                </span>
              </div>
              <div className="session-meta">
                <span className={`status status-${session.status.toLowerCase()}`}>
                  {session.status}
                </span>
                {session.hasLog && <span className="status logged">LOGGED</span>}
              </div>
              <div className="session-actions">
                <button
                  className="btn primary"
                  onClick={() => markStatus(session.id, 'COMPLETED')}
                  disabled={submitting}
                >
                  Mark Completed
                </button>
                <button
                  className="btn ghost"
                  onClick={() => markStatus(session.id, 'MISSED')}
                  disabled={submitting}
                >
                  Mark Missed
                </button>
                <button
                  className="btn ghost"
                  onClick={() => openLog(session)}
                  disabled={submitting}
                >
                  Log
                </button>
              </div>
            </div>
          ))}
      </section>

      {weekSessions.length > 0 && (
        <section className="week-overview">
          <h2 className="week-overview-title">This Week</h2>
          <ul className="week-sessions-list">
            {weekSessions.map((session) => (
              <li key={session.id} className="week-session-item">
                {session.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSession && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="modal-title">Log Session</p>
                <h3>{activeSession.title}</h3>
                <p className="modal-subtitle">{activeSession.type}</p>
              </div>
              <button
                className="btn icon"
                onClick={closeLog}
                disabled={submitting}
                aria-label="Close log"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {activeSession.type === 'ENDURANCE' && (
                <label className="field">
                  <span>Duration (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    value={logForm.durationMinutes}
                    onChange={(event) =>
                      setLogForm((prev) => ({
                        ...prev,
                        durationMinutes: event.target.value,
                      }))
                    }
                    placeholder="30"
                  />
                </label>
              )}
              <label className="field">
                <span>RPE (1-10)</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={logForm.rpe}
                  onChange={(event) =>
                    setLogForm((prev) => ({
                      ...prev,
                      rpe: event.target.value,
                    }))
                  }
                  placeholder="7"
                />
              </label>
              <label className="field">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={logForm.notes}
                  onChange={(event) =>
                    setLogForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional notes"
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="btn ghost"
                onClick={closeLog}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={submitLog}
                disabled={submitting}
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

type SessionType = 'STRENGTH' | 'ENDURANCE'
type SessionStatus = 'PLANNED' | 'COMPLETED' | 'MISSED' | 'MODIFIED'

interface TrainingSession {
  id: string
  date: string
  createdAt?: string
  title: string
  type: SessionType
  status: SessionStatus
  prescription: Record<string, unknown>
  hasLog?: boolean
}

interface WeekSession {
  id: string
  date: string
  title: string
  type: SessionType
  status: SessionStatus
  completedAt?: string | null
  hasLog?: boolean
}

interface LogFormState {
  rpe: string
  notes: string
  durationMinutes: string
}

interface ApiErrorPayload {
  message?: string
}

const AUTH_TOKEN_KEYS = ['authToken', 'accessToken', 'token']

function getAuthToken() {
  for (const key of AUTH_TOKEN_KEYS) {
    const token = localStorage.getItem(key)
    if (token) return token
  }
  return null
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(path, { ...options, headers })
  if (!response.ok) {
    let payload: ApiErrorPayload | null = null
    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch (err) {
      payload = null
    }
    throw new Error(payload?.message ?? 'Request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function summarizePrescription(session: TrainingSession) {
  const prescription = session.prescription ?? {}
  if (session.type === 'STRENGTH') {
    const items = Array.isArray(prescription.items) ? prescription.items : []
    if (items.length === 0) return 'Strength work'
    const first = items[0] as {
      exerciseNameSnapshot?: string
      sets?: number
      reps?: number
    }
    const title = first.exerciseNameSnapshot ?? 'Strength work'
    const details =
      first.sets && first.reps ? `${first.sets}x${first.reps}` : 'Work sets'
    const remaining = items.length > 1 ? ` • ${items.length - 1} more` : ''
    return `${title} ${details}${remaining}`
  }

  const modality = String(prescription.modality ?? 'ENDURANCE')
  const intervals = Array.isArray(prescription.intervals)
    ? prescription.intervals
    : []
  if (intervals.length > 0) {
    const totalSeconds = intervals.reduce((sum, interval) => {
      const duration = Number((interval as { durationSeconds?: number }).durationSeconds)
      return sum + (Number.isNaN(duration) ? 0 : duration)
    }, 0)
    const totalMinutes = totalSeconds > 0 ? Math.round(totalSeconds / 60) : null
    return totalMinutes
      ? `${modality} • ${totalMinutes} min intervals`
      : `${modality} • ${intervals.length} intervals`
  }

  return `${modality} session`
}

function buildStrengthSummary(form: LogFormState) {
  return {
    completed: true,
    rpe: form.rpe ? Number(form.rpe) : undefined,
    notes: form.notes || undefined,
  }
}

function buildEnduranceSummary(form: LogFormState) {
  return {
    durationSeconds: form.durationMinutes
      ? Math.round(Number(form.durationMinutes) * 60)
      : undefined,
    rpe: form.rpe ? Number(form.rpe) : undefined,
    notes: form.notes || undefined,
  }
}
