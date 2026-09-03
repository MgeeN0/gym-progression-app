import { type SQLiteDatabase } from 'expo-sqlite';

export type Plan = {
  id: number;
  plan_name: string;
  plan_type: string;
};

const CURRENT_DB_VERSION = 4;

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

const upgrades: { number: number; run: (db: SQLiteDatabase) => Promise<void> }[] = [
  { number: 1, run: upgrade1_createExerciseTable },
  { number: 2, run: upgrade2_createActivityTable },
  { number: 3, run: upgrade3_createPlanTable },
  { number: 4, run: upgrade4_addPlanIdToActivity },
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
    { plan_name: 'Push Pull Legs', plan_type: 'Push Pull Legs' },
    { plan_name: 'Upper Body Strength', plan_type: 'Upper/Lower' },
    { plan_name: 'Full Body Conditioning', plan_type: 'Full Body' },
  ];

  for (const plan of testPlans) {
    await db.runAsync(
      'INSERT INTO plan (plan_name, plan_type) VALUES (?, ?)',
      plan.plan_name,
      plan.plan_type
    );
  }
}
