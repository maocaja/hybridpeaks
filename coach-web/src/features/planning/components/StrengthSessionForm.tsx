import { useState, useMemo } from 'react'
import { Button, Input, Modal } from '../../../shared/components'
import { useGetExercises } from '../hooks/useExercises'
import './StrengthSessionForm.css'

export interface StrengthExercise {
  id: string
  name: string
  sets: number
  reps: number
  targetLoadType: 'PERCENT_1RM' | 'RPE' | 'ABS'
  targetValue: number
  restSeconds?: number
  tempo?: string
}

export interface StrengthSessionFormData {
  title: string
  exercises: StrengthExercise[]
}

export interface StrengthSessionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StrengthSessionFormData) => void
  initialData?: Partial<StrengthSessionFormData>
  date: string
}

export function StrengthSessionForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  date: _date, // Used for context, not directly in form
}: StrengthSessionFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [exercises, setExercises] = useState<StrengthExercise[]>(
    initialData?.exercises || [
      {
        id: '',
        name: '',
        sets: 3,
        reps: 10,
        targetLoadType: 'RPE',
        targetValue: 7,
      },
    ],
  )
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [showExercisePicker, setShowExercisePicker] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: allExercises = [], isLoading: exercisesLoading } = useGetExercises(
    exerciseSearch || undefined,
  )

  const strengthExercises = useMemo(() => {
    return allExercises.filter((ex) => ex.type === 'STRENGTH')
  }, [allExercises])

  const handleAddExercise = () => {
    setExercises([
      ...exercises,
      {
        id: '',
        name: '',
        sets: 3,
        reps: 10,
        targetLoadType: 'RPE',
        targetValue: 7,
      },
    ])
  }

  const handleRemoveExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index))
    }
  }

  const handleExerciseSelect = (index: number, exercise: { id: string; name: string }) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], id: exercise.id, name: exercise.name }
    setExercises(updated)
    setShowExercisePicker(null)
    setExerciseSearch('')
  }

  const handleExerciseChange = (
    index: number,
    field: keyof StrengthExercise,
    value: string | number | undefined,
  ) => {
    const updated = [...exercises]
    updated[index] = { ...updated[index], [field]: value }
    setExercises(updated)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }

    exercises.forEach((exercise, index) => {
      if (!exercise.id || !exercise.name) {
        newErrors[`exercise-${index}-name`] = 'Exercise is required'
      }
      if (exercise.sets < 1) {
        newErrors[`exercise-${index}-sets`] = 'Sets must be at least 1'
      }
      if (exercise.reps < 1) {
        newErrors[`exercise-${index}-reps`] = 'Reps must be at least 1'
      }
      if (exercise.targetValue < 1) {
        newErrors[`exercise-${index}-targetValue`] = 'Target value must be at least 1'
      }
      if (exercise.targetLoadType === 'PERCENT_1RM' && exercise.targetValue > 100) {
        newErrors[`exercise-${index}-targetValue`] = 'Percentage cannot exceed 100'
      }
      if (exercise.targetLoadType === 'RPE' && exercise.targetValue > 10) {
        newErrors[`exercise-${index}-targetValue`] = 'RPE cannot exceed 10'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({ title, exercises })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Strength Session"
      size="large"
      footer={
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={(e) => {
              e.preventDefault()
              handleSubmit(e as any)
            }}
          >
            Save Session
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="strength-session-form">
        <div className="form-group">
          <Input
            label="Session Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g., Upper Body Strength"
            required
          />
        </div>

        <div className="form-group">
          <div className="form-section-header">
            <h3>Exercises</h3>
            <Button type="button" variant="ghost" size="small" onClick={handleAddExercise}>
              + Add Exercise
            </Button>
          </div>

          {exercises.map((exercise, index) => (
            <div key={index} className="exercise-item">
              <div className="exercise-header">
                <span className="exercise-number">Exercise {index + 1}</span>
                {exercises.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => handleRemoveExercise(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="exercise-fields">
                <div className="form-group">
                  <label>
                    Exercise
                    <div className="exercise-picker-wrapper">
                      <input
                        type="text"
                        value={exercise.name || ''}
                        placeholder="Search and select exercise..."
                        readOnly
                        onClick={() => setShowExercisePicker(index)}
                        className={errors[`exercise-${index}-name`] ? 'input-error' : ''}
                      />
                      {errors[`exercise-${index}-name`] && (
                        <span className="field-error">{errors[`exercise-${index}-name`]}</span>
                      )}
                      {showExercisePicker === index && (
                        <div className="exercise-picker-dropdown">
                          <input
                            type="text"
                            placeholder="Search exercises..."
                            value={exerciseSearch}
                            onChange={(e) => setExerciseSearch(e.target.value)}
                            autoFocus
                            className="exercise-search-input"
                          />
                          {exercisesLoading ? (
                            <div className="exercise-picker-loading">Loading...</div>
                          ) : strengthExercises.length === 0 ? (
                            <div className="exercise-picker-empty">No exercises found</div>
                          ) : (
                            <div className="exercise-picker-list">
                              {strengthExercises.map((ex) => (
                                <button
                                  key={ex.id}
                                  type="button"
                                  className="exercise-picker-item"
                                  onClick={() => handleExerciseSelect(index, ex)}
                                >
                                  {ex.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="exercise-row">
                  <div className="form-group">
                    <Input
                      label="Sets"
                      type="number"
                      min={1}
                      value={exercise.sets.toString()}
                      onChange={(e) =>
                        handleExerciseChange(index, 'sets', parseInt(e.target.value) || 1)
                      }
                      error={errors[`exercise-${index}-sets`]}
                    />
                  </div>

                  <div className="form-group">
                    <Input
                      label="Reps"
                      type="number"
                      min={1}
                      value={exercise.reps.toString()}
                      onChange={(e) =>
                        handleExerciseChange(index, 'reps', parseInt(e.target.value) || 1)
                      }
                      error={errors[`exercise-${index}-reps`]}
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Intensity Type
                      <select
                        value={exercise.targetLoadType}
                        onChange={(e) =>
                          handleExerciseChange(
                            index,
                            'targetLoadType',
                            e.target.value as 'PERCENT_1RM' | 'RPE' | 'ABS',
                          )
                        }
                      >
                        <option value="PERCENT_1RM">% 1RM</option>
                        <option value="RPE">RPE</option>
                        <option value="ABS">Absolute (kg)</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-group">
                    <Input
                      label={
                        exercise.targetLoadType === 'PERCENT_1RM'
                          ? '% 1RM'
                          : exercise.targetLoadType === 'RPE'
                            ? 'RPE'
                            : 'Weight (kg)'
                      }
                      type="number"
                      min={1}
                      max={exercise.targetLoadType === 'PERCENT_1RM' ? 100 : exercise.targetLoadType === 'RPE' ? 10 : undefined}
                      value={exercise.targetValue.toString()}
                      onChange={(e) =>
                        handleExerciseChange(index, 'targetValue', parseFloat(e.target.value) || 1)
                      }
                      error={errors[`exercise-${index}-targetValue`]}
                    />
                  </div>
                </div>

                <div className="exercise-row">
                  <div className="form-group">
                    <Input
                      label="Rest (seconds)"
                      type="number"
                      min={0}
                      value={exercise.restSeconds?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value
                        handleExerciseChange(
                          index,
                          'restSeconds',
                          value ? parseInt(value) || undefined : undefined,
                        )
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <Input
                      label="Tempo (optional)"
                      value={exercise.tempo || ''}
                      onChange={(e) => handleExerciseChange(index, 'tempo', e.target.value)}
                      placeholder="e.g., 3-1-1-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  )
}

