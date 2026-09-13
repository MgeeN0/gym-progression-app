import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radii } from '@/constants/theme';

const DANGER_BACKGROUND = '#3A1E22';
const DANGER_BORDER = '#7A2A32';
const DANGER_ICON = '#FF6B6B';

type TopBarActionBase = {
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
};

export type TopBarAction = TopBarActionBase &
  (
    | { icon: keyof typeof MaterialCommunityIcons.glyphMap; label?: never }
    | { label: string; icon?: never }
  );

export function TopBar({
  title,
  leftAction,
  rightAction,
}: {
  title?: string;
  leftAction?: TopBarAction;
  rightAction?: TopBarAction;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.slot}>{leftAction && <TopBarButton action={leftAction} />}</View>
        <View style={styles.slot}>{rightAction && <TopBarButton action={rightAction} />}</View>
        {title && (
          // Absolutely positioned so the title stays centered even when the side buttons differ in width.
          <View style={styles.titleWrapper} pointerEvents="none">
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
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
  if (action.label !== undefined) {
    return (
      <View style={[styles.labelShadow, action.disabled && styles.buttonDisabled]}>
        <Pressable onPress={action.onPress} disabled={action.disabled} style={styles.labelButton} hitSlop={8}>
          <LinearGradient
            colors={[Colors.accentStart, Colors.accentEnd]}
            start={[0, 0]}
            end={[1, 0]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.labelText}>{action.label}</Text>
        </Pressable>
      </View>
    );
  }

  const isDanger = action.tone === 'danger';

  return (
    <View style={styles.buttonShadow}>
      <Pressable
        onPress={action.onPress}
        disabled={action.disabled}
        style={[styles.button, isDanger && styles.buttonDanger, action.disabled && styles.buttonDisabled]}
        hitSlop={8}
      >
        <MaterialCommunityIcons
          name={action.icon}
          size={20}
          color={isDanger ? DANGER_ICON : Colors.textPrimary}
        />
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
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
  },
  titleWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 104,
    right: 104,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
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
  buttonDanger: {
    backgroundColor: DANGER_BACKGROUND,
    borderColor: DANGER_BORDER,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  labelShadow: {
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
      web: { boxShadow: `0 4px 14px -2px ${Colors.accentStart}99` },
    }),
  },
  labelButton: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  labelText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
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
