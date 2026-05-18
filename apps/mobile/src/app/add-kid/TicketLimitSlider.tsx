import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { COLORS } from '@/lib/ui-constants';

export interface TicketLimitSliderProps {
  value: number;
  onValueChange: (value: number) => void;
}

export function TicketLimitSlider({
  value,
  onValueChange,
}: TicketLimitSliderProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>Tickets per day</Text>
        <Text style={styles.sliderValue}>{value}</Text>
      </View>
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primary}
        />
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
});
