import React from 'react';
import './Navigation.css';

interface NavigationProps {
  currentView: 'garden' | 'mood' | 'challenges';
  onViewChange: (view: 'garden' | 'mood' | 'challenges') => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>🌱 MoodGarden</h1>
      </div>
      
      <div className="nav-menu">
        <button 
          className={`nav-button ${currentView === 'garden' ? 'active' : ''}`}
          onClick={() => onViewChange('garden')}
        >
          🌺 Garden
        </button>
        
        <button 
          className={`nav-button ${currentView === 'mood' ? 'active' : ''}`}
          onClick={() => onViewChange('mood')}
        >
          💭 Add Mood
        </button>
        
        <button 
          className={`nav-button ${currentView === 'challenges' ? 'active' : ''}`}
          onClick={() => onViewChange('challenges')}
        >
          🏆 Challenges
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
