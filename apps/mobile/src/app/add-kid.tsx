// Add kid screen
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const AVATAR_OPTIONS = [
  { id: 'alien-1', emoji: '👽', name: 'Zorg' },
  { id: 'alien-2', emoji: '👾', name: 'Blip' },
  { id: 'alien-3', emoji: '🛸', name: 'Gloop' },
  { id: 'alien-4', emoji: '🚀', name: 'Nova' },
  { id: 'alien-5', emoji: '🌟', name: 'Zyx' },
  { id: 'kid-1', emoji: '🧒', name: 'Spike' },
  { id: 'kid-2', emoji: '👦', name: 'Pip' },
  { id: 'kid-3', emoji: '👧', name: 'Ace' },
  { id: 'kid-4', emoji: '🧑', name: 'Sunny' },
  { id: 'kid-5', emoji: '🏃', name: 'Dot' },
  { id: 'adult-1', emoji: '👨', name: 'Dash' },
  { id: 'adult-2', emoji: '🧔', name: 'Spark' },
  { id: 'adult-3', emoji: '👴', name: 'Beard' },
  { id: 'adult-4', emoji: '💪', name: 'Blaze' },
  { id: 'adult-5', emoji: '🦸', name: 'Tank' },
  { id: 'animal-1', emoji: '🐱', name: 'Whiskers' },
  { id: 'animal-2', emoji: '🐶', name: 'Rover' },
  { id: 'animal-3', emoji: '🐰', name: 'Hop' },
  { id: 'animal-4', emoji: '🦉', name: 'Hoot' },
  { id: 'animal-5', emoji: '🦊', name: 'Ember' },
];

const TICKET_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export default function AddKidScreen() {
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('kid-1');
  const [ticketLimit, setTicketLimit] = useState(3);
  const [ticketDuration, setTicketDuration] = useState(30);

  const addKid = useAppStore((state) => state.addKid);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    addKid({
      name: name.trim(),
      avatarEmoji: selectedAvatar,
      ticketLimit,
      ticketDuration,
    });

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Name Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter kid's name"
          placeholderTextColor="#666"
          maxLength={20}
        />
      </View>

      {/* Avatar Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Choose Avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATAR_OPTIONS.map((avatar) => (
            <Pressable
              key={avatar.id}
              onPress={() => setSelectedAvatar(avatar.id)}
              style={[
                styles.avatarButton,
                selectedAvatar === avatar.id && styles.avatarButtonSelected,
              ]}
            >
              <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
              <Text style={styles.avatarName}>{avatar.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Ticket Limit */}
      <View style={styles.section}>
        <Text style={styles.label}>Daily Tickets: {ticketLimit}</Text>
        <View style={styles.optionsRow}>
          {TICKET_OPTIONS.map((num) => (
            <Pressable
              key={num}
              onPress={() => setTicketLimit(num)}
              style={[
                styles.optionButton,
                ticketLimit === num && styles.optionButtonSelected,
              ]}
            >
              <Text style={[
                styles.optionText,
                ticketLimit === num && styles.optionTextSelected,
              ]}>
                {num}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Ticket Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Minutes Per Ticket: {ticketDuration}</Text>
        <View style={styles.optionsRow}>
          {DURATION_OPTIONS.map((mins) => (
            <Pressable
              key={mins}
              onPress={() => setTicketDuration(mins)}
              style={[
                styles.optionButton,
                ticketDuration === mins && styles.optionButtonSelected,
              ]}
            >
              <Text style={[
                styles.optionText,
                ticketDuration === mins && styles.optionTextSelected,
              ]}>
                {mins}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Save Button */}
      <Pressable onPress={handleSave} style={styles.saveButton}>
        <Ionicons name="checkmark" size={24} color="#1a1a2e" />
        <Text style={styles.saveButtonText}>ADD KID</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    padding: 16,
    color: '#fff',
    fontSize: 18,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarButton: {
    width: 70,
    height: 80,
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  avatarButtonSelected: {
    borderColor: '#ffea00',
    backgroundColor: '#3a3a5e',
  },
  avatarEmoji: {
    fontSize: 28,
  },
  avatarName: {
    fontSize: 10,
    color: '#888',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    minWidth: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: '#ffea00',
    backgroundColor: '#3a3a5e',
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#ffea00',
  },
  saveButton: {
    backgroundColor: '#ffea00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
