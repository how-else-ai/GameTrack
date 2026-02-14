# Game Time Tracker - Synchronization System

## Overview

The Game Time Tracker uses a **HTTP polling-based sync mechanism** to keep player data synchronized between paired devices.

## Architecture

### Server (PHP)
- **REST API** at `https://sync.how-else.com/sync.php`
- **Event-based communication** - devices push events and poll for new events
- **Acknowledgment system** - events are acknowledged after processing

### Client (Next.js)
- **useSync hook** - manages all sync operations
- **Zustand store** - persists data locally in localStorage
- **Real-time polling** - checks for new events every 2 seconds

## Event Types

### KIDS_UPDATE
- Sent when kids data changes
- Includes deleted kids list for proper merge

### REQUEST_SYNC
- Asks the other device to send its data
- Used for manual sync triggers

## Sync Rules

1. **Merge deletedKids** - keep the most recent deletion for each kid
2. **Filter out deleted kids** - remove any kids in deletedKids list
3. **Event ID tracking** - prevent echo loops
4. **Debouncing** - 500ms debounce on local changes

## Manual Sync Flow

1. Push REQUEST_SYNC to paired devices
2. Poll aggressively for 5 seconds
3. Process incoming KIDS_UPDATE

