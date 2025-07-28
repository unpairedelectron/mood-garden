import React, { useState, useEffect } from 'react';

interface ZenBreathingProps {
  isActive: boolean;
  zenMode: boolean;
}

const ZenBreathing: React.FC<ZenBreathingProps> = ({ isActive, zenMode }) => {
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [breathCount, setBreathCount] = useState(0);

  useEffect(() => {
    if (!isActive || !zenMode) return;

    const breathingCycle = () => {
      const phases = [
        { phase: 'inhale', duration: 4000 },
        { phase: 'hold', duration: 2000 },
        { phase: 'exhale', duration: 6000 },
        { phase: 'pause', duration: 2000 }
      ] as const;

      let currentPhaseIndex = 0;

      const nextPhase = () => {
        setBreathPhase(phases[currentPhaseIndex].phase);
        
        setTimeout(() => {
          currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
          if (currentPhaseIndex === 0) {
            setBreathCount(prev => prev + 1);
          }
          nextPhase();
        }, phases[currentPhaseIndex].duration);
      };

      nextPhase();
    };

    breathingCycle();
  }, [isActive, zenMode]);

  if (!isActive || !zenMode) return null;

  return (
    <div className="zen-breathing-guide">
      <div className={`breathing-circle ${breathPhase}`}>
        <div className="breathing-center">
          <span className="breath-text">
            {breathPhase === 'inhale' ? 'Breathe In' : 
             breathPhase === 'hold' ? 'Hold' :
             breathPhase === 'exhale' ? 'Breathe Out' : 'Rest'}
          </span>
        </div>
      </div>
      <div className="breath-counter">
        🧘‍♀️ Breath {breathCount}
      </div>
    </div>
  );
};

export default ZenBreathing;