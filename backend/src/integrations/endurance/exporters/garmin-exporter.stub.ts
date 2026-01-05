import { EnduranceExporter, ExportPayload } from './exporter';
import { NormalizedWorkout } from '../endurance-normalizer';

export class GarminExporterStub implements EnduranceExporter {
  build(workout: NormalizedWorkout): ExportPayload {
    return {
      platform: 'GARMIN',
      sport: workout.sport,
      objective: workout.objective,
      notes: workout.notes,
      steps: workout.steps.map((step) => ({
        type: step.type,
        duration: step.duration,
        targets: {
          primary: step.primaryTarget
            ? {
                kind: step.primaryTarget.kind,
                unit: step.primaryTarget.unit,
                zone: step.primaryTarget.zone,
                min: step.primaryTarget.min,
                max: step.primaryTarget.max,
              }
            : undefined,
          cadence: step.cadenceTarget
            ? {
                minRpm: step.cadenceTarget.minRpm,
                maxRpm: step.cadenceTarget.maxRpm,
              }
            : undefined,
        },
        note: step.note,
      })),
      exportVersion: 'draft-v1',
    };
  }
}
