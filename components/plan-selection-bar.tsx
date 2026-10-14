import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActiveWorkout } from '@/components/active-workout-provider';
import { Colors, Radii } from '@/constants/theme';

const CONFIRM_COLOR = '#22C55E';
const CANCEL_COLOR = '#FF4D4F';
const BUTTON_SIZE = 64;
const BOTTOM_GAP = 24;
// Enough to clear the floating workout timer, which sits at the same edge.
const TIMER_CLEARANCE = 62;

/**
 * The two actions for deleting plans: confirm the selection, or leave selection mode.
 * Liquid glass on iOS 26, a flat surface elsewhere. Lifts itself above the floating
 * workout timer while a workout is running so the two never overlap.
 */
export function PlanSelectionBar({
  confirmDisabled,
  onConfirm,
  onCancel,
}: {
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { activeWorkout } = useActiveWorkout();
  const bottom = insets.bottom + BOTTOM_GAP + (activeWorkout ? TIMER_CLEARANCE : 0);

  return (
    <View style={[styles.row, { bottom }]} pointerEvents="box-none">
      <CircleButton
        icon="close"
        color={CANCEL_COLOR}
        accessibilityLabel="Cancel deleting plans"
        onPress={onCancel}
      />
      <CircleButton
        icon="check"
        color={CONFIRM_COLOR}
        accessibilityLabel="Delete selected plans"
        disabled={confirmDisabled}
        onPress={onConfirm}
      />
    </View>
  );
}

function CircleButton({
  icon,
  color,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  accessibilityLabel: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  // Clear glass left the icons hard to read, so the glass carries a tint of the button's
  // own colour and the icon goes white on top of it. The flat fallback keeps a coloured
  // icon on its own surface, which reads fine without a tint.
  const glass = isLiquidGlassAvailable();

  const content = (
    <Pressable
      style={styles.button}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={30} color={glass ? '#FFFFFF' : color} />
    </Pressable>
  );

  return (
    <View style={[styles.shadow, glow(color), disabled && styles.disabled]}>
      {glass ? (
        <GlassView
          style={styles.circle}
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor={`${color}59`}
          isInteractive
        >
          {content}
        </GlassView>
      ) : (
        <View style={[styles.circle, styles.flatCircle]}>{content}</View>
      )}
    </View>
  );
}

function glow(color: string) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
    },
    android: { elevation: 8 },
    web: { boxShadow: `0 4px 16px -2px ${color}99` },
  });
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  shadow: {
    borderRadius: Radii.pill,
  },
  disabled: {
    opacity: 0.4,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  circle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  flatCircle: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
