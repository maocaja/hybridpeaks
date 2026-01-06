// Utility functions for endurance workout preview calculation
// Extracted for testability

export interface EndurancePrescription {
  sport?: string
  objective?: string
  steps?: Array<{
    type?: string
    duration?: {
      type?: string
      value?: number
      seconds?: number
      meters?: number
    }
    primaryTarget?: {
      kind?: string
      zone?: number
      min?: number
      max?: number
    }
    steps?: Array<unknown> // For repeat blocks
    repeat?: number
  }>
}

export interface EndurancePreview {
  objective?: string
  duration: string
  sport: string
  primaryTarget?: string
  error?: string
}

export function calculateEndurancePreview(
  prescription: EndurancePrescription | Record<string, unknown>,
): EndurancePreview {
  try {
    // Validate prescription structure
    if (!prescription || typeof prescription !== 'object') {
      return {
        sport: 'UNKNOWN',
        duration: 'TBD',
        error: 'Invalid workout format',
      }
    }

    const sport = String(prescription.sport ?? 'BIKE').toUpperCase()
    const objective = prescription.objective as string | undefined

    // Calculate duration from steps
    let totalSeconds = 0
    const steps = Array.isArray(prescription.steps) ? prescription.steps : []

    for (const step of steps) {
      if (step && typeof step === 'object') {
        try {
          // Handle repeat blocks
          if ('repeat' in step && Array.isArray(step.steps)) {
            const repeat = Number(step.repeat) || 1
            for (const innerStep of step.steps) {
              if (
                innerStep &&
                typeof innerStep === 'object' &&
                innerStep.duration
              ) {
                if (innerStep.duration.type === 'TIME') {
                  totalSeconds +=
                    (Number(innerStep.duration.value) || 0) * repeat
                } else if (innerStep.duration.seconds) {
                  totalSeconds +=
                    (Number(innerStep.duration.seconds) || 0) * repeat
                }
              }
            }
          } else if (step.duration) {
            if (step.duration.type === 'TIME') {
              totalSeconds += Number(step.duration.value) || 0
            } else if (step.duration.seconds) {
              totalSeconds += Number(step.duration.seconds) || 0
            }
          }
        } catch (err) {
          // Skip invalid steps
          console.warn('Invalid step in workout:', err)
        }
      }
    }

    const durationMinutes =
      totalSeconds > 0 ? Math.round(totalSeconds / 60) : null
    const duration = durationMinutes ? `${durationMinutes} min` : 'TBD'

    // Get primary target from first step with target
    let primaryTarget: string | undefined
    for (const step of steps) {
      if (step && typeof step === 'object' && step.primaryTarget) {
        try {
          const target = step.primaryTarget as {
            kind?: string
            zone?: number
            min?: number
            max?: number
          }
          if (target.kind === 'POWER' && target.zone !== undefined) {
            primaryTarget = `Power Zone ${target.zone}`
            break
          } else if (target.kind === 'HEART_RATE' && target.zone !== undefined) {
            primaryTarget = `HR Zone ${target.zone}`
            break
          } else if (target.kind === 'PACE' && target.zone !== undefined) {
            primaryTarget = `Pace Zone ${target.zone}`
            break
          } else if (
            target.min !== undefined &&
            target.max !== undefined
          ) {
            primaryTarget = `${target.kind} ${target.min}-${target.max}`
            break
          }
        } catch (err) {
          // Skip invalid targets
          console.warn('Invalid target in workout:', err)
        }
      }
    }

    return {
      objective,
      duration,
      sport,
      primaryTarget,
    }
  } catch (error) {
    console.error('Error calculating endurance preview:', error)
    return {
      sport: 'UNKNOWN',
      duration: 'TBD',
      error: 'Unable to calculate preview',
    }
  }
}

