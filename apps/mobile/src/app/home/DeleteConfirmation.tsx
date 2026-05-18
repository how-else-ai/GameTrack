import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/lib/ui-constants';

export interface DeleteConfirmationProps {
  kidName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmation({
  kidName,
  onCancel,
  onConfirm,
}: DeleteConfirmationProps) {
  const message = `This will permanently delete ${kidName} and all their ticket history.\nThis action cannot be undone.`;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>DELETE PLAYER?</Text>
        <Text style={styles.text}>{message}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={onCancel} style={styles.button}>
            <Text style={styles.buttonText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            style={[styles.button, styles.buttonDanger]}
          >
            <Text style={[styles.buttonText, styles.buttonTextDanger]}>
              DELETE
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 100,
  },
  content: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 24,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: 'PressStart2P',
  },
  text: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'PressStart2P',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  buttonDanger: {
    backgroundColor: COLORS.retroMagenta,
    borderColor: COLORS.retroMagenta,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'PressStart2P',
  },
  buttonTextDanger: {
    color: COLORS.background,
  },
});
