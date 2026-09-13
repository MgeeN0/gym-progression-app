import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { DIALOG_DANGER_TEXT, WorkoutDialog } from '@/components/workout-dialog';
import { Colors } from '@/constants/theme';
import { discardUnfinishedWorkout, getActiveWorkout, inspectUnfinishedWorkout, startWorkout } from '@/db/init';

export type ActiveWorkout = {
  id: number;
  planId: number;
  planName: string;
  startedAt: number;
};

type ActiveWorkoutContextValue = {
  activeWorkout: ActiveWorkout | null;
  refreshActiveWorkout: () => Promise<void>;
  requestStart: (planId: number) => Promise<void>;
};

type Dialog =
  | { kind: 'hidden' }
  | { kind: 'restore'; planId: number }
  | { kind: 'switch'; startPlanId: number }
  | { kind: 'corrupted'; startPlanId: number | null };

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

export function useActiveWorkout() {
  const value = useContext(ActiveWorkoutContext);
  if (!value) {
    throw new Error('useActiveWorkout must be used inside ActiveWorkoutProvider');
  }
  return value;
}

export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'hidden' });

  const refreshActiveWorkout = useCallback(async () => {
    const row = await getActiveWorkout(db);
    setActiveWorkout(
      row
        ? { id: row.id, planId: row.plan_id, planName: row.plan_name, startedAt: Date.parse(row.start_timestamp) }
        : null
    );
  }, [db]);

  const beginWorkout = useCallback(
    async (planId: number) => {
      await startWorkout(db, planId);
      await refreshActiveWorkout();
    },
    [db, refreshActiveWorkout]
  );

  useEffect(() => {
    let cancelled = false;

    const checkOnStartup = async () => {
      const result = await inspectUnfinishedWorkout(db);
      if (cancelled) {
        return;
      }
      if (result.status === 'open' && !result.hasDrafts) {
        // Started but nothing recorded, so there is nothing worth restoring.
        await discardUnfinishedWorkout(db);
      } else if (result.status === 'open') {
        setDialog({ kind: 'restore', planId: result.planId });
      } else if (result.status === 'corrupted') {
        setDialog({ kind: 'corrupted', startPlanId: null });
      }
      await refreshActiveWorkout();
    };

    checkOnStartup();
    return () => {
      cancelled = true;
    };
  }, [db, refreshActiveWorkout]);

  const requestStart = useCallback(
    async (planId: number) => {
      const result = await inspectUnfinishedWorkout(db);
      if (result.status === 'none') {
        await beginWorkout(planId);
      } else if (result.status === 'open' && result.planId === planId) {
        await refreshActiveWorkout();
      } else if (result.status === 'open') {
        setDialog({ kind: 'switch', startPlanId: planId });
      } else {
        setDialog({ kind: 'corrupted', startPlanId: planId });
      }
    },
    [db, beginWorkout, refreshActiveWorkout]
  );

  const hideDialog = () => setDialog({ kind: 'hidden' });

  const handleRestore = () => {
    if (dialog.kind !== 'restore') {
      return;
    }
    hideDialog();
    router.push(`/plan/custom/${dialog.planId}`);
  };

  const handleDelete = async () => {
    await discardUnfinishedWorkout(db);
    await refreshActiveWorkout();
    hideDialog();
  };

  const handleSwitch = async () => {
    if (dialog.kind !== 'switch') {
      return;
    }
    const { startPlanId } = dialog;
    hideDialog();
    await discardUnfinishedWorkout(db);
    await beginWorkout(startPlanId);
  };

  const handleCorruptedOk = async () => {
    if (dialog.kind !== 'corrupted') {
      return;
    }
    const { startPlanId } = dialog;
    hideDialog();
    await discardUnfinishedWorkout(db);
    if (startPlanId !== null) {
      await beginWorkout(startPlanId);
    } else {
      await refreshActiveWorkout();
    }
  };

  return (
    <ActiveWorkoutContext.Provider value={{ activeWorkout, refreshActiveWorkout, requestStart }}>
      {children}

      <WorkoutDialog
        visible={dialog.kind === 'restore'}
        icon="history"
        iconColor={Colors.accentEnd}
        message="Unsaved changes have been found. Do you want to restore previous workout session?"
        primaryLabel="Yes"
        onPrimary={handleRestore}
        danger={{ label: 'Delete', icon: 'trash-can-outline', onPress: handleDelete }}
        onRequestClose={() => {}}
      />

      <WorkoutDialog
        visible={dialog.kind === 'switch'}
        icon="swap-horizontal"
        iconColor={Colors.accentEnd}
        message="Do you want to cancel current workout and start another one?"
        primaryLabel="No"
        onPrimary={hideDialog}
        danger={{ label: 'Yes', icon: 'trash-can-outline', onPress: handleSwitch }}
        onRequestClose={hideDialog}
      />

      <WorkoutDialog
        visible={dialog.kind === 'corrupted'}
        icon="alert-octagon-outline"
        iconColor={DIALOG_DANGER_TEXT}
        message="App data is corrupted. Incorrect activity data will be now removed."
        primaryLabel="OK"
        onPrimary={handleCorruptedOk}
        onRequestClose={handleCorruptedOk}
      />
    </ActiveWorkoutContext.Provider>
  );
}
