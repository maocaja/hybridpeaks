import { EnduranceExporter, ExportPayload } from './exporter';
import { NormalizedWorkout } from '../endurance-normalizer';

export class WahooExporterStub implements EnduranceExporter {
  build(workout: NormalizedWorkout): ExportPayload {
    return {
      platform: 'WAHOO',
      sport: workout.sport,
      workoutName: workout.objective,
      notes: workout.notes,
      intervals: workout.steps.map((step) => {
        const interval: Record<string, unknown> = {
          type: step.type,
          duration: step.duration,
        };

        // Map targets to Wahoo structure
        if (step.primaryTarget || step.cadenceTarget) {
          const targets: Record<string, unknown> = {};

          if (step.primaryTarget) {
            switch (step.primaryTarget.kind) {
              case 'POWER':
                targets.power = {
                  unit: step.primaryTarget.unit,
                  ...(step.primaryTarget.zone !== undefined
                    ? { zone: step.primaryTarget.zone }
                    : {}),
                  ...(step.primaryTarget.min !== undefined
                    ? { minWatts: step.primaryTarget.min }
                    : {}),
                  ...(step.primaryTarget.max !== undefined
                    ? { maxWatts: step.primaryTarget.max }
                    : {}),
                };
                break;
              case 'HEART_RATE':
                targets.heartRate = {
                  unit: step.primaryTarget.unit,
                  ...(step.primaryTarget.zone !== undefined
                    ? { zone: step.primaryTarget.zone }
                    : {}),
                  ...(step.primaryTarget.min !== undefined
                    ? { minBpm: step.primaryTarget.min }
                    : {}),
                  ...(step.primaryTarget.max !== undefined
                    ? { maxBpm: step.primaryTarget.max }
                    : {}),
                };
                break;
              case 'PACE':
                targets.pace = {
                  unit: step.primaryTarget.unit,
                  ...(step.primaryTarget.zone !== undefined
                    ? { zone: step.primaryTarget.zone }
                    : {}),
                  ...(step.primaryTarget.min !== undefined
                    ? { minSecPerKm: step.primaryTarget.min }
                    : {}),
                  ...(step.primaryTarget.max !== undefined
                    ? { maxSecPerKm: step.primaryTarget.max }
                    : {}),
                };
                break;
            }
          }

          if (step.cadenceTarget) {
            targets.cadence = {
              minRpm: step.cadenceTarget.minRpm,
              maxRpm: step.cadenceTarget.maxRpm,
            };
          }

          interval.targets = targets;
        }

        if (step.note) {
          interval.note = step.note;
        }

        return interval;
      }),
      exportVersion: 'wahoo-stub-v1',
    };
  }
}
