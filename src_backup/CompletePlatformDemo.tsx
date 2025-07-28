import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App-ai-demo.css';

// Import all advanced services
import { BiometricControlService } from '../services/BiometricControlService';
import { CBTDBTGamificationService } from '../services/CBTDBTGamificationService';
import { TraumaInformedService } from '../services/TraumaInformedService';
import { SocialHealingService } from '../services/SocialHealingService';

/**
 * Week 7-12: Complete MoodGarden Platform Demo
 * 
 * Comprehensive therapeutic platform integrating:
 * - Week 7: Biometric Controls & Real-time Adaptation
 * - Week 8: CBT/DBT Gamification & Therapeutic Exercises
 * - Week 9: Trauma-Informed Features & Safety Systems
 * - Week 10: Social Healing & Community Features
 * - Week 11: Platform Integration & Monetization
 * - Week 12: Clinical Validation & Launch Preparation
 */
const CompletePlatformDemo: React.FC = () => {
  // Core state management
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [biometricData, setBiometricData] = useState<any>(null);
  const [therapeuticProgress, setTherapeuticProgress] = useState<any>(null);
  const [communityConnections, setCommunityConnections] = useState<any[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<any>(null);
  const [gamificationData, setGamificationData] = useState<any>(null);
  const [activeExercise, setActiveExercise] = useState<any>(null);
  const [communitySpaces, setCommunitySpaces] = useState<any[]>([]);
  const [clinicalMetrics, setClinicalMetrics] = useState<any>(null);
  
  // Service instances
  const [biometricService, setBiometricService] = useState<BiometricControlService | null>(null);
  const [cbtService, setCbtService] = useState<CBTDBTGamificationService | null>(null);
  const [traumaService, setTraumaService] = useState<TraumaInformedService | null>(null);
  const [socialService, setSocialService] = useState<SocialHealingService | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logs, setLogs] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Platform initialization
  useEffect(() => {
    initializePlatform();
  }, []);

  const initializePlatform = async () => {
    try {
      addLog('🚀 Initializing Complete MoodGarden Platform...');
      
      // Initialize all services
      const biometric = new BiometricControlService();
      const cbt = new CBTDBTGamificationService();
      const trauma = new TraumaInformedService();
      const social = new SocialHealingService();
      
      await biometric.initialize();
      
      setBiometricService(biometric);
      setCbtService(cbt);
      setTraumaService(trauma);
      setSocialService(social);
      
      // Create demo user profile
      const user = await createDemoUser();
      setCurrentUser(user);
      
      // Initialize user data
      await initializeUserData(user.id);
      
      addLog('✅ Platform initialization complete');
      addLog('🌟 Welcome to the future of digital therapeutic intervention');
      
    } catch (error) {
      addLog(`❌ Platform initialization error: ${error}`);
      console.error('Platform initialization failed:', error);
    }
  };

  const createDemoUser = async () => {
    const user = {
      id: 'demo_user_12_week',
      name: 'Alex Wellness Seeker',
      age: 32,
      therapeutic_goals: ['anxiety_management', 'trauma_recovery', 'social_connection'],
      preferences: {
        privacy_level: 'high',
        interaction_style: 'gentle',
        trigger_sensitivity: 'medium'
      },
      clinical_profile: {
        primary_concerns: ['generalized_anxiety', 'social_anxiety', 'past_trauma'],
        treatment_history: ['therapy', 'medication'],
        current_stability: 'stable'
      }
    };
    
    return user;
  };

  const initializeUserData = async (userId: string) => {
    if (!biometricService || !cbtService || !traumaService || !socialService) return;
    
    // Initialize biometric monitoring
    biometricService.calibrateSensors({
      restingHeartRate: 68,
      stressSensitivity: 0.7,
      anxietyTriggers: ['loud_sounds', 'sudden_movements']
    });
    
    // Set up trauma-informed profile
    await traumaService.createTraumaSurvivorProfile(userId, {
      trauma_types: ['emotional_trauma'],
      severity_level: 'moderate',
      current_stability: 'stable'
    });
    
    // Initialize gamification
    const progress = cbtService.getUserProgress(userId);
    setGamificationData(progress.gamification);
    
    // Load community spaces
    loadCommunitySpaces();
    
    // Start real-time monitoring
    startRealTimeUpdates();
  };

  const loadCommunitySpaces = () => {
    const spaces = [
      {
        id: 'anxiety_support',
        name: 'Anxiety Support Circle',
        members: 8,
        activity_level: 'high',
        next_session: 'Today 3:00 PM'
      },
      {
        id: 'trauma_garden',
        name: 'Trauma Survivors Garden',
        members: 12,
        activity_level: 'moderate',
        next_session: 'Tomorrow 10:00 AM'
      },
      {
        id: 'creative_studio',
        name: 'Creative Expression Studio',
        members: 15,
        activity_level: 'very_high',
        next_session: 'Today 7:00 PM'
      }
    ];
    
    setCommunitySpaces(spaces);
  };

  const startRealTimeUpdates = () => {
    // Simulate real-time biometric updates
    const biometricInterval = setInterval(() => {
      if (biometricService) {
        const data = biometricService.getCurrentBiometrics();
        setBiometricData(data);
        
        // Check for safety concerns
        if (data && data.stressScore > 0.8) {
          triggerSafetyProtocol('high_stress');
        }
      }
    }, 3000);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      updateTherapeuticProgress();
    }, 10000);

    return () => {
      clearInterval(biometricInterval);
      clearInterval(progressInterval);
    };
  };

  const updateTherapeuticProgress = () => {
    setTherapeuticProgress({
      overall_progress: 73,
      skill_mastery: {
        mindfulness: 85,
        emotional_regulation: 67,
        social_skills: 56,
        trauma_processing: 43
      },
      recent_achievements: [
        'Completed 7-day mindfulness streak',
        'Mastered breathing techniques',
        'Joined first community circle'
      ],
      goals_progress: {
        anxiety_reduction: 65,
        social_connection: 45,
        trauma_healing: 38
      }
    });
  };

  const triggerSafetyProtocol = async (type: string) => {
    if (!traumaService || emergencyMode) return;
    
    setEmergencyMode(true);
    
    try {
      const response = await traumaService.activateSafetyProtocol(currentUser.id, type);
      setSafetyStatus(response);
      
      addNotification({
        type: 'safety',
        title: 'Safety Protocol Activated',
        message: 'We\'ve detected you might need extra support. Your safety resources are now available.',
        actions: ['Access Resources', 'Contact Support', 'I\'m Safe']
      });
      
      addLog(`🛡️ Safety protocol activated: ${type}`);
      
    } catch (error) {
      addLog(`❌ Safety protocol error: ${error}`);
    }
    
    setTimeout(() => setEmergencyMode(false), 30000); // Reset after 30 seconds
  };

  const startTherapeuticExercise = async (exerciseId: string) => {
    if (!cbtService) return;
    
    try {
      const session = await cbtService.startExercise(exerciseId, currentUser.id);
      setActiveExercise(session);
      
      addLog(`🧠 Started therapeutic exercise: ${exerciseId}`);
      
      addNotification({
        type: 'exercise',
        title: 'Exercise Started',
        message: `You've begun ${exerciseId.replace('_', ' ')}. Take your time and be gentle with yourself.`,
        actions: ['Continue', 'Pause', 'Exit Safely']
      });
      
    } catch (error) {
      addLog(`❌ Exercise start error: ${error}`);
    }
  };

  const joinCommunitySpace = async (spaceId: string) => {
    if (!socialService) return;
    
    try {
      const result = await socialService.joinCommunitySpace(currentUser.id, spaceId);
      
      if (result.joined) {
        setCommunityConnections(prev => [...prev, result.space]);
        
        addNotification({
          type: 'community',
          title: 'Joined Community',
          message: `Welcome to ${result.space.name}! Read the guidelines and introduce yourself when ready.`,
          actions: ['View Guidelines', 'Introduce Myself', 'Explore']
        });
        
        addLog(`🤝 Joined community space: ${result.space.name}`);
      }
      
    } catch (error) {
      addLog(`❌ Community join error: ${error}`);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const addNotification = (notification: any) => {
    const notif = {
      ...notification,
      id: Date.now(),
      timestamp: new Date()
    };
    setNotifications(prev => [notif, ...prev.slice(0, 9)]);
  };

  const dismissNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const renderDashboard = () => (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        {/* Biometric Status */}
        <div className="dashboard-card biometric-card">
          <h3>🔬 Real-time Wellness</h3>
          {biometricData ? (
            <div className="biometric-display">
              <div className="biometric-metric">
                <span className="metric-label">Heart Rate</span>
                <span className="metric-value">{Math.round(biometricData.heartRate)} BPM</span>
              </div>
              <div className="biometric-metric">
                <span className="metric-label">Stress Level</span>
                <span className="metric-value">{Math.round(biometricData.stressScore * 100)}%</span>
              </div>
              <div className="biometric-metric">
                <span className="metric-label">Coherence</span>
                <span className="metric-value">{Math.round(biometricData.coherenceScore * 100)}%</span>
              </div>
              <div className="biometric-metric">
                <span className="metric-label">Emotional State</span>
                <span className="metric-value">{biometricData.emotionalValence > 0 ? 'Positive' : 'Calm'}</span>
              </div>
            </div>
          ) : (
            <p>Initializing biometric monitoring...</p>
          )}
        </div>

        {/* Therapeutic Progress */}
        <div className="dashboard-card progress-card">
          <h3>📈 Therapeutic Progress</h3>
          {therapeuticProgress ? (
            <div className="progress-display">
              <div className="overall-progress">
                <span>Overall Progress: {therapeuticProgress.overall_progress}%</span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${therapeuticProgress.overall_progress}%` }}
                  ></div>
                </div>
              </div>
              <div className="skill-progress">
                <h4>Skill Mastery</h4>
                {Object.entries(therapeuticProgress.skill_mastery).map(([skill, level]) => (
                  <div key={skill} className="skill-item">
                    <span>{skill.replace('_', ' ')}</span>
                    <span>{level}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>Loading progress data...</p>
          )}
        </div>

        {/* Safety Status */}
        <div className={`dashboard-card safety-card ${emergencyMode ? 'emergency' : ''}`}>
          <h3>🛡️ Safety & Support</h3>
          <div className="safety-status">
            <div className="safety-indicator">
              <span className={`status-light ${emergencyMode ? 'red' : 'green'}`}></span>
              <span>{emergencyMode ? 'Safety Protocol Active' : 'All Systems Normal'}</span>
            </div>
            {safetyStatus && (
              <div className="safety-details">
                <p>Protocol: {safetyStatus.protocol_active ? 'Active' : 'Inactive'}</p>
                <p>Support: {safetyStatus.support_network_notified ? 'Notified' : 'On Standby'}</p>
              </div>
            )}
            <div className="safety-actions">
              <button 
                className="emergency-btn"
                onClick={() => triggerSafetyProtocol('user_requested')}
              >
                🚨 I Need Support
              </button>
              <button 
                className="resources-btn"
                onClick={() => setActiveTab('resources')}
              >
                📚 Safety Resources
              </button>
            </div>
          </div>
        </div>

        {/* Community Connections */}
        <div className="dashboard-card community-card">
          <h3>🤝 Community & Connections</h3>
          <div className="community-overview">
            <div className="connection-stats">
              <span>Active Connections: {communityConnections.length}</span>
              <span>Available Spaces: {communitySpaces.length}</span>
            </div>
            <div className="recent-activity">
              <h4>Recent Community Activity</h4>
              <ul>
                <li>Sarah shared a breakthrough in Anxiety Circle</li>
                <li>New member joined Trauma Garden</li>
                <li>Group meditation starting in 15 minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="action-btn primary"
          onClick={() => startTherapeuticExercise('mindfulness_breathing')}
        >
          🧘 Start Mindfulness Exercise
        </button>
        <button 
          className="action-btn secondary"
          onClick={() => setActiveTab('exercises')}
        >
          🎯 Browse Exercises
        </button>
        <button 
          className="action-btn secondary"
          onClick={() => setActiveTab('community')}
        >
          🌟 Join Community
        </button>
        <button 
          className="action-btn secondary"
          onClick={() => setActiveTab('garden')}
        >
          🌱 Tend Garden
        </button>
      </div>
    </div>
  );

  const renderExercises = () => (
    <div className="exercises-container">
      <h2>🧠 Therapeutic Exercises</h2>
      <div className="exercise-categories">
        <div className="category">
          <h3>CBT Exercises</h3>
          <div className="exercise-grid">
            <div className="exercise-card" onClick={() => startTherapeuticExercise('thought_record')}>
              <h4>Thought Record</h4>
              <p>Challenge negative thought patterns</p>
              <div className="exercise-meta">
                <span>⏱️ 10 min</span>
                <span>⭐ Beginner</span>
              </div>
            </div>
            <div className="exercise-card" onClick={() => startTherapeuticExercise('behavioral_activation')}>
              <h4>Activity Scheduling</h4>
              <p>Plan mood-boosting activities</p>
              <div className="exercise-meta">
                <span>⏱️ 15 min</span>
                <span>⭐⭐ Intermediate</span>
              </div>
            </div>
          </div>
        </div>

        <div className="category">
          <h3>DBT Skills</h3>
          <div className="exercise-grid">
            <div className="exercise-card" onClick={() => startTherapeuticExercise('wise_mind')}>
              <h4>Wise Mind Meditation</h4>
              <p>Access inner balance and wisdom</p>
              <div className="exercise-meta">
                <span>⏱️ 8 min</span>
                <span>⭐ Beginner</span>
              </div>
            </div>
            <div className="exercise-card" onClick={() => startTherapeuticExercise('distress_tolerance')}>
              <h4>Crisis Survival Skills</h4>
              <p>Manage intense distress safely</p>
              <div className="exercise-meta">
                <span>⏱️ 12 min</span>
                <span>⭐⭐⭐ Advanced</span>
              </div>
            </div>
          </div>
        </div>

        <div className="category">
          <h3>Mindfulness</h3>
          <div className="exercise-grid">
            <div className="exercise-card" onClick={() => startTherapeuticExercise('body_scan')}>
              <h4>Garden Body Scan</h4>
              <p>Mindful body awareness in nature</p>
              <div className="exercise-meta">
                <span>⏱️ 15 min</span>
                <span>⭐ Beginner</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeExercise && (
        <div className="active-exercise">
          <h3>🎯 Active Exercise: {activeExercise.adapted_exercise.name}</h3>
          <p>{activeExercise.adapted_exercise.description}</p>
          <div className="exercise-controls">
            <button className="continue-btn">Continue</button>
            <button className="pause-btn">Pause</button>
            <button className="exit-btn">Exit Safely</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCommunity = () => (
    <div className="community-container">
      <h2>🤝 Healing Community</h2>
      
      <div className="community-spaces-grid">
        {communitySpaces.map(space => (
          <div key={space.id} className="community-space-card">
            <h3>{space.name}</h3>
            <div className="space-stats">
              <span>👥 {space.members} members</span>
              <span>📊 {space.activity_level} activity</span>
            </div>
            <p>Next session: {space.next_session}</p>
            <button 
              className="join-btn"
              onClick={() => joinCommunitySpace(space.id)}
            >
              Join Community
            </button>
          </div>
        ))}
      </div>

      <div className="community-features">
        <div className="feature">
          <h3>🌱 Peer Gardens</h3>
          <p>Collaborate on healing garden spaces with other survivors</p>
          <button className="feature-btn">Explore Gardens</button>
        </div>
        
        <div className="feature">
          <h3>🎨 Creative Circles</h3>
          <p>Express yourself through art, music, and creative healing</p>
          <button className="feature-btn">Join Circle</button>
        </div>
        
        <div className="feature">
          <h3>👥 Buddy System</h3>
          <p>Find a healing companion for mutual support and growth</p>
          <button className="feature-btn">Find Buddy</button>
        </div>
      </div>
    </div>
  );

  const renderPlatformMetrics = () => (
    <div className="metrics-container">
      <h2>📊 Platform Analytics & Clinical Validation</h2>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Clinical Effectiveness</h3>
          <div className="metric-value">87%</div>
          <p>Users report symptom improvement</p>
        </div>
        
        <div className="metric-card">
          <h3>Engagement Rate</h3>
          <div className="metric-value">92%</div>
          <p>Daily active user retention</p>
        </div>
        
        <div className="metric-card">
          <h3>Safety Score</h3>
          <div className="metric-value">99.8%</div>
          <p>Crisis situations successfully managed</p>
        </div>
        
        <div className="metric-card">
          <h3>Community Growth</h3>
          <div className="metric-value">156%</div>
          <p>Month-over-month user growth</p>
        </div>
      </div>
      
      <div className="clinical-validation">
        <h3>🏥 Clinical Validation Status</h3>
        <div className="validation-checklist">
          <div className="validation-item completed">
            ✅ IRB Approval for Clinical Studies
          </div>
          <div className="validation-item completed">
            ✅ HIPAA Compliance Certification
          </div>
          <div className="validation-item completed">
            ✅ FDA Breakthrough Device Designation
          </div>
          <div className="validation-item in-progress">
            🔄 Phase II Clinical Trial (In Progress)
          </div>
          <div className="validation-item pending">
            ⏳ FDA 510(k) Submission (Planned Q4)
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="complete-platform-demo">
      {/* Navigation */}
      <nav className="platform-nav">
        <div className="nav-brand">
          <h1>🌿 MoodGarden Pro</h1>
          <span className="version">v12.0 - Complete Platform</span>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-tab ${activeTab === 'exercises' ? 'active' : ''}`}
            onClick={() => setActiveTab('exercises')}
          >
            🧠 Exercises
          </button>
          <button 
            className={`nav-tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            🤝 Community
          </button>
          <button 
            className={`nav-tab ${activeTab === 'garden' ? 'active' : ''}`}
            onClick={() => setActiveTab('garden')}
          >
            🌱 Garden
          </button>
          <button 
            className={`nav-tab ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            📈 Analytics
          </button>
        </div>
        
        <div className="nav-user">
          <span>👤 {currentUser?.name || 'Loading...'}</span>
          <button className="emergency-btn" onClick={() => triggerSafetyProtocol('user_requested')}>
            🚨 Emergency
          </button>
        </div>
      </nav>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map(notification => (
            <div key={notification.id} className={`notification ${notification.type}`}>
              <div className="notification-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <div className="notification-actions">
                  {notification.actions.map((action: string, index: number) => (
                    <button key={index} className="notification-action">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                className="notification-dismiss"
                onClick={() => dismissNotification(notification.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="platform-main">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'exercises' && renderExercises()}
        {activeTab === 'community' && renderCommunity()}
        {activeTab === 'garden' && (
          <div className="garden-tab">
            <h2>🌱 Your Healing Garden</h2>
            <p>Garden integration with all previous weeks' features...</p>
          </div>
        )}
        {activeTab === 'metrics' && renderPlatformMetrics()}
      </main>

      {/* Activity Log */}
      <aside className="activity-log">
        <h3>📝 Activity Log</h3>
        <div className="log-entries">
          {logs.slice(0, 10).map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </aside>

      <style jsx>{`
        .complete-platform-demo {
          display: grid;
          grid-template-areas: 
            "nav nav nav"
            "main main log"
            "main main log";
          grid-template-columns: 1fr 1fr 300px;
          grid-template-rows: auto 1fr;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .platform-nav {
          grid-area: nav;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .nav-brand h1 {
          margin: 0;
          font-size: 1.5rem;
        }

        .nav-brand .version {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .nav-tabs {
          display: flex;
          gap: 1rem;
        }

        .nav-tab {
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 20px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-tab:hover, .nav-tab.active {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .nav-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .emergency-btn {
          padding: 0.5rem 1rem;
          background: #ff4757;
          border: none;
          border-radius: 20px;
          color: white;
          cursor: pointer;
          font-weight: bold;
        }

        .platform-main {
          grid-area: main;
          padding: 2rem;
          overflow-y: auto;
        }

        .activity-log {
          grid-area: log;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          overflow-y: auto;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .dashboard-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .dashboard-card h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
        }

        .biometric-display {
          display: grid;
          gap: 0.5rem;
        }

        .biometric-metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #81C784);
          transition: width 0.3s ease;
        }

        .safety-card.emergency {
          border-color: #ff4757;
          background: rgba(255, 71, 87, 0.2);
        }

        .status-light {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 0.5rem;
        }

        .status-light.green {
          background: #4CAF50;
        }

        .status-light.red {
          background: #ff4757;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .quick-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 1rem 2rem;
          border: none;
          border-radius: 25px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .action-btn.primary {
          background: #4CAF50;
          color: white;
        }

        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .exercise-grid, .community-spaces-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }

        .exercise-card, .community-space-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 1rem;
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .exercise-card:hover, .community-space-card:hover {
          transform: translateY(-5px);
        }

        .notifications-container {
          position: fixed;
          top: 80px;
          right: 20px;
          z-index: 1000;
          max-width: 400px;
        }

        .notification {
          background: rgba(255, 255, 255, 0.95);
          color: #333;
          border-radius: 10px;
          margin-bottom: 1rem;
          padding: 1rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .notification.safety {
          border-left: 4px solid #ff4757;
        }

        .notification.exercise {
          border-left: 4px solid #4CAF50;
        }

        .notification.community {
          border-left: 4px solid #2196F3;
        }

        .log-entry {
          padding: 0.25rem 0;
          font-size: 0.9rem;
          opacity: 0.9;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          padding: 2rem;
          text-align: center;
        }

        .metric-value {
          font-size: 3rem;
          font-weight: bold;
          color: #4CAF50;
          margin: 1rem 0;
        }

        .validation-checklist {
          display: grid;
          gap: 1rem;
          margin-top: 1rem;
        }

        .validation-item {
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
        }

        .validation-item.completed {
          border-left: 4px solid #4CAF50;
        }

        .validation-item.in-progress {
          border-left: 4px solid #FFC107;
        }

        .validation-item.pending {
          border-left: 4px solid #9E9E9E;
        }
      `}</style>
    </div>
  );
};

export default CompletePlatformDemo;
