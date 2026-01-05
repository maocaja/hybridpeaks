export type EnduranceSport = 'BIKE' | 'RUN' | 'SWIM';

export type StepType = 'WARMUP' | 'WORK' | 'RECOVERY' | 'COOLDOWN';

export type DurationType = 'TIME' | 'DISTANCE';

export type PrimaryTargetKind = 'POWER' | 'HEART_RATE' | 'PACE';

export type PrimaryTargetUnit = 'WATTS' | 'BPM' | 'SEC_PER_KM';

export type CadenceTargetUnit = 'RPM';

export type CadenceTargetKind = 'CADENCE';

export type PrimaryTargetInput =
  | {
      kind: 'POWER';
      unit: 'WATTS';
      zone?: number;
      minWatts?: number;
      maxWatts?: number;
    }
  | {
      kind: 'HEART_RATE';
      unit: 'BPM';
      zone?: number;
      minBpm?: number;
      maxBpm?: number;
    }
  | {
      kind: 'PACE';
      unit: 'SEC_PER_KM';
      zone?: number;
      minSecPerKm?: number;
      maxSecPerKm?: number;
    };

export type CadenceTargetInput = {
  kind: 'CADENCE';
  unit: 'RPM';
  minRpm: number;
  maxRpm: number;
};

export type EnduranceStepInput = {
  type: StepType;
  duration: {
    type: DurationType;
    value: number;
  };
  primaryTarget?: PrimaryTargetInput;
  cadenceTarget?: CadenceTargetInput;
  note?: string;
};

export type EnduranceRepeatBlockInput = {
  repeat: number;
  steps: EnduranceStepInput[];
};

export type EndurancePrescription = {
  sport: EnduranceSport;
  steps: Array<EnduranceStepInput | EnduranceRepeatBlockInput>;
  objective?: string;
  notes?: string;
};

export type NormalizedWorkout = {
  sport: EnduranceSport;
  steps: NormalizedStep[];
  objective?: string;
  notes?: string;
};

export type NormalizedStep = {
  type: StepType;
  duration: { seconds?: number; meters?: number };
  primaryTarget?: {
    kind: PrimaryTargetKind;
    unit: string;
    zone?: number;
    min?: number;
    max?: number;
  };
  cadenceTarget?: { minRpm: number; maxRpm: number };
  note?: string;
};

export function normalizeEnduranceWorkout(
  prescription: EndurancePrescription,
): NormalizedWorkout {
  const steps: NormalizedStep[] = [];

  prescription.steps.forEach((step) => {
    if (isRepeatBlock(step)) {
      for (let index = 0; index < step.repeat; index += 1) {
        step.steps.forEach((innerStep) => {
          steps.push(normalizeStep(innerStep, prescription.sport));
        });
      }
    } else {
      steps.push(normalizeStep(step, prescription.sport));
    }
  });

  return {
    sport: prescription.sport,
    steps,
    ...(prescription.objective && { objective: prescription.objective }),
    ...(prescription.notes && { notes: prescription.notes }),
  };
}

function isRepeatBlock(
  step: EnduranceStepInput | EnduranceRepeatBlockInput,
): step is EnduranceRepeatBlockInput {
  return 'repeat' in step;
}

function normalizeStep(
  step: EnduranceStepInput,
  sport: EnduranceSport,
): NormalizedStep {
  const duration =
    step.duration.type === 'TIME'
      ? { seconds: step.duration.value }
      : { meters: step.duration.value };

  const normalized: NormalizedStep = {
    type: step.type,
    duration,
    ...(step.note && { note: step.note }),
  };

  if (step.primaryTarget) {
    normalized.primaryTarget = normalizePrimaryTarget(step.primaryTarget);
  }

  if (step.cadenceTarget) {
    if (sport !== 'BIKE') {
      throw new Error('Cadence target is only allowed for BIKE workouts');
    }
    normalized.cadenceTarget = {
      minRpm: step.cadenceTarget.minRpm,
      maxRpm: step.cadenceTarget.maxRpm,
    };
  }

  return normalized;
}

function normalizePrimaryTarget(target: PrimaryTargetInput): {
  kind: PrimaryTargetKind;
  unit: string;
  zone?: number;
  min?: number;
  max?: number;
} {
  if (target.zone !== undefined) {
    return {
      kind: target.kind,
      unit: target.unit,
      zone: target.zone,
    };
  }

  const range = extractPrimaryRange(target);
  if (range.min === undefined || range.max === undefined) {
    throw new Error(
      'Primary target requires both min and max when zone is absent',
    );
  }

  return {
    kind: target.kind,
    unit: target.unit,
    min: range.min,
    max: range.max,
  };
}

function extractPrimaryRange(target: PrimaryTargetInput): {
  min?: number;
  max?: number;
} {
  switch (target.kind) {
    case 'POWER':
      return { min: target.minWatts, max: target.maxWatts };
    case 'HEART_RATE':
      return { min: target.minBpm, max: target.maxBpm };
    case 'PACE':
      return { min: target.minSecPerKm, max: target.maxSecPerKm };
    default: {
      const exhaustiveCheck: never = target;
      return exhaustiveCheck;
    }
  }
}
