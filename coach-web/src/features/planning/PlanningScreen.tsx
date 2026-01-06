import { useState, useMemo, useEffect } from 'react'
import { useGetWeeklyPlan, useCreateWeeklyPlan, useUpdateWeeklyPlan, type WeeklyPlanSession } from './hooks/useWeeklyPlan'
import { LoadingSpinner, Button } from '../../shared/components'
import { WeeklyCalendar, AthleteSelector, WeekSelector } from './components'
import { StrengthSessionForm, type StrengthSessionFormData } from './components/StrengthSessionForm'
import { EnduranceSessionForm, type EnduranceSessionFormData } from './components/EnduranceSessionForm'
import { SessionTypeSelector } from './components/SessionTypeSelector'
import { formatDate } from './utils/dateUtils'
import './PlanningScreen.css'

/**
 * Get next Monday from today
 */
function getNextMonday(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + diff)
  return formatDate(nextMonday)
}

/**
 * Main planning screen for coaches
 * This is the entry point for the planning feature
 */
export function PlanningScreen() {
  const [athleteId, setAthleteId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<string | null>(getNextMonday())

  // Modal states
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showStrengthForm, setShowStrengthForm] = useState(false)
  const [showEnduranceForm, setShowEnduranceForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<WeeklyPlanSession | null>(null)

  // Local draft state for unsaved sessions
  const [draftSessions, setDraftSessions] = useState<WeeklyPlanSession[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { data: weeklyPlan, isLoading, error } = useGetWeeklyPlan(athleteId, weekStart)
  const createPlanMutation = useCreateWeeklyPlan()
  const updatePlanMutation = useUpdateWeeklyPlan()

  // Initialize draft sessions when plan loads or changes
  useEffect(() => {
    if (weeklyPlan) {
      setDraftSessions(weeklyPlan.sessions)
      setHasUnsavedChanges(false)
    } else if (weeklyPlan === null) {
      // No plan exists, start with empty draft
      setDraftSessions([])
      setHasUnsavedChanges(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyPlan?.id, weekStart, athleteId]) // Only reset when plan ID, week, or athlete changes

  const sessions = useMemo(() => {
    // Use draft sessions if there are unsaved changes, otherwise use plan sessions
    if (hasUnsavedChanges) {
      return draftSessions
    }
    if (weeklyPlan === null) return []
    return weeklyPlan?.sessions || []
  }, [draftSessions, hasUnsavedChanges, weeklyPlan])

  const handleSessionClick = (session: WeeklyPlanSession) => {
    setEditingSession(session)
    setSelectedDate(session.date)
    if (session.type === 'STRENGTH') {
      setShowStrengthForm(true)
    } else {
      setShowEnduranceForm(true)
    }
  }

  const handleSessionEdit = (session: WeeklyPlanSession) => {
    handleSessionClick(session)
  }

  const handleSessionDelete = (session: WeeklyPlanSession) => {
    if (confirm(`Are you sure you want to delete "${session.title}"?`)) {
      const updated = draftSessions.filter((s) => s.id !== session.id)
      setDraftSessions(updated)
      setHasUnsavedChanges(true)
    }
  }

  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    setEditingSession(null)
    setShowTypeSelector(true)
  }

  const handleTypeSelect = (type: 'STRENGTH' | 'ENDURANCE') => {
    // Close type selector first
    setShowTypeSelector(false)
    // Use requestAnimationFrame to ensure state updates are processed in the next frame
    // This prevents React from batching the state updates incorrectly
    requestAnimationFrame(() => {
      if (type === 'STRENGTH') {
        setShowStrengthForm(true)
      } else {
        setShowEnduranceForm(true)
      }
    })
  }

  const buildStrengthPrescription = (data: StrengthSessionFormData) => {
    return {
      items: data.exercises.map((ex) => ({
        exerciseId: ex.id,
        exerciseNameSnapshot: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        targetLoadType: ex.targetLoadType,
        targetValue: ex.targetValue,
        restSeconds: ex.restSeconds,
        tempo: ex.tempo,
      })),
    }
  }

  const buildEndurancePrescription = (data: EnduranceSessionFormData) => {
    return {
      sport: data.sport,
      steps: data.steps.map((step) => {
        const stepData: any = {
          type: step.type,
          duration: {
            type: step.durationType,
            value: step.durationValue,
          },
        }

        if (step.targetKind) {
          stepData.primaryTarget = {
            kind: step.targetKind,
            unit:
              step.targetKind === 'POWER'
                ? 'WATTS'
                : step.targetKind === 'HEART_RATE'
                  ? 'BPM'
                  : 'SEC_PER_KM',
            ...(step.targetZone && { zone: step.targetZone }),
            ...(step.targetMin &&
              step.targetKind === 'POWER' && { minWatts: step.targetMin }),
            ...(step.targetMax &&
              step.targetKind === 'POWER' && { maxWatts: step.targetMax }),
            ...(step.targetMin &&
              step.targetKind === 'HEART_RATE' && { minBpm: step.targetMin }),
            ...(step.targetMax &&
              step.targetKind === 'HEART_RATE' && { maxBpm: step.targetMax }),
            ...(step.targetMin &&
              step.targetKind === 'PACE' && { minSecPerKm: step.targetMin }),
            ...(step.targetMax &&
              step.targetKind === 'PACE' && { maxSecPerKm: step.targetMax }),
          }
        }

        if (data.sport === 'BIKE' && step.cadenceMin && step.cadenceMax) {
          stepData.cadenceTarget = {
            kind: 'CADENCE',
            unit: 'RPM',
            minRpm: step.cadenceMin,
            maxRpm: step.cadenceMax,
          }
        }

        if (step.note) {
          stepData.note = step.note
        }

        return stepData
      }),
      ...(data.objective && { objective: data.objective }),
      ...(data.notes && { notes: data.notes }),
    }
  }

  const handleStrengthSubmit = (data: StrengthSessionFormData) => {
    if (!selectedDate) return

    const prescription = buildStrengthPrescription(data)
    const newSession: WeeklyPlanSession = {
      id: editingSession?.id || `draft-${Date.now()}`,
      date: selectedDate,
      type: 'STRENGTH',
      title: data.title,
      prescription,
    }

    if (editingSession) {
      // Update existing session
      const updated = draftSessions.map((s) => (s.id === editingSession.id ? newSession : s))
      setDraftSessions(updated)
    } else {
      // Add new session
      setDraftSessions([...draftSessions, newSession])
    }

    setHasUnsavedChanges(true)
    setShowStrengthForm(false)
    setSelectedDate(null)
    setEditingSession(null)
  }

  const handleEnduranceSubmit = (data: EnduranceSessionFormData) => {
    if (!selectedDate) return

    const prescription = buildEndurancePrescription(data)
    const newSession: WeeklyPlanSession = {
      id: editingSession?.id || `draft-${Date.now()}`,
      date: selectedDate,
      type: 'ENDURANCE',
      title: data.title,
      prescription,
    }

    if (editingSession) {
      // Update existing session
      const updated = draftSessions.map((s) => (s.id === editingSession.id ? newSession : s))
      setDraftSessions(updated)
    } else {
      // Add new session
      setDraftSessions([...draftSessions, newSession])
    }

    setHasUnsavedChanges(true)
    setShowEnduranceForm(false)
    setSelectedDate(null)
    setEditingSession(null)
  }

  const handleCloseForms = () => {
    setShowStrengthForm(false)
    setShowEnduranceForm(false)
    setShowTypeSelector(false)
    setSelectedDate(null)
    setEditingSession(null)
  }

  const handleSavePlan = async () => {
    if (!athleteId || !weekStart || sessions.length === 0) return

    try {
      const sessionsToSave = sessions.map((session) => ({
        date: session.date,
        type: session.type,
        title: session.title,
        prescription: session.prescription,
      }))

      if (weeklyPlan) {
        // Update existing plan
        await updatePlanMutation.mutateAsync({
          planId: weeklyPlan.id,
          data: {
            sessions: sessionsToSave,
          },
        })
      } else {
        // Create new plan
        await createPlanMutation.mutateAsync({
          athleteId,
          data: {
            weekStart,
            sessions: sessionsToSave,
          },
        })
      }

      setHasUnsavedChanges(false)
      // The query will automatically refetch after mutation success
    } catch (error) {
      console.error('Failed to save plan:', error)
      alert(`Failed to save plan: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="planning-screen">
      <div className="planning-header">
        <h1>Weekly Planning</h1>
        <p>Create and manage weekly training plans for your athletes</p>
      </div>

      <div className="planning-controls">
        <div className="planning-control-group">
          <label className="planning-control-label">Athlete</label>
          <AthleteSelector value={athleteId} onChange={setAthleteId} />
        </div>
        <div className="planning-control-group">
          <label className="planning-control-label">Week</label>
          <WeekSelector value={weekStart} onChange={setWeekStart} />
        </div>
        {athleteId && weekStart && (
          <div className="planning-control-group">
            <Button
              variant="primary"
              size="medium"
              onClick={handleSavePlan}
              disabled={
                !hasUnsavedChanges ||
                createPlanMutation.isPending ||
                updatePlanMutation.isPending ||
                sessions.length === 0
              }
              loading={createPlanMutation.isPending || updatePlanMutation.isPending}
            >
              {hasUnsavedChanges ? 'Save Plan' : 'Plan Saved'}
            </Button>
            {hasUnsavedChanges && (
              <span className="unsaved-indicator">• Unsaved changes</span>
            )}
          </div>
        )}
      </div>

      <div className="planning-content">
        {!athleteId ? (
          <div className="planning-empty">
            <p>Please select an athlete to view their weekly plan</p>
          </div>
        ) : isLoading ? (
          <div className="planning-loading">
            <LoadingSpinner size="large" />
            <p>Loading plan...</p>
          </div>
        ) : error && weeklyPlan !== null ? (
          // Only show error if we didn't get null (which means 404 - no plan exists)
          <div className="planning-error">
            <p>Failed to load plan: {error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {(createPlanMutation.isError || updatePlanMutation.isError) && (
              <div className="planning-error">
                <p>
                  Failed to save plan:{' '}
                  {(createPlanMutation.error || updatePlanMutation.error) instanceof Error
                    ? (createPlanMutation.error || updatePlanMutation.error)?.message
                    : 'Unknown error'}
                </p>
              </div>
            )}
            {createPlanMutation.isSuccess && (
              <div className="planning-success">
                <p>Plan saved successfully!</p>
              </div>
            )}
            {/* Show calendar even if weeklyPlan is null (404 - no plan exists yet) */}
            <WeeklyCalendar
              weekStart={weekStart || getNextMonday()}
              sessions={sessions}
              onSessionClick={handleSessionClick}
              onSessionEdit={handleSessionEdit}
              onSessionDelete={handleSessionDelete}
              onDayClick={handleDayClick}
            />
          </>
        )}
      </div>

      {/* Session Type Selector */}
      <SessionTypeSelector
        isOpen={showTypeSelector}
        onClose={() => {
          setShowTypeSelector(false)
          setSelectedDate(null)
        }}
        onSelectType={handleTypeSelect}
      />

      {/* Session Forms */}
      {selectedDate && (
        <>
          <StrengthSessionForm
            isOpen={showStrengthForm}
            onClose={handleCloseForms}
            onSubmit={handleStrengthSubmit}
            date={selectedDate}
            initialData={
              editingSession
                ? {
                    title: editingSession.title,
                    exercises: (editingSession.prescription as any)?.items?.map((item: any) => ({
                      id: item.exerciseId,
                      name: item.exerciseNameSnapshot,
                      sets: item.sets,
                      reps: item.reps,
                      targetLoadType: item.targetLoadType,
                      targetValue: item.targetValue,
                      restSeconds: item.restSeconds,
                      tempo: item.tempo,
                    })) || [],
                  }
                : undefined
            }
          />
          <EnduranceSessionForm
            isOpen={showEnduranceForm}
            onClose={handleCloseForms}
            onSubmit={handleEnduranceSubmit}
            date={selectedDate}
            initialData={
              editingSession
                ? {
                    title: editingSession.title,
                    sport: (editingSession.prescription as any)?.sport || 'BIKE',
                    objective: (editingSession.prescription as any)?.objective,
                    notes: (editingSession.prescription as any)?.notes,
                    steps: (editingSession.prescription as any)?.steps?.map((step: any) => ({
                      type: step.type,
                      durationType: step.duration?.type || 'TIME',
                      durationValue: step.duration?.value || 0,
                      targetKind: step.primaryTarget?.kind,
                      targetZone: step.primaryTarget?.zone,
                      targetMin: step.primaryTarget?.minWatts || step.primaryTarget?.minBpm || step.primaryTarget?.minSecPerKm,
                      targetMax: step.primaryTarget?.maxWatts || step.primaryTarget?.maxBpm || step.primaryTarget?.maxSecPerKm,
                      cadenceMin: step.cadenceTarget?.minRpm,
                      cadenceMax: step.cadenceTarget?.maxRpm,
                      note: step.note,
                    })) || [],
                  }
                : undefined
            }
          />
        </>
      )}
    </div>
  )
}

