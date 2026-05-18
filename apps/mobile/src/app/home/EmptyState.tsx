import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/ui-constants';

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NO PLAYERS</Text>
      <Text style={styles.text}>
        Add your first kid to start tracking their gaming time with tickets
      </Text>
      <Link href="/add-kid" asChild>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color={COLORS.background} />
          <Text style={styles.addButtonText}>ADD PLAYER</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
    letterSpacing: 1,
    fontFamily: 'PressStart2P',
  },
  text: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
    fontFamily: 'PressStart2P',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'PressStart2P',
  },
});
