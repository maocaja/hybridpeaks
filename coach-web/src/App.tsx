import { useState, useEffect, useCallback, useMemo } from 'react'
import { PlanningScreen } from './features/planning/PlanningScreen'
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

type EnduranceSport = 'BIKE' | 'RUN' | 'SWIM'

type EnduranceStepType = 'WARMUP' | 'WORK' | 'RECOVERY' | 'COOLDOWN'

type EnduranceDurationType = 'TIME' | 'DISTANCE'

type EnduranceTargetType = 'POWER' | 'HEART_RATE' | 'PACE' | 'NONE'

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

interface WeekSummary {
  plannedSessionsCount: number
  completedSessionsCount: number
  missedSessionsCount: number
  adherenceRate: number
  strengthCount: number
  enduranceCount: number
}

type SessionStatus = 'PLANNED' | 'COMPLETED' | 'MISSED' | 'MODIFIED'

interface CoachWeekSession {
  id: string
  date: string
  title: string
  type: SessionType
  status: SessionStatus
  hasLog: boolean
}

interface WorkoutLog {
  id: string
  sessionId: string
  type: SessionType
  summary: Record<string, unknown>
  createdAt: string
}

interface EnduranceStepDraft {
  id: string
  type: EnduranceStepType
  durationType: EnduranceDurationType
  durationValue: string
  targetType: EnduranceTargetType
  targetZone?: string
  targetMin?: string
  targetMax?: string
  cadenceMin?: string
  cadenceMax?: string
  note?: string
}

type EnduranceBlockDraft =
  | { id: string; kind: 'STEP'; step: EnduranceStepDraft }
  | { id: string; kind: 'REPEAT'; repeat: string; steps: EnduranceStepDraft[] }

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
  enduranceSport?: EnduranceSport
  enduranceBlocks?: EnduranceBlockDraft[]
  enduranceObjective?: string
  enduranceNotes?: string
}

interface SessionErrors {
  date?: string
  title?: string
  strengthExerciseId?: string
  strengthSets?: string
  strengthReps?: string
  strengthTargetLoadType?: string
  strengthTargetValue?: string
  enduranceSport?: string
  enduranceBlocks?: string
  enduranceBlockErrors?: Record<string, string>
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getAuthToken())
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState<
    'athletes' | 'exercises' | 'plans' | 'summary' | 'week'
  >('athletes')
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
  const [summaryAthleteId, setSummaryAthleteId] = useState('')
  const [summaryWeekDate, setSummaryWeekDate] = useState('')
  const [summaryData, setSummaryData] = useState<WeekSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [weekAthleteId, setWeekAthleteId] = useState('')
  const [weekDate, setWeekDate] = useState('')
  const [weekSessions, setWeekSessions] = useState<CoachWeekSession[]>([])
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekError, setWeekError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<CoachWeekSession | null>(null)
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [logData, setLogData] = useState<WorkoutLog | null>(null)
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
      } else if (activeTab === 'plans') {
        if (athletes.length === 0) {
          fetchAthletes()
        }
        if (exercises.length === 0) {
          fetchExercises()
        }
      } else if (activeTab === 'summary') {
        if (athletes.length === 0) {
          fetchAthletes()
        }
      } else {
        if (athletes.length === 0) {
          fetchAthletes()
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
        enduranceSport: type === 'ENDURANCE' ? 'RUN' : undefined,
        enduranceBlocks:
          type === 'ENDURANCE' ? [createEnduranceStepBlock()] : undefined,
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

  const updateEnduranceBlocks = useCallback(
    (
      clientId: string,
      updater: (blocks: EnduranceBlockDraft[]) => EnduranceBlockDraft[],
    ) => {
      setPlanSessions((prev) =>
        prev.map((session) => {
          if (session.clientId !== clientId || session.type !== 'ENDURANCE') {
            return session
          }
          const nextBlocks = updater(session.enduranceBlocks ?? [])
          return { ...session, enduranceBlocks: nextBlocks }
        }),
      )
    },
    [],
  )

  const addEnduranceStep = (clientId: string) => {
    updateEnduranceBlocks(clientId, (blocks) => [
      ...blocks,
      createEnduranceStepBlock(),
    ])
  }

  const addEnduranceRepeatBlock = (clientId: string) => {
    updateEnduranceBlocks(clientId, (blocks) => [
      ...blocks,
      createEnduranceRepeatBlock(),
    ])
  }

  const removeEnduranceBlock = (clientId: string, blockId: string) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.filter((block) => block.id !== blockId),
    )
  }

  const moveEnduranceBlock = (
    clientId: string,
    blockId: string,
    direction: 'UP' | 'DOWN',
  ) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      moveItem(blocks, (block) => block.id === blockId, direction),
    )
  }

  const updateEnduranceStepBlock = (
    clientId: string,
    blockId: string,
    updates: Partial<EnduranceStepDraft>,
  ) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId || block.kind !== 'STEP') return block
        return { ...block, step: { ...block.step, ...updates } }
      }),
    )
  }

  const updateRepeatBlock = (
    clientId: string,
    blockId: string,
    updates: { repeat?: string },
  ) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId || block.kind !== 'REPEAT') return block
        return { ...block, ...updates }
      }),
    )
  }

  const addRepeatStep = (clientId: string, blockId: string) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId || block.kind !== 'REPEAT') return block
        return {
          ...block,
          steps: [...block.steps, createEnduranceStepDraft()],
        }
      }),
    )
  }

  const updateRepeatStep = (
    clientId: string,
    blockId: string,
    stepId: string,
    updates: Partial<EnduranceStepDraft>,
  ) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId || block.kind !== 'REPEAT') return block
        return {
          ...block,
          steps: block.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step,
          ),
        }
      }),
    )
  }

  const removeRepeatStep = (
    clientId: string,
    blockId: string,
    stepId: string,
  ) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId || block.kind !== 'REPEAT') return block
        return {
          ...block,
          steps: block.steps.filter((step) => step.id !== stepId),
        }
      }),
    )
  }

  const moveRepeatStep = (
    clientId: string,
    blockId: string,
    stepId: string,
    direction: 'UP' | 'DOWN',
  ) => {
    updateEnduranceBlocks(clientId, (blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId || block.kind !== 'REPEAT') return block
        return {
          ...block,
          steps: moveItem(block.steps, (step) => step.id === stepId, direction),
        }
      }),
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

    const { sport, blocks, objective, notes } = mapEndurancePrescriptionToDraft(
      session.prescription,
    )
    return {
      clientId: session.id ?? getLocalId(),
      date: session.date.split('T')[0],
      type: session.type,
      title: session.title,
      enduranceSport: sport ?? 'RUN',
      enduranceBlocks: blocks.length > 0 ? blocks : [createEnduranceStepBlock()],
      enduranceObjective: objective ?? '',
      enduranceNotes: notes ?? '',
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
        sport: session.enduranceSport,
        steps: buildEnduranceSteps(session.enduranceBlocks ?? []),
        ...(session.enduranceObjective
          ? { objective: session.enduranceObjective }
          : {}),
        ...(session.enduranceNotes ? { notes: session.enduranceNotes } : {}),
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
      if (!session.enduranceSport) {
        errors.enduranceSport = 'Sport required.'
      }
      const blocks = session.enduranceBlocks ?? []
      if (blocks.length === 0) {
        errors.enduranceBlocks = 'Add at least one step.'
      } else {
        const blockErrors = validateEnduranceBlocks(blocks, session.enduranceSport)
        if (Object.keys(blockErrors).length > 0) {
          errors.enduranceBlockErrors = blockErrors
        }
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

  const loadWeekSummary = useCallback(async () => {
    if (!summaryAthleteId || !summaryWeekDate) {
      setSummaryError('Select an athlete and week.')
      return
    }
    const weekStart = normalizeWeekStart(summaryWeekDate)
    if (!weekStart) {
      setSummaryError('Select a valid week.')
      return
    }

    setSummaryLoading(true)
    setSummaryError(null)
    setSummaryData(null)

    try {
      const data = await apiFetch<WeekSummary>(
        `/api/coach/athletes/${summaryAthleteId}/week-summary?weekStart=${weekStart}`,
      )
      setSummaryData(data)
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : 'Failed to load summary',
      )
    } finally {
      setSummaryLoading(false)
    }
  }, [summaryAthleteId, summaryWeekDate, apiFetch])

  const loadWeekSessions = useCallback(async () => {
    if (!weekAthleteId || !weekDate) {
      setWeekError('Select an athlete and week.')
      return
    }
    const weekStart = normalizeWeekStart(weekDate)
    if (!weekStart) {
      setWeekError('Select a valid week.')
      return
    }
    const weekEnd = addDays(weekStart, 6)

    setWeekLoading(true)
    setWeekError(null)
    setWeekSessions([])

    try {
      const data = await apiFetch<CoachWeekSession[]>(
        `/api/coach/athletes/${weekAthleteId}/sessions?from=${weekStart}&to=${weekEnd}`,
      )
      setWeekSessions(data)
    } catch (err) {
      setWeekError(
        err instanceof Error ? err.message : 'Failed to load sessions',
      )
    } finally {
      setWeekLoading(false)
    }
  }, [weekAthleteId, weekDate, apiFetch])

  const openSessionModal = async (session: CoachWeekSession) => {
    setSelectedSession(session)
    setLogError(null)
    setLogData(null)

    if (!session.hasLog) {
      return
    }

    setLogLoading(true)
    try {
      const data = await apiFetch<WorkoutLog>(
        `/api/coach/athletes/${weekAthleteId}/sessions/${session.id}/log`,
      )
      setLogData(data)
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to load log')
    } finally {
      setLogLoading(false)
    }
  }

  const closeSessionModal = useCallback(() => {
    setSelectedSession(null)
    setLogData(null)
    setLogError(null)
    setLogLoading(false)
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSessionModal()
      }
    }
    if (selectedSession) {
      window.addEventListener('keydown', handleKey)
    }
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedSession, closeSessionModal])

  // Auto-load summary when both athlete and week are selected
  useEffect(() => {
    if (
      activeTab === 'summary' &&
      summaryAthleteId &&
      summaryWeekDate &&
      !summaryLoading &&
      !summaryData
    ) {
      const weekStart = normalizeWeekStart(summaryWeekDate)
      if (weekStart) {
        loadWeekSummary()
      }
    }
  }, [activeTab, summaryAthleteId, summaryWeekDate, summaryLoading, summaryData, loadWeekSummary])

  // Auto-load week sessions when both athlete and week are selected
  useEffect(() => {
    if (
      activeTab === 'week' &&
      weekAthleteId &&
      weekDate &&
      !weekLoading &&
      weekSessions.length === 0
    ) {
      const weekStart = normalizeWeekStart(weekDate)
      if (weekStart) {
        loadWeekSessions()
      }
    }
  }, [activeTab, weekAthleteId, weekDate, weekLoading, weekSessions.length, loadWeekSessions])

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
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button
          className={`tab ${activeTab === 'week' ? 'active' : ''}`}
          onClick={() => setActiveTab('week')}
        >
          Week
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
                    : activeTab === 'summary'
                      ? fetchAthletes
                      : activeTab === 'week'
                        ? fetchAthletes
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

        {activeTab === 'plans' && <PlanningScreen />}

        {/* Old plans UI - disabled for now */}
        {false && (
          <div className="card">
            <div className="card-header">
              <h2>Weekly Plans (Old)</h2>
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
                          <div className="endurance-builder">
                            <div className="plan-session-fields">
                              <label className="field">
                                <span>Sport</span>
                                <select
                                  value={session.enduranceSport ?? ''}
                                  onChange={(event) =>
                                    updatePlanSession(session.clientId, {
                                      enduranceSport: event.target.value as EnduranceSport,
                                    })
                                  }
                                >
                                  <option value="">Select sport</option>
                                  <option value="RUN">Run</option>
                                  <option value="BIKE">Bike</option>
                                  <option value="SWIM">Swim</option>
                                </select>
                                {errors.enduranceSport && (
                                  <span className="field-error">{errors.enduranceSport}</span>
                                )}
                              </label>
                              <label className="field">
                                <span>Objective</span>
                                <input
                                  type="text"
                                  value={session.enduranceObjective ?? ''}
                                  onChange={(event) =>
                                    updatePlanSession(session.clientId, {
                                      enduranceObjective: event.target.value,
                                    })
                                  }
                                  placeholder="Primary objective"
                                />
                              </label>
                            </div>
                            <label className="field">
                              <span>Notes</span>
                              <textarea
                                rows={2}
                                value={session.enduranceNotes ?? ''}
                                onChange={(event) =>
                                  updatePlanSession(session.clientId, {
                                    enduranceNotes: event.target.value,
                                  })
                                }
                                placeholder="Optional notes"
                              />
                            </label>
                            <div className="endurance-actions">
                              <button
                                className="btn ghost"
                                type="button"
                                onClick={() => addEnduranceStep(session.clientId)}
                              >
                                Add Step
                              </button>
                              <button
                                className="btn ghost"
                                type="button"
                                onClick={() => addEnduranceRepeatBlock(session.clientId)}
                              >
                                Add Repeat Block
                              </button>
                            </div>
                            {errors.enduranceBlocks && (
                              <span className="field-error">{errors.enduranceBlocks}</span>
                            )}
                            <div className="endurance-blocks">
                              {(session.enduranceBlocks ?? []).map((block) => {
                                const blockError =
                                  errors.enduranceBlockErrors?.[block.id]
                                if (block.kind === 'STEP') {
                                  const step = block.step
                                  return (
                                    <div key={block.id} className="endurance-block">
                                      <div className="endurance-block-header">
                                        <span className="muted small">Step</span>
                                        <div className="inline-actions">
                                          <button
                                            className="btn ghost"
                                            type="button"
                                            onClick={() =>
                                              moveEnduranceBlock(
                                                session.clientId,
                                                block.id,
                                                'UP',
                                              )
                                            }
                                          >
                                            ↑
                                          </button>
                                          <button
                                            className="btn ghost"
                                            type="button"
                                            onClick={() =>
                                              moveEnduranceBlock(
                                                session.clientId,
                                                block.id,
                                                'DOWN',
                                              )
                                            }
                                          >
                                            ↓
                                          </button>
                                          <button
                                            className="btn ghost"
                                            type="button"
                                            onClick={() =>
                                              removeEnduranceBlock(session.clientId, block.id)
                                            }
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                      <div className="endurance-step-grid">
                                        <label className="field">
                                          <span>Type</span>
                                          <select
                                            value={step.type}
                                            onChange={(event) =>
                                              updateEnduranceStepBlock(session.clientId, block.id, {
                                                type: event.target.value as EnduranceStepType,
                                              })
                                            }
                                          >
                                            <option value="WARMUP">Warmup</option>
                                            <option value="WORK">Work</option>
                                            <option value="RECOVERY">Recovery</option>
                                            <option value="COOLDOWN">Cooldown</option>
                                          </select>
                                        </label>
                                        <label className="field">
                                          <span>Duration Type</span>
                                          <select
                                            value={step.durationType}
                                            onChange={(event) =>
                                              updateEnduranceStepBlock(session.clientId, block.id, {
                                                durationType: event.target.value as EnduranceDurationType,
                                              })
                                            }
                                          >
                                            <option value="TIME">Time (sec)</option>
                                            <option value="DISTANCE">Distance (m)</option>
                                          </select>
                                        </label>
                                        <label className="field">
                                          <span>Duration</span>
                                          <input
                                            type="number"
                                            min={1}
                                            value={step.durationValue}
                                            onChange={(event) =>
                                              updateEnduranceStepBlock(session.clientId, block.id, {
                                                durationValue: event.target.value,
                                              })
                                            }
                                          />
                                        </label>
                                        <label className="field">
                                          <span>Target Type</span>
                                          <select
                                            value={step.targetType}
                                            onChange={(event) =>
                                              updateEnduranceStepBlock(session.clientId, block.id, {
                                                targetType: event.target.value as EnduranceTargetType,
                                              })
                                            }
                                          >
                                            <option value="NONE">None</option>
                                            <option value="POWER">Power</option>
                                            <option value="HEART_RATE">Heart Rate</option>
                                            <option value="PACE">Pace</option>
                                          </select>
                                        </label>
                                        {step.targetType !== 'NONE' && (
                                          <>
                                            <label className="field">
                                              <span>Zone</span>
                                              <input
                                                type="number"
                                                min={1}
                                                max={5}
                                                value={step.targetZone ?? ''}
                                                onChange={(event) =>
                                                  updateEnduranceStepBlock(session.clientId, block.id, {
                                                    targetZone: event.target.value,
                                                  })
                                                }
                                                placeholder="1-5"
                                              />
                                              <p className="field-hint">
                                                {step.targetType === 'POWER'
                                                  ? 'Zone (1-5) or watts range, not both'
                                                  : step.targetType === 'HEART_RATE'
                                                    ? 'Zone (1-5) or bpm range, not both'
                                                    : 'Zone (1-5) or sec/km range, not both'}
                                              </p>
                                            </label>
                                            <label className="field">
                                              <span>Min</span>
                                              <input
                                                type="number"
                                                min={1}
                                                value={step.targetMin ?? ''}
                                                onChange={(event) =>
                                                  updateEnduranceStepBlock(session.clientId, block.id, {
                                                    targetMin: event.target.value,
                                                  })
                                                }
                                                placeholder={
                                                  step.targetType === 'POWER'
                                                    ? 'e.g., 200'
                                                    : step.targetType === 'HEART_RATE'
                                                      ? 'e.g., 150'
                                                      : 'e.g., 240'
                                                }
                                              />
                                            </label>
                                            <label className="field">
                                              <span>Max</span>
                                              <input
                                                type="number"
                                                min={1}
                                                value={step.targetMax ?? ''}
                                                onChange={(event) =>
                                                  updateEnduranceStepBlock(session.clientId, block.id, {
                                                    targetMax: event.target.value,
                                                  })
                                                }
                                                placeholder={
                                                  step.targetType === 'POWER'
                                                    ? 'e.g., 250'
                                                    : step.targetType === 'HEART_RATE'
                                                      ? 'e.g., 170'
                                                      : 'e.g., 300'
                                                }
                                              />
                                            </label>
                                          </>
                                        )}
                                        {session.enduranceSport === 'BIKE' && (
                                          <>
                                            <label className="field">
                                              <span>Cadence Min (RPM)</span>
                                              <input
                                                type="number"
                                                min={1}
                                                value={step.cadenceMin ?? ''}
                                                onChange={(event) =>
                                                  updateEnduranceStepBlock(
                                                    session.clientId,
                                                    block.id,
                                                    { cadenceMin: event.target.value },
                                                  )
                                                }
                                              />
                                            </label>
                                            <label className="field">
                                              <span>Cadence Max (RPM)</span>
                                              <input
                                                type="number"
                                                min={1}
                                                value={step.cadenceMax ?? ''}
                                                onChange={(event) =>
                                                  updateEnduranceStepBlock(
                                                    session.clientId,
                                                    block.id,
                                                    { cadenceMax: event.target.value },
                                                  )
                                                }
                                              />
                                            </label>
                                          </>
                                        )}
                                        <label className="field endurance-note">
                                          <span>Note</span>
                                          <input
                                            type="text"
                                            value={step.note ?? ''}
                                            onChange={(event) =>
                                              updateEnduranceStepBlock(session.clientId, block.id, {
                                                note: event.target.value,
                                              })
                                            }
                                            placeholder="Optional note"
                                          />
                                        </label>
                                      </div>
                                      {blockError && (
                                        <span className="field-error">{blockError}</span>
                                      )}
                                    </div>
                                  )
                                }

                                return (
                                  <div key={block.id} className="endurance-block">
                                    <div className="endurance-block-header">
                                      <span className="muted small">Repeat Block</span>
                                      <div className="repeat-controls">
                                        <label className="field">
                                          <span>Repeat</span>
                                          <input
                                            type="number"
                                            min={2}
                                            value={block.repeat}
                                            onChange={(event) =>
                                              updateRepeatBlock(session.clientId, block.id, {
                                                repeat: event.target.value,
                                              })
                                            }
                                          />
                                        </label>
                                        <div className="inline-actions">
                                          <button
                                            className="btn ghost"
                                            type="button"
                                            onClick={() =>
                                              moveEnduranceBlock(
                                                session.clientId,
                                                block.id,
                                                'UP',
                                              )
                                            }
                                          >
                                            ↑
                                          </button>
                                          <button
                                            className="btn ghost"
                                            type="button"
                                            onClick={() =>
                                              moveEnduranceBlock(
                                                session.clientId,
                                                block.id,
                                                'DOWN',
                                              )
                                            }
                                          >
                                            ↓
                                          </button>
                                          <button
                                            className="btn ghost"
                                            type="button"
                                            onClick={() =>
                                              removeEnduranceBlock(session.clientId, block.id)
                                            }
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="repeat-steps">
                                      {block.steps.map((step) => (
                                        <div key={step.id} className="endurance-step">
                                        <div className="endurance-step-header">
                                          <span className="muted small">Step</span>
                                          <div className="inline-actions">
                                            <button
                                              className="btn ghost"
                                              type="button"
                                              onClick={() =>
                                                moveRepeatStep(
                                                  session.clientId,
                                                  block.id,
                                                  step.id,
                                                  'UP',
                                                )
                                              }
                                            >
                                              ↑
                                            </button>
                                            <button
                                              className="btn ghost"
                                              type="button"
                                              onClick={() =>
                                                moveRepeatStep(
                                                  session.clientId,
                                                  block.id,
                                                  step.id,
                                                  'DOWN',
                                                )
                                              }
                                            >
                                              ↓
                                            </button>
                                            <button
                                              className="btn ghost"
                                              type="button"
                                              onClick={() =>
                                                removeRepeatStep(
                                                  session.clientId,
                                                  block.id,
                                                  step.id,
                                                )
                                              }
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                          <div className="endurance-step-grid">
                                            <label className="field">
                                              <span>Type</span>
                                              <select
                                                value={step.type}
                                                onChange={(event) =>
                                                  updateRepeatStep(
                                                    session.clientId,
                                                    block.id,
                                                    step.id,
                                                    {
                                                      type: event.target.value as EnduranceStepType,
                                                    },
                                                  )
                                                }
                                              >
                                                <option value="WARMUP">Warmup</option>
                                                <option value="WORK">Work</option>
                                                <option value="RECOVERY">Recovery</option>
                                                <option value="COOLDOWN">Cooldown</option>
                                              </select>
                                            </label>
                                            <label className="field">
                                              <span>Duration Type</span>
                                              <select
                                                value={step.durationType}
                                                onChange={(event) =>
                                                  updateRepeatStep(
                                                    session.clientId,
                                                    block.id,
                                                    step.id,
                                                    {
                                                      durationType: event.target.value as EnduranceDurationType,
                                                    },
                                                  )
                                                }
                                              >
                                                <option value="TIME">Time (sec)</option>
                                                <option value="DISTANCE">Distance (m)</option>
                                              </select>
                                            </label>
                                            <label className="field">
                                              <span>Duration</span>
                                              <input
                                                type="number"
                                                min={1}
                                                value={step.durationValue}
                                                onChange={(event) =>
                                                  updateRepeatStep(
                                                    session.clientId,
                                                    block.id,
                                                    step.id,
                                                    { durationValue: event.target.value },
                                                  )
                                                }
                                              />
                                            </label>
                                            <label className="field">
                                              <span>Target Type</span>
                                              <select
                                                value={step.targetType}
                                                onChange={(event) =>
                                                  updateRepeatStep(
                                                    session.clientId,
                                                    block.id,
                                                    step.id,
                                                    {
                                                      targetType: event.target.value as EnduranceTargetType,
                                                    },
                                                  )
                                                }
                                              >
                                                <option value="NONE">None</option>
                                                <option value="POWER">Power</option>
                                                <option value="HEART_RATE">Heart Rate</option>
                                                <option value="PACE">Pace</option>
                                              </select>
                                            </label>
                                            {step.targetType !== 'NONE' && (
                                              <>
                                                <label className="field">
                                                  <span>Zone</span>
                                                  <input
                                                    type="number"
                                                    min={1}
                                                    max={5}
                                                    value={step.targetZone ?? ''}
                                                    onChange={(event) =>
                                                      updateRepeatStep(
                                                        session.clientId,
                                                        block.id,
                                                        step.id,
                                                        { targetZone: event.target.value },
                                                      )
                                                    }
                                                    placeholder="1-5"
                                                  />
                                                  <p className="field-hint">
                                                    {step.targetType === 'POWER'
                                                      ? 'Zone (1-5) or watts range, not both'
                                                      : step.targetType === 'HEART_RATE'
                                                        ? 'Zone (1-5) or bpm range, not both'
                                                        : 'Zone (1-5) or sec/km range, not both'}
                                                  </p>
                                                </label>
                                                <label className="field">
                                                  <span>Min</span>
                                                  <input
                                                    type="number"
                                                    min={1}
                                                    value={step.targetMin ?? ''}
                                                    onChange={(event) =>
                                                      updateRepeatStep(
                                                        session.clientId,
                                                        block.id,
                                                        step.id,
                                                        { targetMin: event.target.value },
                                                      )
                                                    }
                                                    placeholder={
                                                      step.targetType === 'POWER'
                                                        ? 'e.g., 200'
                                                        : step.targetType === 'HEART_RATE'
                                                          ? 'e.g., 150'
                                                          : 'e.g., 240'
                                                    }
                                                  />
                                                </label>
                                                <label className="field">
                                                  <span>Max</span>
                                                  <input
                                                    type="number"
                                                    min={1}
                                                    value={step.targetMax ?? ''}
                                                    onChange={(event) =>
                                                      updateRepeatStep(
                                                        session.clientId,
                                                        block.id,
                                                        step.id,
                                                        { targetMax: event.target.value },
                                                      )
                                                    }
                                                    placeholder={
                                                      step.targetType === 'POWER'
                                                        ? 'e.g., 250'
                                                        : step.targetType === 'HEART_RATE'
                                                          ? 'e.g., 170'
                                                          : 'e.g., 300'
                                                    }
                                                  />
                                                </label>
                                              </>
                                            )}
                                            {session.enduranceSport === 'BIKE' && (
                                              <>
                                                <label className="field">
                                                  <span>Cadence Min (RPM)</span>
                                                  <input
                                                    type="number"
                                                    min={1}
                                                    value={step.cadenceMin ?? ''}
                                                    onChange={(event) =>
                                                      updateRepeatStep(
                                                        session.clientId,
                                                        block.id,
                                                        step.id,
                                                        { cadenceMin: event.target.value },
                                                      )
                                                    }
                                                  />
                                                </label>
                                                <label className="field">
                                                  <span>Cadence Max (RPM)</span>
                                                  <input
                                                    type="number"
                                                    min={1}
                                                    value={step.cadenceMax ?? ''}
                                                    onChange={(event) =>
                                                      updateRepeatStep(
                                                        session.clientId,
                                                        block.id,
                                                        step.id,
                                                        { cadenceMax: event.target.value },
                                                      )
                                                    }
                                                  />
                                                </label>
                                              </>
                                            )}
                                            <label className="field endurance-note">
                                              <span>Note</span>
                                              <input
                                                type="text"
                                                value={step.note ?? ''}
                                                onChange={(event) =>
                                                  updateRepeatStep(
                                                    session.clientId,
                                                    block.id,
                                                    step.id,
                                                    { note: event.target.value },
                                                  )
                                                }
                                                placeholder="Optional note"
                                              />
                                            </label>
                                          </div>
                                        </div>
                                      ))}
                                      <button
                                        className="btn ghost"
                                        type="button"
                                        onClick={() => addRepeatStep(session.clientId, block.id)}
                                      >
                                        Add Step
                                      </button>
                                    </div>
                                    {blockError && (
                                      <span className="field-error">{blockError}</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
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

        {activeTab === 'summary' && (
          <div className="card">
            <div className="card-header">
              <h2>Weekly Summary</h2>
            </div>
            <div className="summary-controls">
              <label className="field">
                <span>Athlete</span>
                <select
                  value={summaryAthleteId}
                  onChange={(event) => setSummaryAthleteId(event.target.value)}
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
                  value={summaryWeekDate}
                  onChange={(event) => setSummaryWeekDate(event.target.value)}
                />
              </label>
              <button
                className="btn"
                onClick={() => loadWeekSummary()}
                disabled={!summaryAthleteId || !summaryWeekDate || summaryLoading}
              >
                {summaryLoading ? 'Loading...' : 'Load Summary'}
              </button>
            </div>
            {summaryError && <p className="inline-error">{summaryError}</p>}
            {summaryData && (
              <div className="summary-grid">
                <div className="summary-card">
                  <p className="summary-label">Planned</p>
                  <p className="summary-value">{summaryData.plannedSessionsCount}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-label">Completed</p>
                  <p className="summary-value">{summaryData.completedSessionsCount}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-label">Missed</p>
                  <p className="summary-value">{summaryData.missedSessionsCount}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-label">Adherence</p>
                  <p className="summary-value">
                    {(summaryData.adherenceRate * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="summary-card">
                  <p className="summary-label">Strength</p>
                  <p className="summary-value">{summaryData.strengthCount}</p>
                </div>
                <div className="summary-card">
                  <p className="summary-label">Endurance</p>
                  <p className="summary-value">{summaryData.enduranceCount}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'week' && (
          <div className="card">
            <div className="card-header">
              <h2>Week View</h2>
            </div>
            <div className="summary-controls">
              <label className="field">
                <span>Athlete</span>
                <select
                  value={weekAthleteId}
                  onChange={(event) => setWeekAthleteId(event.target.value)}
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
                  value={weekDate}
                  onChange={(event) => setWeekDate(event.target.value)}
                />
              </label>
              <button
                className="btn"
                onClick={() => loadWeekSessions()}
                disabled={!weekAthleteId || !weekDate || weekLoading}
              >
                {weekLoading ? 'Loading...' : 'Load Week'}
              </button>
            </div>
            {weekError && <p className="inline-error">{weekError}</p>}
            {weekLoading && <p className="muted">Loading sessions...</p>}
            {!weekLoading && !weekError && weekSessions.length === 0 && (
              <p className="muted">No sessions in this range.</p>
            )}
            {weekSessions.length > 0 && (
              <div className="week-list">
                {groupSessionsByDay(weekSessions).map((group) => (
                  <div key={group.date} className="week-day">
                    <h3 className="week-day-title">{formatDayLabel(group.date)}</h3>
                    <div className="week-day-list">
                      {group.sessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          className="week-session"
                          onClick={() => openSessionModal(session)}
                        >
                          <div>
                            <div className="list-item-title">{session.title}</div>
                            <div className="list-item-meta">
                              <span
                                className={`chip ${
                                  session.type === 'STRENGTH'
                                    ? 'chip-strength'
                                    : 'chip-endurance'
                                }`}
                              >
                                {session.type}
                              </span>
                              {session.hasLog && <span className="badge">Log</span>}
                            </div>
                          </div>
                          <span className={`badge status-${session.status.toLowerCase()}`}>
                            {session.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedSession && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <p className="modal-title">Session Details</p>
                  <h3>{selectedSession.title}</h3>
                  <p className="modal-subtitle">
                    {selectedSession.type} • {formatDayLabel(selectedSession.date)}
                  </p>
                </div>
                <button className="btn ghost" onClick={closeSessionModal}>
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-row">
                  <span className="badge status-base">{selectedSession.status}</span>
                  {selectedSession.hasLog && <span className="badge">Log</span>}
                </div>
                {logLoading && <p className="muted">Loading log...</p>}
                {!logLoading && logError && (
                  <p className="inline-error">{logError}</p>
                )}
                {!logLoading && !logError && !selectedSession.hasLog && (
                  <p className="muted">No log for this session.</p>
                )}
                 {!logLoading && !logError && logData && (
                   <div className="log-details">
                     {selectedSession.type === 'STRENGTH' && (
                       <>
                         <div className="log-row">
                           <span className="log-label">Completed</span>
                           <span className="log-value">
                             {String(getLogField(logData.summary, 'completed') ?? '—')}
                           </span>
                         </div>
                         <div className="log-row">
                           <span className="log-label">RPE</span>
                           <span className="log-value">
                             {String(getLogField(logData.summary, 'rpe') ?? '—')}
                           </span>
                         </div>
                       </>
                     )}
                     {selectedSession.type === 'ENDURANCE' && (
                       <>
                         <div className="log-row">
                           <span className="log-label">Duration</span>
                           <span className="log-value">
                             {formatDuration(getLogField(logData.summary, 'durationSeconds'))}
                           </span>
                         </div>
                         <div className="log-row">
                           <span className="log-label">Distance</span>
                           <span className="log-value">
                             {formatDistance(getLogField(logData.summary, 'distanceMeters'))}
                           </span>
                         </div>
                         <div className="log-row">
                           <span className="log-label">Avg HR</span>
                           <span className="log-value">
                             {formatHeartRate(getLogField(logData.summary, 'avgHr'))}
                           </span>
                         </div>
                         <div className="log-row">
                           <span className="log-label">RPE</span>
                           <span className="log-value">
                             {String(getLogField(logData.summary, 'rpe') ?? '—')}
                           </span>
                         </div>
                       </>
                     )}
                     <div className="log-row">
                       <span className="log-label">Notes</span>
                       <span className="log-value">
                         {String(getLogField(logData.summary, 'notes') ?? '—')}
                       </span>
                     </div>
                     <div className="log-row">
                       <span className="log-label">Logged</span>
                       <span className="log-value">
                         {new Date(logData.createdAt).toLocaleString()}
                       </span>
                     </div>
                   </div>
                 )}
              </div>
            </div>
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

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function groupSessionsByDay(sessions: CoachWeekSession[]) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const groups: Array<{ date: string; sessions: CoachWeekSession[] }> = []
  for (const session of sorted) {
    const day = session.date.split('T')[0]
    const last = groups[groups.length - 1]
    if (!last || last.date !== day) {
      groups.push({ date: day, sessions: [session] })
    } else {
      last.sessions.push(session)
    }
  }
  return groups
}

function formatDayLabel(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`)
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function createEnduranceStepDraft(): EnduranceStepDraft {
  return {
    id: getLocalId(),
    type: 'WORK',
    durationType: 'TIME',
    durationValue: '',
    targetType: 'NONE',
  }
}

function createEnduranceStepBlock(): EnduranceBlockDraft {
  return {
    id: getLocalId(),
    kind: 'STEP',
    step: createEnduranceStepDraft(),
  }
}

function createEnduranceRepeatBlock(): EnduranceBlockDraft {
  return {
    id: getLocalId(),
    kind: 'REPEAT',
    repeat: '2',
    steps: [createEnduranceStepDraft()],
  }
}

function buildEnduranceSteps(blocks: EnduranceBlockDraft[]) {
  return blocks.map((block) => {
    if (block.kind === 'REPEAT') {
      return {
        repeat: Number(block.repeat),
        steps: block.steps.map((step) => buildEnduranceStep(step)),
      }
    }
    return buildEnduranceStep(block.step)
  })
}

function buildEnduranceStep(step: EnduranceStepDraft) {
  const durationValue = Number(step.durationValue)
  const primaryTarget = buildPrimaryTarget(step)
  const cadenceTarget = buildCadenceTarget(step)
  return {
    type: step.type,
    duration: {
      type: step.durationType,
      value: durationValue,
    },
    ...(primaryTarget && { primaryTarget }),
    ...(cadenceTarget && { cadenceTarget }),
    ...(step.note ? { note: step.note } : {}),
  }
}

function buildPrimaryTarget(step: EnduranceStepDraft) {
  if (step.targetType === 'NONE') {
    return undefined
  }
  const zoneValue = toNumber(step.targetZone)
  const minValue = toNumber(step.targetMin)
  const maxValue = toNumber(step.targetMax)
  const range =
    zoneValue !== null ? undefined : buildPrimaryRange(step.targetType, minValue, maxValue)
  return {
    kind: step.targetType,
    unit: mapPrimaryUnit(step.targetType),
    ...(zoneValue !== null && { zone: zoneValue }),
    ...(range ?? {}),
  }
}

function buildCadenceTarget(step: EnduranceStepDraft) {
  const minValue = toNumber(step.cadenceMin)
  const maxValue = toNumber(step.cadenceMax)
  if (minValue === null || maxValue === null) return undefined
  return {
    kind: 'CADENCE' as const,
    unit: 'RPM' as const,
    minRpm: minValue,
    maxRpm: maxValue,
  }
}

function mapPrimaryUnit(kind: EnduranceTargetType) {
  if (kind === 'POWER') return 'WATTS' as const
  if (kind === 'HEART_RATE') return 'BPM' as const
  return 'SEC_PER_KM' as const
}

function buildPrimaryRange(
  kind: EnduranceTargetType,
  minValue: number | null,
  maxValue: number | null,
) {
  if (minValue === null || maxValue === null) return undefined
  if (kind === 'POWER') {
    return { minWatts: minValue, maxWatts: maxValue }
  }
  if (kind === 'HEART_RATE') {
    return { minBpm: minValue, maxBpm: maxValue }
  }
  return { minSecPerKm: minValue, maxSecPerKm: maxValue }
}

function mapPrimaryRangeToDraft(target: Record<string, unknown>) {
  const legacyMin = typeof target.min === 'number' ? String(target.min) : undefined
  const legacyMax = typeof target.max === 'number' ? String(target.max) : undefined
  if (typeof target.kind !== 'string') return undefined
  if (target.kind === 'POWER') {
    return {
      min:
        typeof target.minWatts === 'number'
          ? String(target.minWatts)
          : legacyMin,
      max:
        typeof target.maxWatts === 'number'
          ? String(target.maxWatts)
          : legacyMax,
    }
  }
  if (target.kind === 'HEART_RATE') {
    return {
      min: typeof target.minBpm === 'number' ? String(target.minBpm) : legacyMin,
      max: typeof target.maxBpm === 'number' ? String(target.maxBpm) : legacyMax,
    }
  }
  if (target.kind === 'PACE') {
    return {
      min:
        typeof target.minSecPerKm === 'number'
          ? String(target.minSecPerKm)
          : legacyMin,
      max:
        typeof target.maxSecPerKm === 'number'
          ? String(target.maxSecPerKm)
          : legacyMax,
    }
  }
  return undefined
}

function toNumber(value?: string) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapEndurancePrescriptionToDraft(
  prescription: Record<string, unknown>,
): {
  sport: EnduranceSport | null
  blocks: EnduranceBlockDraft[]
  objective?: string
  notes?: string
} {
  if (prescription && typeof prescription === 'object') {
    if ('sport' in prescription && Array.isArray(prescription.steps)) {
      const sportValue = prescription.sport
      const isValidSport =
        typeof sportValue === 'string' &&
        (sportValue === 'BIKE' || sportValue === 'RUN' || sportValue === 'SWIM')
      const steps = prescription.steps as Array<Record<string, unknown>>
      const objective =
        typeof prescription.objective === 'string' ? prescription.objective : undefined
      const notes = typeof prescription.notes === 'string' ? prescription.notes : undefined
      return {
        sport: isValidSport ? (sportValue as EnduranceSport) : null,
        blocks: steps.map((step) => mapEnduranceBlock(step)),
        objective,
        notes,
      }
    }
    if ('modality' in prescription) {
      return mapLegacyEndurancePrescription(prescription)
    }
  }

  return { sport: null, blocks: [] }
}

function mapEnduranceBlock(step: Record<string, unknown>): EnduranceBlockDraft {
  if ('repeat' in step && 'steps' in step && Array.isArray(step.steps)) {
    const repeatValue = String(step.repeat ?? '2')
    const nestedSteps = step.steps as Array<Record<string, unknown>>
    return {
      id: getLocalId(),
      kind: 'REPEAT',
      repeat: repeatValue,
      steps: nestedSteps.map((nested) => mapEnduranceStep(nested)),
    }
  }
  return {
    id: getLocalId(),
    kind: 'STEP',
    step: mapEnduranceStep(step),
  }
}

function mapEnduranceStep(step: Record<string, unknown>): EnduranceStepDraft {
  const duration = isRecord(step.duration) ? step.duration : {}
  const primaryTarget = isRecord(step.primaryTarget) ? step.primaryTarget : {}
  const cadenceTarget = isRecord(step.cadenceTarget) ? step.cadenceTarget : {}
  const targetKind =
    typeof primaryTarget.kind === 'string'
      ? (primaryTarget.kind as EnduranceTargetType)
      : 'NONE'
  const targetZone =
    typeof primaryTarget.zone === 'number' ? String(primaryTarget.zone) : undefined
  const range = mapPrimaryRangeToDraft(primaryTarget)
  return {
    id: getLocalId(),
    type: (step.type as EnduranceStepType) ?? 'WORK',
    durationType: (duration.type as EnduranceDurationType) ?? 'TIME',
    durationValue:
      typeof duration.value === 'number' ? String(duration.value) : '',
    targetType: targetKind,
    targetZone,
    targetMin: range?.min,
    targetMax: range?.max,
    cadenceMin:
      typeof cadenceTarget.minRpm === 'number'
        ? String(cadenceTarget.minRpm)
        : undefined,
    cadenceMax:
      typeof cadenceTarget.maxRpm === 'number'
        ? String(cadenceTarget.maxRpm)
        : undefined,
    note: typeof step.note === 'string' ? step.note : undefined,
  }
}

function mapLegacyEndurancePrescription(
  prescription: Record<string, unknown>,
): { sport: EnduranceSport | null; blocks: EnduranceBlockDraft[]; notes?: string } {
  const modality = prescription.modality as Modality | undefined
  const sport: EnduranceSport =
    modality === 'BIKE' ? 'BIKE' : modality === 'SWIM' ? 'SWIM' : 'RUN'
  const intervals = Array.isArray(prescription.intervals)
    ? (prescription.intervals as Array<Record<string, unknown>>)
    : []
  const warmup = typeof prescription.warmup === 'string' ? prescription.warmup : ''
  const cooldown = typeof prescription.cooldown === 'string' ? prescription.cooldown : ''
  const blocks = intervals.map((interval, index) => {
    const noteParts = [
      typeof interval.targetZoneOrValue === 'string'
        ? `Legacy target: ${interval.targetZoneOrValue}`
        : undefined,
      index === 0 && warmup ? `Warmup: ${warmup}` : undefined,
      index === intervals.length - 1 && cooldown ? `Cooldown: ${cooldown}` : undefined,
    ].filter((part): part is string => Boolean(part))
    return {
      id: getLocalId(),
      kind: 'STEP' as const,
      step: {
        id: getLocalId(),
        type: 'WORK' as EnduranceStepType,
        durationType: 'TIME' as EnduranceDurationType,
        durationValue:
          typeof interval.durationSeconds === 'number'
            ? String(interval.durationSeconds)
            : '',
        targetType: 'NONE' as EnduranceTargetType,
        note: noteParts.length > 0 ? noteParts.join(' • ') : undefined,
      },
    }
  })
  const notes = [warmup && `Warmup: ${warmup}`, cooldown && `Cooldown: ${cooldown}`]
    .filter((part): part is string => Boolean(part))
    .join(' • ')
  return { sport, blocks, notes: notes.length > 0 ? notes : undefined }
}

function validateEnduranceBlocks(
  blocks: EnduranceBlockDraft[],
  sport?: EnduranceSport,
) {
  const errors: Record<string, string> = {}
  blocks.forEach((block) => {
    if (block.kind === 'STEP') {
      const error = validateEnduranceStep(block.step, sport)
      if (error) {
        errors[block.id] = error
      }
      return
    }
    if (Number(block.repeat) < 2) {
      errors[block.id] = 'Repeat count must be at least 2.'
      return
    }
    const stepErrors = block.steps
      .map((step) => validateEnduranceStep(step, sport))
      .filter(Boolean)
    if (stepErrors.length > 0) {
      errors[block.id] = 'Fix the repeat block steps.'
    }
  })
  return errors
}

function validateEnduranceStep(step: EnduranceStepDraft, sport?: EnduranceSport) {
  const durationValue = Number(step.durationValue)
  if (!step.type || !step.durationType) {
    return 'Step type and duration are required.'
  }
  if (!Number.isFinite(durationValue) || durationValue <= 0) {
    return 'Duration must be greater than 0.'
  }
  if (!step.targetType) {
    return 'Target type is required.'
  }
  if (step.targetType !== 'NONE') {
    const zone = toNumber(step.targetZone)
    const min = toNumber(step.targetMin)
    const max = toNumber(step.targetMax)
    if ((zone !== null && (min !== null || max !== null)) || (zone === null && (min === null || max === null))) {
      return 'Target needs zone or min/max.'
    }
    if ((min !== null && max === null) || (min === null && max !== null)) {
      return 'Target needs both min and max.'
    }
  }
  const cadenceMin = toNumber(step.cadenceMin)
  const cadenceMax = toNumber(step.cadenceMax)
  if (cadenceMin !== null || cadenceMax !== null) {
    if (sport !== 'BIKE') {
      return 'Cadence is only allowed for bike sessions.'
    }
    if (cadenceMin === null || cadenceMax === null) {
      return 'Cadence needs min and max.'
    }
    if (cadenceMin <= 0 || cadenceMax < cadenceMin) {
      return 'Cadence range is invalid.'
    }
  }
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function moveItem<T>(
  items: T[],
  predicate: (item: T) => boolean,
  direction: 'UP' | 'DOWN',
): T[] {
  const index = items.findIndex(predicate)
  if (index === -1) return items
  const targetIndex = direction === 'UP' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= items.length) return items
  const next = [...items]
  const temp = next[index]
  next[index] = next[targetIndex]
  next[targetIndex] = temp
  return next
}

function getLogField(summary: Record<string, unknown>, key: string) {
  if (summary && typeof summary === 'object' && key in summary) {
    return summary[key]
  }
  return undefined
}

function formatDuration(seconds: unknown): string {
  if (typeof seconds !== 'number' || seconds <= 0) {
    return '—'
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatDistance(meters: unknown): string {
  if (typeof meters !== 'number' || meters <= 0) {
    return '—'
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`
  }
  return `${meters} m`
}

function formatHeartRate(bpm: unknown): string {
  if (typeof bpm !== 'number' || bpm <= 0) {
    return '—'
  }
  return `${Math.round(bpm)} bpm`
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
