import React, { useState } from 'react';
import type { MoodEntry } from '../types';
import './MoodInput.css';

interface MoodInputProps {
  onMoodSubmit: (mood: MoodEntry) => void;
}

const MoodInput: React.FC<MoodInputProps> = ({ onMoodSubmit }) => {
  const [inputType, setInputType] = useState<'text' | 'emoji'>('text');
  const [moodText, setMoodText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');

  const moodEmojis = [
    { emoji: '😊', sentiment: 'joy', label: 'Happy' },
    { emoji: '😌', sentiment: 'calm', label: 'Calm' },
    { emoji: '🎨', sentiment: 'creative', label: 'Creative' },
    { emoji: '⚡', sentiment: 'energetic', label: 'Energetic' },
    { emoji: '🕯️', sentiment: 'peaceful', label: 'Peaceful' },
    { emoji: '😢', sentiment: 'sad', label: 'Sad' },
    { emoji: '😰', sentiment: 'anxious', label: 'Anxious' },
    { emoji: '😠', sentiment: 'angry', label: 'Angry' },
  ];

  const analyzeSentiment = (text: string): { sentiment: string; confidence: number } => {
    const positiveWords = ['happy', 'joy', 'excited', 'great', 'wonderful', 'amazing', 'love', 'peaceful', 'calm'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'worried', 'anxious', 'upset', 'terrible', 'hate'];
    const creativeWords = ['creative', 'inspired', 'artistic', 'imaginative', 'innovative'];
    
    const words = text.toLowerCase().split(' ');
    
    let positiveCount = 0;
    let negativeCount = 0;
    let creativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
      if (creativeWords.some(cw => word.includes(cw))) creativeCount++;
    });
    
    if (creativeCount > 0) return { sentiment: 'creative', confidence: 0.8 };
    if (positiveCount > negativeCount) return { sentiment: 'joy', confidence: 0.7 };
    if (negativeCount > positiveCount) return { sentiment: 'sad', confidence: 0.7 };
    
    return { sentiment: 'calm', confidence: 0.5 };
  };

  const handleSubmit = () => {
    let sentiment = 'calm';
    let confidence = 0.5;
    
    if (inputType === 'text' && moodText.trim()) {
      const analysis = analyzeSentiment(moodText);
      sentiment = analysis.sentiment;
      confidence = analysis.confidence;
    } else if (inputType === 'emoji' && selectedEmoji) {
      const emojiData = moodEmojis.find(em => em.emoji === selectedEmoji);
      sentiment = emojiData?.sentiment || 'calm';
      confidence = 0.9;
    }
    
    const moodEntry: MoodEntry = {
      id: Date.now().toString(),
      userId: 'user1', // This would come from authentication
      text: inputType === 'text' ? moodText : undefined,
      emoji: inputType === 'emoji' ? selectedEmoji : undefined,
      sentiment,
      confidence,
      timestamp: new Date(),
    };
    
    onMoodSubmit(moodEntry);
    
    // Reset form
    setMoodText('');
    setSelectedEmoji('');
  };

  return (
    <div className="mood-input">
      <h2>🌱 How are you feeling today?</h2>
      
      <div className="input-type-selector">
        <button 
          className={inputType === 'text' ? 'active' : ''}
          onClick={() => setInputType('text')}
        >
          📝 Text
        </button>
        <button 
          className={inputType === 'emoji' ? 'active' : ''}
          onClick={() => setInputType('emoji')}
        >
          😊 Emoji
        </button>
      </div>
      
      {inputType === 'text' && (
        <div className="text-input-section">
          <textarea
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
            placeholder="Describe how you're feeling... What's on your mind today?"
            className="mood-textarea"
            rows={4}
          />
        </div>
      )}
      
      {inputType === 'emoji' && (
        <div className="emoji-input-section">
          <p>Choose an emoji that represents your current mood:</p>
          <div className="emoji-grid">
            {moodEmojis.map((moodEmoji) => (
              <button
                key={moodEmoji.emoji}
                className={`emoji-button ${selectedEmoji === moodEmoji.emoji ? 'selected' : ''}`}
                onClick={() => setSelectedEmoji(moodEmoji.emoji)}
                title={moodEmoji.label}
              >
                {moodEmoji.emoji}
                <span className="emoji-label">{moodEmoji.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <button 
        className="submit-button"
        onClick={handleSubmit}
        disabled={
          (inputType === 'text' && !moodText.trim()) ||
          (inputType === 'emoji' && !selectedEmoji)
        }
      >
        🌱 Plant Your Mood
      </button>
      
      <div className="mood-tips">
        <h3>💡 Mood Garden Tips:</h3>
        <ul>
          <li>Each mood you record grows a unique plant in your garden</li>
          <li>Different emotions create different weather patterns</li>
          <li>Creative moods attract fireflies at night</li>
          <li>Joyful moods bring colorful butterflies</li>
          <li>Complete challenges to unlock special garden features</li>
        </ul>
      </div>
    </div>
  );
};

export default MoodInput;
