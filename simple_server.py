#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
from pathlib import Path
import os

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.getcwd(), **kwargs)
    
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def start_server():
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"🚀 BlindVision Assistant starting...")
            print(f"📱 Open: http://localhost:{PORT}/web-simple.html")
            print(f"🎯 Click status indicator (top right) to set OpenAI API key")
            print(f"📷 Allow camera permissions when prompted")
            print(f"🗣️  Click 'Ask Question' or 'Type Question' to interact")
            print(f"⏹️  Press Ctrl+C to stop")
            print("")
            
            # Try to open browser automatically
            try:
                webbrowser.open(f'http://localhost:{PORT}/web-simple.html')
            except:
                pass
                
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {PORT} is already in use. Try:")
            print(f"   lsof -ti:{PORT} | xargs kill")
            print(f"   Then run this script again")
        else:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    start_server()