// Shared theme colors matching web app
export const COLORS = {
  background: '#0a0a12',
  card: '#12121f',
  primary: '#ffea00',
  retroCyan: '#00f0ff',
  retroMagenta: '#ff2a6d',
  retroGreen: '#05ffa1',
  retroOrange: '#ff6b35',
  retroPurple: '#b967ff',
  border: '#3a3a5e',
  muted: '#1a1a2e',
  mutedForeground: '#8888aa',
  text: '#f0f0f0',
};

// Get avatar image source
export function getAvatarUrl(avatarId: string): any {
  const avatarMap: Record<string, any> = {
    'alien-1': require('@assets/alien-1.png'),
    'alien-2': require('@assets/alien-2.png'),
    'alien-3': require('@assets/alien-3.png'),
    'alien-4': require('@assets/alien-4.png'),
    'alien-5': require('@assets/alien-5.png'),
    'kid-1': require('@assets/kid-1.png'),
    'kid-2': require('@assets/kid-2.png'),
    'kid-3': require('@assets/kid-3.png'),
    'kid-4': require('@assets/kid-4.png'),
    'kid-5': require('@assets/kid-5.png'),
    'adult-1': require('@assets/adult-1.png'),
    'adult-2': require('@assets/adult-2.png'),
    'adult-3': require('@assets/adult-3.png'),
    'adult-4': require('@assets/adult-4.png'),
    'adult-5': require('@assets/adult-5.png'),
    'animal-1': require('@assets/animal-1.png'),
    'animal-2': require('@assets/animal-2.png'),
    'animal-3': require('@assets/animal-3.png'),
    'animal-4': require('@assets/animal-4.png'),
    'animal-5': require('@assets/animal-5.png'),
  };
  return avatarMap[avatarId] || avatarMap['kid-1'];
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
