import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { useActiveWorkout } from '@/components/active-workout-provider';
import { AddActivityModal, type EditableActivity } from '@/components/add-activity-modal';
import { AddExerciseButton } from '@/components/add-exercise-button';
import { ExerciseCard, type ExerciseCardActivity, type RecordedStats } from '@/components/exercise-card';
import { TopBar } from '@/components/top-bar';
import { WorkoutSummaryModal, type WorkoutSummaryEntry } from '@/components/workout-summary-modal';
import { Colors } from '@/constants/theme';
import {
  deleteActivity,
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
  sets_amount: number;
  reps_amount: number | null;
  weight: number | null;
  time: number | null;
  outcome: string | null;
};

// The stored session, which after an edit saved with "Save & confirm" is the user's own
// numbers rather than anything derivable from the goal.
function toRecordedStats(mode: ProgressionMode, row: DraftRow): RecordedStats | null {
  if (mode === 'time') {
    return row.time === null ? null : { amount: row.time, load: row.sets_amount, sets: row.sets_amount };
  }
  return row.reps_amount === null || row.weight === null
    ? null
    : { amount: row.reps_amount, load: row.weight, sets: row.sets_amount };
}

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
  const [editable, setEditable] = useState<Record<number, EditableActivity>>({});
  const [editing, setEditing] = useState<EditableActivity | null>(null);
  const [recordedOutcomes, setRecordedOutcomes] = useState<Record<number, ExerciseOutcome>>({});
  const [recordedStats, setRecordedStats] = useState<Record<number, RecordedStats>>({});
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

    const editPayloads: Record<number, EditableActivity> = {};

    const withStats = await Promise.all(
      rows.map(async (row): Promise<ExerciseCardActivity> => {
        const fromExercise = row.exercise_id != null;
        const mode: ProgressionMode = (fromExercise ? row.exercise_type : row.custom_type) === 'time' ? 'time' : 'weight';
        const lastStats = await db.getFirstAsync<LastStatsRow>(
          'SELECT reps_amount, sets_amount, weight, time, no FROM activity_stats WHERE activity_id = ? AND is_confirmed = 1 ORDER BY no DESC LIMIT 1',
          row.id
        );

        // Only custom activities carry their own editable fields; browser ones live in `exercise`.
        if (!fromExercise) {
          editPayloads[row.id] = {
            id: row.id,
            customName: row.custom_name ?? '',
            customVideoLink: row.custom_video_link,
            customType: mode,
            minReps: row.min_reps,
            maxReps: row.max_reps,
            weightStep: row.weight_step,
            progressionPace: row.progression_pace,
            last: {
              sets: lastStats?.sets_amount ?? 1,
              reps: lastStats?.reps_amount ?? null,
              weight: lastStats?.weight ?? null,
              time: lastStats?.time ?? null,
            },
          };
        }

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
    setEditable(editPayloads);

    // Rebuild card states from any drafts of this plan's activities (e.g. a restored session).
    const drafts = await db.getAllAsync<DraftRow>(
      'SELECT activity_id, sets_amount, reps_amount, weight, time, outcome FROM activity_stats WHERE is_confirmed = 0'
    );
    const outcomes: Record<number, ExerciseOutcome> = {};
    const stats: Record<number, RecordedStats> = {};
    for (const draft of drafts) {
      const activity = withStats.find((item) => item.id === draft.activity_id);
      if (activity?.lastStats) {
        const goal = computeGoal(activity.mode, activity.lastStats, activity);
        const recordedAmount = activity.mode === 'time' ? draft.time : draft.reps_amount;
        outcomes[activity.id] = restoreOutcome(draft.outcome, goal, recordedAmount ?? goal.amount);
        const recorded = toRecordedStats(activity.mode, draft);
        if (recorded) {
          stats[activity.id] = recorded;
        }
      }
    }
    setRecordedOutcomes(outcomes);
    setRecordedStats(stats);
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
      const stored = recordedStats[activity.id];
      const recorded = stored ?? computeRecordedStats(activity.mode, activity.lastStats, activity, outcome);
      const afterSets = stored
        ? stored.sets
        : activity.mode === 'time'
          ? recorded.load
          : activity.lastStats.sets;
      entries.push({
        activityId: activity.id,
        name: activity.displayName,
        before: formatSessionStats(activity.mode, activity.lastStats),
        after: formatSessionStats(activity.mode, { ...recorded, sets: afterSets }),
      });
    }

    setRecordedOutcomes({});
    setRecordedStats({});
    setSummaryDuration(formatElapsed(durationSeconds));
    setSummaryEntries(entries);
    await refreshActiveWorkout();
  }, [db, planId, activeWorkout, activities, recordedOutcomes, recordedStats, refreshActiveWorkout]);

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
          setRecordedStats({});
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
      const lastSets = activity.lastStats.sets;
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
      setRecordedStats((prev) => ({
        ...prev,
        [activityId]: { amount: recorded.amount, load: recorded.load, sets: isTime ? recorded.load : lastSets },
      }));
    },
    [db, activities]
  );

  const handleDelete = useCallback(
    (activityId: number) => {
      Alert.alert(
        'Are you sure you want to delete this activity?',
        'Progress history will be deleted as well.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              await deleteActivity(db, activityId);
              setEditing(null);
              await loadActivities();
            },
          },
        ]
      );
    },
    [db, loadActivities]
  );

  const handleUndo = useCallback(
    async (activityId: number) => {
      await deleteDraftActivityStats(db, activityId);
      setRecordedOutcomes((prev) => {
        const next = { ...prev };
        delete next[activityId];
        return next;
      });
      setRecordedStats((prev) => {
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
            recorded={recordedStats[activity.id]}
            onRecordOutcome={(outcome) => handleRecordOutcome(activity.id, outcome)}
            onUndo={() => handleUndo(activity.id)}
            onEdit={editable[activity.id] ? () => setEditing(editable[activity.id]) : undefined}
            onDelete={() => handleDelete(activity.id)}
          />
        ))}
      </ScrollView>

      {/* Keyed per activity so the form state is seeded from whichever one is opened. */}
      <AddActivityModal
        key={editing ? `edit-${editing.id}` : 'create'}
        visible={addActivityVisible || editing !== null}
        planId={planId}
        editing={editing}
        sessionActive={sessionActive}
        onClose={() => {
          setAddActivityVisible(false);
          setEditing(null);
        }}
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
