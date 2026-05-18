import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { DURATION_OPTIONS, formatDuration } from '@/lib/add-kid-data';
import { COLORS } from '@/lib/ui-constants';

export interface TicketDurationSliderProps {
  durationIndex: number;
  ticketDuration: number;
  onDurationIndexChange: (index: number, duration: number) => void;
}

export function TicketDurationSlider({
  durationIndex,
  ticketDuration,
  onDurationIndexChange,
}: TicketDurationSliderProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>Minutes per ticket</Text>
        <Text style={styles.sliderValue}>{formatDuration(ticketDuration)}</Text>
      </View>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={DURATION_OPTIONS.length - 1}
          step={1}
          value={durationIndex}
          onValueChange={(value: number) => {
            const index = Math.round(value);
            onDurationIndexChange(index, DURATION_OPTIONS[index]);
          }}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
      </View>
      <View style={styles.durationLabels}>
        {DURATION_OPTIONS.map((d, i) => (
          <Text key={i} style={styles.durationLabel}>
            {formatDuration(d)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  label: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderValue: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
  sliderContainer: {
    backgroundColor: COLORS.muted,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  durationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationLabel: {
    fontSize: 6,
    color: COLORS.mutedForeground,
    fontFamily: 'PressStart2P',
  },
});
