import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import { Stack } from 'expo-router';
import { type SQLiteDatabase, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { ActiveWorkoutProvider } from '@/components/active-workout-provider';
import { ActiveWorkoutTimer } from '@/components/active-workout-timer';
import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';
import { migrateDbIfNeeded } from '@/db/init';

async function initializeDatabase(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
}

/**
 * Only ever rendered in development. The plugin resolves the dev server through React
 * Native's getDevServer, which falls back to localhost:8081 in a release build, so left
 * mounted it would retry that connection on a real phone for minutes, or throw during
 * render. Metro compiles __DEV__ to false and drops the branch below in production.
 */
function DrizzleStudioDevTools() {
  useDrizzleStudio(useSQLiteContext());
  return null;
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="gym.db" onInit={initializeDatabase}>
      {__DEV__ && <DrizzleStudioDevTools />}
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
