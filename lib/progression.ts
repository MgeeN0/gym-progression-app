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

// The pace is skipped because goal - pace equals last reps, which the X button already records.
// Amounts larger than the goal reps are dropped since they would go below zero.
export function getLessAmounts(goalReps: number, progressionPace: number | null, count = 3) {
  const amounts: number[] = [];
  for (let amount = 1; amounts.length < count; amount++) {
    if (amount !== progressionPace) {
      amounts.push(amount);
    }
  }
  return amounts.filter((amount) => amount <= goalReps);
}

function sameWeight(a: number, b: number) {
  return Math.abs(a - b) < 1e-6;
}

// Drafts don't store which button produced them. Every button records a distinct row
// (see getLessAmounts), so the outcome can be recovered from the recorded reps and weight.
export function inferOutcome(
  last: { reps: number; weight: number },
  rules: ProgressionRules,
  recorded: { reps: number; weight: number }
): ExerciseOutcome {
  const goal = computeGoal(last, rules);
  if (!sameWeight(recorded.weight, goal.weight)) {
    return { kind: 'missed' };
  }
  if (recorded.reps === goal.reps) {
    return { kind: 'met' };
  }
  if (sameWeight(recorded.weight, last.weight) && recorded.reps === last.reps) {
    return { kind: 'missed' };
  }
  return recorded.reps > goal.reps
    ? { kind: 'more', amount: recorded.reps - goal.reps }
    : { kind: 'less', amount: goal.reps - recorded.reps };
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
