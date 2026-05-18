// Add/Edit kid screen
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store';
import { useState, useEffect, useCallback } from 'react';
import { AvatarCategory, findClosestDuration, AVATARS, DURATION_OPTIONS } from '@/lib/add-kid-data';
import { Kid } from '@game-time-tracker/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '@/lib/ui-constants';
import { AddKidHeader } from './add-kid/AddKidHeader';
import { NameInput } from './add-kid/NameInput';
import { CategorySelector } from './add-kid/CategorySelector';
import { AvatarGrid } from './add-kid/AvatarGrid';
import { TicketLimitSlider } from './add-kid/TicketLimitSlider';
import { TicketDurationSlider } from './add-kid/TicketDurationSlider';
import { SaveCancelButtons } from './add-kid/SaveCancelButtons';

export default function AddKidScreen() {
  const params = useLocalSearchParams();
  const kids = useAppStore((state) => state.kids);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('kid-1');
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('kid');
  const [ticketLimit, setTicketLimit] = useState(3);
  const [ticketDuration, setTicketDuration] = useState(30);
  const [durationIndex, setDurationIndex] = useState(5);

  const editKidId = params.kidId as string | undefined;
  const editKid = editKidId ? kids.find((k) => k.id === editKidId) : null;
  const isEditing = !!editKidId;

  useEffect(() => {
    if (editKid) {
      setName(editKid.name);
      setAvatarId(editKid.avatarEmoji);
      setTicketLimit(editKid.ticketLimit);
      setTicketDuration(editKid.ticketDuration);
      const closest = findClosestDuration(editKid.ticketDuration);
      setDurationIndex(DURATION_OPTIONS.indexOf(closest));

      const avatar = AVATARS.find((a) => a.id === editKid.avatarEmoji);
      if (avatar) setSelectedCategory(avatar.category);
    }
  }, [editKid]);

  const handleCategorySelect = useCallback((category: AvatarCategory, defaultId: string) => {
    setSelectedCategory(category);
    setAvatarId(defaultId);
  }, []);

  const handleDurationChange = useCallback((index: number, duration: number) => {
    setDurationIndex(index);
    setTicketDuration(duration);
  }, []);

  const handleSave = useCallback(() => {
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
  }, [name, avatarId, ticketLimit, ticketDuration, editKidId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AddKidHeader isEditing={isEditing} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        <NameInput value={name} onChangeText={setName} />
        <CategorySelector
          selectedCategory={selectedCategory}
          onSelect={handleCategorySelect}
        />
        <AvatarGrid selectedAvatarId={avatarId} onSelect={setAvatarId} />
        <TicketLimitSlider value={ticketLimit} onValueChange={setTicketLimit} />
        <TicketDurationSlider
          durationIndex={durationIndex}
          ticketDuration={ticketDuration}
          onDurationIndexChange={handleDurationChange}
        />
        <SaveCancelButtons
          isEditing={isEditing}
          canSave={!!name.trim()}
          onCancel={() => router.back()}
          onSave={handleSave}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 24,
  },
});
