import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useActiveWorkout } from '@/components/active-workout-provider';
import { AddExerciseButton } from '@/components/add-exercise-button';
import { ExerciseCard, type ExerciseCardActivity } from '@/components/exercise-card';
import { TopBar } from '@/components/top-bar';
import { WorkoutSummaryModal, type WorkoutSummaryEntry } from '@/components/workout-summary-modal';
import { Colors } from '@/constants/theme';
import {
  deleteDraftActivityStats,
  discardUnfinishedWorkout,
  finishWorkout,
  recordActivityProgress,
} from '@/db/init';
import { computeRecordedStats, type ExerciseOutcome, inferOutcome } from '@/lib/progression';
import { formatElapsed, secondsSince } from '@/lib/time';

type ActivityRow = {
  id: number;
  exercise_id: number | null;
  custom_name: string | null;
  custom_video_link: string | null;
  progression_pace: number | null;
  min_reps: number | null;
  max_reps: number | null;
  weight_step: number | null;
  exercise_name: string | null;
  video_link: string | null;
};

type LastStatsRow = {
  reps_amount: number;
  sets_amount: number;
  weight: number;
  no: number;
};

type DraftRow = {
  activity_id: number;
  reps_amount: number;
  weight: number;
};

export default function CustomWorkoutPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = Number(id);
  const { activeWorkout, refreshActiveWorkout, requestStart } = useActiveWorkout();

  const [planName, setPlanName] = useState('');
  const [activities, setActivities] = useState<ExerciseCardActivity[]>([]);
  const [recordedOutcomes, setRecordedOutcomes] = useState<Record<number, ExerciseOutcome>>({});
  const [summaryEntries, setSummaryEntries] = useState<WorkoutSummaryEntry[] | null>(null);
  const [summaryDuration, setSummaryDuration] = useState('');

  const sessionActive = activeWorkout?.planId === planId;

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const loadActivities = useCallback(async () => {
    const plan = await db.getFirstAsync<{ plan_name: string }>('SELECT plan_name FROM plan WHERE id = ?', planId);
    setPlanName(plan?.plan_name ?? '');

    const rows = await db.getAllAsync<ActivityRow>(
      `SELECT activity.id, activity.exercise_id, activity.custom_name, activity.custom_video_link,
              activity.progression_pace, activity.min_reps, activity.max_reps, activity.weight_step,
              exercise.exercise_name, exercise.video_link
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
          minReps: row.min_reps,
          maxReps: row.max_reps,
          weightStep: row.weight_step,
          lastStats: lastStats
            ? { reps: lastStats.reps_amount, sets: lastStats.sets_amount, weight: lastStats.weight, no: lastStats.no }
            : null,
        };
      })
    );

    setActivities(withStats);

    // Rebuild card states from any drafts of this plan's activities (e.g. a restored session).
    const drafts = await db.getAllAsync<DraftRow>(
      'SELECT activity_id, reps_amount, weight FROM activity_stats WHERE is_confirmed = 0'
    );
    const outcomes: Record<number, ExerciseOutcome> = {};
    for (const draft of drafts) {
      const activity = withStats.find((item) => item.id === draft.activity_id);
      if (activity?.lastStats) {
        outcomes[activity.id] = inferOutcome(activity.lastStats, activity, {
          reps: draft.reps_amount,
          weight: draft.weight,
        });
      }
    }
    setRecordedOutcomes(outcomes);
  }, [db, planId]);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  const handleStart = useCallback(() => {
    requestStart(planId);
  }, [requestStart, planId]);

  const handleFinish = useCallback(async () => {
    if (!activeWorkout || activeWorkout.planId !== planId) {
      return;
    }
    const durationSeconds = secondsSince(activeWorkout.startedAt);
    await finishWorkout(db, activeWorkout.id, durationSeconds);

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
        after: { ...computeRecordedStats(activity.lastStats, activity, outcome), sets },
      });
    }

    setRecordedOutcomes({});
    setSummaryDuration(formatElapsed(durationSeconds));
    setSummaryEntries(entries);
    await refreshActiveWorkout();
  }, [db, planId, activeWorkout, activities, recordedOutcomes, refreshActiveWorkout]);

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
          await discardUnfinishedWorkout(db);
          setRecordedOutcomes({});
          await refreshActiveWorkout();
          router.dismissTo('/');
        },
      },
    ]);
  }, [db, refreshActiveWorkout, router]);

  const handleRecordOutcome = useCallback(
    async (activityId: number, outcome: ExerciseOutcome) => {
      const activity = activities.find((item) => item.id === activityId);
      if (!activity || !activity.lastStats) {
        return;
      }

      const recorded = computeRecordedStats(activity.lastStats, activity, outcome);
      await recordActivityProgress(db, {
        activity_id: activityId,
        no: activity.lastStats.no + 1,
        sets_amount: activity.lastStats.sets,
        reps_amount: recorded.reps,
        weight: recorded.weight,
      });

      await Haptics.notificationAsync(
        outcome.kind === 'missed'
          ? Haptics.NotificationFeedbackType.Error
          : outcome.kind === 'less'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
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
    // Leaves room for the floating workout timer.
    paddingBottom: 100,
  },
});
