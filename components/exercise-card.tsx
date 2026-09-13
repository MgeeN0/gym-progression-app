import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';
import { computeGoal, formatGoalChange, type ProgressionRules } from '@/lib/progression';

const SUCCESS_COLOR = '#22C55E';
const DANGER_COLOR = '#FF4D4F';

export type ExerciseOutcome = 'met' | 'missed';

export type ExerciseCardActivity = ProgressionRules & {
  id: number;
  displayName: string;
  videoUrl: string | null;
  lastStats: { reps: number; sets: number; weight: number; no: number } | null;
};

export function ExerciseCard({
  activity,
  sessionActive,
  outcome,
  onRecordOutcome,
  onUndo,
}: {
  activity: ExerciseCardActivity;
  sessionActive: boolean;
  outcome: ExerciseOutcome | undefined;
  onRecordOutcome: (outcome: ExerciseOutcome) => void;
  onUndo: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const goal = activity.lastStats ? computeGoal(activity.lastStats, activity) : null;
  const goalChange = goal ? formatGoalChange(goal) : '';
  const canRecordOutcome = sessionActive && activity.lastStats !== null && outcome === undefined;
  const outlineColors: [string, string] =
    outcome === 'met'
      ? [SUCCESS_COLOR, SUCCESS_COLOR]
      : outcome === 'missed'
        ? [DANGER_COLOR, DANGER_COLOR]
        : [Colors.accentStart, Colors.accentEnd];
  const tintStyle =
    outcome === 'met' ? styles.tintSuccess : outcome === 'missed' ? styles.tintDanger : null;

  const handleYoutubePress = () => {
    if (activity.videoUrl) {
      Linking.openURL(activity.videoUrl);
    }
  };

  return (
    <View style={styles.shadowWrapper}>
      <LinearGradient colors={outlineColors} start={[0, 0]} end={[1, 1]} style={styles.outline}>
        <View style={styles.card}>
          {/* The card must stay opaque: the outline gradient fills the whole card area behind it. */}
          {tintStyle && <View style={[StyleSheet.absoluteFill, tintStyle]} pointerEvents="none" />}
          <Pressable style={styles.header} onPress={() => setExpanded((prev) => !prev)}>
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="image-outline" size={26} color={Colors.textSecondary} />
            </View>
            <Text style={styles.name}>{activity.displayName}</Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={26}
              color={Colors.textSecondary}
            />
          </Pressable>

          {expanded && (
            <View style={styles.body}>
              <Text style={styles.goalLabel}>
                {goal ? `Goal${goalChange ? ` (${goalChange})` : ''}:` : 'No previous training yet'}
              </Text>

              <View style={styles.statsRow}>
                <StatPill icon="arm-flex-outline" label={`Reps: ${goal?.reps ?? '—'}`} />
                <StatPill icon="repeat" label={`Sets: ${activity.lastStats?.sets ?? '—'}`} />
                <StatPill icon="weight-kilogram" label={goal ? `${goal.weight} kg` : '—'} />
              </View>

              <View style={styles.actionsRow}>
                <ProgressButton icon="minus" color="#FF8A3D" disabled={!sessionActive} />
                <ProgressButton
                  icon="close"
                  color={DANGER_COLOR}
                  disabled={!canRecordOutcome}
                  onPress={() => onRecordOutcome('missed')}
                />
                <ProgressButton
                  icon="check"
                  color={SUCCESS_COLOR}
                  disabled={!canRecordOutcome}
                  onPress={() => onRecordOutcome('met')}
                />
                <ProgressButton icon="plus" color="#2F86FF" disabled={!sessionActive} />
              </View>

              <View style={styles.linksRow}>
                <View style={[styles.linkShadow, !activity.videoUrl && styles.linkShadowDisabled]}>
                  <Pressable
                    style={styles.linkButton}
                    onPress={handleYoutubePress}
                    disabled={!activity.videoUrl}
                  >
                    <LinearGradient
                      colors={[Colors.accentStart, Colors.accentEnd]}
                      start={[0, 0]}
                      end={[1, 0]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.linkButtonLabel}>Youtube demo</Text>
                  </Pressable>
                </View>

                <View style={styles.linkShadow}>
                  <Pressable style={styles.linkButton}>
                    <LinearGradient
                      colors={[Colors.accentEnd, Colors.accentStart]}
                      start={[0, 0]}
                      end={[1, 0]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.linkButtonLabel}>Stats & history</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.iconRow}>
                <Pressable style={styles.iconButton}>
                  <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={[styles.iconButton, outcome === undefined && styles.iconButtonDisabled]}
                  onPress={onUndo}
                  disabled={outcome === undefined}
                >
                  <MaterialCommunityIcons name="undo-variant" size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

function StatPill({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={14} color={Colors.accentEnd} />
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

function progressGlow(color: string) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.55,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
    web: { boxShadow: `0 4px 12px ${color}80` },
  });
}

function ProgressButton({
  icon,
  color,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 12 }).start();
  };

  return (
    <Animated.View
      style={[
        styles.progressShadow,
        progressGlow(color),
        disabled && styles.progressShadowDisabled,
        { transform: [{ scale }] },
      ]}
    >
      <Pressable
        style={[styles.progressButton, { backgroundColor: color }]}
        disabled={disabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <MaterialCommunityIcons name={icon} size={20} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: Radii.card,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: `0 6px 16px -4px ${Colors.accentStart}66, 6px 6px 14px ${Colors.shadowDark}, -6px -6px 14px ${Colors.shadowLight}`,
      },
    }),
  },
  outline: {
    borderRadius: Radii.card,
    padding: 1.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card - 1.5,
    overflow: 'hidden',
  },
  tintSuccess: {
    backgroundColor: `${SUCCESS_COLOR}12`,
  },
  tintDanger: {
    backgroundColor: `${DANGER_COLOR}12`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: Radii.well,
    backgroundColor: Colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  name: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  goalLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  statPill: {
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
  statPillLabel: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  progressShadow: {
    borderRadius: Radii.pill,
  },
  progressShadowDisabled: {
    opacity: 0.35,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  progressButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkShadow: {
    flex: 1,
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 5 },
      web: { boxShadow: `0 4px 12px -2px ${Colors.accentStart}66` },
    }),
  },
  linkShadowDisabled: {
    opacity: 0.4,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  linkButton: {
    borderRadius: Radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  linkButtonLabel: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSunken,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.4,
  },
});
