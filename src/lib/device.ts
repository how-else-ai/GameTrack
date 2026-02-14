// Device ID generation and management

export function generateDeviceId(): string {
  // Generate a unique device ID
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `device-${timestamp}-${randomPart}`;
}
