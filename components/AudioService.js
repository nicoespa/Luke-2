import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

class AudioService {
  constructor() {
    this.soundObject = null;
    this.isPlaying = false;
    this.speechQueue = [];
    this.initializeAudio();
  }

  async initializeAudio() {
    try {
      // Configure audio session for optimal performance - simplified for compatibility
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
    } catch (error) {
      console.error('Audio initialization error:', error);
      // Continue without advanced audio config
    }
  }

  async speakWithElevenLabs(text, apiKey, voiceId = '21m00Tcm4TlvDq8ikWAM') {
    try {
      this.isPlaying = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2', // Fastest model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          },
          output_format: 'mp3_44100_128' // Optimized format
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUri = URL.createObjectURL(audioBlob);
      
      // Stop any current audio
      if (this.soundObject) {
        await this.soundObject.unloadAsync();
      }

      // Create new sound object with optimized settings
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { 
          shouldPlay: true,
          isLooping: false,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: false, // Faster playback
          progressUpdateIntervalMillis: 100
        }
      );

      this.soundObject = sound;

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          this.isPlaying = false;
          this.processQueue();
        }
      });

      await sound.playAsync();
      
    } catch (error) {
      console.error('ElevenLabs playback error:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async speakWithNative(text) {
    try {
      this.isPlaying = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const options = {
        language: 'en-US',
        pitch: 1.1,
        rate: 1.0, // Faster rate for quicker responses
        quality: 'enhanced',
        onStart: () => {
          console.log('Speech started');
        },
        onDone: () => {
          this.isPlaying = false;
          this.processQueue();
        },
        onStopped: () => {
          this.isPlaying = false;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isPlaying = false;
        }
      };

      Speech.speak(text, options);
      
    } catch (error) {
      console.error('Native speech error:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async speak(text, useElevenLabs = false, elevenLabsKey = null) {
    if (this.isPlaying) {
      this.speechQueue.push({ text, useElevenLabs, elevenLabsKey });
      return;
    }

    try {
      if (useElevenLabs && elevenLabsKey) {
        await this.speakWithElevenLabs(text, elevenLabsKey);
      } else {
        await this.speakWithNative(text);
      }
    } catch (error) {
      console.error('Speech error:', error);
      // Fallback to native speech
      if (useElevenLabs) {
        await this.speakWithNative(text);
      }
    }
  }

  processQueue() {
    if (this.speechQueue.length > 0 && !this.isPlaying) {
      const next = this.speechQueue.shift();
      setTimeout(() => {
        this.speak(next.text, next.useElevenLabs, next.elevenLabsKey);
      }, 100); // Minimal delay for better flow
    }
  }

  async stopAllAudio() {
    try {
      // Stop native speech
      Speech.stop();
      
      // Stop ElevenLabs audio
      if (this.soundObject) {
        await this.soundObject.stopAsync();
        await this.soundObject.unloadAsync();
        this.soundObject = null;
      }

      // Clear queue
      this.speechQueue = [];
      this.isPlaying = false;
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error('Stop audio error:', error);
    }
  }

  getPlayingStatus() {
    return this.isPlaying;
  }

  getQueueLength() {
    return this.speechQueue.length;
  }
}

export default new AudioService();