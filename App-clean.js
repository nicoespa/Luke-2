import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  Modal
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function BlindVisionApp() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInputText, setManualInputText] = useState('');

  const cameraRef = useRef(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const storedApiKey = await AsyncStorage.getItem('openaiKey');
      setApiKey(storedApiKey || '');
      await requestPermissions();
      
      setTimeout(() => {
        speak('BlindVision Assistant ready. Touch screen to ask questions.');
      }, 1000);
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status === 'granted') {
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
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.1,
        rate: 1.0
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  }, []);

  const captureImage = useCallback(async () => {
    if (!cameraRef.current || isAnalyzing) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: true,
      });
      return `data:image/jpeg;base64,${photo.base64}`;
    } catch (error) {
      console.error('Capture error:', error);
      return null;
    }
  }, [isAnalyzing]);

  const analyzeScene = useCallback(async (question) => {
    if (!apiKey || apiKey === '') {
      speak('Please set your OpenAI API key first. Long press the status indicator.');
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
              content: 'You are a visual assistant for blind users. Provide concise, actionable descriptions focusing on navigation, safety, and spatial awareness.'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: question },
                { 
                  type: 'image_url',
                  image_url: { url: imageData, detail: 'low' }
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

  const handleSaveSettings = useCallback(async () => {
    const key = prompt('Enter your OpenAI API Key:');
    if (key !== null) {
      setApiKey(key);
      await AsyncStorage.setItem('openaiKey', key);
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
      
      <TouchableOpacity 
        style={[styles.statusIndicator, isAnalyzing ? styles.analyzing : styles.ready]}
        onLongPress={handleSaveSettings}
        delayLongPress={1000}
      />

      <Modal
        visible={showManualInput}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ask a Question</Text>
            <Text style={styles.modalSubtitle}>What would you like to know?</Text>
            
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
      
      <Text style={styles.instructions}>
        Touch screen to ask questions • Long press green dot for API key
      </Text>
    </View>
  );
}

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