import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const DANGER_COLOR = '#FF4D4F';
const DANGER_BACKGROUND = '#3A1E22';
export const DIALOG_DANGER_TEXT = '#FF6B6B';

export function WorkoutDialog({
  visible,
  icon,
  iconColor,
  message,
  primaryLabel,
  onPrimary,
  danger,
  onRequestClose,
}: {
  visible: boolean;
  icon: IconName;
  iconColor: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  danger?: { label: string; icon: IconName; onPress: () => void };
  onRequestClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.shadowWrapper}>
          <LinearGradient
            colors={[Colors.accentStart, Colors.accentEnd]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.outline}
          >
            <View style={styles.card}>
              <MaterialCommunityIcons name={icon} size={36} color={iconColor} />
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttonsRow}>
                {danger && (
                  <View style={styles.dangerShadow}>
                    <Pressable style={styles.dangerButton} onPress={danger.onPress}>
                      <MaterialCommunityIcons name={danger.icon} size={18} color={DIALOG_DANGER_TEXT} />
                      <Text style={styles.dangerLabel}>{danger.label}</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.primaryShadow}>
                  <Pressable style={styles.primaryButton} onPress={onPrimary}>
                    <LinearGradient
                      colors={[Colors.accentStart, Colors.accentEnd]}
                      start={[0, 0]}
                      end={[1, 0]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.primaryLabel}>{primaryLabel}</Text>
                  </Pressable>
                </View>
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
    gap: 16,
  },
  message: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 23,
    textAlign: 'center',
  },
  buttonsRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryShadow: {
    flex: 1,
    borderRadius: Radii.pill,
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
  primaryButton: {
    borderRadius: Radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primaryLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  dangerShadow: {
    flex: 1,
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: DANGER_COLOR,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: { boxShadow: `0 6px 18px -4px ${DANGER_COLOR}66` },
    }),
  },
  dangerButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: Radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DANGER_BACKGROUND,
    borderWidth: 1.5,
    borderColor: DANGER_COLOR,
  },
  dangerLabel: {
    color: DIALOG_DANGER_TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
});
