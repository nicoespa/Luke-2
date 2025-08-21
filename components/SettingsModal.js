import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const SettingsModal = ({ visible, onClose, onSave, currentApiKey, currentElevenLabsKey }) => {
  const [apiKey, setApiKey] = useState(currentApiKey || '');
  const [elevenLabsKey, setElevenLabsKey] = useState(currentElevenLabsKey || '');

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('openaiKey', apiKey);
      await AsyncStorage.setItem('elevenLabsKey', elevenLabsKey);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave(apiKey, elevenLabsKey);
      onClose();
      
      Alert.alert('Settings Saved', 'Your API keys have been saved successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.section}>
              <Text style={styles.label}>OpenAI API Key</Text>
              <Text style={styles.description}>
                Required for image analysis and visual descriptions
              </Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="sk-..."
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>ElevenLabs API Key (Optional)</Text>
              <Text style={styles.description}>
                For higher quality voice synthesis. Leave empty to use system voice.
              </Text>
              <TextInput
                style={styles.input}
                value={elevenLabsKey}
                onChangeText={setElevenLabsKey}
                placeholder="sk_..."
                placeholderTextColor="#666"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save Settings</Text>
            </TouchableOpacity>

            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                Your API keys are stored securely on your device and are only used to communicate with the respective services.
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#44ff44',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  infoSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SettingsModal;