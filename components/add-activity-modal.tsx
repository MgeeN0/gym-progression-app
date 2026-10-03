import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { KeyboardDoneBar } from '@/components/keyboard-done-bar';
import { RangeSlider } from '@/components/range-slider';
import { ValidatedInput, ValidationHintButton, ValidationMessage } from '@/components/validated-input';
import { Colors, Radii } from '@/constants/theme';
import { createActivity } from '@/db/init';
import {
  isValidDecimal,
  isValidInteger,
  isValidName,
  isValidYoutubeLink,
  normalizeYoutubeLink,
  parseDecimal,
} from '@/lib/validation';

export type ActivityMode = 'custom' | 'browser';
export type CustomActivityType = 'weight' | 'time';

const MODES: { value: ActivityMode; label: string }[] = [
  { value: 'custom', label: 'Custom exercise' },
  { value: 'browser', label: 'Pick from browser' },
];

const ACTIVITY_TYPES: { value: CustomActivityType; label: string }[] = [
  { value: 'weight', label: 'Weight' },
  { value: 'time', label: 'Time' },
];

const LIMITS = {
  weight: { range: { min: 1, max: 24 }, pace: { min: 0.5, max: 3 } },
  time: { range: { min: 1, max: 120 }, pace: { min: 0.5, max: 20 } },
};

// A field counts as filled only when it has a value that passes its rule.
function filled(value: string, isValid: (value: string) => boolean) {
  return value !== '' && isValid(value);
}

export function AddActivityModal({
  visible,
  planId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  planId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const db = useSQLiteContext();

  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<ActivityMode>('custom');
  const [customName, setCustomName] = useState('');
  const [customVideoLink, setCustomVideoLink] = useState('');
  const [customType, setCustomType] = useState<CustomActivityType>('weight');

  // Starting point
  const [startReps, setStartReps] = useState('10');
  const [startSets, setStartSets] = useState('4');
  const [startWeight, setStartWeight] = useState('40');
  const [startTime, setStartTime] = useState('60');

  // Kept per activity type so switching type doesn't lose the other one's values.
  const [repsRange, setRepsRange] = useState([8, 12]);
  const [timeRange, setTimeRange] = useState([30, 60]);
  const [weightStep, setWeightStep] = useState('2.5');
  const [repsPace, setRepsPace] = useState(1);
  const [timePace, setTimePace] = useState(5);

  const [weightOnlyChoice, setWeightOnly] = useState(false);
  const [lockSetsChoice, setLockSets] = useState(false);
  const [noAutoProgress, setNoAutoProgress] = useState(false);

  const isTime = customType === 'time';
  const limits = isTime ? LIMITS.time : LIMITS.weight;
  const range = isTime ? timeRange : repsRange;
  const setRange = isTime ? setTimeRange : setRepsRange;
  const setPace = isTime ? setTimePace : setRepsPace;
  // Without auto progress nothing can change, so the range-hiding option is forced on in
  // both modes. The user's own choice is kept underneath and comes back afterwards.
  const weightOnly = weightOnlyChoice || noAutoProgress;
  const lockSets = lockSetsChoice || noAutoProgress;
  const rangeHidden = isTime ? lockSets : weightOnly;
  // Weight-only progression always moves one step per session, so the pace isn't chosen.
  const paceHidden = !isTime && weightOnly;
  const pace = isTime ? timePace : paceHidden ? 1 : repsPace;

  const trimmedLink = customVideoLink.trim();
  const nameValid = isValidName(customName);
  const linkValid = isValidYoutubeLink(trimmedLink);
  const canContinue = customName.trim().length > 0 && nameValid && linkValid;

  // Progression starts from the starting point and moves inside the range, so a starting
  // point outside the range has nowhere to go. Only checked while the range is in use.
  const outsideRange = (value: string) => {
    const parsed = parseDecimal(value);
    return parsed < range[0] || parsed > range[1];
  };
  const startRepsOutOfRange =
    !isTime && !rangeHidden && filled(startReps, isValidInteger) && outsideRange(startReps);
  const startTimeOutOfRange =
    isTime && !rangeHidden && filled(startTime, isValidDecimal) && outsideRange(startTime);
  const rangeError = `Starting point can not be outside of ${isTime ? 'time' : 'reps'} range`;
  const rangeInvalid = startRepsOutOfRange || startTimeOutOfRange;

  // The explanation is asked for, never pushed: it would otherwise pop up halfway through
  // typing a number. The error clearing also forgets the tap, so the next mistake starts
  // hidden again rather than behaving like a toggle. Reset during render rather than in an
  // effect, which the compiler's lint rules disallow.
  const [rangeHelpShown, setRangeHelpShown] = useState(false);
  const [helpWasInvalid, setHelpWasInvalid] = useState(rangeInvalid);
  if (helpWasInvalid !== rangeInvalid) {
    setHelpWasInvalid(rangeInvalid);
    setRangeHelpShown(false);
  }

  // Only the fields visible for the current type and options have to be filled in.
  const canSave =
    canContinue &&
    filled(startSets, isValidInteger) &&
    (isTime
      ? filled(startTime, isValidDecimal) && !startTimeOutOfRange
      : filled(startReps, isValidInteger) && !startRepsOutOfRange && filled(startWeight, isValidDecimal)) &&
    (isTime || noAutoProgress || filled(weightStep, isValidDecimal));

  const close = () => {
    onClose();
    setPage(1);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    const repsValue = Number(startReps);

    // Weight mode: "Progress with weight only" pins the range to the starting reps so only weight moves.
    // Time mode: "Lock sets" clears the range, which is what drives the set increase.
    let rangeLow: number | null = range[0];
    let rangeHigh: number | null = range[1];
    if (isTime && lockSets) {
      rangeLow = null;
      rangeHigh = null;
    } else if (!isTime && weightOnly) {
      rangeLow = repsValue;
      rangeHigh = repsValue;
    }

    await createActivity(db, {
      planId,
      customName: customName.trim(),
      customVideoLink: trimmedLink ? normalizeYoutubeLink(trimmedLink) : null,
      customType,
      minReps: rangeLow,
      maxReps: rangeHigh,
      // Time activities progress by whole sets, so there is no weight step.
      weightStep: isTime || noAutoProgress ? null : parseDecimal(weightStep),
      progressionPace: noAutoProgress ? 0 : pace,
      start: {
        sets: Number(startSets),
        reps: isTime ? null : repsValue,
        weight: isTime ? null : parseDecimal(startWeight),
        time: isTime ? parseDecimal(startTime) : null,
      },
    });

    onSaved();
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        {/* Stops a tap inside the card from closing it. */}
        <Pressable style={styles.shadowWrapper} onPress={() => {}}>
          <LinearGradient
            colors={[Colors.accentStart, Colors.accentEnd]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.outline}
          >
            <View style={styles.card}>
              <Text style={styles.title}>
                {page === 1 ? 'Create new activity' : 'Choose activity details'}
              </Text>

              {page === 1 ? (
                <>
                  <View style={styles.segmented}>
                    {MODES.map((option) => (
                      <SegmentButton
                        key={option.value}
                        label={option.label}
                        selected={mode === option.value}
                        onPress={() => setMode(option.value)}
                      />
                    ))}
                  </View>

                  {mode === 'custom' ? (
                    <>
                      <View style={styles.field}>
                        <Text style={styles.label}>Activity name</Text>
                        <ValidatedInput
                          style={styles.input}
                          invalid={!nameValid}
                          placeholder="Bench press"
                          placeholderTextColor={Colors.textSecondary}
                          value={customName}
                          onChangeText={setCustomName}
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Youtube demo link (optional)</Text>
                        <ValidatedInput
                          style={styles.input}
                          invalid={!linkValid}
                          placeholder="https://youtube.com/..."
                          placeholderTextColor={Colors.textSecondary}
                          value={customVideoLink}
                          onChangeText={setCustomVideoLink}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                        />
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Activity type</Text>
                        <View style={styles.radioGroup}>
                          {ACTIVITY_TYPES.map((option) => (
                            <RadioRow
                              key={option.value}
                              label={option.label}
                              selected={customType === option.value}
                              onPress={() => setCustomType(option.value)}
                            />
                          ))}
                        </View>
                      </View>

                      <GradientButton
                        label="Next"
                        icon="arrow-right"
                        onPress={() => setPage(2)}
                        disabled={!canContinue}
                      />
                    </>
                  ) : (
                    <View style={styles.placeholder} />
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.sectionLabel}>Choose starting point</Text>

                  <View style={styles.startRow}>
                    {!isTime && (
                      <NumberField
                        label="Reps"
                        kind="integer"
                        value={startReps}
                        onChangeText={setStartReps}
                        invalid={startRepsOutOfRange}
                        onHelpPress={() => setRangeHelpShown(true)}
                      />
                    )}
                    <NumberField label="Sets" kind="integer" value={startSets} onChangeText={setStartSets} />
                    {isTime ? (
                      <NumberField
                        label="Time (s)"
                        kind="decimal"
                        value={startTime}
                        onChangeText={setStartTime}
                        invalid={startTimeOutOfRange}
                        onHelpPress={() => setRangeHelpShown(true)}
                      />
                    ) : (
                      <NumberField
                        label="Weight (kg)"
                        kind="decimal"
                        value={startWeight}
                        onChangeText={setStartWeight}
                      />
                    )}
                  </View>

                  {rangeInvalid && rangeHelpShown && <ValidationMessage>{rangeError}</ValidationMessage>}

                  {!rangeHidden && (
                    <View style={styles.field}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.label}>{isTime ? 'Time range' : 'Reps range'}</Text>
                        <Text style={styles.sliderValue}>
                          {range[0]} - {range[1]}
                          {isTime ? ' s' : ''}
                        </Text>
                      </View>
                      <RangeSlider
                        min={limits.range.min}
                        max={limits.range.max}
                        step={1}
                        values={range}
                        onChange={setRange}
                      />
                      <Text style={styles.hint}>
                        {isTime ? 'Range of seconds in one set' : 'Range of reps in one set'}
                      </Text>
                    </View>
                  )}

                  {!noAutoProgress && (
                    <View style={styles.progressRow}>
                      {!isTime && (
                        <View style={styles.weightStepField}>
                          <Text style={styles.label}>Weight step</Text>
                          <ValidatedInput
                            style={styles.input}
                            invalid={!isValidDecimal(weightStep)}
                            value={weightStep}
                            onChangeText={setWeightStep}
                            keyboardType="decimal-pad"
                            placeholderTextColor={Colors.textSecondary}
                          />
                        </View>
                      )}

                      {!paceHidden && (
                        <View style={styles.paceField}>
                          <View style={styles.sliderHeader}>
                            <Text style={styles.label}>Progression pace</Text>
                            <Text style={styles.sliderValue}>
                              {pace}
                              {isTime ? ' s' : ' rep'}
                            </Text>
                          </View>
                          <RangeSlider
                            min={limits.pace.min}
                            max={limits.pace.max}
                            step={0.5}
                            values={[pace]}
                            onChange={(next) => setPace(next[0])}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {!isTime && (
                    <CheckboxRow
                      label="Progress with weight only"
                      description="Amount of reps will remain the same"
                      checked={weightOnly}
                      disabled={noAutoProgress}
                      onPress={() => setWeightOnly((prev) => !prev)}
                    />
                  )}

                  {isTime && (
                    <CheckboxRow
                      label="Lock sets"
                      description="Sets will not increase in progress mode"
                      checked={lockSets}
                      disabled={noAutoProgress}
                      onPress={() => setLockSets((prev) => !prev)}
                    />
                  )}

                  <CheckboxRow
                    label="No auto progress"
                    description="Auto weight/reps increase will be disabled"
                    checked={noAutoProgress}
                    onPress={() => setNoAutoProgress((prev) => !prev)}
                  />

                  <View style={styles.footer}>
                    <Pressable style={styles.previousButton} onPress={() => setPage(1)}>
                      <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.textSecondary} />
                      <Text style={styles.previousLabel}>Previous</Text>
                    </Pressable>
                    <GradientButton label="Save" onPress={handleSave} disabled={!canSave} />
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </Pressable>
        <KeyboardDoneBar />
      </Pressable>
    </Modal>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.segment} onPress={onPress}>
      {selected && (
        <LinearGradient
          colors={[Colors.accentStart, Colors.accentEnd]}
          start={[0, 0]}
          end={[1, 0]}
          style={StyleSheet.absoluteFill}
        />
      )}
      {selected && <MaterialCommunityIcons name="check" size={15} color={Colors.textPrimary} />}
      <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.radioRow} onPress={onPress}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && (
          <LinearGradient
            colors={[Colors.accentStart, Colors.accentEnd]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.radioDot}
          />
        )}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

function CheckboxRow({
  label,
  description,
  checked,
  disabled,
  onPress,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.checkboxRow, disabled && styles.checkboxRowDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <MaterialCommunityIcons name="check" size={15} color={Colors.textPrimary} />}
      </View>
      <View style={styles.checkboxText}>
        <Text style={styles.radioLabel}>{label}</Text>
        <Text style={styles.hint}>{description}</Text>
      </View>
    </Pressable>
  );
}

function NumberField({
  label,
  kind,
  value,
  onChangeText,
  invalid,
  onHelpPress,
}: {
  label: string;
  kind: 'integer' | 'decimal';
  value: string;
  onChangeText: (value: string) => void;
  /** Set when something outside the field's own format makes the value wrong. */
  invalid?: boolean;
  /** Given together with `invalid` when that case has an explanation to reveal. */
  onHelpPress?: () => void;
}) {
  const isValid = kind === 'integer' ? isValidInteger : isValidDecimal;
  return (
    <View style={styles.numberField}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {invalid && onHelpPress && <ValidationHintButton onPress={onHelpPress} />}
      </View>
      <ValidatedInput
        style={styles.input}
        invalid={!isValid(value) || !!invalid}
        value={value}
        onChangeText={onChangeText}
        keyboardType={kind === 'integer' ? 'number-pad' : 'decimal-pad'}
        placeholderTextColor={Colors.textSecondary}
      />
    </View>
  );
}

function GradientButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.gradientShadow, disabled && styles.gradientShadowDisabled]}>
      <Pressable style={styles.gradientButton} onPress={onPress} disabled={disabled}>
        <LinearGradient
          colors={[Colors.accentStart, Colors.accentEnd]}
          start={[0, 0]}
          end={[1, 0]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.gradientLabel}>{label}</Text>
        {icon && <MaterialCommunityIcons name={icon} size={18} color={Colors.textPrimary} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 12, 18, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  shadowWrapper: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radii.card,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      web: { boxShadow: `0 10px 36px -6px ${Colors.accentStart}99` },
    }),
  },
  outline: {
    borderRadius: Radii.card,
    padding: 1.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card - 1.5,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    gap: 4,
    ...Platform.select({
      web: { boxShadow: `inset 3px 3px 8px ${Colors.shadowDark}, inset -3px -3px 8px ${Colors.shadowLight}` },
    }),
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  segmentLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentLabelSelected: {
    color: Colors.textPrimary,
  },
  field: {
    gap: 8,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  input: {
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.well,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  startRow: {
    flexDirection: 'row',
    gap: 10,
  },
  numberField: {
    flex: 1,
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  weightStepField: {
    flex: 4,
    gap: 8,
  },
  paceField: {
    flex: 6,
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sliderValue: {
    color: Colors.accentEnd,
    fontSize: 13,
    fontWeight: '700',
  },
  radioGroup: {
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Radii.well,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radii.pill,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.accentEnd,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.pill,
  },
  radioLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxRowDisabled: {
    opacity: 0.45,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: Colors.accentEnd,
    backgroundColor: `${Colors.accentStart}55`,
  },
  checkboxText: {
    flex: 1,
    gap: 2,
  },
  placeholder: {
    height: 160,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSunken,
  },
  previousLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  gradientShadow: {
    alignSelf: 'center',
    borderRadius: Radii.pill,
    ...Platform.select({
      ios: {
        shadowColor: Colors.accentStart,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      web: { boxShadow: `0 6px 18px -4px ${Colors.accentStart}80` },
    }),
  },
  gradientShadowDisabled: {
    opacity: 0.4,
    ...Platform.select({ android: { elevation: 0 } }),
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  gradientLabel: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});
