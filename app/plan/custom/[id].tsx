import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useActiveWorkout } from '@/components/active-workout-provider';
import { AddActivityModal } from '@/components/add-activity-modal';
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
import {
  computeGoal,
  computeRecordedStats,
  type ExerciseOutcome,
  formatSessionStats,
  type ProgressionMode,
  restoreOutcome,
} from '@/lib/progression';
import { formatElapsed, secondsSince } from '@/lib/time';

type ActivityRow = {
  id: number;
  exercise_id: number | null;
  custom_name: string | null;
  custom_video_link: string | null;
  custom_type: string | null;
  progression_pace: number | null;
  min_reps: number | null;
  max_reps: number | null;
  weight_step: number | null;
  exercise_name: string | null;
  exercise_type: string | null;
  video_link: string | null;
};

type LastStatsRow = {
  reps_amount: number | null;
  sets_amount: number;
  weight: number | null;
  time: number | null;
  no: number;
};

type DraftRow = {
  activity_id: number;
  reps_amount: number | null;
  time: number | null;
  outcome: string | null;
};

// Time activities track seconds and sets; weight activities track reps and weight.
function toLastStats(mode: ProgressionMode, row: LastStatsRow | null): ExerciseCardActivity['lastStats'] {
  if (!row) {
    return null;
  }
  if (mode === 'time') {
    return row.time === null ? null : { amount: row.time, load: row.sets_amount, sets: row.sets_amount, no: row.no };
  }
  return row.reps_amount === null || row.weight === null
    ? null
    : { amount: row.reps_amount, load: row.weight, sets: row.sets_amount, no: row.no };
}

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
  const [addActivityVisible, setAddActivityVisible] = useState(false);

  const sessionActive = activeWorkout?.planId === planId;

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const loadActivities = useCallback(async () => {
    const plan = await db.getFirstAsync<{ plan_name: string }>('SELECT plan_name FROM plan WHERE id = ?', planId);
    setPlanName(plan?.plan_name ?? '');

    const rows = await db.getAllAsync<ActivityRow>(
      `SELECT activity.id, activity.exercise_id, activity.custom_name, activity.custom_video_link, activity.custom_type,
              activity.progression_pace, activity.min_reps, activity.max_reps, activity.weight_step,
              exercise.exercise_name, exercise.exercise_type, exercise.video_link
       FROM activity
       LEFT JOIN exercise ON activity.exercise_id = exercise.id
       WHERE activity.plan_id = ?
       ORDER BY activity.id`,
      planId
    );

    const withStats = await Promise.all(
      rows.map(async (row): Promise<ExerciseCardActivity> => {
        const fromExercise = row.exercise_id != null;
        const mode: ProgressionMode = (fromExercise ? row.exercise_type : row.custom_type) === 'time' ? 'time' : 'weight';
        const lastStats = await db.getFirstAsync<LastStatsRow>(
          'SELECT reps_amount, sets_amount, weight, time, no FROM activity_stats WHERE activity_id = ? AND is_confirmed = 1 ORDER BY no DESC LIMIT 1',
          row.id
        );

        return {
          id: row.id,
          displayName: (fromExercise ? row.exercise_name : row.custom_name) ?? 'Unnamed exercise',
          videoUrl: (fromExercise ? row.video_link : row.custom_video_link) ?? null,
          mode,
          progressionPace: row.progression_pace,
          minReps: row.min_reps,
          maxReps: row.max_reps,
          weightStep: row.weight_step,
          lastStats: toLastStats(mode, lastStats),
        };
      })
    );

    setActivities(withStats);

    // Rebuild card states from any drafts of this plan's activities (e.g. a restored session).
    const drafts = await db.getAllAsync<DraftRow>(
      'SELECT activity_id, reps_amount, time, outcome FROM activity_stats WHERE is_confirmed = 0'
    );
    const outcomes: Record<number, ExerciseOutcome> = {};
    for (const draft of drafts) {
      const activity = withStats.find((item) => item.id === draft.activity_id);
      if (activity?.lastStats) {
        const goal = computeGoal(activity.mode, activity.lastStats, activity);
        const recordedAmount = activity.mode === 'time' ? draft.time : draft.reps_amount;
        outcomes[activity.id] = restoreOutcome(draft.outcome, goal, recordedAmount ?? goal.amount);
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
      const recorded = computeRecordedStats(activity.mode, activity.lastStats, activity, outcome);
      const afterSets = activity.mode === 'time' ? recorded.load : activity.lastStats.sets;
      entries.push({
        activityId: activity.id,
        name: activity.displayName,
        before: formatSessionStats(activity.mode, activity.lastStats),
        after: formatSessionStats(activity.mode, { ...recorded, sets: afterSets }),
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

      const isTime = activity.mode === 'time';
      const recorded = computeRecordedStats(activity.mode, activity.lastStats, activity, outcome);
      await recordActivityProgress(db, {
        activity_id: activityId,
        no: activity.lastStats.no + 1,
        sets_amount: isTime ? recorded.load : activity.lastStats.sets,
        reps_amount: isTime ? null : recorded.amount,
        weight: isTime ? null : recorded.load,
        time: isTime ? recorded.amount : null,
        outcome: outcome.kind,
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
        <AddExerciseButton onPress={() => setAddActivityVisible(true)} />
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

      <AddActivityModal
        visible={addActivityVisible}
        planId={planId}
        onClose={() => setAddActivityVisible(false)}
        onSaved={loadActivities}
      />

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
