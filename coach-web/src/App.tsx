import { useState, useEffect, useCallback } from 'react'
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken())
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<'athletes' | 'exercises'>('athletes')
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      } else {
        fetchExercises()
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
      </div>

      <div className="coach-content">
        {error && (
          <div className="card error">
            <p>{error}</p>
            <button className="btn ghost" onClick={activeTab === 'athletes' ? fetchAthletes : fetchExercises}>
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
