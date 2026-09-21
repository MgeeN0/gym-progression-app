export type ProgressionMode = 'weight' | 'time';

export type ProgressionRules = {
  progressionPace: number | null;
  minReps: number | null;
  maxReps: number | null;
  weightStep: number | null;
};

/**
 * The two values a session tracks. Weight mode: amount = reps, load = weight.
 * Time mode: amount = seconds, load = sets. min_reps/max_reps hold the amount range in both.
 */
export type Session = {
  amount: number;
  load: number;
  no: number;
};

export type ProgressionGoal = {
  amount: number;
  load: number;
  amountDelta: number;
  loadDelta: number;
};

function roundValue(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Whole units to add for the session after `lastNo`. A fractional pace spreads the
 * increase over several sessions, so 0.5 adds 1 every second session rather than half a rep.
 */
export function progressionIncrement(progressionPace: number | null, lastNo: number) {
  const pace = progressionPace ?? 0;
  return Math.floor(pace * (lastNo + 1)) - Math.floor(pace * lastNo);
}

// Time mode's pace is literal seconds, so 0.5 really adds half a second each session.
function amountIncrement(mode: ProgressionMode, progressionPace: number | null, lastNo: number) {
  return mode === 'time' ? (progressionPace ?? 0) : progressionIncrement(progressionPace, lastNo);
}

// Weight activities move by the configured weight step; time activities by one set.
function loadStep(mode: ProgressionMode, rules: ProgressionRules) {
  return mode === 'time' ? 1 : rules.weightStep;
}

function adjustLoad(mode: ProgressionMode, last: Session, minAmount: number, delta: number): ProgressionGoal {
  // A time activity can't drop below one set.
  const load = mode === 'time' ? Math.max(1, last.load + delta) : roundValue(last.load + delta);
  return {
    amount: minAmount,
    load,
    amountDelta: roundValue(minAmount - last.amount),
    loadDelta: roundValue(load - last.load),
  };
}

export function computeGoal(mode: ProgressionMode, last: Session, rules: ProgressionRules): ProgressionGoal {
  const step = amountIncrement(mode, rules.progressionPace, last.no);
  const stepLoad = loadStep(mode, rules);
  const { minReps: minAmount, maxReps: maxAmount } = rules;

  // Moving the load only applies once the whole range is configured.
  if (minAmount !== null && maxAmount !== null && stepLoad !== null) {
    if (last.amount + step > maxAmount) {
      return adjustLoad(mode, last, minAmount, stepLoad);
    }
    if (last.amount < minAmount) {
      return adjustLoad(mode, last, minAmount, -stepLoad);
    }
  }

  return { amount: roundValue(last.amount + step), load: last.load, amountDelta: step, loadDelta: 0 };
}

// `skipAmount` is the goal's own increase: goal - that amount equals the last session,
// which the X button already records. Amounts larger than the goal are dropped since
// they would go below zero.
export function getLessAmounts(goalAmount: number, skipAmount: number, count = 3) {
  const amounts: number[] = [];
  for (let amount = 1; amounts.length < count; amount++) {
    if (amount !== skipAmount) {
      amounts.push(amount);
    }
  }
  return amounts.filter((amount) => amount <= goalAmount);
}

export type ExerciseOutcome =
  | { kind: 'met' }
  | { kind: 'missed' }
  | { kind: 'more'; amount: number }
  | { kind: 'less'; amount: number };

export type ExerciseOutcomeKind = ExerciseOutcome['kind'];

export function computeRecordedStats(
  mode: ProgressionMode,
  last: Session,
  rules: ProgressionRules,
  outcome: ExerciseOutcome
) {
  const goal = computeGoal(mode, last, rules);
  switch (outcome.kind) {
    case 'met':
      return { amount: goal.amount, load: goal.load };
    case 'missed':
      return { amount: last.amount, load: last.load };
    case 'more':
      return { amount: roundValue(goal.amount + outcome.amount), load: goal.load };
    case 'less':
      return { amount: Math.max(0, roundValue(goal.amount - outcome.amount)), load: goal.load };
  }
}

/**
 * Rebuilds a card's outcome from a stored draft. The kind comes from the database; the
 * amount is the distance between the recorded amount and the goal.
 */
export function restoreOutcome(
  kind: string | null,
  goal: ProgressionGoal,
  recordedAmount: number
): ExerciseOutcome {
  switch (kind) {
    case 'missed':
      return { kind: 'missed' };
    case 'more':
      return { kind: 'more', amount: roundValue(recordedAmount - goal.amount) };
    case 'less':
      return { kind: 'less', amount: roundValue(goal.amount - recordedAmount) };
    default:
      // Includes drafts written before the outcome column existed.
      return { kind: 'met' };
  }
}

function signed(value: number) {
  return `${value > 0 ? '+' : '-'}${Math.abs(value)}`;
}

function plural(value: number) {
  return Math.abs(value) === 1 ? '' : 's';
}

export function formatGoalChange(mode: ProgressionMode, goal: ProgressionGoal) {
  const parts: string[] = [];
  if (goal.loadDelta !== 0) {
    parts.push(mode === 'time' ? `${signed(goal.loadDelta)} set${plural(goal.loadDelta)}` : `${signed(goal.loadDelta)} kg`);
  }
  if (goal.amountDelta !== 0) {
    parts.push(mode === 'time' ? `${signed(goal.amountDelta)} s` : `${signed(goal.amountDelta)} rep${plural(goal.amountDelta)}`);
  }
  return parts.join(', ');
}

/** Summary text for one session, e.g. "12 reps, 4 sets, 40 kg" or "45 s, 3 sets". */
export function formatSessionStats(mode: ProgressionMode, stats: { amount: number; load: number; sets: number }) {
  return mode === 'time'
    ? `${stats.amount} s, ${stats.load} sets`
    : `${stats.amount} reps, ${stats.sets} sets, ${stats.load} kg`;
}
