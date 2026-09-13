import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Animated,
  type LayoutRectangle,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Radii } from '@/constants/theme';
import {
  computeGoal,
  type ExerciseOutcome,
  formatGoalChange,
  getLessAmounts,
  type ProgressionRules,
} from '@/lib/progression';

const SUCCESS_COLOR = '#22C55E';
const DANGER_COLOR = '#FF4D4F';
const MORE_COLOR = '#2F86FF';
const LESS_COLOR = '#FF8A3D';

const OUTCOME_COLORS: Record<ExerciseOutcome['kind'], { outline: string; tint: string }> = {
  met: { outline: SUCCESS_COLOR, tint: `${SUCCESS_COLOR}12` },
  missed: { outline: DANGER_COLOR, tint: `${DANGER_COLOR}12` },
  more: { outline: MORE_COLOR, tint: `${MORE_COLOR}16` },
  less: { outline: DANGER_COLOR, tint: '#FF6A3D16' },
};

type PickerKind = 'more' | 'less';
type PickerTheme = { fill: string; border: string };
type Point = { x: number; y: number };

const PICKER_THEMES: Record<PickerKind, PickerTheme> = {
  more: { fill: '#19ACE2', border: '#00909A' },
  less: { fill: LESS_COLOR, border: '#B8541F' },
};

const MORE_AMOUNTS = [1, 2, 3];

const BUTTON_SIZE = 44;
const BUTTON_GAP = 14;
const BUTTON_COUNT = 4;
const BUBBLE_SIZE = 32;
const ARC_RADIUS = 56;
const ARC_ANGLES = [-55, 0, 55];

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
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [actionsLayout, setActionsLayout] = useState<LayoutRectangle | null>(null);

  const goal = activity.lastStats ? computeGoal(activity.lastStats, activity) : null;
  const goalChange = goal ? formatGoalChange(goal) : '';
  const lessAmounts = goal ? getLessAmounts(goal.reps, activity.progressionPace) : [];
  const canRecordOutcome = sessionActive && activity.lastStats !== null && outcome === undefined;
  const openPicker = canRecordOutcome ? picker : null;
  const outcomeColors = outcome ? OUTCOME_COLORS[outcome.kind] : null;
  const outlineColors: [string, string] = outcomeColors
    ? [outcomeColors.outline, outcomeColors.outline]
    : [Colors.accentStart, Colors.accentEnd];

  let repsLabel = 'Reps: —';
  let repsAccent: string | undefined;
  if (goal) {
    if (outcome?.kind === 'more') {
      repsLabel = `Reps: ${goal.reps} + ${outcome.amount}`;
      repsAccent = MORE_COLOR;
    } else if (outcome?.kind === 'less') {
      repsLabel = `Reps: ${goal.reps} - ${outcome.amount}`;
      repsAccent = LESS_COLOR;
    } else {
      repsLabel = `Reps: ${goal.reps}`;
    }
  }

  // Buttons are fixed-size and centered, so their centers follow from the row's layout.
  const pickerOrigins: Record<PickerKind, Point> | null = actionsLayout
    ? (() => {
        const contentWidth = BUTTON_SIZE * BUTTON_COUNT + BUTTON_GAP * (BUTTON_COUNT - 1);
        const centerY = actionsLayout.y + actionsLayout.height / 2;
        return {
          less: { x: actionsLayout.x + (actionsLayout.width - contentWidth) / 2 + BUTTON_SIZE / 2, y: centerY },
          more: { x: actionsLayout.x + (actionsLayout.width + contentWidth) / 2 - BUTTON_SIZE / 2, y: centerY },
        };
      })()
    : null;

  const record = (next: ExerciseOutcome) => {
    setPicker(null);
    onRecordOutcome(next);
  };

  const togglePicker = (kind: PickerKind) => {
    setPicker((current) => (current === kind ? null : kind));
  };

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
          {outcomeColors && (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: outcomeColors.tint }]}
              pointerEvents="none"
            />
          )}
          <Pressable
            style={styles.header}
            onPress={() => {
              setExpanded((prev) => !prev);
              setPicker(null);
            }}
          >
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
                <StatPill icon="arm-flex-outline" label={repsLabel} accent={repsAccent} />
                <StatPill icon="repeat" label={`Sets: ${activity.lastStats?.sets ?? '—'}`} />
                <StatPill icon="weight-kilogram" label={goal ? `${goal.weight} kg` : '—'} />
              </View>

              <View style={styles.actionsRow} onLayout={(event) => setActionsLayout(event.nativeEvent.layout)}>
                <ProgressButton
                  icon="minus"
                  color={LESS_COLOR}
                  disabled={!canRecordOutcome || lessAmounts.length === 0}
                  active={openPicker === 'less'}
                  onPress={() => togglePicker('less')}
                />
                <ProgressButton
                  icon="close"
                  color={DANGER_COLOR}
                  disabled={!canRecordOutcome}
                  onPress={() => record({ kind: 'missed' })}
                />
                <ProgressButton
                  icon="check"
                  color={SUCCESS_COLOR}
                  disabled={!canRecordOutcome}
                  onPress={() => record({ kind: 'met' })}
                />
                <ProgressButton
                  icon="plus"
                  color={MORE_COLOR}
                  disabled={!canRecordOutcome}
                  active={openPicker === 'more'}
                  onPress={() => togglePicker('more')}
                />
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

              {/* Rendered last and inside the body (not the button) so the bubbles sit on top and stay
                  within a parent's bounds — touches outside a parent's bounds aren't reliable on Android. */}
              {pickerOrigins && (
                <>
                  <RepPicker
                    direction={-1}
                    origin={pickerOrigins.less}
                    visible={openPicker === 'less'}
                    theme={PICKER_THEMES.less}
                    amounts={lessAmounts}
                    onSelect={(amount) => record({ kind: 'less', amount })}
                  />
                  <RepPicker
                    direction={1}
                    origin={pickerOrigins.more}
                    visible={openPicker === 'more'}
                    theme={PICKER_THEMES.more}
                    amounts={MORE_AMOUNTS}
                    onSelect={(amount) => record({ kind: 'more', amount })}
                  />
                </>
              )}
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
  accent,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  accent?: string;
}) {
  return (
    <View style={[styles.statPill, accent !== undefined && { borderColor: accent, borderWidth: 1.5 }]}>
      <MaterialCommunityIcons name={icon} size={14} color={accent ?? Colors.accentEnd} />
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
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  disabled?: boolean;
  active?: boolean;
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
        style={[styles.progressButton, { backgroundColor: color }, active && styles.progressButtonActive]}
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

function RepPicker({
  direction,
  origin,
  visible,
  theme,
  amounts,
  onSelect,
}: {
  direction: 1 | -1;
  origin: Point;
  visible: boolean;
  theme: PickerTheme;
  amounts: number[];
  onSelect: (amount: number) => void;
}) {
  const [progress] = useState(() => ARC_ANGLES.map(() => new Animated.Value(0)));

  useEffect(() => {
    const animation = Animated.parallel(
      progress.map((value, index) =>
        visible
          ? Animated.sequence([
              Animated.delay(index * 55),
              Animated.spring(value, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }),
            ])
          : Animated.timing(value, { toValue: 0, duration: 140, useNativeDriver: true })
      )
    );
    animation.start();
    // Stopping here prevents a still-pending staggered open from re-opening after a quick close.
    return () => animation.stop();
  }, [visible, progress]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'box-none' : 'none'}>
      {ARC_ANGLES.map((angle, index) => {
        if (index >= amounts.length) {
          return null;
        }
        const radians = (angle * Math.PI) / 180;
        return (
          <RepBubble
            key={angle}
            amount={amounts[index]}
            origin={origin}
            offset={{ x: Math.cos(radians) * ARC_RADIUS * direction, y: Math.sin(radians) * ARC_RADIUS }}
            spin={direction}
            progress={progress[index]}
            theme={theme}
            onSelect={onSelect}
          />
        );
      })}
    </View>
  );
}

function RepBubble({
  amount,
  origin,
  offset,
  spin,
  progress,
  theme,
  onSelect,
}: {
  amount: number;
  origin: Point;
  offset: Point;
  spin: 1 | -1;
  progress: Animated.Value;
  theme: PickerTheme;
  onSelect: (amount: number) => void;
}) {
  const [pressScale] = useState(() => new Animated.Value(1));

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, offset.x] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, offset.y] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [`${-140 * spin}deg`, '0deg'] });
  const opacity = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] });
  const scale = Animated.multiply(
    progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
    pressScale
  );

  return (
    <Animated.View
      style={[
        styles.bubbleShadow,
        progressGlow(theme.fill),
        {
          left: origin.x - BUBBLE_SIZE / 2,
          top: origin.y - BUBBLE_SIZE / 2,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        },
      ]}
    >
      <Pressable
        style={[styles.bubble, { backgroundColor: theme.fill, borderColor: theme.border }]}
        hitSlop={4}
        onPressIn={() =>
          Animated.spring(pressScale, { toValue: 0.8, speed: 40, bounciness: 6, useNativeDriver: true }).start()
        }
        onPressOut={() =>
          Animated.spring(pressScale, { toValue: 1, speed: 30, bounciness: 12, useNativeDriver: true }).start()
        }
        onPress={() => onSelect(amount)}
      >
        <Text style={styles.bubbleLabel}>{amount}</Text>
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
    gap: BUTTON_GAP,
  },
  progressShadow: {
    borderRadius: Radii.pill,
  },
  progressShadowDisabled: {
    opacity: 0.35,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  progressButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressButtonActive: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  bubbleShadow: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: Radii.pill,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
