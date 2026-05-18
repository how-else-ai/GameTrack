import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/ui-constants';

export interface NameInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function NameInput({ value, onChangeText }: NameInputProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter name"
        placeholderTextColor={COLORS.mutedForeground}
        maxLength={20}
      />
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
  input: {
    backgroundColor: COLORS.muted,
    borderWidth: 4,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'PressStart2P',
  },
});
