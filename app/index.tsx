import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { AddPlanCard } from '@/components/add-plan-card';
import { PlanCard } from '@/components/plan-card';
import { Colors } from '@/constants/theme';
import { type Plan } from '@/db/init';

export default function Page() {
  const db = useSQLiteContext();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    db.getAllAsync<Plan>('SELECT * FROM plan ORDER BY id').then(setPlans);
  }, [db]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Welcome back!</Text>
      <View style={styles.headingRule} />

      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} />
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
