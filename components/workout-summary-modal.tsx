import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

type Stats = { reps: number; sets: number; weight: number };

export type WorkoutSummaryEntry = {
  activityId: number;
  name: string;
  before: Stats;
  after: Stats;
};

function formatStats(stats: Stats) {
  return `${stats.reps} reps, ${stats.sets} sets, ${stats.weight} kg`;
}

export function WorkoutSummaryModal({
  visible,
  duration,
  entries,
  onConfirm,
}: {
  visible: boolean;
  duration: string;
  entries: WorkoutSummaryEntry[];
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
      <View style={styles.backdrop}>
        <View style={styles.shadowWrapper}>
          <LinearGradient
            colors={[Colors.accentStart, Colors.accentEnd]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.outline}
          >
            <View style={styles.card}>
              <MaterialCommunityIcons name="trophy-outline" size={34} color={Colors.accentEnd} />
              <Text style={styles.title}>Workout complete</Text>
              <View style={styles.durationPill}>
                <MaterialCommunityIcons name="timer-outline" size={16} color={Colors.accentEnd} />
                <Text style={styles.durationText}>{duration}</Text>
              </View>

              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {entries.length === 0 ? (
                  <Text style={styles.empty}>No progress was recorded this session.</Text>
                ) : (
                  entries.map((entry) => (
                    <View key={entry.activityId} style={styles.row}>
                      <Text style={styles.rowText}>
                        <Text style={styles.rowName}>{entry.name}: </Text>
                        {formatStats(entry.before)}
                        <Text style={styles.arrow}> → </Text>
                        <Text style={styles.rowAfter}>{formatStats(entry.after)}</Text>
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.okShadow}>
                <Pressable style={styles.okButton} onPress={onConfirm}>
                  <LinearGradient
                    colors={[Colors.accentStart, Colors.accentEnd]}
                    start={[0, 0]}
                    end={[1, 0]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.okLabel}>OK</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  shadowWrapper: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radii.card,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      web: { boxShadow: `0 10px 36px -6px ${Colors.accentStart}99` },
    }),
  },
  outline: {
    borderRadius: Radii.card,
    padding: 1.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card - 1.5,
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  durationText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    alignSelf: 'stretch',
    maxHeight: 320,
  },
  listContent: {
    gap: 10,
  },
  empty: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.well,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  rowName: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  arrow: {
    color: Colors.accentEnd,
    fontWeight: '700',
  },
  rowAfter: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  okShadow: {
    alignSelf: 'stretch',
    borderRadius: Radii.pill,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: { boxShadow: `0 6px 18px -4px ${Colors.accentStart}80` },
    }),
  },
  okButton: {
    borderRadius: Radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  okLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
