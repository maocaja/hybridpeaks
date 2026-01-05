import { NormalizedWorkout } from '../endurance-normalizer';

export type ExportPayload = Record<string, unknown>;

export interface EnduranceExporter {
  build(workout: NormalizedWorkout): ExportPayload;
}
