import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/lib/ui-constants';

export interface SaveCancelButtonsProps {
  isEditing: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function SaveCancelButtons({
  isEditing,
  canSave,
  onCancel,
  onSave,
}: SaveCancelButtonsProps) {
  return (
    <View style={styles.buttons}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>CANCEL</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        disabled={!canSave}
      >
        <Text style={styles.saveButtonText}>
          {isEditing ? 'Save' : 'Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderWidth: 4,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'PressStart2P',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.background,
    fontFamily: 'PressStart2P',
  },
});
