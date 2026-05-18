import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { AvatarInfo, AVATARS } from '@/lib/add-kid-data';
import { COLORS } from '@/lib/ui-constants';

export interface AvatarGridProps {
  selectedAvatarId: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarGrid({ selectedAvatarId, onSelect }: AvatarGridProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Avatar</Text>
      <View style={styles.avatarGrid}>
        {AVATARS.map((avatar) => (
          <TouchableOpacity
            key={avatar.id}
            onPress={() => onSelect(avatar.id)}
            style={[
              styles.avatarButton,
              selectedAvatarId === avatar.id && styles.avatarButtonSelected,
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
});
