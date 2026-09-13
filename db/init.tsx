import { type SQLiteDatabase } from 'expo-sqlite';

export type Plan = {
  id: number;
  plan_name: string;
  plan_type: string;
  days_per_plan: number | null;
  note: string | null;
};

const CURRENT_DB_VERSION = 9;

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

// Draft activity_stats rows (is_confirmed = 0) exist only for the duration of an
// in-progress training session. Also reused to silently clean up leftover drafts
// from a session that never finished (e.g. the app crashed mid-workout).
export async function discardUnconfirmedActivityStats(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM activity_stats WHERE is_confirmed = 0');
}

export async function confirmActivityStats(db: SQLiteDatabase) {
  await db.runAsync('UPDATE activity_stats SET is_confirmed = 1 WHERE is_confirmed = 0');
}

export async function recordActivityProgress(
  db: SQLiteDatabase,
  entry: { activity_id: number; no: number; sets_amount: number; reps_amount: number; weight: number }
) {
  await db.runAsync(
    'INSERT INTO activity_stats (activity_id, no, sets_amount, reps_amount, weight, date, is_confirmed) VALUES (?, ?, ?, ?, ?, ?, 0)',
    entry.activity_id,
    entry.no,
    entry.sets_amount,
    entry.reps_amount,
    entry.weight,
    new Date().toISOString()
  );
}

export async function deleteDraftActivityStats(db: SQLiteDatabase, activityId: number) {
  await db.runAsync('DELETE FROM activity_stats WHERE activity_id = ? AND is_confirmed = 0', activityId);
}
