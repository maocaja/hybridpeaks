import { useState, useEffect, useCallback, useMemo } from 'react'
import './App.css'

interface Athlete {
  id: string
  email: string
  linkedAt: string
}

interface Exercise {
  id: string
  name: string
  type: 'STRENGTH' | 'ENDURANCE'
  modality?: string
  description?: string
}

type SessionType = 'STRENGTH' | 'ENDURANCE'

type TargetLoadType = 'PERCENT_1RM' | 'RPE' | 'ABS'

type Modality = 'GYM' | 'BIKE' | 'RUN' | 'SWIM'

interface WeeklyPlanSession {
  id?: string
  date: string
  type: SessionType
  title: string
  prescription: Record<string, unknown>
}

interface WeeklyPlan {
  id: string
  weekStart: string
  notes?: string | null
  sessions: WeeklyPlanSession[]
}

interface PlanSessionDraft {
  clientId: string
  date: string
  type: SessionType
  title: string
  strengthExerciseId?: string
  strengthExerciseName?: string
  strengthSets?: string
  strengthReps?: string
  strengthTargetLoadType?: TargetLoadType
  strengthTargetValue?: string
  enduranceModality?: Modality
  enduranceDurationMinutes?: string
  enduranceTarget?: string
}

interface SessionErrors {
  date?: string
  title?: string
  strengthExerciseId?: string
  strengthSets?: string
  strengthReps?: string
  strengthTargetLoadType?: string
  strengthTargetValue?: string
  enduranceModality?: string
  enduranceDurationMinutes?: string
  enduranceTarget?: string
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken())
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<'athletes' | 'exercises' | 'plans'>('athletes')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [planAthleteId, setPlanAthleteId] = useState('')
  const [planWeekDate, setPlanWeekDate] = useState('')
  const [planSessions, setPlanSessions] = useState<PlanSessionDraft[]>([])
  const [planErrors, setPlanErrors] = useState<Record<string, SessionErrors>>({})
  const [planId, setPlanId] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planMessage, setPlanMessage] = useState<string | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planBuilderActive, setPlanBuilderActive] = useState(false)
  const [planSuccess, setPlanSuccess] = useState(false)

  const apiFetch = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = getAuthToken()
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const response = await fetch(path, { ...options, headers })
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Request failed')
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json() as Promise<T>
  }, [])

  const fetchAthletes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch<Athlete[]>('/api/coach/athletes')
      setAthletes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load athletes')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  const handleInviteAthlete = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    setInviteToken(null)

    if (!inviteEmail.trim()) {
      setInviteError('Email is required')
      setInviteLoading(false)
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteError('Please enter a valid email address')
      setInviteLoading(false)
      return
    }

    try {
      const response = await apiFetch<{ invitationId: string; token: string }>(
        '/api/coach/athletes/invite',
        {
          method: 'POST',
          body: JSON.stringify({ email: inviteEmail.trim() }),
        },
      )
      setInviteToken(response.token)
      setInviteEmail('')
      // Refresh athletes list
      await fetchAthletes()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const copyTokenToClipboard = async () => {
    if (inviteToken) {
      try {
        await navigator.clipboard.writeText(inviteToken)
        // Optionally show a brief confirmation
        const originalToken = inviteToken
        setInviteToken(null)
        setTimeout(() => {
          setInviteToken(originalToken)
        }, 100)
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = inviteToken
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
          setInviteToken(null)
          setTimeout(() => {
            setInviteToken(inviteToken)
          }, 100)
        } catch (fallbackErr) {
          setInviteError('Failed to copy token. Please copy manually.')
        }
        document.body.removeChild(textArea)
      }
    }
  }

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch<Exercise[]>('/api/exercises')
      setExercises(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exercises')
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'athletes') {
        fetchAthletes()
      } else if (activeTab === 'exercises') {
        fetchExercises()
      } else {
        if (athletes.length === 0) {
          fetchAthletes()
        }
        if (exercises.length === 0) {
          fetchExercises()
        }
      }
    }
  }, [isAuthenticated, activeTab, fetchAthletes, fetchExercises])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Login failed')
      }

      const data = (await response.json()) as {
        accessToken: string
        refreshToken?: string
      }

      localStorage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }

      setIsAuthenticated(true)
      setLoginForm({ email: '', password: '' })
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('authToken')
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setAthletes([])
    setExercises([])
  }

  const startNewPlan = () => {
    setPlanId(null)
    setPlanSessions([])
    setPlanErrors({})
    setPlanMessage(null)
    setPlanError(null)
    setPlanBuilderActive(true)
  }

  const addPlanSession = (type: SessionType) => {
    setPlanSessions((prev) => [
      ...prev,
      {
        clientId: getLocalId(),
        date: planWeekDate,
        type,
        title: '',
        strengthTargetLoadType: type === 'STRENGTH' ? 'PERCENT_1RM' : undefined,
      },
    ])
  }

  const removePlanSession = (clientId: string) => {
    setPlanSessions((prev) => prev.filter((session) => session.clientId !== clientId))
    setPlanErrors((prev) => {
      const next = { ...prev }
      delete next[clientId]
      return next
    })
  }

  const updatePlanSession = (clientId: string, updates: Partial<PlanSessionDraft>) => {
    setPlanSessions((prev) =>
      prev.map((session) =>
        session.clientId === clientId ? { ...session, ...updates } : session,
      ),
    )
  }

  const mapSessionToDraft = (session: WeeklyPlanSession): PlanSessionDraft => {
    if (session.type === 'STRENGTH') {
      const items = Array.isArray(session.prescription?.items)
        ? (session.prescription.items as Array<Record<string, unknown>>)
        : []
      const first = items[0] || {}
      const exerciseId = typeof first.exerciseId === 'string' ? first.exerciseId : ''
      const exerciseName =
        typeof first.exerciseNameSnapshot === 'string'
          ? first.exerciseNameSnapshot
          : exercises.find((exercise) => exercise.id === exerciseId)?.name
      return {
        clientId: session.id ?? getLocalId(),
        date: session.date.split('T')[0],
        type: session.type,
        title: session.title,
        strengthExerciseId: exerciseId,
        strengthExerciseName: exerciseName,
        strengthSets: first.sets ? String(first.sets) : '',
        strengthReps: first.reps ? String(first.reps) : '',
        strengthTargetLoadType: first.targetLoadType as TargetLoadType,
        strengthTargetValue: first.targetValue ? String(first.targetValue) : '',
      }
    }

    const intervals = Array.isArray(session.prescription?.intervals)
      ? (session.prescription.intervals as Array<Record<string, unknown>>)
      : []
    const firstInterval = intervals[0] || {}
    const durationSeconds =
      typeof firstInterval.durationSeconds === 'number'
        ? firstInterval.durationSeconds
        : 0
    const target =
      typeof firstInterval.targetZoneOrValue === 'string'
        ? firstInterval.targetZoneOrValue
        : ''
    return {
      clientId: session.id ?? getLocalId(),
      date: session.date.split('T')[0],
      type: session.type,
      title: session.title,
      enduranceModality: session.prescription?.modality as Modality,
      enduranceDurationMinutes: durationSeconds
        ? String(Math.round(durationSeconds / 60))
        : '',
      enduranceTarget: target,
    }
  }

  const buildSessionPayload = (session: PlanSessionDraft) => {
    if (session.type === 'STRENGTH') {
      const exercise =
        exercises.find((exercise) => exercise.id === session.strengthExerciseId) ??
        null
      return {
        date: session.date,
        type: session.type,
        title: session.title,
        prescription: {
          items: [
            {
              exerciseId: session.strengthExerciseId,
              exerciseNameSnapshot:
                session.strengthExerciseName || exercise?.name || 'Exercise',
              sets: Number(session.strengthSets),
              reps: Number(session.strengthReps),
              targetLoadType: session.strengthTargetLoadType,
              targetValue: Number(session.strengthTargetValue),
            },
          ],
        },
      }
    }

    return {
      date: session.date,
      type: session.type,
      title: session.title,
      prescription: {
        modality: session.enduranceModality,
        intervals: [
          {
            durationSeconds: Math.round(
              Number(session.enduranceDurationMinutes) * 60,
            ),
            targetType: 'POWER',
            targetZoneOrValue: session.enduranceTarget,
          },
        ],
      },
    }
  }

  const loadWeeklyPlan = async () => {
    if (!planAthleteId || !planWeekDate) {
      return
    }
    const weekStart = normalizeWeekStart(planWeekDate)
    if (!weekStart) {
      setPlanError('Select a valid week start date.')
      return
    }

    setPlanLoading(true)
    setPlanError(null)
    setPlanMessage(null)
    setPlanErrors({})

    try {
      const plan = await apiFetch<WeeklyPlan>(
        `/api/coach/athletes/${planAthleteId}/weekly-plans?weekStart=${weekStart}`,
      )
      setPlanId(plan.id)
      setPlanSessions(
        plan.sessions.map((session) => mapSessionToDraft(session)),
      )
      setPlanBuilderActive(true)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load weekly plan'
      if (message.toLowerCase().includes('no weekly plan')) {
        setPlanId(null)
        setPlanSessions([])
        setPlanBuilderActive(false)
      } else {
        setPlanError(message)
      }
    } finally {
      setPlanLoading(false)
    }
  }

  const validateSession = (session: PlanSessionDraft, weekStart: string) => {
    const errors: SessionErrors = {}
    if (!session.date) {
      errors.date = 'Date is required.'
    } else if (!isDateInWeek(session.date, weekStart)) {
      errors.date = 'Date must be within the selected week.'
    }
    if (!session.title.trim()) {
      errors.title = 'Title is required.'
    }

    if (session.type === 'STRENGTH') {
      if (!session.strengthExerciseId) {
        errors.strengthExerciseId = 'Select an exercise.'
      }
      if (!session.strengthSets) {
        errors.strengthSets = 'Sets required.'
      }
      if (!session.strengthReps) {
        errors.strengthReps = 'Reps required.'
      }
      if (!session.strengthTargetLoadType) {
        errors.strengthTargetLoadType = 'Target type required.'
      }
      if (!session.strengthTargetValue) {
        errors.strengthTargetValue = 'Target value required.'
      }
    }

    if (session.type === 'ENDURANCE') {
      if (!session.enduranceModality) {
        errors.enduranceModality = 'Modality required.'
      }
      if (!session.enduranceDurationMinutes) {
        errors.enduranceDurationMinutes = 'Duration required.'
      }
      if (!session.enduranceTarget) {
        errors.enduranceTarget = 'Target required.'
      }
    }

    return errors
  }

  const isPlanValid = useMemo(() => {
    if (!planAthleteId || !planWeekDate) {
      return false
    }
    const weekStart = normalizeWeekStart(planWeekDate)
    if (!weekStart) {
      return false
    }
    if (planSessions.length === 0) {
      return false
    }

    // Check if all sessions are valid
    for (const session of planSessions) {
      const sessionErrors = validateSession(session, weekStart)
      if (Object.keys(sessionErrors).length > 0) {
        return false
      }
    }

    return true
  }, [planAthleteId, planWeekDate, planSessions])

  const savePlan = async () => {
    if (!planAthleteId || !planWeekDate) {
      setPlanError('Select an athlete and week first.')
      return
    }
    const weekStart = normalizeWeekStart(planWeekDate)
    if (!weekStart) {
      setPlanError('Select a valid week start date.')
      return
    }
    if (planSessions.length === 0) {
      setPlanError('Add at least one session before saving.')
      return
    }

    const errors: Record<string, SessionErrors> = {}
    planSessions.forEach((session) => {
      const sessionErrors = validateSession(session, weekStart)
      if (Object.keys(sessionErrors).length > 0) {
        errors[session.clientId] = sessionErrors
      }
    })

    setPlanErrors(errors)
    if (Object.keys(errors).length > 0) {
      setPlanError('Fix the highlighted fields.')
      return
    }

    const payload = {
      weekStart,
      sessions: planSessions.map((session) => buildSessionPayload(session)),
    }

    setPlanLoading(true)
    setPlanError(null)
    setPlanMessage(null)
    setPlanSuccess(false)

    try {
      if (planId) {
        await apiFetch(`/api/coach/weekly-plans/${planId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        await apiFetch(`/api/coach/athletes/${planAthleteId}/weekly-plans`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      setPlanSuccess(true)
      setPlanMessage('Plan saved successfully!')
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPlanSuccess(false)
        setPlanMessage(null)
      }, 3000)
      await loadWeeklyPlan()
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to save plan')
    } finally {
      setPlanLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <header className="login-header">
            <h1 className="login-title">HybridPeaks Coach</h1>
            <p className="login-subtitle">
              Design training programs and monitor athlete progress. Built for hybrid athletes.
            </p>
          </header>
          <form className="login-form" onSubmit={handleLogin}>
            {loginError && <div className="card error">{loginError}</div>}
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="coach@example.com"
                required
                disabled={loginLoading}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="••••••••"
                required
                disabled={loginLoading}
                minLength={8}
              />
            </label>
            <button
              type="submit"
              className="btn primary"
              disabled={loginLoading}
            >
              {loginLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="coach-header">
        <h1>Coach Dashboard</h1>
        <button className="btn ghost" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'athletes' ? 'active' : ''}`}
          onClick={() => setActiveTab('athletes')}
        >
          Athletes
        </button>
        <button
          className={`tab ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          Exercises
        </button>
        <button
          className={`tab ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Plans
        </button>
      </div>

      <div className="coach-content">
        {error && (
          <div className="card error">
            <p>{error}</p>
            <button
              className="btn ghost"
              onClick={
                activeTab === 'athletes'
                  ? fetchAthletes
                  : activeTab === 'exercises'
                    ? fetchExercises
                    : fetchAthletes
              }
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === 'athletes' && (
          <div className="card">
            <div className="card-header">
              <h2>Athletes</h2>
              <button className="btn ghost" onClick={fetchAthletes} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Invite Athlete Form */}
            <div className="invite-form">
              <form onSubmit={handleInviteAthlete}>
                <div className="invite-form-row">
                  <label className="field" style={{ flex: 1 }}>
                    <span>Email</span>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value)
                        setInviteError(null)
                      }}
                      placeholder="athlete@example.com"
                      disabled={inviteLoading}
                    />
                    {inviteError && <span className="field-error">{inviteError}</span>}
                  </label>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={inviteLoading || !inviteEmail.trim()}
                    style={{ alignSelf: 'flex-end' }}
                  >
                    {inviteLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>

              {/* Success Banner with Token */}
              {inviteToken && (
                <div className="card success" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Invitation created!</p>
                      <p style={{ margin: '0 0 8px', fontSize: '0.875rem' }}>
                        Copy token: <code style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em' }}>{inviteToken}</code>
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                        Share this token with the athlete to accept the invitation.
                      </p>
                    </div>
                    <button
                      className="btn ghost"
                      onClick={copyTokenToClipboard}
                      style={{ flexShrink: 0 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            {loading && athletes.length === 0 ? (
              <p className="muted">Loading athletes...</p>
            ) : athletes.length === 0 ? (
              <div className="empty-state">
                <p className="muted">No athletes in your roster yet.</p>
                <p className="muted small">
                  Use the API to invite athletes: <code>POST /api/coach/athletes/invite</code>
                </p>
              </div>
            ) : (
              <div className="list">
                {athletes.map((athlete) => (
                  <div key={athlete.id} className="list-item">
                    <div>
                      <div className="list-item-title">{athlete.email}</div>
                      <div className="list-item-meta">
                        Linked: {new Date(athlete.linkedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="list-item-actions">
                      <span className="badge">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'exercises' && (
          <div className="card">
            <div className="card-header">
              <h2>Exercises</h2>
              <button className="btn ghost" onClick={fetchExercises} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {loading && exercises.length === 0 ? (
              <p className="muted">Loading exercises...</p>
            ) : exercises.length === 0 ? (
              <div className="empty-state">
                <p className="muted">No exercises yet.</p>
                <p className="muted small">
                  Use the API to create exercises: <code>POST /api/exercises</code>
                </p>
              </div>
            ) : (
              <div className="list">
                {exercises.map((exercise) => (
                  <div key={exercise.id} className="list-item">
                    <div>
                      <div className="list-item-title">{exercise.name}</div>
                      <div className="list-item-meta">
                        <span className="chip chip-strength">{exercise.type}</span>
                        {exercise.modality && (
                          <span className="chip chip-endurance">{exercise.modality}</span>
                        )}
                        {exercise.description && (
                          <span className="muted"> • {exercise.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="card">
            <div className="card-header">
              <h2>Weekly Plans</h2>
            </div>
            <div className="plan-controls">
              <label className="field">
                <span>Athlete</span>
                <select
                  value={planAthleteId}
                  onChange={(event) => setPlanAthleteId(event.target.value)}
                >
                  <option value="">Select athlete</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Week of</span>
                <input
                  type="date"
                  value={planWeekDate}
                  onChange={(event) => setPlanWeekDate(event.target.value)}
                />
              </label>
              <button
                className="btn"
                onClick={() => loadWeeklyPlan()}
                disabled={!planAthleteId || !planWeekDate || planLoading}
              >
                {planLoading ? 'Loading...' : 'Load Plan'}
              </button>
            </div>

            {planSuccess && planMessage && (
              <div className="card success">
                <p>{planMessage}</p>
              </div>
            )}
            {planError && <p className="inline-error">{planError}</p>}

            {!planLoading && planAthleteId && planWeekDate && !planBuilderActive && (
              <div className="empty-state">
                <p className="muted">No plan found for this week.</p>
                <button className="btn primary" onClick={() => startNewPlan()}>
                  Create Plan
                </button>
              </div>
            )}

            {planBuilderActive && (
              <div className="plan-builder">
                <div className="plan-actions">
                  <button className="btn ghost" onClick={() => addPlanSession('STRENGTH')}>
                    Add Strength Session
                  </button>
                  <button className="btn ghost" onClick={() => addPlanSession('ENDURANCE')}>
                    Add Endurance Session
                  </button>
                </div>

                <div className="plan-session-list">
                  {planSessions.length === 0 && (
                    <p className="muted">Add sessions to build this week.</p>
                  )}
                  {planSessions.map((session) => {
                    const errors = planErrors[session.clientId] || {}
                    return (
                      <div key={session.clientId} className="plan-session-card">
                        <div className="plan-session-header">
                          <h3>{session.type}</h3>
                          <button
                            className="btn ghost"
                            onClick={() => removePlanSession(session.clientId)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="plan-session-fields">
                          <label className="field">
                            <span>Date</span>
                            <input
                              type="date"
                              value={session.date}
                              onChange={(event) =>
                                updatePlanSession(session.clientId, {
                                  date: event.target.value,
                                })
                              }
                            />
                            {errors.date && <span className="field-error">{errors.date}</span>}
                          </label>
                          <label className="field">
                            <span>Title</span>
                            <input
                              type="text"
                              value={session.title}
                              onChange={(event) =>
                                updatePlanSession(session.clientId, {
                                  title: event.target.value,
                                })
                              }
                            />
                            {errors.title && <span className="field-error">{errors.title}</span>}
                          </label>
                        </div>

                        {session.type === 'STRENGTH' && (
                          <div className="plan-session-fields">
                            <label className="field">
                              <span>Exercise</span>
                              <select
                                value={session.strengthExerciseId ?? ''}
                                onChange={(event) => {
                                  const selected = exercises.find(
                                    (exercise) => exercise.id === event.target.value,
                                  )
                                  updatePlanSession(session.clientId, {
                                    strengthExerciseId: event.target.value,
                                    strengthExerciseName: selected?.name ?? '',
                                  })
                                }}
                              >
                                <option value="">Select exercise</option>
                                {exercises
                                  .filter((exercise) => exercise.type === 'STRENGTH')
                                  .map((exercise) => (
                                    <option key={exercise.id} value={exercise.id}>
                                      {exercise.name}
                                    </option>
                                  ))}
                              </select>
                              {errors.strengthExerciseId && (
                                <span className="field-error">{errors.strengthExerciseId}</span>
                              )}
                            </label>
                            <label className="field">
                              <span>Sets</span>
                              <input
                                type="number"
                                min={1}
                                value={session.strengthSets ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    strengthSets: event.target.value,
                                  })
                                }
                              />
                              {errors.strengthSets && (
                                <span className="field-error">{errors.strengthSets}</span>
                              )}
                            </label>
                            <label className="field">
                              <span>Reps</span>
                              <input
                                type="number"
                                min={1}
                                value={session.strengthReps ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    strengthReps: event.target.value,
                                  })
                                }
                              />
                              {errors.strengthReps && (
                                <span className="field-error">{errors.strengthReps}</span>
                              )}
                            </label>
                            <label className="field">
                              <span>Target</span>
                              <select
                                value={session.strengthTargetLoadType ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    strengthTargetLoadType: event.target.value as TargetLoadType,
                                  })
                                }
                              >
                                <option value="">Select target</option>
                                <option value="PERCENT_1RM">% 1RM</option>
                                <option value="RPE">RPE</option>
                                <option value="ABS">Absolute</option>
                              </select>
                              {errors.strengthTargetLoadType && (
                                <span className="field-error">{errors.strengthTargetLoadType}</span>
                              )}
                            </label>
                            <label className="field">
                              <span>Target Value</span>
                              <input
                                type="number"
                                min={1}
                                value={session.strengthTargetValue ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    strengthTargetValue: event.target.value,
                                  })
                                }
                              />
                              {errors.strengthTargetValue && (
                                <span className="field-error">{errors.strengthTargetValue}</span>
                              )}
                            </label>
                          </div>
                        )}

                        {session.type === 'ENDURANCE' && (
                          <div className="plan-session-fields">
                            <label className="field">
                              <span>Modality</span>
                              <select
                                value={session.enduranceModality ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    enduranceModality: event.target.value as Modality,
                                  })
                                }
                              >
                                <option value="">Select modality</option>
                                <option value="RUN">Run</option>
                                <option value="BIKE">Bike</option>
                                <option value="SWIM">Swim</option>
                                <option value="GYM">Gym</option>
                              </select>
                              {errors.enduranceModality && (
                                <span className="field-error">{errors.enduranceModality}</span>
                              )}
                            </label>
                            <label className="field">
                              <span>Duration (min)</span>
                              <input
                                type="number"
                                min={1}
                                value={session.enduranceDurationMinutes ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    enduranceDurationMinutes: event.target.value,
                                  })
                                }
                              />
                              {errors.enduranceDurationMinutes && (
                                <span className="field-error">{errors.enduranceDurationMinutes}</span>
                              )}
                            </label>
                            <label className="field">
                              <span>Target</span>
                              <input
                                type="text"
                                value={session.enduranceTarget ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    enduranceTarget: event.target.value,
                                  })
                                }
                                placeholder="65-75% FTP"
                              />
                              {errors.enduranceTarget && (
                                <span className="field-error">{errors.enduranceTarget}</span>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="plan-footer">
                  <button
                    className="btn primary"
                    onClick={() => savePlan()}
                    disabled={planLoading || !isPlanValid}
                  >
                    {planLoading ? 'Saving...' : 'Save Plan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getAuthToken() {
  const keys = ['authToken', 'accessToken', 'token']
  for (const key of keys) {
    const token = localStorage.getItem(key)
    if (token) return token
  }
  return null
}

export default App

function normalizeWeekStart(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + offset)
  return monday.toISOString().split('T')[0]
}

function isDateInWeek(dateString: string, weekStart: string) {
  const date = new Date(`${dateString}T00:00:00`)
  const start = new Date(`${weekStart}T00:00:00`)
  if (Number.isNaN(date.getTime()) || Number.isNaN(start.getTime())) return false
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return date >= start && date <= end
}

function getLocalId() {
  if (crypto && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
