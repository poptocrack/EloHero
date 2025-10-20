#!/bin/bash

# Reset Firebase Emulator Data
echo "🔄 Resetting Firebase Emulator data..."

# Stop any running emulators
echo "Stopping existing emulators..."
pkill -f "firebase emulators" || true

# Wait a moment
sleep 2

# Start emulators with fresh data
echo "Starting emulators with fresh data..."
firebase emulators:start --only firestore,functions --import=./emulator-data --export-on-exit=./emulator-data

echo "✅ Emulator reset complete!"
