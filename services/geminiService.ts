let audioContext: AudioContext | null = null;
const announcementQueue: {ticketNumber: string, counterNumber: number}[] = [];
let isPlaying = false;
let queueSoundBuffer: AudioBuffer | null = null;

// Initialize WebSocket connection for real-time announcements
let ws: WebSocket | null = null;

// Audio file path - adjust based on your project structure
const QUEUE_SOUND_PATH = 'sounds/Electronic queue sound (Sound effect).mp3'; // Changed to beep.mp3

export const initializeVoiceService = () => {
  // Load the sound file first
  loadQueueSound();
  
  // Connect to WebSocket for real-time announcement coordination
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.hostname}:8080`;
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Announcement service WebSocket connected');
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

// Load the queue sound from the file
const loadQueueSound = async () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  try {
    const response = await fetch(QUEUE_SOUND_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load sound file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    queueSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('Queue sound loaded successfully');
  } catch (error) {
    console.error('Failed to load queue sound:', error);
    // Fallback: Create a simple beep if sound file fails to load
    createFallbackBeep();
  }
};

// Create a simple fallback beep if sound file can't be loaded
const createFallbackBeep = () => {
  if (!audioContext) return;
  
  try {
    // Create a simple beep sound - one short beep
    const duration = 0.5; // Shorter beep
    const sampleRate = audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    
    const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Create a simple beep tone
    const frequency = 800;
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    }
    
    queueSoundBuffer = buffer;
    console.log('Created fallback beep sound');
  } catch (error) {
    console.error('Failed to create fallback beep:', error);
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
  // Also announce locally - JUST THE BEEP, NO ANNOUNCEMENT
  playBeepSoundOnly();
};

// Modified to just play beep without announcement
export const announceTicket = async (ticketNumber: string, counterNumber: number) => {
  try {
    console.log(`🔔 Playing beep for ticket: ${ticketNumber} at counter: ${counterNumber}`);
    
    // Add to queue if already playing
    if (isPlaying) {
      announcementQueue.push({ ticketNumber, counterNumber });
      console.log(`Added to queue. Queue length: ${announcementQueue.length}`);
      return false;
    }
    
    isPlaying = true;
    
    // Play just the beep sound (no announcement)
    await playBeepSoundOnly();
    
    isPlaying = false;
    
    // Process next in queue
    processAnnouncementQueue();
    
    return true;
  } catch (error) {
    console.error("Beep sound failed:", error);
    isPlaying = false;
    processAnnouncementQueue();
    return false;
  }
};

// New function: Play beep sound only (no announcement)
const playBeepSoundOnly = async (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      if (!queueSoundBuffer) {
        console.warn('Beep sound not loaded yet. Loading now...');
        loadQueueSound().then(() => {
          // Try again after loading
          playBeepSoundOnly().then(resolve);
        });
        return;
      }
      
      // Create audio source
      const source = audioContext.createBufferSource();
      source.buffer = queueSoundBuffer;
      
      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0; // Full volume
      
      // Connect nodes
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Play the sound - ONE TIME ONLY
      source.start();
      
      // Resolve after the beep completes
      setTimeout(() => {
        resolve();
      }, queueSoundBuffer.duration * 1000 + 100);
      
    } catch (error) {
      console.error('Failed to play beep sound:', error);
      
      // Ultimate fallback: Use HTML5 Audio
      playHtml5Fallback().then(() => resolve());
    }
  });
};

// Modified playQueueSound to just play one beep
const playQueueSound = async (ticketNumber: string, counterNumber: number): Promise<void> => {
  // Now just plays a single beep
  return playBeepSoundOnly();
};

const playHtml5Fallback = async (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(QUEUE_SOUND_PATH);
      
      audio.oncanplaythrough = () => {
        audio.play().then(() => {
          setTimeout(() => {
            resolve();
          }, (audio.duration * 1000) || 1000);
        }).catch(e => {
          console.error('HTML5 audio playback failed:', e);
          resolve();
        });
      };
      
      audio.onerror = () => {
        console.error('HTML5 audio load failed');
        resolve();
      };
      
      // If browser doesn't support oncanplaythrough
      setTimeout(() => {
        if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or more
          audio.play().then(() => {
            setTimeout(resolve, 2000);
          }).catch(() => resolve());
        } else {
          resolve();
        }
      }, 500);
      
    } catch (error) {
      console.error('HTML5 fallback failed:', error);
      resolve();
    }
  });
};

const processAnnouncementQueue = () => {
  if (announcementQueue.length > 0 && !isPlaying) {
    const next = announcementQueue.shift();
    if (next) {
      console.log(`Processing queued beep for: ${next.ticketNumber} at counter ${next.counterNumber}`);
      announceTicket(next.ticketNumber, next.counterNumber);
    }
  }
};

// Test function to play the beep
export const testBeep = (ticketNumber: string = 'B-015', counterNumber: number = 8) => {
  console.log(`🔊 Testing beep sound`);
  playBeepSoundOnly();
};

// Preload audio context and sound on user interaction
export const preloadAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log('Audio context preloaded');
  }
  
  // Also preload the sound file
  loadQueueSound();
};

// Initialize on user interaction (required by browsers)
if (typeof window !== 'undefined') {
  // Initialize on first user interaction
  const initOnInteraction = () => {
    preloadAudio();
    window.removeEventListener('click', initOnInteraction);
    window.removeEventListener('touchstart', initOnInteraction);
  };
  
  window.addEventListener('click', initOnInteraction);
  window.addEventListener('touchstart', initOnInteraction);
  
  // Initialize WebSocket connection
  setTimeout(initializeVoiceService, 1000);
}

// Clean up function
export const cleanupAnnouncementService = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
    audioContext = null;
  }
  
  // Clear buffer and queue
  queueSoundBuffer = null;
  announcementQueue.length = 0;
  isPlaying = false;
};

// Volume control
export const setAnnouncementVolume = (volume: number) => {
  // Store volume for future use
  console.log(`Volume set to: ${volume}`);
  // Note: To implement actual volume control, we'd need to store
  // and apply this to gain nodes when creating audio sources
};

export const getCurrentStatus = () => ({
  isPlaying,
  queueLength: announcementQueue.length,
  soundLoaded: !!queueSoundBuffer,
  audioContextState: audioContext?.state
});

// Function to manually trigger a beep from UI
export const playBeep = () => {
  console.log(`Manual beep play`);
  playBeepSoundOnly();
};