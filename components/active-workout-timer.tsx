import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type ActiveWorkout, useActiveWorkout } from '@/components/active-workout-provider';
import { Colors, Radii } from '@/constants/theme';
import { formatElapsed, secondsSince } from '@/lib/time';

// Screens with a fixed footer button need the timer lifted above it.
const RAISED_PATHS = ['/add-plan'];

export function ActiveWorkoutTimer() {
  const { activeWorkout } = useActiveWorkout();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!activeWorkout) {
    return null;
  }

  const onOwnPlanScreen = pathname === `/plan/custom/${activeWorkout.planId}`;
  const bottom = insets.bottom + (RAISED_PATHS.includes(pathname) ? 104 : 24);

  // Elsewhere in the app the badge is the way back to the workout in progress. navigate
  // rather than push, so returning reuses that screen instead of stacking another copy.
  const handlePress = () => {
    router.navigate(`/plan/custom/${activeWorkout.planId}`);
  };

  return (
    // box-none: the bar itself stays transparent to touches, the badge inside does not.
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      {/* Keyed by workout so the elapsed time is initialised fresh for each workout. */}
      <TimerBadge
        key={activeWorkout.id}
        workout={activeWorkout}
        showPlanName={!onOwnPlanScreen}
        onPress={onOwnPlanScreen ? undefined : handlePress}
      />
    </View>
  );
}

function TimerBadge({
  workout,
  showPlanName,
  onPress,
}: {
  workout: ActiveWorkout;
  showPlanName: boolean;
  onPress?: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => secondsSince(workout.startedAt));

  useEffect(() => {
    const interval = setInterval(() => setElapsed(secondsSince(workout.startedAt)), 1000);
    return () => clearInterval(interval);
  }, [workout.startedAt]);

  const time = formatElapsed(elapsed);

  return (
    <Pressable
      style={({ pressed }) => [styles.shadow, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
    >
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
    </Pressable>
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
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
