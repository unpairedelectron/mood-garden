import React, { useEffect, useRef, useState } from 'react';
import './MoodMusic.css';

interface MoodMusicProps {
  weather: string;
  pets?: any[];
  plantsCount?: number;
}

const MoodMusic: React.FC<MoodMusicProps> = ({ weather, pets = [], plantsCount = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [currentSoundscape, setCurrentSoundscape] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<{ [key: string]: AudioNode[] }>({});
  const intervalRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (isPlaying) {
      startWeatherSoundscape();
    } else {
      stopAllSounds();
    }

    return () => stopAllSounds();
  }, [weather, isPlaying, volume, pets.length, plantsCount]);

  const stopAllSounds = () => {
    // Stop all intervals
    intervalRefs.current.forEach(interval => clearInterval(interval));
    intervalRefs.current = [];

    // Stop all audio nodes
    Object.values(soundNodesRef.current).forEach(nodes => {
      nodes.forEach(node => {
        try {
          if ('stop' in node) {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch (e) {
          // Node might already be stopped
        }
      });
    });
    soundNodesRef.current = {};
  };

  const startWeatherSoundscape = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      stopAllSounds();

      const soundscape = getWeatherSoundscape(weather);
      setCurrentSoundscape(soundscape.name);

      // Create base ambient layer
      createAmbientLayer(audioContext, soundscape.ambient);

      // Add weather-specific sounds
      if (soundscape.weatherSounds) {
        soundscape.weatherSounds.forEach((sound: any) => {
          createWeatherEffect(audioContext, sound);
        });
      }

      // Add nature sounds based on garden state
      addNatureSounds(audioContext);
      
      // Add pet sounds
      if (pets.length > 0) {
        addPetSounds(audioContext);
      }

    } catch (error) {
      console.warn('Web Audio API not supported or failed:', error);
    }
  };

  const getWeatherSoundscape = (weather: string) => {
    const soundscapes: { [key: string]: any } = {
      'sunny': {
        name: 'Bright Garden Symphony',
        ambient: { 
          frequency: 220, 
          type: 'sine' as OscillatorType, 
          harmonics: [440, 660], 
          volume: 0.15 
        },
        weatherSounds: [
          { type: 'birds', interval: 3000, volume: 0.3 },
          { type: 'breeze', frequency: 100, volume: 0.2 }
        ]
      },
      'rainy': {
        name: 'Gentle Rain Meditation',
        ambient: { 
          frequency: 80, 
          type: 'triangle' as OscillatorType, 
          harmonics: [160, 240], 
          volume: 0.2 
        },
        weatherSounds: [
          { type: 'rain', frequency: 2000, volume: 0.4 },
          { type: 'thunder', interval: 15000, volume: 0.1 }
        ]
      },
      'cloudy': {
        name: 'Peaceful Overcast',
        ambient: { 
          frequency: 110, 
          type: 'sawtooth' as OscillatorType, 
          harmonics: [220, 330], 
          volume: 0.18 
        },
        weatherSounds: [
          { type: 'wind', frequency: 150, volume: 0.25 }
        ]
      },
      'misty': {
        name: 'Mystical Garden Fog',
        ambient: { 
          frequency: 65, 
          type: 'sine' as OscillatorType, 
          harmonics: [130, 195], 
          volume: 0.22 
        },
        weatherSounds: [
          { type: 'mystery', frequency: 200, volume: 0.15 },
          { type: 'distant_birds', interval: 8000, volume: 0.1 }
        ]
      },
      'sunset': {
        name: 'Golden Hour Serenity',
        ambient: { 
          frequency: 174, 
          type: 'sine' as OscillatorType, 
          harmonics: [348, 522], 
          volume: 0.2 
        },
        weatherSounds: [
          { type: 'evening_birds', interval: 5000, volume: 0.2 },
          { type: 'crickets', interval: 1000, volume: 0.15 }
        ]
      }
    };

    return soundscapes[weather] || soundscapes['sunny'];
  };

  const createAmbientLayer = (audioContext: AudioContext, config: any) => {
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(config.volume * volume, audioContext.currentTime);
    gainNode.connect(audioContext.destination);

    // Main tone
    const oscillator = audioContext.createOscillator();
    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
    oscillator.connect(gainNode);
    oscillator.start();

    // Harmonics
    const harmonicNodes: AudioNode[] = [oscillator, gainNode];
    soundNodesRef.current['ambient'] = harmonicNodes;
  };

  const createWeatherEffect = (audioContext: AudioContext, sound: any) => {
    if (sound.interval) {
      // Periodic sounds (birds, thunder, etc.)
      const interval = setInterval(() => {
        playPeriodicSound(audioContext, sound);
      }, sound.interval + Math.random() * 2000); // Add randomness

      intervalRefs.current.push(interval);
    }
  };

  const playPeriodicSound = (audioContext: AudioContext, sound: any) => {
    const duration = 0.5 + Math.random() * 1.5; // 0.5-2 seconds
    const gainNode = audioContext.createGain();
    const oscillator = audioContext.createOscillator();

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(sound.volume * volume, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    gainNode.connect(audioContext.destination);

    // Different sound types
    switch (sound.type) {
      case 'birds':
      case 'evening_birds':
        oscillator.frequency.setValueAtTime(1000 + Math.random() * 2000, audioContext.currentTime);
        oscillator.type = 'sine';
        break;
      case 'thunder':
        oscillator.frequency.setValueAtTime(60 + Math.random() * 40, audioContext.currentTime);
        oscillator.type = 'sawtooth';
        break;
      case 'distant_birds':
        oscillator.frequency.setValueAtTime(800 + Math.random() * 1200, audioContext.currentTime);
        oscillator.type = 'triangle';
        break;
      case 'crickets':
        oscillator.frequency.setValueAtTime(2000 + Math.random() * 1000, audioContext.currentTime);
        oscillator.type = 'square';
        break;
      default:
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.type = 'sine';
    }

    oscillator.connect(gainNode);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  const addNatureSounds = (audioContext: AudioContext) => {
    // Add subtle plant rustling based on plant count
    if (plantsCount > 0) {
      const rustleIntensity = Math.min(plantsCount / 10, 1);
      const interval = setInterval(() => {
        if (Math.random() < rustleIntensity * 0.1) {
          playRustleSound(audioContext);
        }
      }, 2000);
      
      intervalRefs.current.push(interval);
    }
  };

  const addPetSounds = (audioContext: AudioContext) => {
    pets.forEach(pet => {
      const interval = setInterval(() => {
        playPetSound(audioContext, pet.type);
      }, 5000 + Math.random() * 10000);
      
      intervalRefs.current.push(interval);
    });
  };

  const playRustleSound = (audioContext: AudioContext) => {
    const duration = 0.3 + Math.random() * 0.4;
    const gainNode = audioContext.createGain();
    const oscillator = audioContext.createOscillator();

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05 * volume, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(200 + Math.random() * 400, audioContext.currentTime);
    oscillator.type = 'sawtooth';
    oscillator.connect(gainNode);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  const playPetSound = (audioContext: AudioContext, petType: string) => {
    const duration = 0.2 + Math.random() * 0.3;
    const gainNode = audioContext.createGain();
    const oscillator = audioContext.createOscillator();

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1 * volume, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    gainNode.connect(audioContext.destination);

    switch (petType) {
      case 'butterfly':
        oscillator.frequency.setValueAtTime(800 + Math.random() * 400, audioContext.currentTime);
        oscillator.type = 'sine';
        break;
      case 'firefly':
        oscillator.frequency.setValueAtTime(1200 + Math.random() * 600, audioContext.currentTime);
        oscillator.type = 'triangle';
        break;
      case 'bird':
        oscillator.frequency.setValueAtTime(1500 + Math.random() * 1000, audioContext.currentTime);
        oscillator.type = 'sine';
        break;
      case 'bee':
        oscillator.frequency.setValueAtTime(300 + Math.random() * 200, audioContext.currentTime);
        oscillator.type = 'sawtooth';
        break;
      default:
        oscillator.frequency.setValueAtTime(600 + Math.random() * 400, audioContext.currentTime);
        oscillator.type = 'sine';
    }

    oscillator.connect(gainNode);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  const toggleMusic = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(event.target.value));
  };

  return (
    <div className="mood-music">
      <div className="music-controls">
        <button 
          className={`play-button ${isPlaying ? 'playing' : ''}`}
          onClick={toggleMusic}
          aria-label={isPlaying ? 'Pause ambient sounds' : 'Play ambient sounds'}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>
        
        <div className="volume-control">
          <label htmlFor="volume">🔉</label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
        
        {isPlaying && (
          <div className="soundscape-info">
            <span className="soundscape-name">{currentSoundscape}</span>
            <div className="sound-visualizer">
              <div className="sound-wave"></div>
              <div className="sound-wave"></div>
              <div className="sound-wave"></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="music-description">
        <p>🎵 Ambient sounds that change with your garden's weather and mood</p>
        {pets.length > 0 && (
          <p>🐾 Your garden pets add their own gentle sounds to the symphony</p>
        )}
      </div>
    </div>
  );
};

export default MoodMusic;
