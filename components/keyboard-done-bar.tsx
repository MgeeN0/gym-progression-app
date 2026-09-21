import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

const GAP_ABOVE_KEYBOARD = 8;

/**
 * iOS numeric keypads have no return key, so this floats a Done button just above the
 * keyboard while it's open. Render it as a direct child of a full-screen container (e.g. a
 * modal's backdrop). It's positioned from keyboard events rather than an InputAccessoryView,
 * because accessory views don't show up inside a React Native Modal on iOS.
 * Renders nothing on other platforms, whose numeric keyboards already have a Done key.
 */
export function KeyboardDoneBar() {
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }
    const show = Keyboard.addListener('keyboardWillShow', (event) => setKeyboardHeight(event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS !== 'ios' || keyboardHeight === null) {
    return null;
  }

  return (
    <View style={[styles.row, { bottom: keyboardHeight + GAP_ABOVE_KEYBOARD }]} pointerEvents="box-none">
      {isLiquidGlassAvailable() ? (
        <GlassView style={styles.pill} glassEffectStyle="regular" colorScheme="dark" isInteractive>
          <DoneButton />
        </GlassView>
      ) : (
        <View style={[styles.pill, styles.fallbackPill]}>
          <DoneButton />
        </View>
      )}
    </View>
  );
}

function DoneButton() {
  return (
    <Pressable style={styles.button} onPress={Keyboard.dismiss} hitSlop={8}>
      <Text style={styles.label}>Done</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  fallbackPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    minWidth: 150,
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
