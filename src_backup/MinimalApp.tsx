import React from 'react';

const MinimalApp: React.FC = () => {
  console.log('MinimalApp rendering...');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🌱 MoodGarden - React is Working!</h1>
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        padding: '20px', 
        borderRadius: '10px', 
        marginTop: '20px' 
      }}>
        <h2>✅ Status Check</h2>
        <p>✓ React is mounted correctly</p>
        <p>✓ CSS styles are applied</p>
        <p>✓ No import errors</p>
        <button 
          style={{ 
            background: '#4CAF50', 
            color: 'white', 
            padding: '10px 20px', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
          onClick={() => {
            console.log('Button clicked!');
            alert('Button works! React is fully functional.');
          }}
        >
          Test React Interaction
        </button>
      </div>
    </div>
  );
};

export default MinimalApp;
