import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { type GestureResponderEvent, Platform, StyleSheet, View } from 'react-native';

import { Colors, Radii } from '@/constants/theme';

const THUMB_SIZE = 22;
const TRACK_HEIGHT = 6;

function roundToStep(value: number, step: number, min: number, max: number) {
  const stepped = min + Math.round((value - min) / step) * step;
  // Steps like 0.5 introduce float noise, so snap to 2 decimals.
  return Math.min(max, Math.max(min, Math.round(stepped * 100) / 100));
}

/**
 * Slider with one or two thumbs. Touches are handled on the track itself so the
 * thumbs never need to receive touches outside their parent's bounds.
 */
export function RangeSlider({
  min,
  max,
  step,
  values,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  values: number[];
  onChange: (values: number[]) => void;
}) {
  const [width, setWidth] = useState(0);

  const ratio = (value: number) => (max === min ? 0 : (value - min) / (max - min));

  const handleTouch = (event: GestureResponderEvent) => {
    if (width <= 0) {
      return;
    }
    const position = Math.min(1, Math.max(0, event.nativeEvent.locationX / width));
    const touched = roundToStep(min + position * (max - min), step, min, max);

    if (values.length === 1) {
      onChange([touched]);
      return;
    }

    // Move whichever thumb is closer to the touch.
    const [low, high] = values;
    if (Math.abs(touched - low) <= Math.abs(touched - high)) {
      onChange([Math.min(touched, high), high]);
    } else {
      onChange([low, Math.max(touched, low)]);
    }
  };

  const fillStart = values.length === 1 ? 0 : ratio(values[0]);
  const fillEnd = ratio(values[values.length - 1]);

  return (
    <View
      style={styles.touchArea}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <View style={styles.track} pointerEvents="none">
        <LinearGradient
          colors={[Colors.accentStart, Colors.accentEnd]}
          start={[0, 0]}
          end={[1, 0]}
          style={[styles.fill, { left: `${fillStart * 100}%`, right: `${(1 - fillEnd) * 100}%` }]}
        />
      </View>

      {values.map((value, index) => (
        <View
          key={index}
          style={[styles.thumbShadow, { left: ratio(value) * Math.max(0, width - THUMB_SIZE) }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[Colors.accentStart, Colors.accentEnd]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.thumb}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    height: 34,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSunken,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  thumbShadow: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      web: { boxShadow: `0 3px 10px ${Colors.accentStart}99` },
    }),
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
});
