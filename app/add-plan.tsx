import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Colors, Radii } from '@/constants/theme';
import { createPlan } from '@/db/init';

const FULL_BODY_SPLIT = 'Full Body Workout';

const SPLIT_OPTIONS = [
  {
    type: FULL_BODY_SPLIT,
    description: 'Train the whole body in every session using multi-joint exercises',
  },
  {
    type: 'Push/Pull/Legs',
    description:
      'Split your body workouts across three days: pushing movements (e.g., chest), pulling movements (e.g., back, biceps), and legs + abs.',
  },
  {
    type: 'Single workout (custom)',
    description: 'Choose exercises you enjoy, without a template.',
  },
] as const;

export default function AddPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const db = useSQLiteContext();

  const [planName, setPlanName] = useState('');
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null);
  const [daysPerPlan, setDaysPerPlan] = useState(3);
  const [note, setNote] = useState('');

  const canSave = planName.trim().length > 0 && selectedSplit !== null;

  const handleCreate = useCallback(async () => {
    if (!selectedSplit || planName.trim().length === 0) {
      return;
    }

    await createPlan(db, {
      plan_name: planName.trim(),
      plan_type: selectedSplit,
      days_per_plan: selectedSplit === FULL_BODY_SPLIT ? daysPerPlan : null,
      note: note.trim().length > 0 ? note.trim() : null,
    });
  }, [db, planName, selectedSplit, daysPerPlan, note]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <TopBar
          leftAction={{ icon: 'arrow-left', onPress: handleGoBack }}
          rightAction={{ icon: 'check', onPress: handleCreate, disabled: !canSave }}
        />
      ),
    });
  }, [navigation, handleGoBack, handleCreate, canSave]);

  const showDaysPerPlan = useMemo(() => selectedSplit === FULL_BODY_SPLIT, [selectedSplit]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Plan name</Text>
        <TextInput
          style={styles.input}
          placeholder="Name..."
          placeholderTextColor={Colors.textSecondary}
          value={planName}
          onChangeText={setPlanName}
        />

        <Text style={[styles.label, styles.sectionLabel]}>Choose your workout split</Text>
        <View style={styles.splitCard}>
          {SPLIT_OPTIONS.map((option, index) => (
            <View key={option.type}>
              <Pressable style={styles.splitRow} onPress={() => setSelectedSplit(option.type)}>
                <MaterialCommunityIcons name="chevron-double-right" size={18} color={Colors.accentEnd} />
                <View style={styles.splitBody}>
                  <Text style={styles.splitLabel}>{option.type}</Text>
                  <Text style={styles.splitDescription}>{option.description}</Text>
                </View>
                {selectedSplit === option.type && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={Colors.accentStart} />
                )}
              </Pressable>
              {index < SPLIT_OPTIONS.length - 1 && <View style={styles.splitDivider} />}
            </View>
          ))}
        </View>

        {showDaysPerPlan && (
          <View style={styles.sliderSection}>
            <Text style={styles.label}>Days per plan</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={7}
              step={1}
              value={daysPerPlan}
              onValueChange={setDaysPerPlan}
              minimumTrackTintColor={Colors.accentStart}
              maximumTrackTintColor={Colors.surfaceSunken}
              thumbTintColor={Colors.accentEnd}
            />
            <Text style={styles.sliderValue}>
              {daysPerPlan} {daysPerPlan === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

        <Text style={[styles.label, styles.sectionLabel]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Note..."
          placeholderTextColor={Colors.textSecondary}
          value={note}
          onChangeText={setNote}
          multiline
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.createShadow, !canSave && styles.createShadowDisabled]}>
          <Pressable disabled={!canSave} onPress={handleCreate}>
            <LinearGradient
              colors={[Colors.accentStart, Colors.accentEnd]}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.createButton}
            >
              <Text style={styles.createLabel}>Create</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    gap: 8,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 20,
  },
  input: {
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.well,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  splitCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  splitBody: {
    flex: 1,
    gap: 4,
  },
  splitLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  splitDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  splitDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  sliderSection: {
    marginTop: 20,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  sliderValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  createShadow: {
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
  createShadowDisabled: {
    opacity: 0.4,
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },
  createButton: {
    borderRadius: Radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
