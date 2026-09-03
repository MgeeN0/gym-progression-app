import { type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
PRAGMA journal_mode = 'wal';

CREATE TABLE exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_name TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  video_link TEXT
);

CREATE TABLE plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL
);

CREATE TABLE activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sets_amount INTEGER NOT NULL,
  reps_amount INTEGER NOT NULL,
  weight REAL NOT NULL,
  exercise_id INTEGER NOT NULL,
  plan_id INTEGER NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercise (id),
  FOREIGN KEY (plan_id) REFERENCES plan (id)
);
`);
    currentDbVersion = 1;
  }

  // if (currentDbVersion === 1) {
  //   Add future migrations here
  // }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
