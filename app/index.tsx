import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';

import { AddPlanCard } from '@/components/add-plan-card';
import { PlanCard } from '@/components/plan-card';
import { Colors } from '@/constants/theme';
import { getLastTrainedPlanId, type Plan } from '@/db/init';

export default function Page() {
  const db = useSQLiteContext();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [lastTrainedPlanId, setLastTrainedPlanId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setPlans(await db.getAllAsync<Plan>('SELECT * FROM plan ORDER BY id'));
        setLastTrainedPlanId(await getLastTrainedPlanId(db));
      };
      load();
    }, [db])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome back!</Text>
      <View style={styles.headingRule} />

      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} recent={plan.id === lastTrainedPlanId} />
      ))}

      <AddPlanCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    // Leaves room for the floating workout timer.
    paddingBottom: 100,
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
