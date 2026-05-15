// Notification management for timer screen
import { useState, useCallback, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Kid } from '@game-time-tracker/core';

export function useTimerNotifications(kid: Kid | undefined) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [alarmPlayed, setAlarmPlayed] = useState(false);
  const [warningNotified, setWarningNotified] = useState(false);

  // Check notification permission
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setNotificationsEnabled(status === 'granted');
    });
  }, []);

  // Reset flags when session changes
  useEffect(() => {
    if (!kid?.activeSession) {
      setAlarmPlayed(false);
      setWarningNotified(false);
    }
  }, [kid?.activeSession]);

  const sendNotification = useCallback(async (title: string, body: string) => {
    if (!notificationsEnabled) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null,
    });
  }, [notificationsEnabled]);

  // Handle timer expiration alarm
  const handleExpiration = useCallback(() => {
    if (alarmPlayed) return;
    setAlarmPlayed(true);
    sendNotification("Time's Up!", `${kid?.name}'s gaming session has ended.`);
  }, [alarmPlayed, kid?.name, sendNotification]);

  // Handle warning notification at 1 minute
  const handleWarning = useCallback(() => {
    if (warningNotified) return;
    setWarningNotified(true);
    sendNotification('1 Minute Left', `${kid?.name}'s gaming session will end soon.`);
  }, [warningNotified, kid?.name, sendNotification]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }, []);

  return {
    notificationsEnabled,
    alarmPlayed,
    warningNotified,
    handleExpiration,
    handleWarning,
    requestPermission,
  };
}
