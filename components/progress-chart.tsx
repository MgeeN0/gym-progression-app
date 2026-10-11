import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Reanimated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { Colors, Radii } from '@/constants/theme';
import { formatDateTime } from '@/lib/time';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);
const AnimatedG = Reanimated.createAnimatedComponent(G);

const HEIGHT = 200;
const PADDING = { top: 18, right: 16, bottom: 28, left: 46 };
const GRID_LINES = 3;
const DRAW_DURATION = 1000;
const TOOLTIP_WIDTH = 136;
// Roughly the bubble's own height, used to decide whether it fits above its dot.
const TOOLTIP_HEIGHT = 68;
// How far from a dot a tap still counts as hitting it.
const TAP_RADIUS = 48;

/** One session on the chart: the value plotted, plus what the tooltip needs. */
export type ChartPoint = { label: string; value: number; date: string };

type Plot = {
  points: { x: number; y: number }[];
  path: string;
  area: string;
  length: number;
  ticks: { value: number; y: number }[];
};

// Straight segments only: the progression is a sequence of sessions, not a curve.
function buildPlot(values: number[], width: number): Plot {
  const plotWidth = width - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low;
  // A history that never changed has no span to scale against, so it sits mid-plot.
  const flat = span === 0;

  const points = values.map((value, index) => ({
    x: PADDING.left + (values.length === 1 ? plotWidth / 2 : (index * plotWidth) / (values.length - 1)),
    y: flat ? PADDING.top + plotHeight / 2 : PADDING.top + plotHeight * (1 - (value - low) / span),
  }));

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const bottom = HEIGHT - PADDING.bottom;
  const area = `${path} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;

  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y);
  }

  // Top to bottom; a flat history gets one line through the middle instead of three
  // lines all labelled with the same number.
  const ticks = flat
    ? [{ value: high, y: PADDING.top + plotHeight / 2 }]
    : Array.from({ length: GRID_LINES }, (_, index) => ({
        value: high - (span * index) / (GRID_LINES - 1),
        y: PADDING.top + (plotHeight * index) / (GRID_LINES - 1),
      }));

  return { points, path, area, length: length || 1, ticks };
}

function tickLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * A plain line of one value per session: weight for weight activities, seconds for timed
 * ones. The line draws itself from left to right on mount, then the session dots appear.
 * Tapping a dot names that session above it; tapping it again, or away from the line,
 * dismisses it.
 */
export function ProgressChart({
  points,
  unit,
  title,
}: {
  points: ChartPoint[];
  unit: string;
  title: string;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const progress = useSharedValue(0);

  const plot = width > 0 && points.length > 0 ? buildPlot(points.map((point) => point.value), width) : null;
  const length = plot?.length ?? 1;

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: DRAW_DURATION, easing: Easing.out(Easing.cubic) });
  }, [progress, length, points.length]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  // The fill and the dots follow the line rather than appearing with it.
  const areaProps = useAnimatedProps(() => ({ opacity: Math.max(0, (progress.value - 0.2) / 0.8) }));
  const dotsProps = useAnimatedProps(() => ({ opacity: Math.max(0, (progress.value - 0.75) / 0.25) }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  // Nearest dot by x, so a tap near the line counts rather than needing the dot itself.
  const handlePress = (event: GestureResponderEvent) => {
    if (!plot) {
      return;
    }
    const x = event.nativeEvent.locationX;
    let nearest = 0;
    for (let index = 1; index < plot.points.length; index++) {
      if (Math.abs(plot.points[index].x - x) < Math.abs(plot.points[nearest].x - x)) {
        nearest = index;
      }
    }
    const missed = Math.abs(plot.points[nearest].x - x) > TAP_RADIUS;
    setSelected((current) => (missed || current === nearest ? null : nearest));
  };

  // A reload can leave a selection pointing past the end of a shorter history.
  const selectedIndex = selected !== null && selected < points.length ? selected : null;
  const selectedPoint = selectedIndex !== null && plot ? plot.points[selectedIndex] : null;
  const selectedSession = selectedIndex !== null ? points[selectedIndex] : null;

  // Centred over the dot but kept inside the card, and flipped below the dot when there
  // isn't room above it, so the bubble never covers the chart's title.
  const tooltipLeft = selectedPoint
    ? Math.min(Math.max(selectedPoint.x - TOOLTIP_WIDTH / 2, 0), Math.max(width - TOOLTIP_WIDTH, 0))
    : 0;
  const arrowLeft = selectedPoint
    ? Math.min(Math.max(selectedPoint.x - tooltipLeft - 6, 12), TOOLTIP_WIDTH - 24)
    : 0;
  const below = selectedPoint !== null && selectedPoint.y < TOOLTIP_HEIGHT + 12;

  return (
    <View style={styles.shadowWrapper}>
      <ExpoGradient
        colors={[Colors.accentStart, Colors.accentEnd]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.outline}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>

          <Pressable style={styles.plot} onLayout={handleLayout} onPress={handlePress}>
            {plot && (
              <Svg width={width} height={HEIGHT}>
                <Defs>
                  <LinearGradient id="line" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={Colors.accentStart} />
                    <Stop offset="1" stopColor={Colors.accentEnd} />
                  </LinearGradient>
                  <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={Colors.accentStart} stopOpacity="0.35" />
                    <Stop offset="1" stopColor={Colors.accentStart} stopOpacity="0" />
                  </LinearGradient>
                </Defs>

                {plot.ticks.map((tick) => (
                  <G key={tick.y}>
                    <Line
                      x1={PADDING.left}
                      y1={tick.y}
                      x2={width - PADDING.right}
                      y2={tick.y}
                      stroke={Colors.border}
                      strokeWidth={1}
                      strokeDasharray="4 6"
                    />
                    <SvgText
                      x={PADDING.left - 8}
                      y={tick.y + 4}
                      fill={Colors.textSecondary}
                      fontSize="10"
                      textAnchor="end"
                    >
                      {tickLabel(tick.value)}
                    </SvgText>
                  </G>
                ))}

                <AnimatedPath d={plot.area} fill="url(#area)" animatedProps={areaProps} />
                <AnimatedPath
                  d={plot.path}
                  stroke="url(#line)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={plot.length}
                  animatedProps={lineProps}
                />

                <AnimatedG animatedProps={dotsProps}>
                  {plot.points.map((point, index) => (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={3.5}
                      fill={Colors.surface}
                      stroke={Colors.accentEnd}
                      strokeWidth={2}
                    />
                  ))}
                  {selectedPoint && (
                    <Circle
                      cx={selectedPoint.x}
                      cy={selectedPoint.y}
                      r={5.5}
                      fill={Colors.accentEnd}
                      stroke={Colors.surface}
                      strokeWidth={2}
                    />
                  )}
                </AnimatedG>

                <SvgText x={PADDING.left} y={HEIGHT - 8} fill={Colors.textSecondary} fontSize="10" textAnchor="start">
                  1
                </SvgText>
                {points.length > 1 && (
                  <SvgText
                    x={width - PADDING.right}
                    y={HEIGHT - 8}
                    fill={Colors.textSecondary}
                    fontSize="10"
                    textAnchor="end"
                  >
                    {points.length}
                  </SvgText>
                )}
              </Svg>
            )}

            {selectedPoint && selectedSession && (
              <View
                style={[
                  styles.tooltip,
                  { left: tooltipLeft },
                  below ? { top: selectedPoint.y + 12 } : { bottom: HEIGHT - selectedPoint.y + 12 },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.tooltipTitle}>{selectedSession.label}</Text>
                <Text style={styles.tooltipValue}>
                  {selectedSession.value} {unit}
                </Text>
                <Text style={styles.tooltipDate}>{formatDateTime(selectedSession.date)}</Text>
                <View style={[below ? styles.tooltipArrowUp : styles.tooltipArrowDown, { left: arrowLeft }]} />
              </View>
            )}
          </Pressable>

          <Text style={styles.axisLabel}>Trainings</Text>
        </View>
      </ExpoGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: Radii.card,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: `0 6px 16px -4px ${Colors.accentStart}66, 6px 6px 14px ${Colors.shadowDark}, -6px -6px 14px ${Colors.shadowLight}`,
      },
    }),
  },
  outline: {
    borderRadius: Radii.card,
    padding: 1.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card - 1.5,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  unit: {
    color: Colors.accentEnd,
    fontSize: 12,
    fontWeight: '700',
  },
  plot: {
    height: HEIGHT,
  },
  axisLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: Colors.surfaceSunken,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${Colors.accentEnd}66`,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentEnd,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.45,
        shadowRadius: 9,
      },
      android: { elevation: 8 },
      web: { boxShadow: `0 4px 14px -2px ${Colors.accentEnd}80` },
    }),
  },
  tooltipTitle: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  tooltipValue: {
    color: Colors.accentEnd,
    fontSize: 16,
    fontWeight: '800',
  },
  tooltipDate: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  // Pointing down, for a bubble sitting above its dot.
  tooltipArrowDown: {
    position: 'absolute',
    bottom: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.surfaceSunken,
  },
  // Pointing up, for the flipped bubble below its dot.
  tooltipArrowUp: {
    position: 'absolute',
    top: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.surfaceSunken,
  },
});
