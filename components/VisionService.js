import * as Haptics from 'expo-haptics';

class VisionService {
  constructor() {
    this.isProcessing = false;
    this.requestQueue = [];
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
    this.yoloModel = null;
    this.initializeYOLO();
  }

  async initializeYOLO() {
    try {
      // This will be loaded when YOLO processing is needed
      console.log('YOLO initialization ready');
    } catch (error) {
      console.error('YOLO initialization error:', error);
    }
  }

  // Optimized image processing with YOLO + OpenAI integration
  async processImage(imageData, question, apiKey) {
    // Check cache first for similar questions
    const cacheKey = this.generateCacheKey(imageData, question);
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log('Using cached response');
      return cached.response;
    }

    if (this.isProcessing) {
      return new Promise((resolve) => {
        this.requestQueue.push({ imageData, question, apiKey, resolve });
      });
    }

    try {
      this.isProcessing = true;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Try YOLO detection first for faster object identification
      let yoloDetections = null;
      try {
        yoloDetections = await this.runYOLODetection(imageData);
      } catch (error) {
        console.log('YOLO detection failed, using OpenAI only:', error.message);
      }

      // Enhanced prompt with YOLO context if available
      const enhancedQuestion = yoloDetections 
        ? `${question}\n\nContext: I detected these objects: ${yoloDetections.join(', ')}`
        : question;
      
      const response = await this.callOpenAIVision(imageData, enhancedQuestion, apiKey);
      
      // Cache the response
      this.cache.set(cacheKey, {
        response,
        timestamp: Date.now()
      });

      // Clean old cache entries
      this.cleanCache();
      
      return response;
      
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
  }

  async runYOLODetection(imageData) {
    try {
      // Convert base64 to blob for processing
      const base64Data = imageData.split(',')[1];
      const binaryData = atob(base64Data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      
      // Create form data for Python script
      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');
      
      // Call local YOLO detection service
      const response = await fetch('http://localhost:8000/detect', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`YOLO service error: ${response.status}`);
      }

      const result = await response.json();
      return result.detections || [];
      
    } catch (error) {
      console.error('YOLO detection error:', error);
      return null;
    }
  }

  async callOpenAIVision(imageData, question, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Faster and cheaper
        messages: [
          {
            role: 'system',
            content: 'You are a visual assistant for blind users. Provide concise, actionable descriptions focusing on navigation, safety, and spatial awareness. Be direct and specific. Limit responses to 2-3 sentences for faster processing.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Question: "${question}"\n\nProvide a helpful, concise answer based on what you see. Focus on practical information that helps with navigation and understanding the environment.`
              },
              {
                type: 'image_url',
                image_url: { 
                  url: imageData,
                  detail: 'low' // Faster processing with lower detail
                }
              }
            ]
          }
        ],
        max_tokens: 120, // Shorter responses for speed
        temperature: 0.3,
        top_p: 0.8,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  processQueue() {
    if (this.requestQueue.length > 0 && !this.isProcessing) {
      const next = this.requestQueue.shift();
      this.processImage(next.imageData, next.question, next.apiKey)
        .then(next.resolve)
        .catch(next.resolve); // Resolve with error to prevent hanging
    }
  }

  generateCacheKey(imageData, question) {
    // Simple hash for caching similar questions
    const questionHash = question.toLowerCase().replace(/\s+/g, '').substring(0, 20);
    const imageHash = imageData.substring(0, 100); // First part of base64
    return `${questionHash}_${imageHash}`;
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // Analyze command to determine processing priority
  getCommandPriority(command) {
    const urgent = ['danger', 'hazard', 'obstacle', 'stairs', 'step', 'warning'];
    const important = ['where', 'find', 'locate', 'see'];
    const casual = ['describe', 'what', 'tell', 'explain'];

    const lowerCommand = command.toLowerCase();
    
    if (urgent.some(word => lowerCommand.includes(word))) return 'urgent';
    if (important.some(word => lowerCommand.includes(word))) return 'important';
    return 'casual';
  }

  // Pre-process common questions for faster responses
  getQuickResponse(command) {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('help')) {
      return 'I can help you see and navigate. Ask: What do you see? Where is my backpack? What\'s in front of me? What color is my shirt?';
    }
    
    if (lowerCommand.includes('stop') || lowerCommand.includes('quiet')) {
      return null; // Signal to stop audio
    }
    
    return null; // No quick response available
  }

  clearCache() {
    this.cache.clear();
  }

  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.requestQueue.length,
      cacheSize: this.cache.size
    };
  }
}

export default new VisionService();