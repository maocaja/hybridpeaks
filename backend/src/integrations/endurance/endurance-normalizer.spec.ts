import {
  normalizeEnduranceWorkout,
  EndurancePrescription,
} from './endurance-normalizer';

describe('normalizeEnduranceWorkout', () => {
  it('normalizes simple steps with power zone targets', () => {
    const input: EndurancePrescription = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WARMUP',
          duration: { type: 'TIME', value: 600 },
          primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
        },
        {
          type: 'WORK',
          duration: { type: 'TIME', value: 900 },
          primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 3 },
        },
        {
          type: 'COOLDOWN',
          duration: { type: 'TIME', value: 300 },
          primaryTarget: { kind: 'POWER', unit: 'WATTS', zone: 1 },
        },
      ],
    };

    const output = normalizeEnduranceWorkout(input);

    expect(output.steps).toHaveLength(3);
    expect(output.steps[0].duration.seconds).toBe(600);
    expect(output.steps[0].primaryTarget).toEqual({
      kind: 'POWER',
      unit: 'WATTS',
      zone: 1,
    });
  });

  it('expands repeat blocks into linear steps', () => {
    const input: EndurancePrescription = {
      sport: 'RUN',
      steps: [
        {
          repeat: 4,
          steps: [
            {
              type: 'WORK',
              duration: { type: 'TIME', value: 120 },
              primaryTarget: { kind: 'PACE', unit: 'SEC_PER_KM', zone: 4 },
            },
            {
              type: 'RECOVERY',
              duration: { type: 'TIME', value: 60 },
            },
          ],
        },
      ],
    };

    const output = normalizeEnduranceWorkout(input);

    expect(output.steps).toHaveLength(8);
    expect(output.steps[0].type).toBe('WORK');
    expect(output.steps[1].type).toBe('RECOVERY');
    expect(output.steps[2].type).toBe('WORK');
  });

  it('keeps cadence targets for bike workouts', () => {
    const input: EndurancePrescription = {
      sport: 'BIKE',
      steps: [
        {
          type: 'WORK',
          duration: { type: 'TIME', value: 300 },
          cadenceTarget: {
            kind: 'CADENCE',
            unit: 'RPM',
            minRpm: 85,
            maxRpm: 95,
          },
        },
      ],
    };

    const output = normalizeEnduranceWorkout(input);

    expect(output.steps[0].cadenceTarget).toEqual({
      minRpm: 85,
      maxRpm: 95,
    });
  });

  it('normalizes pace min/max targets for runs', () => {
    const input: EndurancePrescription = {
      sport: 'RUN',
      steps: [
        {
          type: 'WORK',
          duration: { type: 'TIME', value: 420 },
          primaryTarget: {
            kind: 'PACE',
            unit: 'SEC_PER_KM',
            minSecPerKm: 240,
            maxSecPerKm: 270,
          },
        },
      ],
    };

    const output = normalizeEnduranceWorkout(input);

    expect(output.steps[0].primaryTarget).toEqual({
      kind: 'PACE',
      unit: 'SEC_PER_KM',
      min: 240,
      max: 270,
    });
  });

  it('supports swim distance durations with pace zone', () => {
    const input: EndurancePrescription = {
      sport: 'SWIM',
      steps: [
        {
          type: 'WORK',
          duration: { type: 'DISTANCE', value: 400 },
          primaryTarget: { kind: 'PACE', unit: 'SEC_PER_KM', zone: 2 },
        },
      ],
    };

    const output = normalizeEnduranceWorkout(input);

    expect(output.steps[0].duration.meters).toBe(400);
    expect(output.steps[0].primaryTarget).toEqual({
      kind: 'PACE',
      unit: 'SEC_PER_KM',
      zone: 2,
    });
  });
});
