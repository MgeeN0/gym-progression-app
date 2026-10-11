import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type ChartPoint, ProgressChart } from '@/components/progress-chart';
import { TopBar } from '@/components/top-bar';
import { Colors, Radii } from '@/constants/theme';
import { DATA_SOURCE } from '@/db/init';
import { type ProgressionMode } from '@/lib/progression';
import { formatDateTime } from '@/lib/time';

type SessionRow = {
  no: number;
  date: string;
  sets_amount: number;
  reps_amount: number | null;
  weight: number | null;
  time: number | null;
  data_source: number;
};

const EDIT_COLOR = '#F2C14E';
const START_COLOR = '#22C55E';

/** A soft halo in the row's own colour, kept subtle so a long history stays calm. */
function glow(color: string) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    web: { boxShadow: `0 0 9px ${color}4D` },
  });
}

/**
 * Not every row is a training: the first one is the activity's starting point, and an
 * edit saved with "Save" adds one of its own.
 */
function sessionKind(session: SessionRow) {
  if (session.no === 1) {
    return 'start' as const;
  }
  return session.data_source === DATA_SOURCE.edit ? ('edit' as const) : ('training' as const);
}

function sessionLabel(session: SessionRow) {
  const kind = sessionKind(session);
  if (kind === 'start') {
    return 'Starting point';
  }
  return kind === 'edit' ? 'Activity edit' : `Training ${session.no}`;
}

export default function ActivityStatsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const activityId = Number(id);

  const [name, setName] = useState('');
  const [mode, setMode] = useState<ProgressionMode>('weight');
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const load = useCallback(async () => {
    const activity = await db.getFirstAsync<{
      custom_name: string | null;
      custom_type: string | null;
      exercise_name: string | null;
      exercise_type: string | null;
    }>(
      `SELECT activity.custom_name, activity.custom_type, exercise.exercise_name, exercise.exercise_type
       FROM activity
       LEFT JOIN exercise ON activity.exercise_id = exercise.id
       WHERE activity.id = ?`,
      activityId
    );

    setName(activity?.custom_name ?? activity?.exercise_name ?? 'Activity');
    setMode((activity?.custom_type ?? activity?.exercise_type) === 'time' ? 'time' : 'weight');

    // Confirmed history only: a draft belongs to a workout that is still running.
    setSessions(
      await db.getAllAsync<SessionRow>(
        `SELECT no, date, sets_amount, reps_amount, weight, time, data_source
         FROM activity_stats
         WHERE activity_id = ? AND is_confirmed = 1
         ORDER BY no`,
        activityId
      )
    );
  }, [db, activityId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      header: () => <TopBar title={name} leftAction={{ icon: 'arrow-left', onPress: handleGoBack }} />,
    });
  }, [navigation, name, handleGoBack]);

  const isTime = mode === 'time';
  const chartPoints: ChartPoint[] = sessions
    .map((session) => ({
      label: sessionLabel(session),
      value: isTime ? session.time : session.weight,
      date: session.date,
    }))
    .filter((point): point is ChartPoint => point.value !== null);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {chartPoints.length > 0 ? (
          <ProgressChart
            points={chartPoints}
            unit={isTime ? 's' : 'kg'}
            title={isTime ? 'Time progress' : 'Weight progress'}
          />
        ) : (
          <EmptyCard label="No training recorded yet" />
        )}

        {sessions.length > 0 && <Text style={styles.sectionLabel}>History</Text>}

        {/* Newest first: the latest session is the one worth seeing without scrolling. */}
        {[...sessions].reverse().map((session) => (
          <SessionCard key={session.no} session={session} isTime={isTime} />
        ))}
      </ScrollView>
    </View>
  );
}

function SessionCard({ session, isTime }: { session: SessionRow; isTime: boolean }) {
  const kind = sessionKind(session);
  const tone = kind === 'edit' ? styles.editCard : kind === 'start' ? styles.startCard : null;
  const badgeTone = kind === 'edit' ? EDIT_COLOR : kind === 'start' ? START_COLOR : Colors.accentEnd;

  return (
    <View style={[styles.sessionCard, tone]}>
      <View style={styles.sessionHeader}>
        <View style={[styles.sessionBadge, { borderColor: `${badgeTone}80` }]}>
          <Text style={[styles.sessionBadgeLabel, { color: badgeTone }]}>{session.no}</Text>
        </View>
        <Text style={styles.sessionTitle}>{sessionLabel(session)}</Text>
        <Text style={styles.sessionDate}>{formatDateTime(session.date)}</Text>
      </View>

      <View style={styles.pillRow}>
        {isTime ? (
          <Pill icon="timer-outline" label={`${session.time ?? '—'} s`} />
        ) : (
          <Pill icon="arm-flex-outline" label={`${session.reps_amount ?? '—'} reps`} />
        )}
        <Pill icon="repeat" label={`${session.sets_amount} sets`} />
        {!isTime && <Pill icon="weight-kilogram" label={`${session.weight ?? '—'} kg`} />}
      </View>
    </View>
  );
}

function Pill({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  return (
    <View style={styles.pill}>
      <MaterialCommunityIcons name={icon} size={14} color={Colors.accentEnd} />
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function EmptyCard({ label }: { label: string }) {
  return (
    <View style={[styles.sessionCard, styles.emptyCard]}>
      <Text style={styles.sessionDate}>{label}</Text>
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
    paddingBottom: 100,
    gap: 14,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      web: { boxShadow: `4px 4px 12px ${Colors.shadowDark}, -4px -4px 12px ${Colors.shadowLight}66` },
    }),
  },
  emptyCard: {
    alignItems: 'center',
  },
  editCard: {
    borderColor: EDIT_COLOR,
    borderWidth: 1.5,
    ...glow(EDIT_COLOR),
  },
  startCard: {
    borderColor: START_COLOR,
    borderWidth: 1.5,
    ...glow(START_COLOR),
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSunken,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionBadgeLabel: {
    color: Colors.accentEnd,
    fontSize: 12,
    fontWeight: '700',
  },
  sessionTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sessionDate: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillLabel: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
