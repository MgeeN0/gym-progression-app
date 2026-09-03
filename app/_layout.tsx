import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

import { migrateDbIfNeeded } from '@/db/init';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="gym.db" onInit={migrateDbIfNeeded}>
      <Stack />
    </SQLiteProvider>
  );
}
