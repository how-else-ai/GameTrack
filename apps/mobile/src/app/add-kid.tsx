// Add/Edit kid screen (aligned with web app)
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Kid } from '@game-time-tracker/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  image: any;
}

const AVATARS: AvatarInfo[] = [
  // Aliens
  { id: 'alien-1', name: 'Zorg', category: 'alien', image: require('@assets/alien-1.png') },
  { id: 'alien-2', name: 'Blip', category: 'alien', image: require('@assets/alien-2.png') },
  { id: 'alien-3', name: 'Gloop', category: 'alien', image: require('@assets/alien-3.png') },
  { id: 'alien-4', name: 'Nova', category: 'alien', image: require('@assets/alien-4.png') },
  { id: 'alien-5', name: 'Zyx', category: 'alien', image: require('@assets/alien-5.png') },
  // Kids
  { id: 'kid-1', name: 'Spike', category: 'kid', image: require('@assets/kid-1.png') },
  { id: 'kid-2', name: 'Pip', category: 'kid', image: require('@assets/kid-2.png') },
  { id: 'kid-3', name: 'Ace', category: 'kid', image: require('@assets/kid-3.png') },
  { id: 'kid-4', name: 'Sunny', category: 'kid', image: require('@assets/kid-4.png') },
  { id: 'kid-5', name: 'Dot', category: 'kid', image: require('@assets/kid-5.png') },
  // Adults
  { id: 'adult-1', name: 'Dash', category: 'adult', image: require('@assets/adult-1.png') },
  { id: 'adult-2', name: 'Spark', category: 'adult', image: require('@assets/adult-2.png') },
  { id: 'adult-3', name: 'Beard', category: 'adult', image: require('@assets/adult-3.png') },
  { id: 'adult-4', name: 'Blaze', category: 'adult', image: require('@assets/adult-4.png') },
  { id: 'adult-5', name: 'Tank', category: 'adult', image: require('@assets/adult-5.png') },
  // Animals
  { id: 'animal-1', name: 'Whiskers', category: 'animal', image: require('@assets/animal-1.png') },
  { id: 'animal-2', name: 'Rover', category: 'animal', image: require('@assets/animal-2.png') },
  { id: 'animal-3', name: 'Hop', category: 'animal', image: require('@assets/animal-3.png') },
  { id: 'animal-4', name: 'Hoot', category: 'animal', image: require('@assets/animal-4.png') },
  { id: 'animal-5', name: 'Ember', category: 'animal', image: require('@assets/animal-5.png') },
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
  const insets = useSafeAreaInsets();
  
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
      {/* Header - with safe area top padding */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
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

        {/* Avatar Selection - Using images instead of emojis */}
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
                <Image
                  source={avatar.image}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
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
    fontFamily: 'PressStart2P',
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
    fontFamily: 'PressStart2P',
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
    overflow: 'hidden',
  },
  avatarButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}20`,
  },
  avatarImage: {
    width: 60,
    height: 60,
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
