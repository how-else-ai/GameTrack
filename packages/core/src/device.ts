// Device ID generation and management - shared across platforms

export function generateDeviceId(): string {
  // Generate a unique device ID
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `device-${timestamp}-${randomPart}`;
}

export function generateKidId(): string {
  return `kid-${Date.now()}`;
}

export function generateTicketId(index: number): string {
  return `ticket-${Date.now()}-${index}`;
}

export function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
