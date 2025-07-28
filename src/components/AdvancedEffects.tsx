import React, { useState, useEffect, useCallback } from 'react';

interface AdvancedEffectsProps {
  isActive: boolean;
  playerPosition: { x: number; y: number };
  weatherType: string;
  timeOfDay: string;
  magicMode: boolean;
  zenMode: boolean;
}

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
}

interface SoundWave {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

const AdvancedEffects: React.FC<AdvancedEffectsProps> = ({
  isActive,
  playerPosition,
  weatherType,
  timeOfDay,
  magicMode,
  zenMode
}) => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [soundWaves, setSoundWaves] = useState<SoundWave[]>([]);
  const [auralField, setAuralField] = useState<string>('peaceful');

  // Inspirational messages that appear during meditation/interaction
  const inspirationalMessages = [
    "✨ You are growing beautifully",
    "🌟 Inner peace blooms within",
    "🌸 Breathe in serenity",
    "💖 Your heart is a garden",
    "🦋 Transform with grace",
    "🌿 Root deeply, reach high",
    "💫 You are exactly where you need to be",
    "🌺 Bloom in your own time",
    "🕊️ Peace flows through you",
    "🌙 Trust your inner wisdom"
  ];

  const zenMessages = [
    "🧘‍♀️ Present moment awareness",
    "🌊 Like water, flow gently",
    "🕯️ Inner light shines bright",
    "🌱 Growth happens in stillness",
    "💎 You are perfectly whole",
    "🦢 Grace in every breath",
    "🌈 Colors of the soul",
    "⭐ Connected to all life"
  ];

  const magicMessages = [
    "✨ Magic flows through you",
    "🌟 Stardust in your veins",
    "🔮 Infinite possibilities",
    "🎭 Create your reality",
    "🌠 Dreams become reality",
    "💫 You are pure magic",
    "🎨 Paint with your soul",
    "🦄 Believe in wonder"
  ];

  // Create floating inspirational text
  const createFloatingText = useCallback((text: string, x: number, y: number, color: string = '#FFD700') => {
    const newText: FloatingText = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 10,
      color,
      life: 0,
      maxLife: 180 // 3 seconds at 60fps
    };
    
    setFloatingTexts(prev => [...prev, newText]);
  }, []);

  // Create sound wave visualization
  const createSoundWave = useCallback((x: number, y: number) => {
    const newWave: SoundWave = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      radius: 0,
      maxRadius: 100,
      life: 0,
      maxLife: 120
    };
    
    setSoundWaves(prev => [...prev, newWave]);
  }, []);

  // Generate periodic inspirational messages based on mode
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      let messages = inspirationalMessages;
      let color = '#FFD700';
      
      if (zenMode) {
        messages = zenMessages;
        color = '#E6E6FA';
      } else if (magicMode) {
        messages = magicMessages;
        color = '#FF69B4';
      }

      // Random chance to show a message
      if (Math.random() < 0.3) {
        const message = messages[Math.floor(Math.random() * messages.length)];
        createFloatingText(
          message,
          playerPosition.x + (Math.random() - 0.5) * 30,
          playerPosition.y - 20,
          color
        );
      }

      // Create sound waves for zen mode
      if (zenMode && Math.random() < 0.2) {
        createSoundWave(playerPosition.x, playerPosition.y);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isActive, zenMode, magicMode, playerPosition, createFloatingText, createSoundWave]);

  // Update floating texts
  useEffect(() => {
    const updateFloatingTexts = () => {
      setFloatingTexts(prev => prev
        .map(text => ({
          ...text,
          y: text.y - 0.5, // Float upward
          life: text.life + 1
        }))
        .filter(text => text.life < text.maxLife)
      );
    };

    const interval = setInterval(updateFloatingTexts, 16); // 60fps
    return () => clearInterval(interval);
  }, []);

  // Update sound waves
  useEffect(() => {
    const updateSoundWaves = () => {
      setSoundWaves(prev => prev
        .map(wave => ({
          ...wave,
          radius: (wave.life / wave.maxLife) * wave.maxRadius,
          life: wave.life + 1
        }))
        .filter(wave => wave.life < wave.maxLife)
      );
    };

    const interval = setInterval(updateSoundWaves, 16); // 60fps
    return () => clearInterval(interval);
  }, []);

  // Aural field changes based on context
  useEffect(() => {
    if (zenMode) {
      setAuralField('zen');
    } else if (magicMode) {
      setAuralField('magical');
    } else if (weatherType === 'rainy') {
      setAuralField('cleansing');
    } else if (timeOfDay === 'night') {
      setAuralField('mystical');
    } else {
      setAuralField('peaceful');
    }
  }, [zenMode, magicMode, weatherType, timeOfDay]);

  if (!isActive) return null;

  return (
    <div className="advanced-effects-layer" style={{ 
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 1500
    }}>
      {/* Aural field background effect */}
      <div 
        className={`aural-field aural-${auralField}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: getAuralFieldGradient(auralField),
          opacity: 0.1,
          animation: 'aural-pulse 8s ease-in-out infinite',
          transformOrigin: `${playerPosition.x}% ${playerPosition.y}%`
        }}
      />

      {/* Floating inspirational texts */}
      {floatingTexts.map(text => (
        <div
          key={text.id}
          className="floating-text"
          style={{
            position: 'absolute',
            left: `${text.x}%`,
            top: `${text.y}%`,
            color: text.color,
            fontSize: '1rem',
            fontWeight: 'bold',
            textShadow: `0 0 10px ${text.color}`,
            opacity: 1 - (text.life / text.maxLife),
            transform: `translateX(-50%) scale(${1 + (text.life / text.maxLife) * 0.5})`,
            transition: 'none',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            textAlign: 'center'
          }}
        >
          {text.text}
        </div>
      ))}

      {/* Sound wave visualizations */}
      {soundWaves.map(wave => (
        <div
          key={wave.id}
          className="sound-wave"
          style={{
            position: 'absolute',
            left: `${wave.x}%`,
            top: `${wave.y}%`,
            width: `${wave.radius}px`,
            height: `${wave.radius}px`,
            border: '2px solid rgba(230, 230, 250, 0.6)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 1 - (wave.life / wave.maxLife),
            boxShadow: '0 0 20px rgba(230, 230, 250, 0.3)'
          }}
        />
      ))}

      {/* Enhanced weather-specific effects */}
      {weatherType === 'sunset' && (
        <div 
          className="golden-hour-rays"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(45deg, transparent 40%, rgba(255, 215, 0, 0.1) 50%, transparent 60%)',
            animation: 'light-rays 10s ease-in-out infinite'
          }}
        />
      )}

      {weatherType === 'misty' && (
        <div 
          className="mystical-fog"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
            animation: 'fog-drift 15s ease-in-out infinite'
          }}
        />
      )}

      {/* Magic mode special effects */}
      {magicMode && (
        <>
          <div 
            className="magic-sparkles"
            style={{
              position: 'absolute',
              left: `${playerPosition.x}%`,
              top: `${playerPosition.y}%`,
              width: '100px',
              height: '100px',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(255, 105, 180, 0.3), transparent)',
              borderRadius: '50%',
              animation: 'magic-sparkle 2s ease-in-out infinite'
            }}
          />
          <div 
            className="magic-constellation"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                          radial-gradient(2px 2px at 40px 70px, #fff, transparent),
                          radial-gradient(1px 1px at 90px 40px, #fff, transparent),
                          radial-gradient(1px 1px at 130px 80px, #fff, transparent),
                          radial-gradient(2px 2px at 160px 30px, #fff, transparent)`,
              backgroundRepeat: 'repeat',
              backgroundSize: '200px 100px',
              animation: 'stars-twinkle 4s ease-in-out infinite',
              opacity: 0.6
            }}
          />
        </>
      )}

      {/* Zen mode special effects */}
      {zenMode && (
        <>
          <div 
            className="zen-ripples"
            style={{
              position: 'absolute',
              left: `${playerPosition.x}%`,
              top: `${playerPosition.y}%`,
              width: '200px',
              height: '200px',
              transform: 'translate(-50%, -50%)',
              border: '1px solid rgba(230, 230, 250, 0.3)',
              borderRadius: '50%',
              animation: 'zen-ripple 6s ease-out infinite'
            }}
          />
          <div 
            className="zen-mandalas"
            style={{
              position: 'absolute',
              top: '10%',
              right: '10%',
              width: '60px',
              height: '60px',
              background: 'radial-gradient(circle, transparent 30%, rgba(230, 230, 250, 0.2) 31%, rgba(230, 230, 250, 0.2) 35%, transparent 36%)',
              borderRadius: '50%',
              animation: 'mandala-rotate 20s linear infinite',
              opacity: 0.7
            }}
          />
        </>
      )}

      <style>{`
        @keyframes aural-pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.2; }
        }

        @keyframes light-rays {
          0%, 100% { transform: translateX(-100px); opacity: 0.3; }
          50% { transform: translateX(100px); opacity: 0.1; }
        }

        @keyframes fog-drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(50px); }
        }

        @keyframes magic-sparkle {
          0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          50% { transform: translate(-50%, -50%) scale(1.3) rotate(180deg); }
        }

        @keyframes stars-twinkle {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes zen-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }

        @keyframes mandala-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Helper function to get aural field gradient
const getAuralFieldGradient = (fieldType: string): string => {
  const gradients = {
    zen: 'radial-gradient(circle, rgba(230, 230, 250, 0.3), rgba(147, 112, 219, 0.1), transparent)',
    magical: 'radial-gradient(circle, rgba(255, 105, 180, 0.3), rgba(138, 43, 226, 0.1), transparent)',
    cleansing: 'radial-gradient(circle, rgba(135, 206, 235, 0.3), rgba(70, 130, 180, 0.1), transparent)',
    mystical: 'radial-gradient(circle, rgba(25, 25, 112, 0.3), rgba(72, 61, 139, 0.1), transparent)',
    peaceful: 'radial-gradient(circle, rgba(144, 238, 144, 0.3), rgba(34, 139, 34, 0.1), transparent)'
  };
  
  return gradients[fieldType as keyof typeof gradients] || gradients.peaceful;
};

export default AdvancedEffects;
