import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { PLAN_TYPES } from '@/constants/plan-types';
import { Colors, Radii } from '@/constants/theme';
import { type Plan } from '@/db/init';

const RECENT_COLOR = '#2F86FF';
const SELECTED_COLOR = '#FF4D4F';

export function PlanCard({
  plan,
  recent,
  selectable,
  selected,
  onToggleSelect,
}: {
  plan: Plan;
  recent?: boolean;
  /** While plans are being picked for deletion the card selects instead of opening. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const router = useRouter();

  const handlePress = () => {
    if (selectable) {
      onToggleSelect?.();
      return;
    }
    if (plan.plan_type === PLAN_TYPES.singleWorkoutCustom) {
      router.push(`/plan/custom/${plan.id}`);
    } else {
      router.push(`/plan/wip/${plan.id}`);
    }
  };

  return (
    <Pressable style={styles.shadowWrapper} onPress={handlePress}>
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
          {/* Both live in the same corner, so the checkbox takes it over while selecting. */}
          {selectable ? (
            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
              {selected && <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />}
            </View>
          ) : (
            recent && (
              <View style={styles.recentBadge}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={RECENT_COLOR} />
              </View>
            )
          )}
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
    </Pressable>
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
  checkbox: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: SELECTED_COLOR,
    backgroundColor: SELECTED_COLOR,
  },
  recentBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadowDark,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
      web: { boxShadow: `0 3px 8px ${Colors.shadowDark}CC` },
    }),
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
