import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useNavigation } from 'expo-router';

import { useActiveWorkout } from '@/components/active-workout-provider';
import { AddPlanCard } from '@/components/add-plan-card';
import { PlanCard } from '@/components/plan-card';
import { PlanSelectionBar } from '@/components/plan-selection-bar';
import { TopBar } from '@/components/top-bar';
import { WorkoutDialog } from '@/components/workout-dialog';
import { Colors } from '@/constants/theme';
import { deletePlans, getLastTrainedPlanId, type Plan } from '@/db/init';

const DANGER_COLOR = '#FF4D4F';

type Dialog = { kind: 'hidden' } | { kind: 'confirm' } | { kind: 'running'; planName: string };

export default function Page() {
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { activeWorkout } = useActiveWorkout();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [lastTrainedPlanId, setLastTrainedPlanId] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'hidden' });

  const load = useCallback(async () => {
    setPlans(await db.getAllAsync<Plan>('SELECT * FROM plan ORDER BY id'));
    setLastTrainedPlanId(await getLastTrainedPlanId(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const startSelecting = useCallback(() => {
    // A mode change with no screen transition, so the tap needs confirming by feel.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelecting(true);
  }, []);

  const stopSelecting = useCallback(() => {
    setSelecting(false);
    setSelectedIds([]);
    setDialog({ kind: 'hidden' });
  }, []);

  const toggleSelected = useCallback((planId: number) => {
    setSelectedIds((current) =>
      current.includes(planId) ? current.filter((id) => id !== planId) : [...current, planId]
    );
  }, []);

  // A plan cannot go while it is being trained: its workout and drafts point at it.
  const handleConfirmRequest = useCallback(() => {
    const running = plans.find((plan) => plan.id === activeWorkout?.planId && selectedIds.includes(plan.id));
    setDialog(running ? { kind: 'running', planName: running.plan_name } : { kind: 'confirm' });
  }, [plans, selectedIds, activeWorkout]);

  const handleDelete = useCallback(async () => {
    await deletePlans(db, selectedIds);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopSelecting();
    await load();
  }, [db, selectedIds, stopSelecting, load]);

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <TopBar
          rightAction={
            selecting || plans.length === 0
              ? undefined
              : {
                  icon: 'trash-can-outline',
                  onPress: startSelecting,
                  tone: 'danger',
                }
          }
        />
      ),
    });
  }, [navigation, selecting, plans.length, startSelecting]);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, selecting && styles.contentSelecting]}>
        <Text style={styles.heading}>{selecting ? 'Select plans to delete' : 'Welcome back!'}</Text>
        <View style={styles.headingRule} />

        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            recent={plan.id === lastTrainedPlanId}
            selectable={selecting}
            selected={selectedIds.includes(plan.id)}
            onToggleSelect={() => toggleSelected(plan.id)}
          />
        ))}

        {!selecting && <AddPlanCard />}
      </ScrollView>

      {selecting && (
        <PlanSelectionBar
          confirmDisabled={selectedIds.length === 0}
          onConfirm={handleConfirmRequest}
          onCancel={stopSelecting}
        />
      )}

      <WorkoutDialog
        visible={dialog.kind === 'confirm'}
        tone="danger"
        icon="alert-octagon-outline"
        iconColor={DANGER_COLOR}
        message="Are you sure you want to remove selected plans and all its activity data?"
        primaryLabel="No"
        onPrimary={() => setDialog({ kind: 'hidden' })}
        danger={{ label: 'Yes', icon: 'trash-can-outline', onPress: handleDelete }}
        onRequestClose={() => setDialog({ kind: 'hidden' })}
      />

      <WorkoutDialog
        visible={dialog.kind === 'running'}
        icon="timer-sand"
        iconColor={Colors.accentEnd}
        message={
          dialog.kind === 'running'
            ? `"${dialog.planName}" is being trained right now. Finish or discard that workout before deleting the plan.`
            : ''
        }
        primaryLabel="Got it"
        onPrimary={() => setDialog({ kind: 'hidden' })}
        onRequestClose={() => setDialog({ kind: 'hidden' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    // Leaves room for the floating workout timer.
    paddingBottom: 100,
  },
  // The delete buttons are taller than the timer, and sit above it while one is running.
  contentSelecting: {
    paddingBottom: 200,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headingRule: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.accentStart,
    marginTop: 10,
    marginBottom: 24,
  },
});
