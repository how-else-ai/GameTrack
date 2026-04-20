# Component Mapping: Web → React Native

## Overview

This document maps web app components to their React Native equivalents.

## Component Mapping Table

| Web Component | React Native Component | Notes |
|---------------|------------------------|-------|
| `div` | `View` | Basic container |
| `span`, `p`, `h1-h6` | `Text` | All text must be in Text component |
| `button` | `TouchableOpacity`, `Pressable` | Pressable is more flexible |
| `img` | `Image` | Source prop instead of src |
| `input` | `TextInput` | Different event handling |
| `dialog`, `modal` | `Modal` (RN) | Or use react-native-modal |
| `form` | `View` + handlers | No native form element |
| `ul`, `ol`, `li` | `FlatList`, `ScrollView` | Use FlatList for performance |
| `a` (link) | `TouchableOpacity` + navigation | Use expo-router |
| `header`, `footer`, `main` | `View` | Semantic elements don't exist |

## Shadcn/UI Component Mappings

### Button

**Web (Current):**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="arcade" size="lg" onClick={handleStart}>
  <Play className="mr-2 h-4 w-4" />
  Start
</Button>
```

**React Native:**
```tsx
import { TouchableOpacity, Text } from 'react-native';
import { Play } from 'lucide-react-native';

<TouchableOpacity 
  onPress={handleStart}
  className="flex-row items-center justify-center px-6 py-3 bg-primary rounded-lg"
  activeOpacity={0.8}
>
  <Play size={16} className="text-primary-foreground mr-2" />
  <Text className="text-primary-foreground font-pixel text-sm">START</Text>
</TouchableOpacity>
```

### Card

**Web (Current):**
```tsx
<div className="bg-card border-4 border-border p-4 rounded-lg">
  {children}
</div>
```

**React Native:**
```tsx
import { View } from 'react-native';

<View className="bg-card border-4 border-border p-4 rounded-lg">
  {children}
</View>
```

### Dialog/AlertDialog

**Web (Current):**
```tsx
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Player?</AlertDialogTitle>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**React Native:**
```tsx
import { Modal, View, Text, TouchableOpacity } from 'react-native';

<Modal
  visible={showDeleteDialog}
  transparent
  animationType="fade"
  onRequestClose={() => setShowDeleteDialog(false)}
>
  <View className="flex-1 bg-black/50 justify-center items-center p-4">
    <View className="bg-card p-6 rounded-lg w-full max-w-sm">
      <Text className="text-lg font-bold text-foreground mb-2">
        Delete Player?
      </Text>
      <View className="flex-row justify-end mt-4">
        <TouchableOpacity 
          onPress={() => setShowDeleteDialog(false)}
          className="px-4 py-2 mr-2"
        >
          <Text className="text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleDelete}
          className="px-4 py-2 bg-destructive rounded"
        >
          <Text className="text-white">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

### Progress Bar

**Web (Current):**
```tsx
<Progress value={progress} className="h-4" />
```

**React Native:**
```tsx
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

function ProgressBar({ value }: { value: number }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(`${value}%`),
  }));

  return (
    <View className="h-4 bg-muted rounded-full overflow-hidden">
      <Animated.View 
        className="h-full bg-primary rounded-full"
        style={animatedStyle}
      />
    </View>
  );
}
```

### Input/TextInput

**Web (Current):**
```tsx
<input 
  type="text" 
  value={name} 
  onChange={(e) => setName(e.target.value)}
  placeholder="Kid's name"
/>
```

**React Native:**
```tsx
import { TextInput } from 'react-native';

<TextInput
  value={name}
  onChangeText={setName}
  placeholder="Kid's name"
  className="border-2 border-border p-3 rounded-lg text-foreground"
  placeholderTextColor="#666"
/>
```

## Custom Component Implementations

### KidCard

**Web (Current):**
```tsx
// Simplified current implementation
<div className="bg-card border-4 border-border p-4 flex items-center gap-4">
  <img src={avatarUrl} className="w-12 h-12 rounded" />
  <div className="flex-1">
    <h3 className="font-bold">{kid.name}</h3>
    <span className="text-sm text-muted">
      {availableTickets} tickets
    </span>
  </div>
  {isTimerActive && <TimerIcon />}
</div>
```

**React Native:**
```tsx
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Timer } from 'lucide-react-native';

interface KidCardProps {
  kid: Kid;
  onPress: () => void;
}

export function KidCard({ kid, onPress }: KidCardProps) {
  const availableTickets = kid.tickets.filter(t => t.status === 'available').length;
  const isTimerActive = kid.activeSession !== null;

  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-card border-4 border-border p-4 flex-row items-center rounded-lg"
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: getAvatarUrl(kid.avatarEmoji) }}
        className="w-12 h-12 rounded"
      />
      <View className="flex-1 ml-4">
        <Text className="font-bold text-foreground text-base">
          {kid.name}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {availableTickets} tickets available
        </Text>
      </View>
      {isTimerActive && (
        <Timer size={20} className="text-primary" />
      )}
    </TouchableOpacity>
  );
}
```

### TimerDisplay

**Web (Current):**
```tsx
<span className="font-pixel text-5xl text-primary">
  {formatTime(remainingTime)}
</span>
```

**React Native:**
```tsx
import { Text, View } from 'react-native';

function TimerDisplay({ remainingSeconds, isWarning }: TimerDisplayProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View>
      <Text 
        className={`font-pixel text-5xl ${
          isWarning ? 'text-destructive' : 'text-primary'
        }`}
      >
        {formatTime(remainingSeconds)}
      </Text>
    </View>
  );
}
```

## Screen Implementations

### Home Screen

**Web Structure:**
```
<Header>
  <Logo />
  <SyncStatus />
  <SyncButton />
</Header>
<Main>
  {kids.length === 0 ? <EmptyState /> : <KidsList />}
</Main>
<Footer>
  <AddButton />
</Footer>
```

**React Native Structure:**
```tsx
import { View, ScrollView, SafeAreaView } from 'react-native';

export default function HomeScreen() {
  const { kids } = useAppStore();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b-4 border-border">
        <Logo />
        <View className="flex-row">
          <SyncStatus />
          <SyncButton />
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-4">
        {kids.length === 0 ? (
          <EmptyState />
        ) : (
          <View className="space-y-4">
            {kids.map(kid => (
              <KidCard key={kid.id} kid={kid} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {kids.length > 0 && (
        <View className="p-4 border-t-4 border-border">
          <AddButton />
        </View>
      )}
    </SafeAreaView>
  );
}
```

### Timer Screen

**Web Structure:**
```
<Header>
  <BackButton />
  <Avatar />
  <KidInfo />
</Header>
<Main>
  {hasActiveSession ? (
    <TimerView>
      <TimerDisplay />
      <ProgressBar />
      <Controls />
    </TimerView>
  ) : (
    <TicketSelector />
  )}
</Main>
```

**React Native Structure:**
```tsx
import { useLocalSearchParams, router } from 'expo-router';

export default function TimerScreen() {
  const { kidId } = useLocalSearchParams();
  const { kids } = useAppStore();
  const kid = kids.find(k => k.id === kidId);

  if (!kid) return <NotFound />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b-4 border-border">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} />
        </TouchableOpacity>
        <Image source={{ uri: getAvatarUrl(kid.avatarEmoji) }} className="w-10 h-10 ml-4" />
        <View className="ml-3">
          <Text className="font-bold text-foreground">{kid.name}</Text>
          <Text className="text-xs text-muted-foreground">
            {kid.ticketDuration} min per ticket
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center p-4">
        {kid.activeSession ? (
          <ActiveTimer kid={kid} />
        ) : (
          <TicketSelector kid={kid} />
        )}
      </View>
    </SafeAreaView>
  );
}
```

## Navigation Pattern

**Web (Next.js App Router):**
```tsx
// Using Link or router.push
<Link href={`/timer/${kid.id}`}>Go to Timer</Link>
```

**React Native (Expo Router):**
```tsx
import { router } from 'expo-router';

<TouchableOpacity onPress={() => router.push(`/timer/${kid.id}`)}>
  <Text>Go to Timer</Text>
</TouchableOpacity>
```

## Styling Differences

### Key Differences

| Feature | Tailwind (Web) | NativeWind (RN) |
|---------|----------------|-----------------|
| Flex default | `display: block` | `display: flex` |
| Flex direction | `flex-row` | `flex-row` (same) |
| Width/Height | Arbitrary values | Limited arbitrary support |
| Colors | Full palette | May need custom config |
| Shadows | `shadow-lg` | Limited, use StyleSheet |
| Gradients | CSS | Separate library needed |

### Custom StyleSheet for Complex Cases

```tsx
import { View, StyleSheet } from 'react-native';

// For complex styles that NativeWind can't handle
<View style={styles.card}>
  {children}
</View>

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Android shadow
  },
});
```

## Asset Handling

**Web:**
```tsx
<img src="/logo.png" />
```

**React Native:**
```tsx
import { Image } from 'react-native';

// Local image
<Image source={require('../assets/logo.png')} />

// Remote image
<Image source={{ uri: 'https://example.com/logo.png' }} />
```

## Font Handling

**Web (Google Fonts):**
```css
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
```

**React Native:**
```tsx
// app/_layout.tsx
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PressStart2P': require('../assets/fonts/PressStart2P-Regular.ttf'),
  });

  if (!fontsLoaded) return null;

  return <Stack />;
}
```

```tsx
// Usage
<Text className="font-press-start">
  Game Time
</Text>
```

## Summary Checklist

- [ ] Replace all `div` with `View`
- [ ] Replace all text elements with `Text`
- [ ] Replace all `button` with `TouchableOpacity` or `Pressable`
- [ ] Replace all `img` with `Image` (update source prop)
- [ ] Replace lists with `FlatList` or `ScrollView`
- [ ] Replace `Link` with `router.push` from expo-router
- [ ] Replace shadcn Dialog with `Modal` component
- [ ] Update event handlers (`onClick` → `onPress`, `onChange` → `onChangeText`)
- [ ] Add SafeAreaView for proper screen insets
- [ ] Configure fonts for React Native
- [ ] Move assets to proper RN location
