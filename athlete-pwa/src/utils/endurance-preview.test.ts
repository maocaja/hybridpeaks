import { describe, it, expect } from 'vitest'
import { calculateEndurancePreview, EndurancePrescription } from './endurance-preview'

describe('calculateEndurancePreview', () => {
  it('calculates duration from simple steps', () => {
    const prescription: EndurancePrescription = {
      sport: 'BIKE',
      objective: 'Test Ride',
      steps: [
        {
          type: 'WARMUP',
          duration: { type: 'TIME', value: 600 },
        },
        {
          type: 'WORK',
          duration: { type: 'TIME', value: 1800 },
        },
        {
          type: 'COOLDOWN',
          duration: { type: 'TIME', value: 300 },
        },
      ],
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.duration).toBe('45 min') // (600 + 1800 + 300) / 60 = 45
    expect(result.sport).toBe('BIKE')
    expect(result.objective).toBe('Test Ride')
  })

  it('calculates duration from repeat blocks', () => {
    const prescription: EndurancePrescription = {
      sport: 'RUN',
      steps: [
        {
          repeat: 4,
          steps: [
            {
              type: 'WORK',
              duration: { type: 'TIME', value: 120 },
            },
            {
              type: 'RECOVERY',
              duration: { type: 'TIME', value: 60 },
            },
          ],
        },
      ],
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.duration).toBe('12 min') // (120 + 60) * 4 / 60 = 12
  })

  it('extracts primary target with zone', () => {
    const prescription: EndurancePrescription = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WORK',
          duration: { type: 'TIME', value: 1800 },
          primaryTarget: { kind: 'POWER', zone: 3 },
        },
      ],
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.primaryTarget).toBe('Power Zone 3')
  })

  it('extracts primary target with range', () => {
    const prescription: EndurancePrescription = {
      sport: 'RUN',
      steps: [
        {
          type: 'WORK',
          duration: { type: 'TIME', value: 1200 },
          primaryTarget: { kind: 'HEART_RATE', min: 140, max: 160 },
        },
      ],
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.primaryTarget).toBe('HEART_RATE 140-160')
  })

  it('handles missing steps', () => {
    const prescription: EndurancePrescription = {
      sport: 'SWIM',
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.duration).toBe('TBD')
    expect(result.sport).toBe('SWIM')
  })

  it('handles invalid prescription', () => {
    const result = calculateEndurancePreview(null as any)

    expect(result.error).toBe('Invalid workout format')
    expect(result.sport).toBe('UNKNOWN')
  })

  it('handles empty steps array', () => {
    const prescription: EndurancePrescription = {
      sport: 'BIKE',
      steps: [],
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.duration).toBe('TBD')
    expect(result.sport).toBe('BIKE')
  })

  it('handles steps with duration in seconds format', () => {
    const prescription: EndurancePrescription = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WORK',
          duration: { seconds: 900 },
        },
      ],
    }

    const result = calculateEndurancePreview(prescription)

    expect(result.duration).toBe('15 min')
  })
})

