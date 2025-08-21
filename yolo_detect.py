from ultralytics import YOLO
import cv2

# Load YOLOv8n model
model = YOLO('yolov8n.pt')

# Function to detect objects in an image
def detect_objects(image_path, save_path=None):
    # Run inference
    results = model(image_path)
    
    # Process results
    for r in results:
        # Get boxes, classes, and confidences
        boxes = r.boxes
        
        if boxes is not None:
            for box in boxes:
                # Get class name
                class_id = int(box.cls[0])
                class_name = model.names[class_id]
                confidence = float(box.conf[0])
                
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                print(f"Detected: {class_name} (confidence: {confidence:.2f})")
                print(f"Location: ({x1:.0f}, {y1:.0f}) to ({x2:.0f}, {y2:.0f})")
        
        # Save annotated image if path provided
        if save_path:
            annotated_img = r.plot()
            cv2.imwrite(save_path, annotated_img)
            print(f"Annotated image saved to: {save_path}")
    
    return results

# Example usage
if __name__ == "__main__":
    # You can replace this with your image path
    image_path = "test_image.jpg"
    
    try:
        results = detect_objects(image_path, "output.jpg")
    except Exception as e:
        print(f"Error: {e}")
        print("Please provide a valid image path or use webcam detection.")
        
        # Alternative: Use webcam
        print("\nTrying webcam detection...")
        try:
            cap = cv2.VideoCapture(0)
            ret, frame = cap.read()
            if ret:
                cv2.imwrite("webcam_frame.jpg", frame)
                results = detect_objects("webcam_frame.jpg", "webcam_output.jpg")
            cap.release()
        except:
            print("Webcam not available.")