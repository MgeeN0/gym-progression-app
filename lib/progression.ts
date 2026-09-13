export type ProgressionRules = {
  progressionPace: number | null;
  minReps: number | null;
  maxReps: number | null;
  weightStep: number | null;
};

export type ProgressionGoal = {
  reps: number;
  weight: number;
  repsDelta: number;
  weightDelta: number;
};

function roundWeight(weight: number) {
  return Math.round(weight * 100) / 100;
}

function adjustWeight(last: { reps: number; weight: number }, minReps: number, weightDelta: number): ProgressionGoal {
  return {
    reps: minReps,
    weight: roundWeight(last.weight + weightDelta),
    repsDelta: minReps - last.reps,
    weightDelta,
  };
}

export function computeGoal(last: { reps: number; weight: number }, rules: ProgressionRules): ProgressionGoal {
  const pace = rules.progressionPace ?? 0;
  const { minReps, maxReps, weightStep } = rules;

  // Weight-based progression only applies once the whole rep range is configured.
  if (minReps !== null && maxReps !== null && weightStep !== null) {
    if (last.reps + pace > maxReps) {
      return adjustWeight(last, minReps, weightStep);
    }
    if (last.reps < minReps) {
      return adjustWeight(last, minReps, -weightStep);
    }
  }

  return { reps: last.reps + pace, weight: last.weight, repsDelta: pace, weightDelta: 0 };
}

export type ExerciseOutcome =
  | { kind: 'met' }
  | { kind: 'missed' }
  | { kind: 'more'; amount: number }
  | { kind: 'less'; amount: number };

export function computeRecordedStats(
  last: { reps: number; weight: number },
  rules: ProgressionRules,
  outcome: ExerciseOutcome
) {
  const goal = computeGoal(last, rules);
  switch (outcome.kind) {
    case 'met':
      return { reps: goal.reps, weight: goal.weight };
    case 'missed':
      return { reps: last.reps, weight: last.weight };
    case 'more':
      return { reps: goal.reps + outcome.amount, weight: goal.weight };
    case 'less':
      return { reps: Math.max(0, goal.reps - outcome.amount), weight: goal.weight };
  }
}

function signed(value: number) {
  return `${value > 0 ? '+' : '-'}${Math.abs(value)}`;
}

export function formatGoalChange(goal: ProgressionGoal) {
  const parts: string[] = [];
  if (goal.weightDelta !== 0) {
    parts.push(`${signed(goal.weightDelta)} kg`);
  }
  if (goal.repsDelta !== 0) {
    parts.push(`${signed(goal.repsDelta)} rep${Math.abs(goal.repsDelta) === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}
