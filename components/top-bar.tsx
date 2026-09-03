import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export function TopBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { height: 56 + insets.top, paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 0]}
        style={styles.underline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
});
