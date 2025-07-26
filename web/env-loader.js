// Environment variables loader
window.ENV = {
    OPENAI_API_KEY: '',
    ELEVENLABS_API_KEY: ''
};

// Load environment variables
async function loadEnv() {
    try {
        // In production, load from API endpoint
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                window.ENV = config;
                console.log('Environment variables loaded from API');
            }
        } else {
            // In development, try to load from .env file
            const response = await fetch('/.env');
            if (response.ok) {
                const envText = await response.text();
                const lines = envText.split('\n');
                
                lines.forEach(line => {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        window.ENV[key.trim()] = value.trim();
                    }
                });
                
                console.log('Development environment variables loaded');
            }
        }
    } catch (error) {
        console.log('Could not load environment variables:', error);
    }
}

// Create a promise that resolves when env is loaded
window.envLoaded = loadEnv(); 