import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Colors } from '@/constants/theme';

export default function CustomWorkoutPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    navigation.setOptions({
      header: () => <TopBar leftAction={{ icon: 'arrow-left', onPress: handleGoBack }} />,
    });
  }, [navigation, handleGoBack]);

  return <View style={styles.screen} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
