import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { Stack } from 'expo-router';
import { type SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { ActiveWorkoutProvider } from '@/components/active-workout-provider';
import { ActiveWorkoutTimer } from '@/components/active-workout-timer';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { migrateDbIfNeeded, seedTestDataIfNeeded } from '@/db/init';

async function initializeDatabase(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
  await seedTestDataIfNeeded(db);
}

function DrizzleStudioDevTools() {
  useDrizzleStudio(useSQLiteContext());
  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="gym.db" onInit={initializeDatabase}>
      <DrizzleStudioDevTools />
      <StatusBar style="light" />
      <ActiveWorkoutProvider>
        <View style={styles.root}>
          <Stack
            screenOptions={{
              header: () => <TopBar />,
              contentStyle: { backgroundColor: Colors.background },
            }}
          />
          <ActiveWorkoutTimer />
        </View>
      </ActiveWorkoutProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
