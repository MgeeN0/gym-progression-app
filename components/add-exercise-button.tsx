import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

export function AddExerciseButton() {
  return (
    <View style={styles.shadowWrapper}>
      <LinearGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.outline}
      >
        <Pressable style={({ pressed }) => [styles.inner, pressed && styles.innerPressed]}>
          <LinearGradient
            colors={[`${Colors.accentStart}33`, `${Colors.accentEnd}14`]}
            start={[0, 0]}
            end={[1, 1]}
            style={StyleSheet.absoluteFill}
          />
          <MaterialCommunityIcons name="plus" size={20} color={Colors.accentEnd} />
          <Text style={styles.label}>Add exercise</Text>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: Radii.card,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentEnd,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      web: { boxShadow: `0 6px 20px -2px ${Colors.accentEnd}80` },
    }),
  },
  outline: {
    borderRadius: Radii.card,
    padding: 2,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card - 2,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  innerPressed: {
    opacity: 0.85,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
