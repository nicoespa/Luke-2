// Environment variables loader
// In production, these will be replaced by Vercel during build
window.ENV = {
    OPENAI_API_KEY: '__OPENAI_API_KEY__',
    ELEVENLABS_API_KEY: '__ELEVENLABS_API_KEY__'
};

// In development, try to load from .env file
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    async function loadEnv() {
        try {
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
        } catch (error) {
            console.log('Could not load .env file, using defaults');
        }
    }
    
    loadEnv();
} 