# BlindVision Mobile Assistant

A React Native mobile app built with Expo that provides visual assistance for blind users through AI-powered image analysis and voice interaction.

## Features

### Core Functionality
- **Voice-First Interface**: Continuous voice recognition for hands-free operation
- **Real-Time Image Analysis**: OpenAI GPT-4V integration for scene description
- **High-Quality Speech**: ElevenLabs API integration with native fallback
- **Optimized Performance**: Sub-2-second response times for common queries

### Mobile Optimizations
- **Native Camera Integration**: Expo Camera with optimized capture settings
- **Advanced Audio Management**: Smart speech queuing and echo prevention
- **Haptic Feedback**: Contextual vibrations for better user experience
- **Background Handling**: Maintains functionality when app returns from background

### Performance Features
- **Response Caching**: Intelligent caching of similar queries
- **Priority Processing**: Urgent commands (safety-related) get faster processing
- **Debounced Voice Processing**: Prevents duplicate command processing
- **Optimized API Calls**: Uses faster models (gpt-4o-mini, eleven_turbo_v2)

## Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator or Android Emulator (or physical device)

### Installation

1. **Clone and install dependencies**:
```bash
npm install
```

2. **Set up API keys**:
   - Get OpenAI API key from [OpenAI Platform](https://platform.openai.com/)
   - (Optional) Get ElevenLabs API key from [ElevenLabs](https://elevenlabs.io/)
   - Keys can be configured in-app via settings (long-press status indicator)

3. **Start the development server**:
```bash
npx expo start
```

4. **Run on device**:
   - Scan QR code with Expo Go app
   - Or press 'i' for iOS simulator, 'a' for Android emulator

## Usage

### Basic Operation
1. **Initial Setup**: Grant camera and microphone permissions
2. **Voice Commands**: Simply speak your questions naturally
3. **Stop Audio**: Tap anywhere on screen to stop current speech
4. **Settings**: Long-press the status indicator (top-right) to configure API keys

### Voice Commands Examples
- *"What do you see?"* - General scene description
- *"Where is my backpack?"* - Object location
- *"What's in front of me?"* - Navigation assistance  
- *"What color is my shirt?"* - Specific questions
- *"Help"* - Available commands
- *"Stop"* or *"Quiet"* - Stop current speech

### Status Indicators
- 🟢 **Green**: Ready/Active
- 🔵 **Blue**: Listening for voice input
- 🟠 **Orange**: Analyzing image
- 🔴 **Red**: Speaking/Audio playing

## Performance Optimizations

### Response Time Improvements
- **Image Processing**: 0.7 quality JPEG, skip processing flags
- **API Optimization**: Shorter token limits, faster models
- **Caching System**: 30-second cache for similar queries
- **Priority Queuing**: Safety-related commands processed first

## API Integration

### OpenAI Vision API
- Uses `gpt-4o-mini` for faster responses
- Optimized token limits (120 tokens)
- Lower detail setting for speed

### ElevenLabs Speech API (Optional)
- Uses `eleven_turbo_v2` model for fastest synthesis
- Optimized audio format for mobile
- Falls back to native speech if unavailable
