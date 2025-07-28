import React, { useState, useEffect, useRef } from 'react';
import { BiometricControlService } from './services/BiometricControlService';
import { CBTDBTGamificationService } from './services/CBTDBTGamificationService';
import { TraumaInformedService } from './services/TraumaInformedService';
import { SocialHealingService } from './services/SocialHealingService';
import { AdvancedAIService } from './services/AdvancedAIService';
import { ProceduralPlantService } from './services/ProceduralPlantService';
import { PhotorealisticBiomeEngine } from './services/PhotorealisticBiomeEngine';
import { MetaHumanCompanionService } from './services/MetaHumanCompanionService';

interface FinalPlatformState {
  // Core platform state
  isInitialized: boolean;
  currentUser: string;
  platformMode: 'garden' | 'therapy' | 'community' | 'analytics';
  
  // Biometric monitoring
  biometricActive: boolean;
  currentBiometrics: any;
  adaptiveResponse: any;
  
  // Therapeutic session
  activeSession: any;
  sessionProgress: number;
  currentExercise: any;
  
  // Safety monitoring
  safetyStatus: 'safe' | 'concerning' | 'alert' | 'crisis';
  activeProtocols: string[];
  
  // Community features
  communityConnected: boolean;
  peerSupport: any;
  
  // AI insights
  aiInsights: any;
  personalizedRecommendations: string[];
  
  // Garden state
  currentBiome: string;
  plantEvolution: any;
  companionActive: any;
}

const FinalPlatformDemo: React.FC = () => {
  // Service instances
  const biometricService = useRef(new BiometricControlService());
  const therapyService = useRef(new CBTDBTGamificationService());
  const traumaService = useRef(new TraumaInformedService());
  const socialService = useRef(new SocialHealingService());
  const aiService = useRef(new AdvancedAIService());
  const plantService = useRef(new ProceduralPlantService());
  const biomeEngine = useRef(new PhotorealisticBiomeEngine());
  const companionService = useRef(new MetaHumanCompanionService());
  const graphicsEngine = useRef(new AdvancedGraphicsEngine());

  // Platform state
  const [platformState, setPlatformState] = useState<FinalPlatformState>({
    isInitialized: false,
    currentUser: 'demo_user_001',
    platformMode: 'garden',
    biometricActive: false,
    currentBiometrics: null,
    adaptiveResponse: null,
    activeSession: null,
    sessionProgress: 0,
    currentExercise: null,
    safetyStatus: 'safe',
    activeProtocols: [],
    communityConnected: false,
    peerSupport: null,
    aiInsights: null,
    personalizedRecommendations: [],
    currentBiome: 'healing_sanctuary',
    plantEvolution: null,
    companionActive: null
  });

  // Demo data and logs
  const [demoLogs, setDemoLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Add log entry
  const addLog = (message: string) => {
    setDemoLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 19)]);
  };

  // Initialize platform
  useEffect(() => {
    const initializePlatform = async () => {
      try {
        addLog('🚀 Initializing MoodGarden Complete Platform...');
        
        // Initialize all services
        await biometricService.current.startBiometricMonitoring();
        addLog('✅ Biometric monitoring initialized');
        
        // Create safety profile
        await traumaService.current.createSafetyProfile(platformState.currentUser, {
          acknowledged: true,
          trigger_categories: ['medical', 'loss'],
          preferences: {
            trigger_warning_level: 'medium',
            content_filtering_level: 'moderate',
            safe_word_enabled: true
          }
        });
        addLog('🛡️ Trauma-informed safety profile created');
        
        // Initialize therapeutic framework
        await therapyService.current.getUserSkillAssessment(platformState.currentUser);
        addLog('🧠 CBT/DBT therapeutic framework initialized');
        
        // Connect to community
        await socialService.current.createCommunityProfile(platformState.currentUser, {
          display_name: 'Garden Explorer',
          privacy_preferences: {
            sharing_level: 'selective',
            peer_support_enabled: true,
            progress_visibility: 'friends_only'
          }
        });
        addLog('🤝 Social healing community connected');
        
        // Initialize garden environment
        const biome = await biomeEngine.current.generatePhotorealisticBiome({
          biomeType: 'healing_sanctuary',
          weatherCondition: 'gentle_rain',
          timeOfDay: 'golden_hour',
          seasonalFactor: 0.7,
          moodInfluence: { calm: 0.8, hope: 0.6, peace: 0.9 },
          userPreferences: { lighting_warmth: 0.8, nature_density: 0.9 }
        });
        addLog('🌿 Photorealistic healing sanctuary generated');
        
        // Activate MetaHuman companion
        const companion = await companionService.current.activateCompanion('sage_elena', {
          user_mood: { calm: 0.8, hope: 0.6 },
          interaction_context: 'first_session',
          privacy_settings: { voice_enabled: true, emotion_detection: true }
        });
        addLog('👥 MetaHuman companion "Sage Elena" activated');
        
        setPlatformState(prev => ({
          ...prev,
          isInitialized: true,
          currentBiome: biome.biome_type,
          companionActive: companion
        }));
        
        addLog('🎯 Platform initialization complete - Ready for comprehensive demo');
        
      } catch (error) {
        addLog(`❌ Initialization error: ${error}`);
      }
    };

    initializePlatform();
  }, []);

  // Start comprehensive demo
  const startComprehensiveDemo = async () => {
    if (!platformState.isInitialized) return;
    
    setIsRunning(true);
    addLog('🎬 Starting comprehensive platform demonstration...');
    
    try {
      // Week 7: Advanced Biometric Analysis
      addLog('📊 WEEK 7: Advanced Biometric Integration');
      
      const mockBiometricData = {
        heartRate: 85,
        heartRateVariability: 45,
        breathingRate: 16,
        breathingPattern: 'regular' as const,
        stressScore: 0.4,
        sleepQuality: 0.7,
        skinTemperature: 98.2,
        timestamp: new Date(),
        deviceSource: 'apple_watch'
      };
      
      const emotionAnalysis = await biometricService.current.analyzeBiometricInput({
        text: "I'm feeling a bit anxious about my presentation tomorrow",
        biometric: mockBiometricData,
        privacy: {
          dataSharing: {
            therapistAccess: false,
            anonymousResearch: true,
            communitySharing: false
          },
          biometricCollection: {
            heartRate: true,
            breathingPattern: true,
            sleepData: true,
            locationTracking: false
          },
          aiProcessing: {
            localOnly: false,
            cloudAnalytics: true,
            personalizedContent: true
          },
          retentionPeriod: 90,
          exportRights: true,
          deletionRights: true
        }
      });
      
      setPlatformState(prev => ({
        ...prev,
        biometricActive: true,
        currentBiometrics: mockBiometricData,
        adaptiveResponse: emotionAnalysis
      }));
      
      addLog(`🧬 Emotion detected: ${emotionAnalysis.primary_emotion} (${(emotionAnalysis.confidence * 100).toFixed(1)}% confidence)`);
      addLog(`⚡ Therapeutic priority: ${emotionAnalysis.therapeutic_priority}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Week 8: CBT/DBT Gamified Session
      addLog('🎮 WEEK 8: CBT/DBT Gamified Therapy Session');
      
      const therapeuticSession = await therapyService.current.startPersonalizedSession(
        platformState.currentUser,
        {
          skill_focus: 'thought_awareness',
          session_length: 15,
          difficulty_preference: 'beginner',
          biometric_data: mockBiometricData
        }
      );
      
      setPlatformState(prev => ({
        ...prev,
        activeSession: therapeuticSession,
        sessionProgress: 0.3
      }));
      
      addLog(`🎯 Therapeutic session started: ${therapeuticSession.skill_focus}`);
      addLog(`📈 Difficulty adapted to: ${therapeuticSession.difficulty_level}`);
      
      // Simulate exercise completion
      const exerciseResult = await therapyService.current.executeInteractiveExercise(
        therapeuticSession.session_id,
        'thought_record_basic',
        {
          situation: 'Upcoming presentation at work',
          emotion_intensity: 7,
          automatic_thought: 'Everyone will think I\'m incompetent'
        }
      );
      
      addLog(`💡 Exercise completed: ${exerciseResult.feedback}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Week 9: Trauma-Informed Safety Monitoring
      addLog('🛡️ WEEK 9: Trauma-Informed Safety Protocols');
      
      const safetyMonitoring = await traumaService.current.monitorSafetyIndicators(
        platformState.currentUser,
        {
          text: "I had a difficult memory surface today",
          biometric: { ...mockBiometricData, stressScore: 0.7 },
          privacy: {
            dataSharing: {
              therapistAccess: false,
              anonymousResearch: true,
              communitySharing: false
            },
            biometricCollection: {
              heartRate: true,
              breathingPattern: true,
              sleepData: true,
              locationTracking: false
            },
            aiProcessing: {
              localOnly: false,
              cloudAnalytics: true,
              personalizedContent: true
            },
            retentionPeriod: 90,
            exportRights: true,
            deletionRights: true
          }
        }
      );
      
      setPlatformState(prev => ({
        ...prev,
        safetyStatus: safetyMonitoring.safety_status,
        activeProtocols: safetyMonitoring.triggered_protocols
      }));
      
      addLog(`🚨 Safety status: ${safetyMonitoring.safety_status}`);
      addLog(`🎯 Recommended interventions: ${safetyMonitoring.recommended_interventions.join(', ')}`);
      
      // Activate grounding resource if needed
      if (safetyMonitoring.safety_status !== 'safe') {
        const groundingResource = await traumaService.current.activateGroundingResource(
          '5_4_3_2_1_sensory',
          platformState.currentUser
        );
        addLog(`🌱 Grounding technique activated: ${groundingResource.resource.name}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Week 10: Social Healing Features
      addLog('🤝 WEEK 10: Social Healing & Community Support');
      
      const peerConnection = await socialService.current.findCompatiblePeers(
        platformState.currentUser,
        {
          support_type: 'anxiety_management',
          interaction_preference: 'text_based',
          experience_level: 'similar',
          availability: 'flexible'
        }
      );
      
      const supportSession = await socialService.current.initiatePeerSupport(
        platformState.currentUser,
        peerConnection[0]?.user_id || 'peer_001',
        {
          session_type: 'mutual_check_in',
          privacy_level: 'moderate',
          duration_preference: 'short'
        }
      );
      
      setPlatformState(prev => ({
        ...prev,
        communityConnected: true,
        peerSupport: supportSession
      }));
      
      addLog(`👥 Connected with compatible peer for anxiety management support`);
      addLog(`💬 Peer support session initiated: ${supportSession.session_type}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Week 11: Advanced AI Insights & Analytics
      addLog('🧠 WEEK 11: Advanced AI Analytics & Insights');
      
      const comprehensiveAnalysis = await aiService.current.analyzeAdvancedMoodWithAI({
        text: "I've been practicing the breathing exercises and they're really helping",
        context: {
          recent_sessions: [therapeuticSession],
          biometric_trends: [mockBiometricData],
          social_interactions: [supportSession],
          safety_incidents: []
        },
        timestamp: new Date(),
        privacy: {
          dataSharing: {
            therapistAccess: false,
            anonymousResearch: true,
            communitySharing: false
          },
          biometricCollection: {
            heartRate: true,
            breathingPattern: true,
            sleepData: true,
            locationTracking: false
          },
          aiProcessing: {
            localOnly: false,
            cloudAnalytics: true,
            personalizedContent: true
          },
          retentionPeriod: 90,
          exportRights: true,
          deletionRights: true
        }
      });
      
      setPlatformState(prev => ({
        ...prev,
        aiInsights: comprehensiveAnalysis,
        personalizedRecommendations: comprehensiveAnalysis.recommendedInterventions
      }));
      
      addLog(`📊 AI Analysis: ${comprehensiveAnalysis.primaryEmotion} with ${comprehensiveAnalysis.therapeuticPriority} priority`);
      addLog(`🎯 Personalized recommendations: ${comprehensiveAnalysis.recommendedInterventions.slice(0, 2).join(', ')}`);
      
      // Generate evolved plant based on progress
      const evolvedPlant = await plantService.current.generateProceduralPlant({
        moodHistory: [comprehensiveAnalysis],
        therapeuticProgress: {
          cbt_skills: { thought_awareness: 0.7 },
          dbt_skills: { mindfulness: 0.6 },
          overall_resilience: 0.65
        },
        biometricTrends: { stress_reduction: 0.4, sleep_improvement: 0.3 },
        userPreferences: { plant_type: 'flowering_tree', growth_speed: 'moderate' },
        environmentalFactors: { season: 'spring', weather: 'sunny' }
      });
      
      setPlatformState(prev => ({
        ...prev,
        plantEvolution: evolvedPlant
      }));
      
      addLog(`🌳 Plant evolved: ${evolvedPlant.species_name} - ${evolvedPlant.evolutionary_stage.name}`);
      addLog(`✨ New therapeutic features unlocked: ${evolvedPlant.therapeutic_properties.metaphors.slice(0, 2).join(', ')}`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Week 12: Integration & Clinical Validation
      addLog('🏥 WEEK 12: Clinical Integration & Validation');
      
      // Generate comprehensive progress report
      const progressReport = {
        user_id: platformState.currentUser,
        assessment_period: '30_days',
        biometric_improvements: {
          stress_reduction: '35%',
          sleep_quality: '28%',
          heart_rate_variability: '15%'
        },
        therapeutic_progress: {
          cbt_skills_mastery: '70%',
          dbt_skills_application: '60%',
          coping_strategy_effectiveness: '85%'
        },
        safety_incidents: {
          total_triggers_detected: 3,
          successful_interventions: 3,
          escalations_required: 0
        },
        social_engagement: {
          peer_connections_made: 4,
          support_sessions_completed: 8,
          community_contributions: 12
        },
        clinical_recommendations: [
          'Continue current CBT/DBT skill development',
          'Increase peer support engagement',
          'Monitor stress response patterns',
          'Consider professional consultation for trauma processing'
        ]
      };
      
      addLog('📋 Clinical progress report generated');
      addLog(`📈 Stress reduction: ${progressReport.biometric_improvements.stress_reduction}`);
      addLog(`🧠 CBT skills mastery: ${progressReport.therapeutic_progress.cbt_skills_mastery}`);
      addLog(`🛡️ Safety interventions: ${progressReport.safety_incidents.successful_interventions}/${progressReport.safety_incidents.total_triggers_detected} successful`);
      
      // Final integration - adaptive garden response
      const finalAdaptation = await biomeEngine.current.generatePhotorealisticBiome({
        biomeType: 'triumph_meadow',
        weatherCondition: 'golden_sunlight',
        timeOfDay: 'sunrise',
        seasonalFactor: 0.9,
        moodInfluence: { joy: 0.8, pride: 0.7, hope: 0.9, peace: 0.8 },
        userPreferences: { lighting_warmth: 0.9, celebration_elements: 0.8 }
      });
      
      addLog('🌅 Garden transformed to Triumph Meadow - celebrating your progress!');
      addLog('🎉 COMPREHENSIVE PLATFORM DEMONSTRATION COMPLETE');
      addLog('🌟 All weeks 7-12 features successfully integrated and demonstrated');
      
      setPlatformState(prev => ({
        ...prev,
        currentBiome: finalAdaptation.biome_type
      }));
      
    } catch (error) {
      addLog(`❌ Demo error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const switchPlatformMode = (mode: 'garden' | 'therapy' | 'community' | 'analytics') => {
    setPlatformState(prev => ({ ...prev, platformMode: mode }));
    addLog(`🔄 Switched to ${mode} mode`);
  };

  return (
    <div className="final-platform-demo">
      <style>{`
        .final-platform-demo {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: white;
        }
        
        .platform-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        
        .platform-title {
          font-size: 3em;
          font-weight: bold;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #ffd700, #ffb347);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .platform-subtitle {
          font-size: 1.3em;
          opacity: 0.9;
          margin-bottom: 20px;
        }
        
        .platform-controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .control-section {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 20px;
          backdrop-filter: blur(10px);
        }
        
        .section-title {
          font-size: 1.4em;
          font-weight: bold;
          margin-bottom: 15px;
          color: #ffd700;
        }
        
        .demo-button {
          background: linear-gradient(45deg, #4CAF50, #45a049);
          color: white;
          border: none;
          padding: 15px 30px;
          font-size: 1.1em;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          margin-bottom: 10px;
        }
        
        .demo-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        
        .demo-button:disabled {
          background: #666;
          cursor: not-allowed;
          transform: none;
        }
        
        .mode-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .mode-button {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid transparent;
          padding: 10px 15px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9em;
        }
        
        .mode-button.active {
          background: linear-gradient(45deg, #ff6b6b, #ee5a24);
          border-color: #fff;
        }
        
        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .status-card {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }
        
        .status-label {
          font-size: 0.9em;
          opacity: 0.8;
          margin-bottom: 5px;
        }
        
        .status-value {
          font-size: 1.2em;
          font-weight: bold;
          color: #ffd700;
        }
        
        .demo-logs {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 15px;
          padding: 20px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .log-entry {
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        
        .log-entry:last-child {
          border-bottom: none;
        }
        
        .weeks-showcase {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .weeks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }
        
        .week-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          border-left: 4px solid #ffd700;
        }
        
        .week-title {
          font-weight: bold;
          color: #ffd700;
          margin-bottom: 8px;
        }
        
        .week-features {
          font-size: 0.9em;
          opacity: 0.9;
          line-height: 1.4;
        }
        
        .running-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          background: #4CAF50;
          border-radius: 50%;
          margin-right: 10px;
          animation: pulse 1.5s ease-in-out infinite alternate;
        }
        
        @keyframes pulse {
          from { opacity: 1; }
          to { opacity: 0.3; }
        }
      `}</style>

      <div className="platform-header">
        <h1 className="platform-title">MoodGarden Complete Platform</h1>
        <p className="platform-subtitle">
          Advanced AI-Powered Therapeutic Garden Experience
        </p>
        <p style={{ opacity: 0.8, fontSize: '1.1em' }}>
          Weeks 7-12 Implementation: Biometrics, CBT/DBT, Trauma-Informed Care, Social Healing, AI Analytics & Clinical Integration
        </p>
      </div>

      <div className="weeks-showcase">
        <div className="section-title">🚀 Implemented Features (Weeks 7-12)</div>
        <div className="weeks-grid">
          <div className="week-card">
            <div className="week-title">Week 7: Advanced Biometrics</div>
            <div className="week-features">
              ML emotion recognition, real-time adaptation, stress response monitoring, physiological feedback loops
            </div>
          </div>
          <div className="week-card">
            <div className="week-title">Week 8: CBT/DBT Gamification</div>
            <div className="week-features">
              Interactive therapy exercises, skill progression tracking, gamified learning, personalized difficulty
            </div>
          </div>
          <div className="week-card">
            <div className="week-title">Week 9: Trauma-Informed Care</div>
            <div className="week-features">
              Safety protocols, trigger detection, grounding resources, crisis intervention, trauma-sensitive design
            </div>
          </div>
          <div className="week-card">
            <div className="week-title">Week 10: Social Healing</div>
            <div className="week-features">
              Peer support matching, community spaces, group healing activities, moderated interactions
            </div>
          </div>
          <div className="week-card">
            <div className="week-title">Week 11: AI Analytics</div>
            <div className="week-features">
              Advanced pattern recognition, personalized insights, predictive wellness, comprehensive progress tracking
            </div>
          </div>
          <div className="week-card">
            <div className="week-title">Week 12: Clinical Integration</div>
            <div className="week-features">
              Healthcare provider integration, clinical validation, progress reports, professional consultation tools
            </div>
          </div>
        </div>
      </div>

      <div className="platform-controls">
        <div className="control-section">
          <div className="section-title">🎬 Platform Demo</div>
          <button 
            className="demo-button"
            onClick={startComprehensiveDemo}
            disabled={!platformState.isInitialized || isRunning}
          >
            {isRunning && <span className="running-indicator"></span>}
            {isRunning ? 'Running Comprehensive Demo...' : 'Start Full Platform Demo'}
          </button>
          <p style={{ fontSize: '0.9em', opacity: 0.8, margin: '10px 0' }}>
            Demonstrates all weeks 7-12 features in sequence
          </p>
        </div>

        <div className="control-section">
          <div className="section-title">🔄 Platform Modes</div>
          <div className="mode-buttons">
            {(['garden', 'therapy', 'community', 'analytics'] as const).map(mode => (
              <button
                key={mode}
                className={`mode-button ${platformState.platformMode === mode ? 'active' : ''}`}
                onClick={() => switchPlatformMode(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <div className="status-label">Platform Status</div>
          <div className="status-value">
            {platformState.isInitialized ? '✅ Ready' : '⏳ Initializing'}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Current Mode</div>
          <div className="status-value">
            {platformState.platformMode.charAt(0).toUpperCase() + platformState.platformMode.slice(1)}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Safety Status</div>
          <div className="status-value">
            {platformState.safetyStatus === 'safe' ? '🛡️ Safe' : 
             platformState.safetyStatus === 'concerning' ? '⚠️ Monitoring' :
             platformState.safetyStatus === 'alert' ? '🚨 Alert' : '🆘 Crisis'}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Biometric Monitoring</div>
          <div className="status-value">
            {platformState.biometricActive ? '📊 Active' : '⭕ Inactive'}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Therapy Session</div>
          <div className="status-value">
            {platformState.activeSession ? `🎯 ${Math.round(platformState.sessionProgress * 100)}%` : '⭕ None'}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Community</div>
          <div className="status-value">
            {platformState.communityConnected ? '🤝 Connected' : '⭕ Offline'}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">Current Biome</div>
          <div className="status-value">
            🌿 {platformState.currentBiome.replace('_', ' ')}
          </div>
        </div>
        <div className="status-card">
          <div className="status-label">AI Companion</div>
          <div className="status-value">
            {platformState.companionActive ? '👥 Active' : '⭕ Inactive'}
          </div>
        </div>
      </div>

      <div className="demo-logs">
        <div className="section-title">📋 Platform Activity Log</div>
        {demoLogs.length === 0 ? (
          <div style={{ opacity: 0.6, fontStyle: 'italic' }}>
            Platform initializing... Logs will appear here.
          </div>
        ) : (
          demoLogs.map((log, index) => (
            <div key={index} className="log-entry">{log}</div>
          ))
        )}
      </div>

      {platformState.aiInsights && (
        <div className="control-section" style={{ marginTop: '20px' }}>
          <div className="section-title">🧠 AI Insights & Recommendations</div>
          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '15px', borderRadius: '10px' }}>
            <p><strong>Primary Emotion:</strong> {platformState.aiInsights.primaryEmotion}</p>
            <p><strong>Therapeutic Priority:</strong> {platformState.aiInsights.therapeuticPriority}</p>
            <p><strong>Recommendations:</strong></p>
            <ul>
              {platformState.personalizedRecommendations.map((rec, index) => (
                <li key={index} style={{ margin: '5px 0' }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalPlatformDemo;
