import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ActiveWorkout, useActiveWorkout } from '@/components/active-workout-provider';
import { Colors, Radii } from '@/constants/theme';
import { formatElapsed, secondsSince } from '@/lib/time';

// Screens with a fixed footer button need the timer lifted above it.
const RAISED_PATHS = ['/add-plan'];

export function ActiveWorkoutTimer() {
  const { activeWorkout } = useActiveWorkout();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (!activeWorkout) {
    return null;
  }

  const onOwnPlanScreen = pathname === `/plan/custom/${activeWorkout.planId}`;
  const bottom = insets.bottom + (RAISED_PATHS.includes(pathname) ? 104 : 24);

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="none">
      {/* Keyed by workout so the elapsed time is initialised fresh for each workout. */}
      <TimerBadge key={activeWorkout.id} workout={activeWorkout} showPlanName={!onOwnPlanScreen} />
    </View>
  );
}

function TimerBadge({ workout, showPlanName }: { workout: ActiveWorkout; showPlanName: boolean }) {
  const [elapsed, setElapsed] = useState(() => secondsSince(workout.startedAt));

  useEffect(() => {
    const interval = setInterval(() => setElapsed(secondsSince(workout.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [workout.startedAt]);

  const time = formatElapsed(elapsed);

  return (
    <View style={styles.shadow}>
      <LinearGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 0]}
        style={styles.badge}
      >
        <MaterialCommunityIcons name="timer-outline" size={16} color={Colors.textPrimary} />
        <Text style={styles.text} numberOfLines={1}>
          {showPlanName ? `${workout.planName}: ${time}` : time}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shadow: {
    maxWidth: '88%',
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  text: {
    flexShrink: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
