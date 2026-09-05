import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';
import { type Plan } from '@/db/init';

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <View style={styles.shadowWrapper}>
      <LinearGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.outline}
      >
        <View style={styles.card}>
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons name="image-outline" size={28} color={Colors.textSecondary} />
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {plan.plan_name}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{plan.plan_type}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shadows must live on a wrapper rather than the LinearGradient itself:
  // the gradient clips its layer to its rounded bounds on native, which
  // clips any shadow set on the same view.
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
      android: {
        elevation: 6,
      },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card - 1.5,
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
  info: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  typeText: {
    color: Colors.accentEnd,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
