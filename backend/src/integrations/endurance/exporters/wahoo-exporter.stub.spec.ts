import { WahooExporterStub } from './wahoo-exporter.stub';
import { NormalizedWorkout } from '../endurance-normalizer';

describe('WahooExporterStub', () => {
  let exporter: WahooExporterStub;

  beforeEach(() => {
    exporter = new WahooExporterStub();
  });

  describe('build', () => {
    it('returns ExportPayload', () => {
      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: { seconds: 600 },
            primaryTarget: {
              kind: 'POWER',
              unit: 'WATTS',
              zone: 1,
            },
          },
        ],
      };

      const result = exporter.build(workout);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('payload includes all workout fields (sport, objective, notes)', () => {
      const workout: NormalizedWorkout = {
        sport: 'RUN',
        steps: [],
        objective: 'Test workout',
        notes: 'Test notes',
      };

      const result = exporter.build(workout);

      expect(result).toHaveProperty('sport', 'RUN');

      expect(result).toHaveProperty('workoutName', 'Test workout');

      expect(result).toHaveProperty('notes', 'Test notes');
    });

    it('payload includes all steps with correct structure', () => {
      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WARMUP',
            duration: { seconds: 600 },
          },
          {
            type: 'WORK',
            duration: { seconds: 1800 },
          },
        ],
      };

      const result = exporter.build(workout);

      expect(result).toHaveProperty('intervals');

      expect(Array.isArray(result.intervals)).toBe(true);

      expect((result.intervals as unknown[]).length).toBe(2);
    });

    it('handles steps with primary targets (power)', () => {
      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 300 },
            primaryTarget: {
              kind: 'POWER',
              unit: 'WATTS',
              zone: 3,
            },
          },
        ],
      };

      const result = exporter.build(workout);

      const intervals = result.intervals as unknown[];
      expect(intervals.length).toBe(1);
      const interval = intervals[0] as Record<string, unknown>;
      expect(interval).toHaveProperty('targets');

      const targets = interval.targets as Record<string, unknown>;
      expect(targets).toHaveProperty('power');
    });

    it('handles steps with primary targets (heart rate)', () => {
      const workout: NormalizedWorkout = {
        sport: 'RUN',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 600 },
            primaryTarget: {
              kind: 'HEART_RATE',
              unit: 'BPM',
              min: 140,
              max: 160,
            },
          },
        ],
      };

      const result = exporter.build(workout);

      const intervals = result.intervals as unknown[];
      const interval = intervals[0] as Record<string, unknown>;

      const targets = interval.targets as Record<string, unknown>;
      expect(targets).toHaveProperty('heartRate');
    });

    it('handles steps with primary targets (pace)', () => {
      const workout: NormalizedWorkout = {
        sport: 'RUN',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 420 },
            primaryTarget: {
              kind: 'PACE',
              unit: 'SEC_PER_KM',
              min: 240,
              max: 270,
            },
          },
        ],
      };

      const result = exporter.build(workout);

      const intervals = result.intervals as unknown[];
      const interval = intervals[0] as Record<string, unknown>;

      const targets = interval.targets as Record<string, unknown>;
      expect(targets).toHaveProperty('pace');
    });

    it('handles steps with cadence targets (bike)', () => {
      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 300 },
            cadenceTarget: {
              minRpm: 85,
              maxRpm: 95,
            },
          },
        ],
      };

      const result = exporter.build(workout);

      const intervals = result.intervals as unknown[];
      const interval = intervals[0] as Record<string, unknown>;

      const targets = interval.targets as Record<string, unknown>;
      expect(targets).toHaveProperty('cadence');

      const cadence = targets.cadence as Record<string, unknown>;
      expect(cadence).toHaveProperty('minRpm', 85);
      expect(cadence).toHaveProperty('maxRpm', 95);
    });

    it('handles steps with no targets', () => {
      const workout: NormalizedWorkout = {
        sport: 'SWIM',
        steps: [
          {
            type: 'RECOVERY',
            duration: { seconds: 60 },
          },
        ],
      };

      const result = exporter.build(workout);

      const intervals = result.intervals as unknown[];
      expect(intervals.length).toBe(1);
      const interval = intervals[0] as Record<string, unknown>;
      expect(interval).toHaveProperty('type', 'RECOVERY');
      expect(interval).toHaveProperty('duration');
    });

    it('handles empty steps array', () => {
      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [],
      };

      const result = exporter.build(workout);

      expect(result).toHaveProperty('intervals');

      expect(Array.isArray(result.intervals)).toBe(true);

      expect((result.intervals as unknown[]).length).toBe(0);
    });

    it('payload structure differs from Garmin format', () => {
      const workout: NormalizedWorkout = {
        sport: 'BIKE',
        steps: [
          {
            type: 'WORK',
            duration: { seconds: 300 },
            primaryTarget: {
              kind: 'POWER',
              unit: 'WATTS',
              zone: 3,
            },
          },
        ],
      };

      const result = exporter.build(workout);

      // Wahoo uses 'intervals' instead of 'steps'

      expect(result).toHaveProperty('intervals');

      expect(result).not.toHaveProperty('steps');

      // Wahoo uses 'workoutName' instead of 'objective'

      expect(result).toHaveProperty('workoutName');

      expect(result).not.toHaveProperty('objective');

      // Wahoo uses different platform identifier

      expect(result).toHaveProperty('platform', 'WAHOO');
    });
  });
});
