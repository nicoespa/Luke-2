#!/bin/bash

echo "🚀 Starting BlindVision Assistant..."

# Kill any existing processes
echo "Stopping existing processes..."
pkill -f "yolo_service.py" 2>/dev/null
pkill -f "expo start" 2>/dev/null

# Wait a moment
sleep 2

# Start YOLO service in background
echo "Starting YOLO detection service..."
cd "$(dirname "$0")"
source yolo_env/bin/activate
python yolo_service.py &
YOLO_PID=$!

# Wait for YOLO service to start
echo "Waiting for YOLO service to initialize..."
sleep 5

# Test YOLO service
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ YOLO service is running on port 8000"
else
    echo "❌ YOLO service failed to start"
    exit 1
fi

# Start React Native web app
echo "Starting React Native web app..."
npm run web &
WEB_PID=$!

echo "🎉 BlindVision Assistant is starting up!"
echo ""
echo "Services:"
echo "  🤖 YOLO Detection Service: http://localhost:8000"
echo "  📱 Web App: http://localhost:8081"
echo ""
echo "Setup Instructions:"
echo "1. Open http://localhost:8081 in your browser"
echo "2. Allow camera and microphone permissions"
echo "3. Long press the status indicator (top right) for 2 seconds to open settings"
echo "4. Enter your OpenAI API key"
echo "5. Start talking to test the assistant!"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping services..."; kill $YOLO_PID $WEB_PID 2>/dev/null; exit 0' INT
wait