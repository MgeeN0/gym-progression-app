import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radii } from '@/constants/theme';

export type TopBarAction = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

export function TopBar({ leftAction, rightAction }: { leftAction?: TopBarAction; rightAction?: TopBarAction }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.slot}>{leftAction && <TopBarButton action={leftAction} />}</View>
        <View style={styles.slot}>{rightAction && <TopBarButton action={rightAction} />}</View>
      </View>
      <LinearGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 0]}
        style={styles.underline}
      />
    </View>
  );
}

function TopBarButton({ action }: { action: TopBarAction }) {
  return (
    <View style={styles.buttonShadow}>
      <Pressable
        onPress={action.onPress}
        disabled={action.disabled}
        style={[styles.button, action.disabled && styles.buttonDisabled]}
        hitSlop={8}
      >
        <MaterialCommunityIcons name={action.icon} size={20} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  slot: {
    width: 40,
    height: 40,
  },
  buttonShadow: {
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
      },
      android: { elevation: 4 },
      web: {
        boxShadow: `3px 3px 8px ${Colors.shadowDark}, -2px -2px 6px ${Colors.shadowLight}`,
      },
    }),
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
});
