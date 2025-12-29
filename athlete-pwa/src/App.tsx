import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken())
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [registerLoading, setRegisterLoading] = useState(false)
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [weekSessions, setWeekSessions] = useState<WeekSession[]>([])
  const [weekError, setWeekError] = useState(false)
  const [weekLoading, setWeekLoading] = useState(false)
  const [dayKey, setDayKey] = useState(() => formatLocalDate(new Date()))
  const [pendingSessionIds, setPendingSessionIds] = useState<string[]>([])
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
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
  const [inviteToken, setInviteToken] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  useEffect(() => {
    if (window.location.pathname === '/') {
      window.history.replaceState({}, '', '/today')
    }
  }, [])

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError(null)

    const email = registerForm.email.trim()
    if (!isValidEmail(email)) {
      setRegisterError('Enter a valid email.')
      return
    }
    if (registerForm.password.length < 8) {
      setRegisterError('Password must be at least 8 characters.')
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match.')
      return
    }

    setRegisterLoading(true)

    try {
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: registerForm.password,
          role: 'ATHLETE',
        }),
      })

      if (!registerResponse.ok) {
        const data = await registerResponse.json().catch(() => ({}))
        throw new Error(data.message || 'Registration failed')
      }

      const registerData = (await registerResponse.json().catch(() => null)) as
        | { accessToken?: string; refreshToken?: string }
        | null

      if (registerData?.accessToken) {
        localStorage.setItem('accessToken', registerData.accessToken)
        if (registerData.refreshToken) {
          localStorage.setItem('refreshToken', registerData.refreshToken)
        }
      } else {
        await handleDirectLogin(email, registerForm.password)
      }

      setIsAuthenticated(true)
      setRegisterForm({ email: '', password: '', confirmPassword: '' })
      setAuthMode('login')
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleDirectLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
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
  }


  const refreshQueueState = useCallback(async () => {
    const items = await listQueueItems()
    const unique = Array.from(new Set(items.map((item) => item.sessionId)))
    setPendingSessionIds(unique)
    return items
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('authToken')
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setCurrentUser(null)
    setSessions([])
    setWeekSessions([])
  }, [])

  const fetchToday = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await apiFetch<TrainingSession[]>('/api/athlete/today')
      const sorted = [...data].sort((a, b) => {
        const aTime = new Date(a.createdAt ?? a.date).getTime()
        const bTime = new Date(b.createdAt ?? b.date).getTime()
        return aTime - bTime
      })
      setSessions(sorted)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleLogout()
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [handleLogout])

  const fetchWeekSessions = useCallback(async () => {
    setWeekLoading(true)
    setWeekError(false)

    try {
      const today = new Date()
      const { start, end } = getWeekRange(today)
      const fromStr = formatLocalDate(start)
      const toStr = formatLocalDate(end)
      const todayKey = formatLocalDate(today)

      const data = await apiFetch<WeekSession[]>(
        `/api/athlete/sessions?from=${fromStr}&to=${toStr}`,
      )

      const remaining = data
        .filter((session) => {
          const sessionKey = formatLocalDate(new Date(session.date))
          return (
            sessionKey !== todayKey &&
            session.status !== 'COMPLETED' &&
            session.status !== 'MISSED'
          )
        })
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )

      setWeekSessions(remaining)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleLogout()
        return
      }
      setWeekError(true)
    } finally {
      setWeekLoading(false)
    }
  }, [handleLogout])

  const replayQueue = useCallback(
    async (items?: QueueItem[]) => {
      const queueItems = items ?? (await listQueueItems())
      if (queueItems.length === 0) {
        setIsSyncing(false)
        return
      }

      setIsSyncing(true)
      const ordered = [...queueItems].sort(
        (a, b) => a.createdAt - b.createdAt,
      )
      let hasSuccessfulReplay = false

      for (const item of ordered) {
        if (item.attempts >= 5) {
          await removeQueueItem(item.id)
          setSyncWarning('Some actions could not be synced.')
          continue
        }

        const method = item.method ?? item.request?.method
        const url = item.url ?? item.request?.url
        const body = getQueueBody(item)
        if (!method || !url) {
          await removeQueueItem(item.id)
          continue
        }
        try {
          const authHeader = buildAuthHeader()
          const response = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(authHeader.Authorization ? authHeader : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
          })

          if (response.ok) {
            await removeQueueItem(item.id)
            hasSuccessfulReplay = true
            continue
          }

          if (response.status === 401 || response.status === 403) {
            setSyncWarning('Session pending sync — please log in again')
            break
          }

          if (response.status === 409 || response.status === 400) {
            if (item.kind === 'LOG') {
              await removeQueueItem(item.id)
              continue
            }
          }

          if (response.status >= 400 && response.status < 500) {
            await removeQueueItem(item.id)
            setSyncWarning('Some actions could not be synced.')
            continue
          }

          await updateQueueItem(item.id, {
            attempts: item.attempts + 1,
            lastError: `Server error ${response.status}`,
          })
        } catch (err) {
          if (isNetworkError(err)) {
            await updateQueueItem(item.id, {
              attempts: item.attempts + 1,
              lastError: 'Network error',
            })
            continue
          }

          await updateQueueItem(item.id, {
            attempts: item.attempts + 1,
            lastError: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }

      const refreshed = await refreshQueueState()
      if (hasSuccessfulReplay) {
        await Promise.all([fetchToday(), fetchWeekSessions()])
      }

      if (refreshed.length === 0) {
        setSyncWarning(null)
      }
      setIsSyncing(false)
    },
    [fetchToday, fetchWeekSessions, refreshQueueState],
  )

  useEffect(() => {
    if (isAuthenticated) {
      fetchToday()
      fetchWeekSessions()
      refreshQueueState().then((items) => replayQueue(items))
      apiFetch<CurrentUser>('/api/auth/me')
        .then((data) => setCurrentUser(data))
        .catch(() => {
          setCurrentUser(null)
        })
    }
  }, [isAuthenticated, fetchToday, fetchWeekSessions, refreshQueueState, replayQueue])

  useEffect(() => {
    fetchWeekSessions()
  }, [dayKey, fetchWeekSessions])

  useEffect(() => {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const timeout = window.setTimeout(() => {
      setDayKey(formatLocalDate(new Date()))
    }, Math.max(0, tomorrow.getTime() - now.getTime() + 1000))

    return () => window.clearTimeout(timeout)
  }, [dayKey])

  useEffect(() => {
    const handleOnline = () => {
      replayQueue()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [replayQueue])

  const todayLabel = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [])

  const updateWeekSessionsAfterStatus = useCallback(
    (sessionId: string, status: SessionStatus) => {
      if (status === 'COMPLETED' || status === 'MISSED') {
        setWeekSessions((prev) => prev.filter((session) => session.id !== sessionId))
        return
      }
      setWeekSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status } : session,
        ),
      )
    },
    [],
  )

  const markStatus = async (sessionId: string, status: SessionStatus) => {
    setSubmitting(true)
    setError(null)

    try {
      if (!navigator.onLine) {
        throw new NetworkError('Offline')
      }
      await apiFetch(`/api/athlete/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, status } : session,
        ),
      )
      updateWeekSessionsAfterStatus(sessionId, status)
      fetchWeekSessions()
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueQueueItem({
          kind: 'STATUS',
          sessionId,
          method: 'PATCH',
          url: `/api/athlete/sessions/${sessionId}/status`,
          body: { status },
        })
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId ? { ...session, status } : session,
          ),
        )
        updateWeekSessionsAfterStatus(sessionId, status)
        await refreshQueueState()
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update status')
      }
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

    const summary =
      activeSession.type === 'STRENGTH'
        ? buildStrengthSummary(logForm)
        : buildEnduranceSummary(logForm)

    try {
      if (!navigator.onLine) {
        throw new NetworkError('Offline')
      }
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
      updateWeekSessionsAfterStatus(activeSession.id, 'COMPLETED')
      setActiveSession(null)
      fetchWeekSessions()
    } catch (err) {
      if (activeSession && isNetworkError(err)) {
        await enqueueQueueItem({
          kind: 'LOG',
          sessionId: activeSession.id,
          method: 'POST',
          url: `/api/athlete/sessions/${activeSession.id}/log`,
          body: { summary },
        })
        await enqueueQueueItem({
          kind: 'STATUS',
          sessionId: activeSession.id,
          method: 'PATCH',
          url: `/api/athlete/sessions/${activeSession.id}/status`,
          body: { status: 'COMPLETED' },
        })
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSession.id
              ? { ...session, status: 'COMPLETED', hasLog: true }
              : session,
          ),
        )
        updateWeekSessionsAfterStatus(activeSession.id, 'COMPLETED')
        setActiveSession(null)
        await refreshQueueState()
      } else {
        setError(err instanceof Error ? err.message : 'Failed to log session')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const acceptInvitation = async () => {
    if (!inviteToken.trim()) {
      setInviteError('Invite token is required.')
      return
    }

    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      await apiFetch('/api/athlete/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: inviteToken.trim() }),
      })
      setInviteSuccess('Invitation accepted.')
      setInviteToken('')
      window.history.replaceState({}, '', '/today')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setInviteLoading(false)
    }
  }

  // Show login screen if not authenticated (after all hooks)
  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-container">
          <header className="login-header">
            <h1 className="login-title">HybridPeaks</h1>
            <p className="login-subtitle">
              Track your progress and execute your training. Built for hybrid athletes.
            </p>
          </header>
          {authMode === 'login' ? (
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
                  placeholder="athlete@example.com"
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
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setLoginError(null)
                  setAuthMode('register')
                }}
              >
                Create account
              </button>
              <p className="login-hint">
                Already invited? Create an account, then paste your invitation token.
              </p>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleRegister}>
              {registerError && <div className="card error">{registerError}</div>}
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="athlete@example.com"
                  required
                  disabled={registerLoading}
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  disabled={registerLoading}
                />
              </label>
              <label className="field">
                <span>Confirm Password</span>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Repeat password"
                  required
                  minLength={8}
                  disabled={registerLoading}
                />
              </label>
              <button
                type="submit"
                className="btn primary"
                disabled={registerLoading}
              >
                {registerLoading ? 'Creating...' : 'Create account'}
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setRegisterError(null)
                  setAuthMode('login')
                }}
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <section className="card invite-card">
        <div className="invite-header">
          <h2 className="invite-title">Accept Invitation</h2>
          <p className="invite-subtitle">Paste the token from your coach.</p>
        </div>
        {inviteSuccess && <p className="invite-success">{inviteSuccess}</p>}
        {inviteError && <div className="card error">{inviteError}</div>}
        <label className="field">
          <span>Invite Token</span>
          <input
            type="text"
            value={inviteToken}
            onChange={(event) => setInviteToken(event.target.value)}
            placeholder="Token"
            disabled={inviteLoading}
          />
        </label>
        <button
          className="btn primary"
          onClick={acceptInvitation}
          disabled={inviteLoading}
        >
          {inviteLoading ? 'Accepting...' : 'Accept'}
        </button>
      </section>

      <header className="today-header">
        <div>
          <p className="today-label">Today</p>
          <h1 className="today-date">{todayLabel}</h1>
          <p className="today-subtitle">Stay on track. One session at a time.</p>
        </div>
        <div className="header-actions">
          {currentUser && (
            <p className="logged-in-text">Logged in as: {currentUser.email}</p>
          )}
          <button
            className="btn ghost logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="today-content">
        {loading && <div className="card">Loading sessions...</div>}
        {!loading && error && <div className="card error">{error}</div>}
        {syncWarning && <div className="card warning">{syncWarning}</div>}
        {isSyncing && (
          <div className="card syncing">
            <span className="syncing-indicator">Syncing...</span>
          </div>
        )}
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
                {pendingSessionIds.includes(session.id) && (
                  <span className="status pending">PENDING SYNC</span>
                )}
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

      <section className="week-overview">
        <h2 className="week-overview-title">This Week</h2>
        {weekError && (
          <div className="week-error">
            <span>Couldn&apos;t load week overview.</span>
            <button
              className="btn ghost week-retry"
              onClick={fetchWeekSessions}
              disabled={weekLoading}
            >
              Retry
            </button>
          </div>
        )}
        {weekLoading && !weekError && (
          <ul className="week-sessions-list">
            {[1, 2, 3].map((i) => (
              <li key={i} className="week-session-item week-session-shimmer">
                <span className="shimmer-placeholder" />
              </li>
            ))}
          </ul>
        )}
        {!weekLoading && !weekError && weekSessions.length === 0 && (
          <p className="week-empty">No remaining sessions this week.</p>
        )}
        {!weekLoading && !weekError && weekSessions.length > 0 && (
          <ul className="week-sessions-list">
            {weekSessions.map((session) => (
              <li key={session.id} className="week-session-item">
                <span>{session.title}</span>
                {pendingSessionIds.includes(session.id) && (
                  <span className="pending-pill">Pending sync</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

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

type QueueKind = 'STATUS' | 'LOG'

interface QueueItem {
  id: string
  createdAt: number
  kind: QueueKind
  sessionId: string
  method: 'PATCH' | 'POST'
  url: string
  body?: Record<string, unknown>
  attempts: number
  lastError?: string
  request?: {
    method: 'PATCH' | 'POST'
    url: string
    body?: string
  }
}

interface LogFormState {
  rpe: string
  notes: string
  durationMinutes: string
}

interface ApiErrorPayload {
  message?: string
}

interface CurrentUser {
  email: string
  role: string
}

const AUTH_TOKEN_KEYS = ['authToken', 'accessToken', 'token']
const QUEUE_DB_NAME = 'athlete-pwa'
const QUEUE_STORE = 'offlineQueue'

class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

class NetworkError extends Error {}

function getAuthToken() {
  for (const key of AUTH_TOKEN_KEYS) {
    const token = localStorage.getItem(key)
    if (token) return token
  }
  return null
}

function buildAuthHeader() {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as {
      accessToken: string
      refreshToken?: string
    }

    localStorage.setItem('accessToken', data.accessToken)
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken)
    }

    return data.accessToken
  } catch {
    return null
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(path, { ...options, headers })
  } catch (err) {
    throw new NetworkError('Network error')
  }

  // If 401, try to refresh token and retry once
  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      // Retry the request with new token
      headers.set('Authorization', `Bearer ${newToken}`)
      try {
        response = await fetch(path, { ...options, headers })
      } catch (err) {
        throw new NetworkError('Network error')
      }
    } else {
      // Refresh failed, clear auth and throw error
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('authToken')
      localStorage.removeItem('token')
      throw new ApiError('Session expired. Please log in again.', 401)
    }
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null
    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch (err) {
      payload = null
    }
    
    // Provide clearer error messages for common status codes
    let errorMessage = payload?.message ?? 'Request failed'
    if (response.status === 401) {
      errorMessage = 'Authentication required. Please log in.'
    } else if (response.status === 403) {
      errorMessage = 'You do not have permission to access this resource.'
    } else if (response.status === 404) {
      errorMessage = 'Resource not found.'
    }
    
    throw new ApiError(errorMessage, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function isNetworkError(error: unknown) {
  return (
    error instanceof NetworkError ||
    error instanceof TypeError ||
    (!navigator.onLine && error instanceof Error)
  )
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

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWeekRange(date: Date) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = base.getDay()
  const offset = (day + 6) % 7
  const start = new Date(base)
  start.setDate(base.getDate() - offset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getQueueBody(item: QueueItem) {
  if (item.body) return item.body
  if (!item.request?.body) return undefined
  try {
    const parsed = JSON.parse(item.request.body) as unknown
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>
    }
  } catch (err) {
    return undefined
  }
  return undefined
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function listQueueItems(): Promise<QueueItem[]> {
  const db = await openQueueDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, 'readonly')
    const store = transaction.objectStore(QUEUE_STORE)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as QueueItem[])
    request.onerror = () => reject(request.error)
  })
}

async function enqueueQueueItem(
  item: Omit<QueueItem, 'id' | 'createdAt' | 'attempts'>,
) {
  const db = await openQueueDb()
  const payload: QueueItem = {
    ...item,
    id: getQueueId(),
    createdAt: Date.now(),
    attempts: 0,
  }

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE)
    const request = store.put(payload)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function updateQueueItem(id: string, updates: Partial<QueueItem>) {
  const db = await openQueueDb()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE)
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const current = getRequest.result as QueueItem | undefined
      if (!current) {
        resolve()
        return
      }
      const next = { ...current, ...updates }
      const putRequest = store.put(next)
      putRequest.onsuccess = () => resolve()
      putRequest.onerror = () => reject(putRequest.error)
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

async function removeQueueItem(id: string) {
  const db = await openQueueDb()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, 'readwrite')
    const store = transaction.objectStore(QUEUE_STORE)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function getQueueId() {
  if (crypto && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `queue_${Date.now()}_${Math.random().toString(16).slice(2)}`
}
