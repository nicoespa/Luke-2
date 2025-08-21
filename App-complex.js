import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  AppState,
  Platform,
  Vibration,
  TextInput,
  Modal
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
// react-native-voice not supported in Expo Go - using web fallback
let Voice = null;
try {
  Voice = require('react-native-voice');
} catch (e) {
  console.log('react-native-voice not available, using web fallback');
}
import AudioService from './components/AudioService';
import VisionService from './components/VisionService';
import SettingsModal from './components/SettingsModal';

const { width, height } = Dimensions.get('window');

const BlindVisionApp = () => {
  // States
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [apiKey, setApiKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [lastCapturedImage, setLastCapturedImage] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputText, setManualInputText] = useState('');

  // Refs
  const cameraRef = useRef(null);
  const speechQueue = useRef([]);
  const continuousListening = useRef(true);
  const isInitialized = useRef(false);

  // Performance optimization: Debounce voice processing
  const processVoiceDebounce = useRef(null);

  // Initialize API keys
  useEffect(() => {
    initializeApp();
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        if (isInitialized.current) {
          startContinuousListening();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        stopListening();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  // Voice recognition setup
  useEffect(() => {
    setupVoiceRecognition();
    return () => {
      if (Voice) {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Load API keys from storage
      const storedApiKey = await AsyncStorage.getItem('openaiKey');
      const storedElevenLabsKey = await AsyncStorage.getItem('elevenLabsKey');
      
      setApiKey(storedApiKey || '');
      setElevenLabsKey(storedElevenLabsKey || '');

      // Request permissions
      await requestPermissions();
      
      // Initialize after a short delay
      setTimeout(() => {
        if (!isInitialized.current) {
          isInitialized.current = true;
          speak('BlindVision Assistant ready. Just speak to ask me questions.');
          setTimeout(() => startContinuousListening(), 2000);
        }
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } = await Camera.requestMicrophonePermissionsAsync();
      
      if (cameraStatus === 'granted' && audioStatus === 'granted') {
        setHasPermissions(true);
      } else {
        Alert.alert(
          'Permissions Required',
          'Camera and microphone access are required for the app to function.',
          [{ text: 'OK', onPress: () => requestPermissions() }]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const setupVoiceRecognition = () => {
    if (!Voice) {
      console.log('Voice recognition not available in this environment');
      return;
    }

    Voice.onSpeechStart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    Voice.onSpeechEnd = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        const transcript = e.value[0].trim();
        console.log('Speech result:', transcript);
        
        // Performance optimization: Debounce processing
        if (processVoiceDebounce.current) {
          clearTimeout(processVoiceDebounce.current);
        }
        
        processVoiceDebounce.current = setTimeout(() => {
          handleVoiceCommand(transcript);
        }, 500);
      }
    };

    Voice.onSpeechError = (e) => {
      console.error('Speech error:', e.error);
      setIsListening(false);
      
      if (continuousListening.current && !isSpeaking) {
        setTimeout(() => startContinuousListening(), 1000);
      }
    };
  };

  const startContinuousListening = useCallback(async () => {
    if (!hasPermissions || isListening || isSpeaking || !Voice) return;

    try {
      continuousListening.current = true;
      await Voice.start('en-US');
      console.log('Continuous listening started');
    } catch (error) {
      console.error('Failed to start listening:', error);
      // Retry after delay
      setTimeout(() => {
        if (continuousListening.current && !isSpeaking) {
          startContinuousListening();
        }
      }, 2000);
    }
  }, [hasPermissions, isListening, isSpeaking]);

  const stopListening = useCallback(async () => {
    try {
      continuousListening.current = false;
      if (Voice) {
        await Voice.stop();
      }
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice:', error);
    }
  }, []);

  const speak = useCallback(async (text) => {
    try {
      // Stop listening while speaking to prevent echo
      await stopListening();
      
      const useElevenLabs = elevenLabsKey && elevenLabsKey !== '' && elevenLabsKey !== 'your_elevenlabs_api_key_here';
      await AudioService.speak(text, useElevenLabs, elevenLabsKey);
      
      setIsSpeaking(AudioService.getPlayingStatus());
      
      // Resume listening after speaking
      if (continuousListening.current) {
        setTimeout(() => startContinuousListening(), 800);
      }
      
    } catch (error) {
      console.error('Speech error:', error);
      setIsSpeaking(false);
      
      if (continuousListening.current) {
        setTimeout(() => startContinuousListening(), 1000);
      }
    }
  }, [elevenLabsKey, stopListening, startContinuousListening]);


  const captureImage = useCallback(async () => {
    if (!cameraRef.current || isAnalyzing) return null;

    try {
      // Performance optimization: Lower quality for faster processing
      const options = {
        quality: 0.7,
        base64: true,
        skipProcessing: true, // Faster capture
      };
      
      const photo = await cameraRef.current.takePictureAsync(options);
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      setLastCapturedImage(imageData);
      return imageData;
    } catch (error) {
      console.error('Capture error:', error);
      return null;
    }
  }, [isAnalyzing]);

  const handleVoiceCommand = useCallback(async (command) => {
    const lowerCommand = command.toLowerCase();
    
    // Filter out noise and echoes with improved detection
    if (lowerCommand.length < 4 || 
        lowerCommand.includes('room with') ||
        lowerCommand.includes('wearing glasses and') ||
        lowerCommand.includes('the person on the left')) {
      return;
    }

    console.log('Processing command:', command);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check for quick responses first
    const quickResponse = VisionService.getQuickResponse(command);
    if (quickResponse === null && (lowerCommand.includes('stop') || lowerCommand.includes('quiet'))) {
      // Stop all audio
      AudioService.stopAllAudio();
      setIsSpeaking(false);
      return;
    } else if (quickResponse) {
      speak(quickResponse);
      return;
    }

    // Performance optimization: Prioritize urgent commands
    const priority = VisionService.getCommandPriority(command);
    if (priority === 'urgent') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Capture and analyze
    const imageData = await captureImage();
    if (imageData) {
      await analyzeScene(command, imageData);
    } else {
      speak('Unable to capture image. Please make sure the camera is working.');
    }
  }, [captureImage, speak]);

  const analyzeScene = useCallback(async (question, imageData) => {
    if (!apiKey || apiKey === '' || apiKey === 'your_openai_api_key_here') {
      speak('OpenAI API key not configured. Please set up your API key in the app settings.');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      // Use optimized vision service
      const answer = await VisionService.processImage(imageData, question, apiKey);
      
      console.log('Analysis complete:', answer.substring(0, 50) + '...');
      speak(answer);
      
    } catch (error) {
      console.error('Analysis error:', error);
      speak('Sorry, I had trouble analyzing that. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [apiKey, speak]);

  const handleScreenTouch = useCallback(() => {
    if (AudioService.getPlayingStatus()) {
      // Stop current speech using optimized service
      AudioService.stopAllAudio();
      setIsSpeaking(false);
      
      // Resume listening after stopping speech
      setTimeout(() => {
        if (continuousListening.current) {
          startContinuousListening();
        }
      }, 500);
    } else if (!Voice) {
      // If voice not available, show manual input
      setShowManualInput(true);
    }
  }, [startContinuousListening]);

  const handleManualInput = useCallback(() => {
    if (manualInputText.trim()) {
      handleVoiceCommand(manualInputText);
      setManualInputText('');
      setShowManualInput(false);
    }
  }, [manualInputText, handleVoiceCommand]);

  const handleSettingsLongPress = useCallback(() => {
    setShowSettings(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const handleSettingsSave = useCallback((newApiKey, newElevenLabsKey) => {
    setApiKey(newApiKey);
    setElevenLabsKey(newElevenLabsKey);
  }, []);

  if (!hasPermissions) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera and microphone permissions are required
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" hidden />
      <StatusBar hidden />
      
      <TouchableOpacity 
        style={styles.cameraContainer} 
        onPress={handleScreenTouch}
        activeOpacity={0.9}
      >
        <Camera 
          style={styles.camera} 
          facing="back"
          ref={cameraRef}
          ratio="16:9"
        />
      </TouchableOpacity>
      
      {/* Status indicator - long press for settings */}
      <TouchableOpacity 
        style={[
          styles.statusIndicator,
          isListening ? styles.listening : 
          isAnalyzing ? styles.analyzing :
          isSpeaking ? styles.speaking : styles.ready
        ]}
        onLongPress={handleSettingsLongPress}
        delayLongPress={2000}
      />
      
      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
        currentApiKey={apiKey}
        currentElevenLabsKey={elevenLabsKey}
      />

      {/* Manual Input Modal - shown when voice recognition not available */}
      <Modal
        visible={showManualInput}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ask a Question</Text>
            <Text style={styles.modalSubtitle}>Voice recognition not available. Type your question:</Text>
            
            <TextInput
              style={styles.textInput}
              value={manualInputText}
              onChangeText={setManualInputText}
              placeholder="What do you see?"
              placeholderTextColor="#666"
              multiline
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleManualInput}
              >
                <Text style={styles.submitButtonText}>Ask</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Accessibility hint */}
      <Text style={styles.hiddenText} accessible={true}>
        BlindVision Assistant: {Voice ? 'Speak' : 'Touch screen'} to ask questions about what you see. Touch screen to stop audio or open text input. Long press status light for settings.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#44ff44',
    padding: 15,
    borderRadius: 25,
    minWidth: 200,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    width: width,
    height: height,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  statusIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  ready: {
    backgroundColor: '#44ff44',
  },
  listening: {
    backgroundColor: '#4444ff',
  },
  analyzing: {
    backgroundColor: '#ffaa00',
  },
  speaking: {
    backgroundColor: '#ff4444',
  },
  hiddenText: {
    position: 'absolute',
    left: -9999,
    fontSize: 1,
    color: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#333',
    color: 'white',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    flex: 0.45,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  submitButton: {
    backgroundColor: '#44ff44',
  },
  cancelButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  submitButtonText: {
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
  }
});

export default BlindVisionApp;