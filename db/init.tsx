import { type SQLiteDatabase } from 'expo-sqlite';

export type Plan = {
  id: number;
  plan_name: string;
  plan_type: string;
  days_per_plan: number | null;
  note: string | null;
};

const CURRENT_DB_VERSION = 15;

async function recordUpgrade(db: SQLiteDatabase, upgradeNumber: number) {
  await db.runAsync(
    'INSERT INTO upgrade (upgrade_number, execution_date) VALUES (?, ?)',
    upgradeNumber,
    new Date().toISOString()
  );
}

async function upgrade1_createExerciseTable(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_name TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  video_link TEXT
);
`);
  await recordUpgrade(db, 1);
}

async function upgrade2_createActivityTable(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sets_amount INTEGER NOT NULL,
  reps_amount INTEGER NOT NULL,
  weight REAL NOT NULL,
  exercise_id INTEGER NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercise (id)
);
`);
  await recordUpgrade(db, 2);
}

async function upgrade3_createPlanTable(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL
);
`);
  await recordUpgrade(db, 3);
}

async function upgrade4_addPlanIdToActivity(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE activity ADD COLUMN plan_id INTEGER REFERENCES plan (id);
`);
  await recordUpgrade(db, 4);
}

async function upgrade5_addDaysPerPlanAndNoteToPlan(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE plan ADD COLUMN days_per_plan INTEGER;
ALTER TABLE plan ADD COLUMN note TEXT;
`);
  await recordUpgrade(db, 5);
}

async function upgrade6_addActivityStatsAndReviseActivityExercise(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE activity_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  no INTEGER NOT NULL,
  sets_amount INTEGER NOT NULL,
  reps_amount INTEGER NOT NULL,
  weight REAL NOT NULL,
  date TEXT,
  FOREIGN KEY (activity_id) REFERENCES activity (id)
);

INSERT INTO activity_stats (activity_id, no, sets_amount, reps_amount, weight, date)
SELECT id, 1, sets_amount, reps_amount, weight, NULL FROM activity;

CREATE TABLE activity_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER,
  plan_id INTEGER,
  custom_name TEXT,
  custom_video_link TEXT,
  FOREIGN KEY (exercise_id) REFERENCES exercise (id),
  FOREIGN KEY (plan_id) REFERENCES plan (id)
);

INSERT INTO activity_new (id, exercise_id, plan_id)
SELECT id, exercise_id, plan_id FROM activity;

DROP TABLE activity;

ALTER TABLE activity_new RENAME TO activity;

ALTER TABLE exercise ADD COLUMN description TEXT;
`);
  await recordUpgrade(db, 6);
}

async function upgrade7_addImagePathToExercise(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE exercise ADD COLUMN image_path TEXT;
`);
  await recordUpgrade(db, 7);
}

async function upgrade8_addProgressionPaceToActivity(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE activity ADD COLUMN progression_pace INTEGER;
`);
  await recordUpgrade(db, 8);
}

async function upgrade9_addIsConfirmedToActivityStats(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE activity_stats ADD COLUMN is_confirmed INTEGER NOT NULL DEFAULT 1;
`);
  await recordUpgrade(db, 9);
}

async function upgrade10_addRepRangeAndWeightStepToActivity(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE activity ADD COLUMN min_reps INTEGER;
ALTER TABLE activity ADD COLUMN max_reps INTEGER;
ALTER TABLE activity ADD COLUMN weight_step REAL;
`);
  await recordUpgrade(db, 10);
}

async function upgrade11_createWorkoutHistoryTable(db: SQLiteDatabase) {
  await db.execAsync(`
CREATE TABLE workout_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  start_timestamp TEXT NOT NULL,
  workout_time INTEGER,
  FOREIGN KEY (plan_id) REFERENCES plan (id)
);
`);
  await recordUpgrade(db, 11);
}

async function upgrade12_addCustomTypeToActivity(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE activity ADD COLUMN custom_type TEXT;
`);
  await recordUpgrade(db, 12);
}

async function upgrade13_addTimeToActivityStats(db: SQLiteDatabase) {
  // Time activities have no reps or weight, so those columns lose NOT NULL.
  // SQLite can't drop a constraint in place, so the table is rebuilt.
  await db.execAsync(`
CREATE TABLE activity_stats_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL,
  no INTEGER NOT NULL,
  sets_amount INTEGER NOT NULL,
  reps_amount INTEGER,
  weight REAL,
  time REAL,
  date TEXT,
  is_confirmed INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (activity_id) REFERENCES activity (id)
);

INSERT INTO activity_stats_new (id, activity_id, no, sets_amount, reps_amount, weight, date, is_confirmed)
SELECT id, activity_id, no, sets_amount, reps_amount, weight, date, is_confirmed FROM activity_stats;

DROP TABLE activity_stats;

ALTER TABLE activity_stats_new RENAME TO activity_stats;
`);
  await recordUpgrade(db, 13);
}

async function upgrade14_addOutcomeToActivityStats(db: SQLiteDatabase) {
  await db.execAsync(`
ALTER TABLE activity_stats ADD COLUMN outcome TEXT;
`);
  await recordUpgrade(db, 14);
}

async function upgrade15_makeProgressionPaceReal(db: SQLiteDatabase) {
  // A pace of 0.5 is fractional, so the column is rebuilt with REAL affinity.
  await db.execAsync(`
CREATE TABLE activity_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER,
  plan_id INTEGER,
  custom_name TEXT,
  custom_video_link TEXT,
  progression_pace REAL,
  min_reps INTEGER,
  max_reps INTEGER,
  weight_step REAL,
  custom_type TEXT,
  FOREIGN KEY (exercise_id) REFERENCES exercise (id),
  FOREIGN KEY (plan_id) REFERENCES plan (id)
);

INSERT INTO activity_new (id, exercise_id, plan_id, custom_name, custom_video_link, progression_pace, min_reps, max_reps, weight_step, custom_type)
SELECT id, exercise_id, plan_id, custom_name, custom_video_link, progression_pace, min_reps, max_reps, weight_step, custom_type FROM activity;

DROP TABLE activity;

ALTER TABLE activity_new RENAME TO activity;
`);
  await recordUpgrade(db, 15);
}

const upgrades: { number: number; run: (db: SQLiteDatabase) => Promise<void> }[] = [
  { number: 1, run: upgrade1_createExerciseTable },
  { number: 2, run: upgrade2_createActivityTable },
  { number: 3, run: upgrade3_createPlanTable },
  { number: 4, run: upgrade4_addPlanIdToActivity },
  { number: 5, run: upgrade5_addDaysPerPlanAndNoteToPlan },
  { number: 6, run: upgrade6_addActivityStatsAndReviseActivityExercise },
  { number: 7, run: upgrade7_addImagePathToExercise },
  { number: 8, run: upgrade8_addProgressionPaceToActivity },
  { number: 9, run: upgrade9_addIsConfirmedToActivityStats },
  { number: 10, run: upgrade10_addRepRangeAndWeightStepToActivity },
  { number: 11, run: upgrade11_createWorkoutHistoryTable },
  { number: 12, run: upgrade12_addCustomTypeToActivity },
  { number: 13, run: upgrade13_addTimeToActivityStats },
  { number: 14, run: upgrade14_addOutcomeToActivityStats },
  { number: 15, run: upgrade15_makeProgressionPaceReal },
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);

  await db.execAsync(`
CREATE TABLE IF NOT EXISTS upgrade (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  upgrade_number INTEGER NOT NULL UNIQUE,
  execution_date TEXT NOT NULL
);
`);

  const result = await db.getFirstAsync<{ max_upgrade: number | null }>(
    'SELECT MAX(upgrade_number) as max_upgrade FROM upgrade'
  );
  const appliedVersion = result?.max_upgrade ?? 0;

  if (appliedVersion >= CURRENT_DB_VERSION) {
    return;
  }

  const pendingUpgrades = upgrades
    .filter((upgrade) => upgrade.number > appliedVersion)
    .sort((a, b) => a.number - b.number);

  for (const upgrade of pendingUpgrades) {
    await upgrade.run(db);
  }
}

export async function seedTestDataIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM plan');
  if ((result?.count ?? 0) > 0) {
    return;
  }

  const testPlans: Omit<Plan, 'id'>[] = [
    { plan_name: 'Push Pull Legs', plan_type: 'Push Pull Legs', days_per_plan: null, note: null },
    { plan_name: 'Upper Body Strength', plan_type: 'Upper/Lower', days_per_plan: null, note: null },
    { plan_name: 'Full Body Conditioning', plan_type: 'Full Body', days_per_plan: 3, note: null },
  ];

  for (const plan of testPlans) {
    await db.runAsync(
      'INSERT INTO plan (plan_name, plan_type, days_per_plan, note) VALUES (?, ?, ?, ?)',
      plan.plan_name,
      plan.plan_type,
      plan.days_per_plan,
      plan.note
    );
  }
}

export async function createPlan(db: SQLiteDatabase, plan: Omit<Plan, 'id'>) {
  await db.runAsync(
    'INSERT INTO plan (plan_name, plan_type, days_per_plan, note) VALUES (?, ?, ?, ?)',
    plan.plan_name,
    plan.plan_type,
    plan.days_per_plan,
    plan.note
  );
}

// While a workout is in progress it exists as one unfinished workout_history row
// (workout_time IS NULL) plus draft activity_stats rows (is_confirmed = 0).

export async function startWorkout(db: SQLiteDatabase, planId: number) {
  const startTimestamp = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString().replace('.000Z', 'Z');
  const result = await db.runAsync(
    'INSERT INTO workout_history (plan_id, start_timestamp) VALUES (?, ?)',
    planId,
    startTimestamp
  );
  return { id: result.lastInsertRowId, startTimestamp };
}

export async function getActiveWorkout(db: SQLiteDatabase) {
  return db.getFirstAsync<{ id: number; plan_id: number; plan_name: string; start_timestamp: string }>(
    `SELECT workout_history.id, workout_history.plan_id, plan.plan_name, workout_history.start_timestamp
     FROM workout_history
     JOIN plan ON plan.id = workout_history.plan_id
     WHERE workout_history.workout_time IS NULL
     ORDER BY workout_history.id DESC
     LIMIT 1`
  );
}

export async function finishWorkout(db: SQLiteDatabase, workoutId: number, workoutTime: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE activity_stats SET is_confirmed = 1 WHERE is_confirmed = 0');
    await db.runAsync('UPDATE workout_history SET workout_time = ? WHERE id = ?', workoutTime, workoutId);
  });
}

export async function discardUnfinishedWorkout(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM activity_stats WHERE is_confirmed = 0');
    await db.runAsync('DELETE FROM workout_history WHERE workout_time IS NULL');
  });
}

export type UnfinishedWorkout =
  | { status: 'none' }
  | { status: 'open'; planId: number; hasDrafts: boolean }
  | { status: 'corrupted' };

export async function inspectUnfinishedWorkout(db: SQLiteDatabase): Promise<UnfinishedWorkout> {
  const openWorkouts = await db.getAllAsync<{ plan_id: number; existing_plan_id: number | null }>(
    `SELECT workout_history.plan_id, plan.id AS existing_plan_id
     FROM workout_history
     LEFT JOIN plan ON plan.id = workout_history.plan_id
     WHERE workout_history.workout_time IS NULL`
  );
  const draftPlans = await db.getAllAsync<{ plan_id: number | null }>(
    `SELECT DISTINCT plan.id AS plan_id
     FROM activity_stats
     LEFT JOIN activity ON activity_stats.activity_id = activity.id
     LEFT JOIN plan ON activity.plan_id = plan.id
     WHERE activity_stats.is_confirmed = 0`
  );

  if (openWorkouts.length === 0 && draftPlans.length === 0) {
    return { status: 'none' };
  }

  // Valid only as one unfinished workout for an existing plan, with every draft belonging to that plan.
  const [workout] = openWorkouts;
  if (
    openWorkouts.length !== 1 ||
    workout.existing_plan_id === null ||
    draftPlans.some((row) => row.plan_id !== workout.plan_id)
  ) {
    return { status: 'corrupted' };
  }
  return { status: 'open', planId: workout.plan_id, hasDrafts: draftPlans.length > 0 };
}

export async function recordActivityProgress(
  db: SQLiteDatabase,
  entry: {
    activity_id: number;
    no: number;
    sets_amount: number;
    reps_amount: number | null;
    weight: number | null;
    time: number | null;
    outcome: 'met' | 'missed' | 'more' | 'less';
  }
) {
  await db.runAsync(
    `INSERT INTO activity_stats (activity_id, no, sets_amount, reps_amount, weight, time, date, is_confirmed, outcome)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    entry.activity_id,
    entry.no,
    entry.sets_amount,
    entry.reps_amount,
    entry.weight,
    entry.time,
    new Date().toISOString(),
    entry.outcome
  );
}

export async function createActivity(
  db: SQLiteDatabase,
  input: {
    planId: number;
    customName: string;
    customVideoLink: string | null;
    customType: 'weight' | 'time';
    minReps: number | null;
    maxReps: number | null;
    weightStep: number | null;
    progressionPace: number | null;
    start: { sets: number; reps: number | null; weight: number | null; time: number | null };
  }
) {
  await db.withTransactionAsync(async () => {
    const activity = await db.runAsync(
      `INSERT INTO activity
         (exercise_id, plan_id, custom_name, custom_video_link, custom_type, progression_pace, min_reps, max_reps, weight_step)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.planId,
      input.customName,
      input.customVideoLink,
      input.customType,
      input.progressionPace,
      input.minReps,
      input.maxReps,
      input.weightStep
    );

    // The starting point is confirmed history, not a draft, so the first goal can build on it.
    await db.runAsync(
      `INSERT INTO activity_stats (activity_id, no, sets_amount, reps_amount, weight, time, date, is_confirmed)
       VALUES (?, 1, ?, ?, ?, ?, ?, 1)`,
      activity.lastInsertRowId,
      input.start.sets,
      input.start.reps,
      input.start.weight,
      input.start.time,
      new Date().toISOString()
    );
  });
}

export async function deleteDraftActivityStats(db: SQLiteDatabase, activityId: number) {
  await db.runAsync('DELETE FROM activity_stats WHERE activity_id = ? AND is_confirmed = 0', activityId);
}
