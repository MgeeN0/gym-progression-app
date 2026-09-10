import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { Colors, Radii } from '@/constants/theme';

export default function WorkInProgressPlanScreen() {
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

  return (
    <View style={styles.screen}>
      <View style={styles.notice}>
        <MaterialCommunityIcons name="information-outline" size={20} color={Colors.accentEnd} />
        <Text style={styles.noticeText}>Work in progress</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.well,
    borderWidth: 1,
    borderColor: `${Colors.accentEnd}55`,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
