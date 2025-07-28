export interface SentimentResult {
  mood: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  emotions: string[];
  intensity: number; // 0-1
  keywords: string[];
  confidence: number; // 0-1
  suggestions: string[];
}

export interface MoodEntry {
  id: string;
  text: string;
  timestamp: Date;
  sentiment: SentimentResult;
  source: 'text' | 'voice' | 'emoji';
  userId: string;
}

class AIService {
  private static instance: AIService;
  
  private positiveWords = [
    'happy', 'joy', 'excited', 'amazing', 'wonderful', 'fantastic', 'great', 'awesome',
    'love', 'grateful', 'blessed', 'peaceful', 'content', 'optimistic', 'confident',
    'energetic', 'motivated', 'accomplished', 'proud', 'thankful', 'delighted'
  ];

  private negativeWords = [
    'sad', 'angry', 'frustrated', 'depressed', 'anxious', 'worried', 'stressed',
    'upset', 'disappointed', 'lonely', 'overwhelmed', 'tired', 'exhausted',
    'hopeless', 'afraid', 'nervous', 'irritated', 'confused', 'hurt', 'broken'
  ];

  private emotionKeywords = {
    joy: ['happy', 'excited', 'delighted', 'cheerful', 'elated', 'thrilled'],
    sadness: ['sad', 'depressed', 'melancholy', 'down', 'blue', 'grief'],
    anger: ['angry', 'furious', 'irritated', 'annoyed', 'rage', 'mad'],
    fear: ['afraid', 'scared', 'anxious', 'worried', 'nervous', 'terrified'],
    surprise: ['amazed', 'shocked', 'surprised', 'astonished', 'stunned'],
    love: ['love', 'adore', 'cherish', 'affection', 'romantic', 'caring'],
    gratitude: ['grateful', 'thankful', 'blessed', 'appreciative'],
    peace: ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed'],
    excitement: ['excited', 'thrilled', 'energetic', 'pumped', 'enthusiastic'],
    confidence: ['confident', 'strong', 'powerful', 'capable', 'accomplished']
  };

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const words = text.toLowerCase().split(/\s+/);
    const emotions: string[] = [];
    const keywords: string[] = [];
    
    let positiveScore = 0;
    let negativeScore = 0;
    let totalWords = words.length;

    // Analyze each word
    words.forEach(word => {
      if (this.positiveWords.includes(word)) {
        positiveScore += 1;
        keywords.push(word);
      }
      if (this.negativeWords.includes(word)) {
        negativeScore += 1;
        keywords.push(word);
      }

      // Check for emotions
      Object.entries(this.emotionKeywords).forEach(([emotion, emotionWords]) => {
        if (emotionWords.includes(word) && !emotions.includes(emotion)) {
          emotions.push(emotion);
        }
      });
    });

    // Calculate sentiment
    const sentimentScore = (positiveScore - negativeScore) / Math.max(totalWords, 1);
    const intensity = Math.min(Math.abs(sentimentScore) * 2, 1);
    
    let mood: SentimentResult['mood'];
    if (sentimentScore > 0.3) mood = 'very_positive';
    else if (sentimentScore > 0.1) mood = 'positive';
    else if (sentimentScore > -0.1) mood = 'neutral';
    else if (sentimentScore > -0.3) mood = 'negative';
    else mood = 'very_negative';

    // Generate suggestions
    const suggestions = this.generateSuggestions(mood, emotions);
    
    // Calculate confidence based on keyword matches
    const confidence = Math.min((keywords.length / Math.max(totalWords * 0.3, 1)), 1);

    return {
      mood,
      emotions,
      intensity,
      keywords,
      confidence,
      suggestions
    };
  }

  private generateSuggestions(mood: SentimentResult['mood'], emotions: string[]): string[] {
    const suggestions: string[] = [];

    switch (mood) {
      case 'very_positive':
        suggestions.push('🌟 Share this joy with your garden!');
        suggestions.push('🎉 Celebrate this moment with deep breathing');
        suggestions.push('📝 Journal about what made you feel this way');
        break;
      
      case 'positive':
        suggestions.push('🌸 Your garden is blooming with positivity');
        suggestions.push('💫 Take a moment to appreciate this feeling');
        suggestions.push('🎵 Listen to uplifting music');
        break;
      
      case 'neutral':
        suggestions.push('🧘 Try a 5-minute meditation');
        suggestions.push('🚶 Take a peaceful walk');
        suggestions.push('📚 Read something inspiring');
        break;
      
      case 'negative':
        suggestions.push('🌿 Practice gentle breathing exercises');
        suggestions.push('💚 Remember: this feeling will pass');
        suggestions.push('☕ Take a warm break and be kind to yourself');
        break;
      
      case 'very_negative':
        suggestions.push('🤗 Consider reaching out to someone you trust');
        suggestions.push('🛁 Try self-care activities like a warm bath');
        suggestions.push('📞 Professional support is always available');
        break;
    }

    // Add emotion-specific suggestions
    if (emotions.includes('anxiety') || emotions.includes('fear')) {
      suggestions.push('🌬️ Try the 4-7-8 breathing technique');
    }
    if (emotions.includes('sadness')) {
      suggestions.push('🎨 Express your feelings through art or writing');
    }
    if (emotions.includes('anger')) {
      suggestions.push('🏃 Physical exercise can help release tension');
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  }

  async processVoiceText(transcript: string): Promise<SentimentResult> {
    // Add voice-specific processing (tone, pace, etc.)
    const sentiment = await this.analyzeSentiment(transcript);
    
    // Voice-specific adjustments
    if (transcript.includes('...') || transcript.includes('um') || transcript.includes('uh')) {
      sentiment.confidence *= 0.8; // Lower confidence for hesitant speech
    }
    
    return sentiment;
  }

  getMoodColor(mood: SentimentResult['mood']): string {
    switch (mood) {
      case 'very_positive': return '#10B981'; // emerald
      case 'positive': return '#34D399'; // light green
      case 'neutral': return '#6B7280'; // gray
      case 'negative': return '#F59E0B'; // amber
      case 'very_negative': return '#EF4444'; // red
    }
  }

  getMoodEmoji(mood: SentimentResult['mood']): string {
    switch (mood) {
      case 'very_positive': return '🌟';
      case 'positive': return '😊';
      case 'neutral': return '😐';
      case 'negative': return '😔';
      case 'very_negative': return '😢';
    }
  }

  getGardenGrowthFactor(mood: SentimentResult['mood'], intensity: number): number {
    const baseFactor = {
      'very_positive': 1.5,
      'positive': 1.2,
      'neutral': 1.0,
      'negative': 0.8,
      'very_negative': 0.6
    }[mood];
    
    return baseFactor * intensity;
  }
}

export default AIService;
