#!/bin/sh
cd /app

# Set up database
export DATABASE_URL="file:/app/prisma/dev.db"

# Push Prisma schema to SQLite
bun run db:push

# Start Next.js dev server
bunx next dev -H 0.0.0.0 -p 3000 &
NEXT_PID=$!
sleep 5

# Start Expo mobile dev server
cd apps/mobile
EXPO_NO_DOTSLASH=1 bunx expo start --port 8081

# Wait for background process
wait $NEXT_PID
