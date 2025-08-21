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
  TextInput,
  Modal
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const BlindVisionApp = () => {
  // States
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputText, setManualInputText] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  // Refs
  const cameraRef = useRef(null);

  // Initialize API keys
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Load API key from storage
      const storedApiKey = await AsyncStorage.getItem('openaiKey');
      setApiKey(storedApiKey || '');

      // Request permissions
      await requestPermissions();
      
      // Initialize
      setTimeout(() => {
        speak('BlindVision Assistant ready. Touch screen to ask questions.');
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      
      if (cameraStatus === 'granted') {
        setHasPermissions(true);
      } else {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is required for the app to function.',
          [{ text: 'OK', onPress: () => requestPermissions() }]
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const speak = useCallback((text) => {
    try {
      const options = {
        language: 'en-US',
        pitch: 1.1,
        rate: 1.0,
        quality: 'enhanced',
      };
      Speech.speak(text, options);
    } catch (error) {
      console.error('Speech error:', error);
    }
  }, []);

  const captureImage = useCallback(async () => {
    if (!cameraRef.current || isAnalyzing) return null;

    try {
      const options = {
        quality: 0.7,
        base64: true,
        skipProcessing: true,
      };
      
      const photo = await cameraRef.current.takePictureAsync(options);
      const imageData = `data:image/jpeg;base64,${photo.base64}`;
      return imageData;
    } catch (error) {
      console.error('Capture error:', error);
      return null;
    }
  }, [isAnalyzing]);

  const analyzeScene = useCallback(async (question) => {
    if (!apiKey || apiKey === '' || apiKey === 'your_openai_api_key_here') {
      speak('Please set your OpenAI API key first. Touch and hold the status indicator.');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      const imageData = await captureImage();
      if (!imageData) {
        speak('Unable to capture image. Please try again.');
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a visual assistant for blind users. Provide concise, actionable descriptions focusing on navigation, safety, and spatial awareness. Be direct and specific.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: question
                },
                {
                  type: 'image_url',
                  image_url: { 
                    url: imageData,
                    detail: 'low'
                  }
                }
              ]
            }
          ],
          max_tokens: 150,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.choices[0].message.content;
      
      setLastResponse(answer);
      speak(answer);
      
    } catch (error) {
      console.error('Analysis error:', error);
      speak('Sorry, I had trouble analyzing that. Please check your API key and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [apiKey, speak, captureImage]);

  const handleScreenTouch = useCallback(() => {
    if (isAnalyzing) {
      Speech.stop();
      return;
    }
    setShowManualInput(true);
  }, [isAnalyzing]);

  const handleManualInput = useCallback(() => {
    if (manualInputText.trim()) {
      analyzeScene(manualInputText);
      setManualInputText('');
      setShowManualInput(false);
    }
  }, [manualInputText, analyzeScene]);

  const handleSettingsLongPress = useCallback(() => {
    setShowSettings(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    const key = prompt('Enter your OpenAI API Key:');
    if (key !== null) {
      setApiKey(key);
      await AsyncStorage.setItem('openaiKey', key);
      setShowSettings(false);
      speak('API key saved successfully!');
    }
  }, [speak]);

  if (!hasPermissions) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
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
      
      {/* Status indicator */}
      <TouchableOpacity 
        style={[
          styles.statusIndicator,
          isAnalyzing ? styles.analyzing : styles.ready
        ]}
        onLongPress={handleSaveSettings}
        delayLongPress={1000}
      />

      {/* Manual Input Modal */}
      <Modal
        visible={showManualInput}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ask a Question</Text>
            <Text style={styles.modalSubtitle}>What would you like to know about what you see?</Text>
            
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
      
      {/* Instructions */}
      <Text style={styles.instructions}>
        Touch screen to ask questions • Long press status light for API key
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
  analyzing: {
    backgroundColor: '#ffaa00',
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    color: 'white',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10,
    fontSize: 14,
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