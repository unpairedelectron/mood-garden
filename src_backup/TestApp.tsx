import './App.css';

function TestApp() {
  return (
    <div style={{ padding: '2rem', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1>🌱 MoodGarden 2.0 - Test</h1>
      <p>If you can see this, the basic React app is working!</p>
      <div style={{ 
        background: 'white', 
        padding: '1rem', 
        borderRadius: '8px',
        marginTop: '1rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>System Check</h2>
        <ul>
          <li>✅ React rendering works</li>
          <li>✅ CSS styles loading</li>
          <li>✅ TypeScript compilation successful</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;
