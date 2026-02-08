
let audioContext: AudioContext | null = null;
const speechQueue: {ticketNumber: string, counterNumber: number}[] = [];
let isSpeaking = false;

// Initialize WebSocket connection for real-time announcements
let ws: WebSocket | null = null;

export const initializeVoiceService = () => {
  // Connect to WebSocket for real-time voice coordination
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.hostname}:8080`;
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Voice service WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'announce') {
          announceTicket(data.ticketNumber, data.counterNumber);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected, retrying in 5s...');
      setTimeout(initializeVoiceService, 5000);
    };
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
  }
};

// Broadcast announcement to all connected clients
export const broadcastAnnouncement = (ticketNumber: string, counterNumber: number) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'announce',
      ticketNumber,
      counterNumber,
      timestamp: Date.now()
    }));
  }
  // Also announce locally
  announceTicket(ticketNumber, counterNumber);
};

export const announceTicket = async (ticketNumber: string, counterNumber: number) => {
  try {
    // Use Web Speech API for high-quality speech synthesis
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Ticket ${ticketNumber}, please proceed to counter ${counterNumber}`;
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      
      // Select a voice if available
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.lang.startsWith('en-')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      speechSynthesis.speak(utterance);
      
      // Handle speech events
      utterance.onstart = () => {
        isSpeaking = true;
      };
      
      utterance.onend = () => {
        isSpeaking = false;
        processSpeechQueue();
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
        processSpeechQueue();
      };
      
      return true;
    } else {
      // Fallback to beep sounds
      playBeepPattern(ticketNumber, counterNumber);
      return true;
    }
  } catch (error) {
    console.error("Voice announcement failed:", error);
    // Fallback to simple beeps
    playBeepPattern(ticketNumber, counterNumber);
    return false;
  }
};

const playBeepPattern = (ticketNumber: string, counterNumber: number) => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  // Create a beep pattern: high beep for ticket, low beeps for counter
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Ticket number beep (high pitch)
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  
  oscillator.start();
  
  // Beep pattern based on ticket number
  const beepCount = parseInt(ticketNumber.split('-')[1]) % 5 || 1;
  
  for (let i = 0; i < beepCount; i++) {
    oscillator.frequency.setValueAtTime(
      600 + i * 100, 
      audioContext.currentTime + 0.2 * (i + 1)
    );
  }
  
  // Counter number beep (low pitch)
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.2 * (beepCount + 1));
  
  oscillator.stop(audioContext.currentTime + 0.2 * (beepCount + 2));
};

const processSpeechQueue = () => {
  if (speechQueue.length > 0 && !isSpeaking) {
    const next = speechQueue.shift();
    if (next) {
      announceTicket(next.ticketNumber, next.counterNumber);
    }
  }
};

// Initialize voice service when module loads
if (typeof window !== 'undefined') {
  setTimeout(initializeVoiceService, 1000);
}
