#!/bin/bash

echo "🚀 Starting BlindVision Assistant (Clean Version)"
echo ""
echo "This version includes:"
echo "✅ Camera access for scene capture"
echo "✅ OpenAI Vision API integration" 
echo "✅ Text-to-speech responses"
echo "✅ Touch interface for questions"
echo "✅ Long-press setup for API key"
echo ""

# Kill any existing processes
pkill -f "expo start" 2>/dev/null

# Start the clean app
echo "Starting Expo on port 8083..."
npx expo start --port 8083 --clear &

echo ""
echo "📱 Access your app:"
echo "   • Web: http://localhost:8083"
echo "   • Mobile: Scan the QR code with Expo Go"
echo ""
echo "🔧 Setup:"
echo "   1. Allow camera permissions"
echo "   2. Long-press the green status dot to set OpenAI API key"
echo "   3. Touch screen to ask questions!"
echo ""
echo "Press Ctrl+C to stop"

# Wait for interrupt
trap 'echo "Stopping..."; pkill -f "expo start"; exit 0' INT
wait