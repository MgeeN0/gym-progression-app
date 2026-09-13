import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddExerciseButton } from '@/components/add-exercise-button';
import { ExerciseCard, type ExerciseCardActivity, type ExerciseOutcome } from '@/components/exercise-card';
import { TopBar } from '@/components/top-bar';
import { WorkoutSummaryModal, type WorkoutSummaryEntry } from '@/components/workout-summary-modal';
import { Colors, Radii } from '@/constants/theme';
import {
  confirmActivityStats,
  deleteDraftActivityStats,
  discardUnconfirmedActivityStats,
  recordActivityProgress,
} from '@/db/init';

type ActivityRow = {
  id: number;
  exercise_id: number | null;
  custom_name: string | null;
  custom_video_link: string | null;
  progression_pace: number | null;
  exercise_name: string | null;
  video_link: string | null;
};

type LastStatsRow = {
  reps_amount: number;
  sets_amount: number;
  weight: number;
  no: number;
};

type LastStats = NonNullable<ExerciseCardActivity['lastStats']>;

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function computeRecordedReps(lastStats: LastStats, progressionPace: number | null, outcome: ExerciseOutcome) {
  return outcome === 'met' ? lastStats.reps + (progressionPace ?? 0) : lastStats.reps;
}

export default function CustomWorkoutPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);

  const [planName, setPlanName] = useState('');
  const [activities, setActivities] = useState<ExerciseCardActivity[]>([]);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedOutcomes, setRecordedOutcomes] = useState<Record<number, ExerciseOutcome>>({});
  const [summaryEntries, setSummaryEntries] = useState<WorkoutSummaryEntry[] | null>(null);
  const [summaryDuration, setSummaryDuration] = useState('');

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const loadActivities = useCallback(async () => {
    const plan = await db.getFirstAsync<{ plan_name: string }>('SELECT plan_name FROM plan WHERE id = ?', planId);
    setPlanName(plan?.plan_name ?? '');

    const rows = await db.getAllAsync<ActivityRow>(
      `SELECT activity.id, activity.exercise_id, activity.custom_name, activity.custom_video_link,
              activity.progression_pace, exercise.exercise_name, exercise.video_link
       FROM activity
       LEFT JOIN exercise ON activity.exercise_id = exercise.id
       WHERE activity.plan_id = ?
       ORDER BY activity.id`,
      planId
    );

    const withStats = await Promise.all(
      rows.map(async (row): Promise<ExerciseCardActivity> => {
        const lastStats = await db.getFirstAsync<LastStatsRow>(
          'SELECT reps_amount, sets_amount, weight, no FROM activity_stats WHERE activity_id = ? AND is_confirmed = 1 ORDER BY no DESC LIMIT 1',
          row.id
        );

        return {
          id: row.id,
          displayName: (row.exercise_id != null ? row.exercise_name : row.custom_name) ?? 'Unnamed exercise',
          videoUrl: (row.exercise_id != null ? row.video_link : row.custom_video_link) ?? null,
          progressionPace: row.progression_pace,
          lastStats: lastStats
            ? { reps: lastStats.reps_amount, sets: lastStats.sets_amount, weight: lastStats.weight, no: lastStats.no }
            : null,
        };
      })
    );

    setActivities(withStats);
  }, [db, planId]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  useEffect(() => {
    if (!sessionActive || sessionStartedAt === null) {
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionActive, sessionStartedAt]);

  const resetSession = useCallback(() => {
    setSessionActive(false);
    setSessionStartedAt(null);
    setRecordedOutcomes({});
  }, []);

  const handleStart = useCallback(() => {
    setSessionActive(true);
    setSessionStartedAt(Date.now());
    setElapsedSeconds(0);
    setRecordedOutcomes({});
  }, []);

  const handleFinish = useCallback(async () => {
    const durationSeconds = sessionStartedAt === null ? 0 : Math.floor((Date.now() - sessionStartedAt) / 1000);
    await confirmActivityStats(db);

    const entries: WorkoutSummaryEntry[] = [];
    for (const activity of activities) {
      const outcome = recordedOutcomes[activity.id];
      if (!outcome || !activity.lastStats) {
        continue;
      }
      const { reps, sets, weight } = activity.lastStats;
      entries.push({
        activityId: activity.id,
        name: activity.displayName,
        before: { reps, sets, weight },
        after: { reps: computeRecordedReps(activity.lastStats, activity.progressionPace, outcome), sets, weight },
      });
    }

    resetSession();
    setSummaryDuration(formatElapsed(durationSeconds));
    setSummaryEntries(entries);
  }, [db, sessionStartedAt, activities, recordedOutcomes, resetSession]);

  const handleSummaryConfirm = useCallback(() => {
    setSummaryEntries(null);
    router.dismissTo('/');
  }, [router]);

  const handleCancelRequest = useCallback(() => {
    Alert.alert('Discard workout?', 'Your recorded progress for this session will be permanently deleted.', [
      { text: 'Keep training', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discardUnconfirmedActivityStats(db);
          resetSession();
          router.dismissTo('/');
        },
      },
    ]);
  }, [db, resetSession, router]);

  const handleRecordOutcome = useCallback(
    async (activityId: number, outcome: ExerciseOutcome) => {
      const activity = activities.find((item) => item.id === activityId);
      if (!activity || !activity.lastStats) {
        return;
      }

      await recordActivityProgress(db, {
        activity_id: activityId,
        no: activity.lastStats.no + 1,
        sets_amount: activity.lastStats.sets,
        reps_amount: computeRecordedReps(activity.lastStats, activity.progressionPace, outcome),
        weight: activity.lastStats.weight,
      });

      await Haptics.notificationAsync(
        outcome === 'met' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
      );

      setRecordedOutcomes((prev) => ({ ...prev, [activityId]: outcome }));
    },
    [db, activities]
  );

  const handleUndo = useCallback(
    async (activityId: number) => {
      await deleteDraftActivityStats(db, activityId);
      setRecordedOutcomes((prev) => {
        const next = { ...prev };
        delete next[activityId];
        return next;
      });
    },
    [db]
  );

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <TopBar
          title={planName}
          leftAction={
            sessionActive
              ? { icon: 'close', onPress: handleCancelRequest, tone: 'danger' }
              : { icon: 'arrow-left', onPress: handleGoBack }
          }
          rightAction={
            sessionActive ? { label: 'Finish', onPress: handleFinish } : { label: 'Start', onPress: handleStart }
          }
        />
      ),
    });
  }, [navigation, planName, sessionActive, handleGoBack, handleCancelRequest, handleFinish, handleStart]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <AddExerciseButton />
        {activities.map((activity) => (
          <ExerciseCard
            key={activity.id}
            activity={activity}
            sessionActive={sessionActive}
            outcome={recordedOutcomes[activity.id]}
            onRecordOutcome={(outcome) => handleRecordOutcome(activity.id, outcome)}
            onUndo={() => handleUndo(activity.id)}
          />
        ))}
      </ScrollView>

      {sessionActive && (
        <View style={styles.timerWrapper} pointerEvents="none">
          <View style={styles.timerShadow}>
            <LinearGradient
              colors={[Colors.accentStart, Colors.accentEnd]}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.timerBadge}
            >
              <MaterialCommunityIcons name="timer-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
            </LinearGradient>
          </View>
        </View>
      )}

      <WorkoutSummaryModal
        visible={summaryEntries !== null}
        duration={summaryDuration}
        entries={summaryEntries ?? []}
        onConfirm={handleSummaryConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  timerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
  },
  timerShadow: {
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      web: { boxShadow: `0 6px 18px -2px ${Colors.accentStart}80` },
    }),
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  timerText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
