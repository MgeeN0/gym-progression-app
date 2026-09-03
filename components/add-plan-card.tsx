import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

export function AddPlanCard() {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.glowBadge}
      >
        <MaterialCommunityIcons name="plus" size={22} color={Colors.textPrimary} />
      </LinearGradient>
      <Text style={styles.label}>Add new plan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    paddingVertical: 18,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: `inset 3px 3px 8px ${Colors.shadowDark}, inset -3px -3px 8px ${Colors.shadowLight}`,
      },
    }),
  },
  glowBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentEnd,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0 0 16px 2px ${Colors.accentEnd}99`,
      },
    }),
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
