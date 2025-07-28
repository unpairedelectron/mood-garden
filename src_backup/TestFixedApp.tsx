import React from 'react';

const TestFixedApp: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      color: 'white'
    }}>
      <h1>🌱 MoodGarden Test - Loading Successfully!</h1>
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h2>✅ App is Working</h2>
        <p>If you can see this, the basic React app is rendering correctly.</p>
        <button 
          style={{ 
            background: '#4CAF50', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          onClick={() => alert('Button works!')}
        >
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestFixedApp;
