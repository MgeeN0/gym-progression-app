import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

const ERROR_COLOR = '#FF4D4F';

/** A TextInput that glows red while `invalid` is true. */
export function ValidatedInput({ invalid, style, ...props }: TextInputProps & { invalid: boolean }) {
  return <TextInput {...props} style={[style, invalid && styles.invalid]} />;
}

/**
 * Sits next to a field's label while the field is invalid, and reveals the explanation
 * when tapped. Kept out of the way so a message can't pop up mid-typing.
 */
export function ValidationHintButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.hintButton}>
      <MaterialCommunityIcons name="help-circle" size={15} color={ERROR_COLOR} />
    </Pressable>
  );
}

/** Spells out a problem under an input, where the red glow alone doesn't say what's wrong. */
export function ValidationMessage({ children }: { children: string }) {
  return (
    <View style={styles.bubble}>
      <Text style={styles.bubbleText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  invalid: {
    borderColor: ERROR_COLOR,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: ERROR_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 8,
      },
      android: { elevation: 4, shadowColor: ERROR_COLOR },
      web: { boxShadow: `0 0 10px ${ERROR_COLOR}AA` },
    }),
  },
  hintButton: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: ERROR_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
      },
      web: { filter: `drop-shadow(0 0 5px ${ERROR_COLOR}AA)` },
    }),
  },
  bubble: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${ERROR_COLOR}66`,
    backgroundColor: `${ERROR_COLOR}22`,
    paddingVertical: 7,
    paddingHorizontal: 10,
    ...Platform.select({
      ios: {
        shadowColor: ERROR_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      web: { boxShadow: `0 0 10px ${ERROR_COLOR}44` },
    }),
  },
  bubbleText: {
    color: ERROR_COLOR,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
