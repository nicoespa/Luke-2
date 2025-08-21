import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default class BlindVisionApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasPermissions: false,
      isAnalyzing: false,
      apiKey: '',
    };
    this.cameraRef = React.createRef();
  }

  componentDidMount() {
    this.initApp();
  }

  initApp = async () => {
    try {
      const storedKey = await AsyncStorage.getItem('openaiKey');
      this.setState({ apiKey: storedKey || '' });
      this.requestPermissions();
    } catch (error) {
      console.log('Init error:', error);
    }
  };

  requestPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      this.setState({ hasPermissions: status === 'granted' });
      
      if (status !== 'granted') {
        Alert.alert('Camera permission required');
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  speak = (text) => {
    Speech.speak(text, { language: 'en-US' });
  };

  captureAndAnalyze = async () => {
    if (!this.state.apiKey) {
      this.speak('Please set your API key first');
      const key = prompt('Enter OpenAI API Key:');
      if (key) {
        this.setState({ apiKey: key });
        await AsyncStorage.setItem('openaiKey', key);
        this.speak('API key saved');
      }
      return;
    }

    if (!this.cameraRef.current || this.state.isAnalyzing) return;

    try {
      this.setState({ isAnalyzing: true });
      this.speak('Analyzing...');

      const photo = await this.cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      const imageData = `data:image/jpeg;base64,${photo.base64}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.state.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              text: 'Describe what you see in this image for a blind person. Be concise and focus on important details.'
            }, {
              type: 'image_url',
              image_url: { url: imageData }
            }]
          }],
          max_tokens: 100
        })
      });

      const data = await response.json();
      const description = data.choices[0].message.content;
      this.speak(description);

    } catch (error) {
      this.speak('Error analyzing image');
      console.log('Error:', error);
    } finally {
      this.setState({ isAnalyzing: false });
    }
  };

  render() {
    const { hasPermissions, isAnalyzing } = this.state;

    if (!hasPermissions) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Camera permission required</Text>
          <TouchableOpacity style={styles.button} onPress={this.requestPermissions}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Camera 
          style={styles.camera} 
          facing="back"
          ref={this.cameraRef}
        />
        
        <TouchableOpacity 
          style={styles.captureButton}
          onPress={this.captureAndAnalyze}
          disabled={isAnalyzing}
        >
          <Text style={styles.captureText}>
            {isAnalyzing ? 'Analyzing...' : 'Tap to Analyze'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.status, isAnalyzing && styles.analyzing]} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: width,
    height: height,
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    margin: 20,
  },
  button: {
    backgroundColor: '#44ff44',
    padding: 15,
    borderRadius: 10,
    margin: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  captureButton: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#44ff44',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  captureText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  status: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#44ff44',
  },
  analyzing: {
    backgroundColor: '#ff4444',
  },
});