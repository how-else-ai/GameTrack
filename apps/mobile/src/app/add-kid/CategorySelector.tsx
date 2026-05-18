import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  CATEGORIES,
  CATEGORY_NAMES,
  AVATARS,
  AvatarCategory,
} from '@/lib/add-kid-data';
import { COLORS } from '@/lib/ui-constants';

export interface CategorySelectorProps {
  selectedCategory: AvatarCategory;
  onSelect: (category: AvatarCategory, defaultAvatarId: string) => void;
}

export function CategorySelector({
  selectedCategory,
  onSelect,
}: CategorySelectorProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            onPress={() => {
              onSelect(category, AVATARS.find(a => a.category === category)?.id ?? category + '-1');
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
});
