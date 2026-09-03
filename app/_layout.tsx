import { Stack } from 'expo-router';
import { type SQLiteDatabase, SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { migrateDbIfNeeded, seedTestDataIfNeeded } from '@/db/init';

async function initializeDatabase(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
  await seedTestDataIfNeeded(db);
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="gym.db" onInit={initializeDatabase}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          header: () => <TopBar />,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
    </SQLiteProvider>
  );
}
