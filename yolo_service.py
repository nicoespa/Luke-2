from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image
import io
import base64

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load YOLOv8n model
model = YOLO('yolov8n.pt')

@app.route('/detect', methods=['POST'])
def detect_objects():
    try:
        # Get image from request
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        
        # Convert to PIL Image
        pil_image = Image.open(image_file.stream)
        
        # Convert to numpy array for YOLO
        image_array = np.array(pil_image)
        
        # Run YOLO detection
        results = model(image_array)
        
        # Extract detections
        detections = []
        confidences = []
        
        for r in results:
            if r.boxes is not None:
                for box in r.boxes:
                    # Get class name and confidence
                    class_id = int(box.cls[0])
                    class_name = model.names[class_id]
                    confidence = float(box.conf[0])
                    
                    # Only include high confidence detections
                    if confidence > 0.5:
                        detections.append(f"{class_name}")
                        confidences.append(confidence)
        
        # Remove duplicates and sort by confidence
        unique_detections = []
        seen = set()
        for detection, conf in zip(detections, confidences):
            if detection not in seen:
                unique_detections.append(detection)
                seen.add(detection)
        
        return jsonify({
            'detections': unique_detections,
            'status': 'success'
        })
        
    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model': 'yolov8n',
        'version': '1.0'
    })

if __name__ == '__main__':
    print("Starting YOLO detection service...")
    print("Model loaded successfully!")
    app.run(host='0.0.0.0', port=8000, debug=False)