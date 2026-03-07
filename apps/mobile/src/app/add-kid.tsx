// Add/Edit kid screen (aligned with web app)
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Kid } from '@game-time-tracker/core';

// Theme colors
const COLORS = {
  background: '#0a0a12',
  card: '#12121f',
  primary: '#ffea00',
  retroCyan: '#00f0ff',
  retroMagenta: '#ff2a6d',
  retroGreen: '#05ffa1',
  border: '#3a3a5e',
  muted: '#1a1a2e',
  mutedForeground: '#8888aa',
  text: '#f0f0f0',
};

// Avatar system matching web app
type AvatarCategory = 'alien' | 'kid' | 'adult' | 'animal';

interface AvatarInfo {
  id: string;
  name: string;
  category: AvatarCategory;
  emoji: string;
}

const AVATARS: AvatarInfo[] = [
  // Aliens
  { id: 'alien-1', name: 'Zorg', category: 'alien', emoji: '👽' },
  { id: 'alien-2', name: 'Blip', category: 'alien', emoji: '👾' },
  { id: 'alien-3', name: 'Gloop', category: 'alien', emoji: '🛸' },
  { id: 'alien-4', name: 'Nova', category: 'alien', emoji: '🚀' },
  { id: 'alien-5', name: 'Zyx', category: 'alien', emoji: '🌟' },
  // Kids
  { id: 'kid-1', name: 'Spike', category: 'kid', emoji: '🧒' },
  { id: 'kid-2', name: 'Pip', category: 'kid', emoji: '👦' },
  { id: 'kid-3', name: 'Ace', category: 'kid', emoji: '👧' },
  { id: 'kid-4', name: 'Sunny', category: 'kid', emoji: '🧑' },
  { id: 'kid-5', name: 'Dot', category: 'kid', emoji: '🏃' },
  // Adults
  { id: 'adult-1', name: 'Dash', category: 'adult', emoji: '👨' },
  { id: 'adult-2', name: 'Spark', category: 'adult', emoji: '🧔' },
  { id: 'adult-3', name: 'Beard', category: 'adult', emoji: '👴' },
  { id: 'adult-4', name: 'Blaze', category: 'adult', emoji: '💪' },
  { id: 'adult-5', name: 'Tank', category: 'adult', emoji: '🦸' },
  // Animals
  { id: 'animal-1', name: 'Whiskers', category: 'animal', emoji: '🐱' },
  { id: 'animal-2', name: 'Rover', category: 'animal', emoji: '🐶' },
  { id: 'animal-3', name: 'Hop', category: 'animal', emoji: '🐰' },
  { id: 'animal-4', name: 'Hoot', category: 'animal', emoji: '🦉' },
  { id: 'animal-5', name: 'Ember', category: 'animal', emoji: '🦊' },
];

const CATEGORIES: AvatarCategory[] = ['alien', 'kid', 'adult', 'animal'];

const CATEGORY_NAMES: Record<AvatarCategory, string> = {
  alien: 'ALIENS',
  kid: 'KIDS',
  adult: 'ADULTS',
  animal: 'ANIMALS',
};

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  return hours === 1 ? '1h' : `${hours}h`;
}

function findClosestDuration(minutes: number): number {
  if (DURATION_OPTIONS.includes(minutes)) {
    return minutes;
  }
  return DURATION_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
  );
}

export default function AddKidScreen() {
  const params = useLocalSearchParams();
  const kids = useAppStore((state) => state.kids);
  
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('kid-1');
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('kid');
  const [ticketLimit, setTicketLimit] = useState(3);
  const [ticketDuration, setTicketDuration] = useState(30);
  const [durationIndex, setDurationIndex] = useState(5); // Index for 30 min

  // Check if editing existing kid
  const editKidId = params.kidId as string | undefined;
  const editKid = editKidId ? kids.find(k => k.id === editKidId) : null;

  // Prefill form when editing
  useEffect(() => {
    if (editKid) {
      setName(editKid.name);
      setAvatarId(editKid.avatarEmoji);
      setTicketLimit(editKid.ticketLimit);
      setTicketDuration(editKid.ticketDuration);
      const closestDuration = findClosestDuration(editKid.ticketDuration);
      setDurationIndex(DURATION_OPTIONS.indexOf(closestDuration));
      
      const avatar = AVATARS.find(a => a.id === editKid.avatarEmoji);
      if (avatar) {
        setSelectedCategory(avatar.category);
      }
    }
  }, [editKid]);

  const categoryAvatars = AVATARS.filter(a => a.category === selectedCategory);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (editKidId) {
      useAppStore.getState().updateKid(editKidId, {
        name: name.trim(),
        avatarEmoji: avatarId,
        ticketLimit,
        ticketDuration,
      });
    } else {
      useAppStore.getState().addKid({
        name: name.trim(),
        avatarEmoji: avatarId,
        ticketLimit,
        ticketDuration,
      });
    }

    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editKidId ? 'Edit Player' : 'Add New Player'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor={COLORS.mutedForeground}
            maxLength={20}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => {
                  setSelectedCategory(category);
                  const firstAvatar = AVATARS.find(a => a.category === category);
                  if (firstAvatar) setAvatarId(firstAvatar.id);
                }}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonSelected,
                ]}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextSelected,
                ]}>
                  {CATEGORY_NAMES[category]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Avatar</Text>
          <View style={styles.avatarGrid}>
            {categoryAvatars.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                onPress={() => setAvatarId(avatar.id)}
                style={[
                  styles.avatarButton,
                  avatarId === avatar.id && styles.avatarButtonSelected,
                ]}
              >
                <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ticket Limit Slider */}
        <View style={styles.section}>
          <View style={styles.sliderHeader}>
            <Text style={styles.label}>Tickets per day</Text>
            <Text style={styles.sliderValue}>{ticketLimit}</Text>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={ticketLimit}
              onValueChange={setTicketLimit}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
        </View>

        {/* Ticket Duration Slider */}
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
                setDurationIndex(index);
                setTicketDuration(DURATION_OPTIONS[index]);
              }}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.primary}
            />
          </View>
          {/* Duration labels */}
          <View style={styles.durationLabels}>
            {DURATION_OPTIONS.map((d, i) => (
              <Text key={i} style={styles.durationLabel}>
                {formatDuration(d)}
              </Text>
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
            disabled={!name.trim()}
          >
            <Text style={styles.saveButtonText}>{editKidId ? 'Save' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.border,
    backgroundColor: `${COLORS.card}99`,
  },
  backButton: {
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.muted,
    borderWidth: 4,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 4,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  categoryButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  categoryButtonText: {
    fontSize: 8,
    color: COLORS.mutedForeground,
    fontWeight: '600',
  },
  categoryButtonTextSelected: {
    color: COLORS.primary,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarButton: {
    width: 60,
    height: 60,
    borderWidth: 4,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  avatarEmoji: {
    fontSize: 32,
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
  },
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
  },
});
