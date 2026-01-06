import { useState } from 'react'
import { Button, Input, Modal } from '../../../shared/components'
import './EnduranceSessionForm.css'

export interface EnduranceStep {
  type: 'WARMUP' | 'WORK' | 'RECOVERY' | 'COOLDOWN'
  durationType: 'TIME' | 'DISTANCE'
  durationValue: number
  targetKind?: 'POWER' | 'HEART_RATE' | 'PACE'
  targetZone?: number
  targetMin?: number
  targetMax?: number
  cadenceMin?: number
  cadenceMax?: number
  note?: string
}

export interface EnduranceSessionFormData {
  title: string
  sport: 'BIKE' | 'RUN' | 'SWIM'
  objective?: string
  notes?: string
  steps: EnduranceStep[]
}

export interface EnduranceSessionFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EnduranceSessionFormData) => void
  initialData?: Partial<EnduranceSessionFormData>
  date: string // Used for context, not directly in form
}

export function EnduranceSessionForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  date: _date, // Used for context, not directly in form
}: EnduranceSessionFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [sport, setSport] = useState<'BIKE' | 'RUN' | 'SWIM'>(initialData?.sport || 'BIKE')
  const [objective, setObjective] = useState(initialData?.objective || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [steps, setSteps] = useState<EnduranceStep[]>(
    initialData?.steps || [
      {
        type: 'WARMUP',
        durationType: 'TIME',
        durationValue: 600, // 10 minutes
      },
    ],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        type: 'WORK',
        durationType: 'TIME',
        durationValue: 1800, // 30 minutes
      },
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const handleStepChange = (
    index: number,
    field: keyof EnduranceStep,
    value: string | number | undefined,
  ) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: value }
    setSteps(updated)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = 'Title is required'
    }

    steps.forEach((step, index) => {
      if (step.durationValue < 1) {
        newErrors[`step-${index}-duration`] = 'Duration must be at least 1'
      }
      if (step.targetZone && (step.targetZone < 1 || step.targetZone > 5)) {
        newErrors[`step-${index}-targetZone`] = 'Zone must be between 1 and 5'
      }
      if (step.targetMin && step.targetMax && step.targetMin >= step.targetMax) {
        newErrors[`step-${index}-targetRange`] = 'Min must be less than Max'
      }
      if (sport === 'BIKE' && step.cadenceMin && step.cadenceMax && step.cadenceMin >= step.cadenceMax) {
        newErrors[`step-${index}-cadence`] = 'Cadence min must be less than max'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSubmit({ title, sport, objective, notes, steps })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Endurance Session"
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
      <form onSubmit={handleSubmit} className="endurance-session-form">
        <div className="form-group">
          <Input
            label="Session Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="e.g., Long Zone 2 Ride"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>
              Sport
              <select value={sport} onChange={(e) => setSport(e.target.value as 'BIKE' | 'RUN' | 'SWIM')}>
                <option value="BIKE">Bike</option>
                <option value="RUN">Run</option>
                <option value="SWIM">Swim</option>
              </select>
            </label>
          </div>
        </div>

        <div className="form-group">
          <Input
            label="Objective (optional)"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Primary training objective"
          />
        </div>

        <div className="form-group">
          <label>
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </label>
        </div>

        <div className="form-group">
          <div className="form-section-header">
            <h3>Workout Steps</h3>
            <Button type="button" variant="ghost" size="small" onClick={handleAddStep}>
              + Add Step
            </Button>
          </div>

          {steps.map((step, index) => (
            <div key={index} className="step-item">
              <div className="step-header">
                <span className="step-number">Step {index + 1}</span>
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => handleRemoveStep(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="step-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Step Type
                      <select
                        value={step.type}
                        onChange={(e) =>
                          handleStepChange(index, 'type', e.target.value as EnduranceStep['type'])
                        }
                      >
                        <option value="WARMUP">Warmup</option>
                        <option value="WORK">Work</option>
                        <option value="RECOVERY">Recovery</option>
                        <option value="COOLDOWN">Cooldown</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      Duration Type
                      <select
                        value={step.durationType}
                        onChange={(e) =>
                          handleStepChange(
                            index,
                            'durationType',
                            e.target.value as 'TIME' | 'DISTANCE',
                          )
                        }
                      >
                        <option value="TIME">Time (seconds)</option>
                        <option value="DISTANCE">Distance (meters)</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-group">
                    <Input
                      label={step.durationType === 'TIME' ? 'Duration (seconds)' : 'Distance (meters)'}
                      type="number"
                      min={1}
                      value={step.durationValue.toString()}
                      onChange={(e) =>
                        handleStepChange(index, 'durationValue', parseInt(e.target.value) || 1)
                      }
                      error={errors[`step-${index}-duration`]}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Target Type
                      <select
                        value={step.targetKind || ''}
                        onChange={(e) =>
                          handleStepChange(
                            index,
                            'targetKind',
                            e.target.value || undefined,
                          )
                        }
                      >
                        <option value="">None</option>
                        {sport === 'BIKE' && <option value="POWER">Power</option>}
                        <option value="HEART_RATE">Heart Rate</option>
                        {(sport === 'RUN' || sport === 'SWIM') && <option value="PACE">Pace</option>}
                      </select>
                    </label>
                  </div>

                  {step.targetKind && (
                    <>
                      <div className="form-group">
                        <Input
                          label="Zone (1-5)"
                          type="number"
                          min={1}
                          max={5}
                          value={step.targetZone?.toString() || ''}
                          onChange={(e) =>
                            handleStepChange(
                              index,
                              'targetZone',
                              e.target.value ? parseInt(e.target.value) : undefined,
                            )
                          }
                          error={errors[`step-${index}-targetZone`]}
                        />
                      </div>

                      <div className="form-group">
                        <Input
                          label="Min"
                          type="number"
                          min={1}
                          value={step.targetMin?.toString() || ''}
                          onChange={(e) =>
                            handleStepChange(
                              index,
                              'targetMin',
                              e.target.value ? parseFloat(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>

                      <div className="form-group">
                        <Input
                          label="Max"
                          type="number"
                          min={1}
                          value={step.targetMax?.toString() || ''}
                          onChange={(e) =>
                            handleStepChange(
                              index,
                              'targetMax',
                              e.target.value ? parseFloat(e.target.value) : undefined,
                            )
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                {sport === 'BIKE' && (
                  <div className="form-row">
                    <div className="form-group">
                      <Input
                        label="Cadence Min (RPM)"
                        type="number"
                        min={1}
                        value={step.cadenceMin?.toString() || ''}
                        onChange={(e) =>
                          handleStepChange(
                            index,
                            'cadenceMin',
                            e.target.value ? parseInt(e.target.value) : undefined,
                          )
                        }
                      />
                    </div>

                    <div className="form-group">
                      <Input
                        label="Cadence Max (RPM)"
                        type="number"
                        min={1}
                        value={step.cadenceMax?.toString() || ''}
                        onChange={(e) =>
                          handleStepChange(
                            index,
                            'cadenceMax',
                            e.target.value ? parseInt(e.target.value) : undefined,
                          )
                        }
                        error={errors[`step-${index}-cadence`]}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <Input
                    label="Note (optional)"
                    value={step.note || ''}
                    onChange={(e) => handleStepChange(index, 'note', e.target.value)}
                    placeholder="Step-specific notes"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  )
}

