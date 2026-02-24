import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Game Time Tracker',
  slug: 'game-time-tracker',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1a2e',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.gametimetracker.app',
    infoPlist: {
      // Notification permissions
      NSUserNotificationsUsageDescription: 'Game Time Tracker needs to send notifications when your gaming session ends, even when the app is closed.',
      // Camera permissions for QR pairing
      NSCameraUsageDescription: 'Game Time Tracker uses the camera to scan QR codes for pairing devices together.',
      // Background modes for sync
      UIBackgroundModes: ['fetch', 'remote-notification'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1a2e',
    },
    package: 'com.gametimetracker.app',
    permissions: [
      'CAMERA',
      'RECEIVE_BOOT_COMPLETED',
      'SCHEDULE_EXACT_ALARM',
      'USE_EXACT_ALARM',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#ffea00',
        sounds: ['./assets/notification-sound.wav'],
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Game Time Tracker to access your camera for scanning QR codes.',
      },
    ],
  ],
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: 'game-time-tracker',
    },
  },
});
