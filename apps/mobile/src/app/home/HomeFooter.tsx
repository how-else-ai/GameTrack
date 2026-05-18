import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/ui-constants';

export interface HomeFooterProps {
  onPress: () => void;
  paddingBottom: number;
}

export function HomeFooter({ onPress, paddingBottom }: HomeFooterProps) {
  return (
    <View style={[styles.footer, { paddingBottom: paddingBottom + 12 }]}>
      <TouchableOpacity onPress={onPress} style={styles.addButton}>
        <Ionicons name="add" size={20} color={COLORS.background} />
        <Text style={styles.addButtonText}>ADD PLAYER</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 4,
    borderTopColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
});
