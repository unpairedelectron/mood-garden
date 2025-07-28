import React, { useState, useEffect } from 'react';

const FinalPlatformDemo: React.FC = () => {
  const [demoLogs, setDemoLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [platformState, setPlatformState] = useState({
    isInitialized: false,
    biometricActive: false,
    safetyStatus: 'safe' as const,
    sessionActive: false,
    communityConnected: false,
    currentBiome: 'healing_sanctuary'
  });

  const addLog = (message: string) => {
    setDemoLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addLog('🚀 MoodGarden Complete Platform initialized');
    addLog('📋 All Weeks 7-12 services ready for demonstration');
    setPlatformState(prev => ({ ...prev, isInitialized: true }));
  }, []);

  const simulateWeek7Demo = async () => {
    addLog('📊 WEEK 7: Advanced Biometric Integration');
    setPlatformState(prev => ({ ...prev, biometricActive: true }));
    
    // Simulate biometric data processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('🧬 BiometricControlService: Heart rate variability analyzed');
    addLog('⚡ ML emotion recognition: Anxiety detected (confidence: 87%)');
    addLog('🎯 Adaptive response triggered: Calming environment activated');
    addLog('📈 Real-time stress indicators: 3 detected, interventions applied');
  };

  const simulateWeek8Demo = async () => {
    addLog('🎮 WEEK 8: CBT/DBT Gamified Therapy');
    setPlatformState(prev => ({ ...prev, sessionActive: true }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('🧠 CBTDBTGamificationService: Personalized session started');
    addLog('📝 Interactive exercise: Thought record completed');
    addLog('🏆 XP earned: +50 points, badge unlocked: "Mindful Observer"');
    addLog('📊 Skill progression: Thought awareness +15%, Mindfulness +12%');
    addLog('🎯 Difficulty auto-adjusted based on performance');
  };

  const simulateWeek9Demo = async () => {
    addLog('🛡️ WEEK 9: Trauma-Informed Safety Protocols');
    setPlatformState(prev => ({ ...prev, safetyStatus: 'concerning' }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('🚨 TraumaInformedService: Potential trigger detected in text input');
    addLog('🛡️ Safety profile activated: Content filtering applied');
    addLog('🌱 Grounding resource deployed: 5-4-3-2-1 sensory technique');
    addLog('📞 Emergency protocols: On standby, contact list ready');
    addLog('✅ User stabilized, safety status returning to normal');
    setPlatformState(prev => ({ ...prev, safetyStatus: 'safe' }));
  };

  const simulateWeek10Demo = async () => {
    addLog('🤝 WEEK 10: Social Healing & Community Support');
    setPlatformState(prev => ({ ...prev, communityConnected: true }));
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('👥 SocialHealingService: Compatible peer matched for anxiety support');
    addLog('💬 Peer support session initiated: Mutual check-in protocol');
    addLog('🏛️ Community space accessed: Healing Circle for trauma survivors');
    addLog('🔒 Privacy-first interactions: All data encrypted and anonymized');
    addLog('🌟 Healing activity completed: Group mindfulness session');
  };

  const simulateWeek11Demo = async () => {
    addLog('🧠 WEEK 11: Advanced AI Analytics & Insights');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('🔍 AdvancedAIService: Multi-modal analysis complete');
    addLog('📊 Pattern recognition: 35% stress reduction over 2 weeks');
    addLog('🎯 Personalized recommendations generated:');
    addLog('   • Continue breathing exercises (85% effectiveness)');
    addLog('   • Increase peer support engagement (optimal timing identified)');
    addLog('   • Plant care activity recommended for mood boost');
    addLog('🌱 AI plant evolution: "Resilience Oak" - Stage 3 unlocked');
  };

  const simulateWeek12Demo = async () => {
    addLog('🏥 WEEK 12: Clinical Integration & Validation');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('📋 Clinical progress report generated');
    addLog('📈 Outcomes: 35% stress reduction, 28% sleep improvement');
    addLog('🧠 CBT skills mastery: 70%, DBT application: 60%');
    addLog('🛡️ Safety incidents: 3 detected, 3 successfully managed');
    addLog('🤝 Social engagement: 4 peer connections, 8 support sessions');
    addLog('⚕️ Healthcare provider dashboard: Ready for clinical review');
    addLog('🎉 Clinical validation: Platform meets therapeutic efficacy standards');
  };

  const runComprehensiveDemo = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    addLog('🎬 Starting comprehensive platform demonstration...');
    
    const weeks = [
      simulateWeek7Demo,
      simulateWeek8Demo,
      simulateWeek9Demo,
      simulateWeek10Demo,
      simulateWeek11Demo,
      simulateWeek12Demo
    ];

    for (let i = 0; i < weeks.length; i++) {
      setCurrentWeek(i + 7);
      await weeks[i]();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Final integration
    addLog('🌟 PLATFORM INTEGRATION COMPLETE');
    addLog('🚀 All systems operational: Biometrics ✓ Therapy ✓ Safety ✓ Community ✓ AI ✓ Clinical ✓');
    addLog('🎯 MoodGarden: Next-generation therapeutic platform ready for deployment');
    
    // Transform to celebration biome
    setPlatformState(prev => ({ ...prev, currentBiome: 'triumph_meadow' }));
    addLog('🌅 Garden transformed to Triumph Meadow - celebrating your journey!');
    
    setIsRunning(false);
    setCurrentWeek(0);
  };

  const weekFeatures = [
    {
      week: 7,
      title: 'Advanced Biometric Integration',
      features: [
        'ML-driven emotion recognition from voice & facial analysis',
        'Real-time biometric monitoring (heart rate, stress, sleep)',
        'Adaptive garden responses to physiological state',
        'Predictive stress detection and intervention'
      ]
    },
    {
      week: 8,
      title: 'CBT/DBT Gamified Therapy',
      features: [
        'Interactive cognitive behavioral therapy exercises',
        'Dialectical behavior therapy skill-building games',
        'Progressive difficulty with AI adaptation',
        'Achievement system with badges and XP'
      ]
    },
    {
      week: 9,
      title: 'Trauma-Informed Safety Protocols',
      features: [
        'Trigger detection and content filtering',
        'Crisis intervention and grounding resources',
        'Safety-first design with user control',
        'Emergency contact and professional support integration'
      ]
    },
    {
      week: 10,
      title: 'Social Healing & Community',
      features: [
        'Peer support matching algorithms',
        'Moderated healing community spaces',
        'Group therapy and mutual aid activities',
        'Privacy-first social interactions'
      ]
    },
    {
      week: 11,
      title: 'Advanced AI Analytics',
      features: [
        'Comprehensive progress tracking and pattern analysis',
        'Personalized intervention recommendations',
        'Predictive wellness insights',
        'AI-driven plant evolution based on therapeutic progress'
      ]
    },
    {
      week: 12,
      title: 'Clinical Integration & Validation',
      features: [
        'Healthcare provider dashboard and reporting',
        'Clinical outcome measurement and validation',
        'Professional consultation integration',
        'Regulatory compliance and data security'
      ]
    }
  ];

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .pulse { animation: pulse 2s infinite; }
        
        .week-progress {
          background: linear-gradient(90deg, #4CAF50 ${((currentWeek - 6) / 6) * 100}%, transparent ${((currentWeek - 6) / 6) * 100}%);
          height: 8px;
          border-radius: 4px;
          margin: 10px 0;
        }
      `}</style>

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '30px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          fontSize: '3em',
          fontWeight: 'bold',
          marginBottom: '10px',
          background: 'linear-gradient(45deg, #ffd700, #ffb347)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          MoodGarden Complete Platform
        </h1>
        <p style={{ fontSize: '1.3em', opacity: 0.9, marginBottom: '20px' }}>
          Weeks 7-12 Implementation: The Future of Digital Mental Health
        </p>
        <p style={{ opacity: 0.8, fontSize: '1.1em' }}>
          Advanced Biometrics • CBT/DBT Gamification • Trauma-Informed Care • Social Healing • AI Analytics • Clinical Integration
        </p>
      </div>

      {/* Demo Control */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>🎬 Platform Demo</h3>
          <button
            onClick={runComprehensiveDemo}
            disabled={!platformState.isInitialized || isRunning}
            style={{
              background: isRunning ? '#666' : 'linear-gradient(45deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              fontSize: '1.1em',
              borderRadius: '10px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              width: '100%',
              transition: 'all 0.3s ease'
            }}
          >
            {isRunning ? (
              <>
                <span className="pulse">🔄</span> Running Week {currentWeek} Demo...
              </>
            ) : (
              '🚀 Start Comprehensive Demo'
            )}
          </button>
          {isRunning && (
            <div className="week-progress" style={{ marginTop: '10px' }}></div>
          )}
          <p style={{ fontSize: '0.9em', opacity: 0.8, margin: '10px 0' }}>
            Demonstrates all weeks 7-12 features in sequence
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>📊 Platform Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Biometric Monitoring</div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#ffd700' }}>
                {platformState.biometricActive ? '📊 Active' : '⭕ Inactive'}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Safety Status</div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#ffd700' }}>
                {platformState.safetyStatus === 'safe' ? '🛡️ Safe' : 
                 platformState.safetyStatus === 'concerning' ? '⚠️ Monitoring' : '🚨 Alert'}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Therapy Session</div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#ffd700' }}>
                {platformState.sessionActive ? '🎯 Active' : '⭕ Inactive'}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>Community</div>
              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#ffd700' }}>
                {platformState.communityConnected ? '🤝 Connected' : '⭕ Offline'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Week Features */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '20px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ color: '#ffd700', marginBottom: '20px' }}>🚀 Implemented Features (Weeks 7-12)</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '15px'
        }}>
          {weekFeatures.map((week) => (
            <div
              key={week.week}
              style={{
                background: currentWeek === week.week ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '15px',
                borderLeft: `4px solid ${currentWeek === week.week ? '#ffd700' : 'rgba(255, 215, 0, 0.5)'}`,
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{
                fontWeight: 'bold',
                color: currentWeek === week.week ? '#ffd700' : '#ffeb3b',
                marginBottom: '8px',
                fontSize: '1.1em'
              }}>
                {currentWeek === week.week && <span className="pulse">🔄 </span>}
                Week {week.week}: {week.title}
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em', opacity: 0.9 }}>
                {week.features.map((feature, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Log */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '15px',
        padding: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>📋 Platform Activity Log</h3>
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          fontSize: '0.9em',
          fontFamily: "'Courier New', monospace"
        }}>
          {demoLogs.length === 0 ? (
            <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
              Platform ready. Click "Start Comprehensive Demo" to begin.
            </div>
          ) : (
            demoLogs.map((log, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  opacity: index === 0 ? 1 : Math.max(0.3, 1 - (index * 0.1))
                }}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Current Biome Display */}
      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        backdropFilter: 'blur(10px)'
      }}>
        <h4 style={{ color: '#ffd700', marginBottom: '10px' }}>🌿 Current Garden Biome</h4>
        <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>
          {platformState.currentBiome.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
        <p style={{ opacity: 0.8, fontSize: '0.9em', margin: '10px 0 0 0' }}>
          Your therapeutic garden evolves based on your progress and emotional state
        </p>
      </div>
    </div>
  );
};

export default FinalPlatformDemo;
