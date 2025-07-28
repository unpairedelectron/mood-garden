import OpenAI from 'openai';
import { MoodType, PlantType, EmotionScore, PlantSuggestion, AICoachResponse } from '../types';

class AIService {
  private openai: OpenAI | null = null;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️  OpenAI API key not found. AI features will be disabled.');
      return;
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeMood(input: string, inputType: 'text' | 'emoji' | 'voice'): Promise<{
    primary: MoodType;
    secondary?: MoodType;
    intensity: number;
    confidence: number;
    sentiment: number;
    emotions: EmotionScore[];
    suggestedPlants: PlantSuggestion[];
    wellnessTips: string[];
  }> {
    if (!this.openai) {
      return this.getFallbackAnalysis(input);
    }

    try {
      const prompt = this.buildMoodAnalysisPrompt(input, inputType);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800,
      });

      const analysis = this.parseMoodAnalysis(response.choices[0].message.content || '');
      return analysis;
    } catch (error) {
      console.error('AI mood analysis error:', error);
      return this.getFallbackAnalysis(input);
    }
  }

  async generateCoachingTip(moodHistory: MoodType[], gardenState: any): Promise<AICoachResponse> {
    if (!this.openai) {
      return this.getFallbackCoachingTip();
    }

    try {
      const prompt = this.buildCoachingPrompt(moodHistory, gardenState);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      });

      return this.parseCoachingResponse(response.choices[0].message.content || '');
    } catch (error) {
      console.error('AI coaching error:', error);
      return this.getFallbackCoachingTip();
    }
  }

  private buildMoodAnalysisPrompt(input: string, inputType: string): string {
    return `
You are an AI wellness coach analyzing mood input for a mental health garden app. 

Input: "${input}"
Input Type: ${inputType}

Analyze this mood input and return a JSON response with:
{
  "primary": "primary_mood",
  "secondary": "secondary_mood_or_null", 
  "intensity": 1-10,
  "confidence": 0.0-1.0,
  "sentiment": -1.0 to 1.0,
  "emotions": [{"emotion": "name", "score": 0.0-1.0}],
  "suggestedPlants": [{"plantType": "plant_name", "reason": "why", "growthStage": "seed|sprout|bloom"}],
  "wellnessTips": ["tip1", "tip2", "tip3"]
}

Available moods: happy, sad, anxious, calm, angry, excited, tired, stressed, content, lonely, grateful, frustrated, peaceful, overwhelmed

Available plants: sunflower, daisy, rose, fern, aloe, bamboo, lavender, oak, willow, cactus, lily, moss, vine, cherry-blossom

Plant associations:
- Happy/Joyful: sunflower, daisy, cherry-blossom
- Sad/Down: fern, willow, moss (healing/gentle)
- Anxious/Stressed: bamboo (resilience), lavender (calming), aloe (healing)
- Calm/Peaceful: lily, oak, moss
- Grateful: cherry-blossom, rose, daisy

Provide 1-3 micro wellness tips (1-5 minutes each).`;
  }

  private buildCoachingPrompt(moodHistory: MoodType[], gardenState: any): string {
    return `
You are a wise AI wellness coach for MoodGarden. Based on recent mood patterns and garden state, provide encouragement using garden metaphors.

Recent moods: ${moodHistory.slice(-7).join(', ')}
Garden info: ${gardenState.plants?.length || 0} plants, weather: ${gardenState.environment?.weather || 'sunny'}

Respond with JSON:
{
  "message": "main_message_with_garden_metaphor",
  "type": "encouragement|suggestion|insight|celebration",
  "metaphor": "specific_garden_metaphor",
  "actionItems": ["1-2 micro actions"],
  "priority": "low|medium|high"
}

Use garden metaphors like: "Your garden needs sunlight = try a morning walk", "Even storms help plants grow stronger", "Small seeds become mighty trees with patience".

Keep it warm, hopeful, and actionable.`;
  }

  private parseMoodAnalysis(content: string): any {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }
    
    return this.getFallbackAnalysis('');
  }

  private parseCoachingResponse(content: string): AICoachResponse {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse coaching response:', error);
    }
    
    return this.getFallbackCoachingTip();
  }

  private getFallbackAnalysis(input: string): any {
    // Simple keyword-based fallback
    const lowerInput = input.toLowerCase();
    
    let primary: MoodType = 'content';
    let sentiment = 0;
    
    if (lowerInput.includes('happy') || lowerInput.includes('joy') || lowerInput.includes('good')) {
      primary = 'happy';
      sentiment = 0.8;
    } else if (lowerInput.includes('sad') || lowerInput.includes('down') || lowerInput.includes('upset')) {
      primary = 'sad';
      sentiment = -0.6;
    } else if (lowerInput.includes('anxious') || lowerInput.includes('worry') || lowerInput.includes('nervous')) {
      primary = 'anxious';
      sentiment = -0.4;
    } else if (lowerInput.includes('calm') || lowerInput.includes('peace') || lowerInput.includes('relax')) {
      primary = 'calm';
      sentiment = 0.6;
    }

    return {
      primary,
      intensity: 5,
      confidence: 0.7,
      sentiment,
      emotions: [{ emotion: primary, score: 0.8 }],
      suggestedPlants: [{ plantType: 'daisy', reason: 'A cheerful flower to brighten your garden', growthStage: 'seed' }],
      wellnessTips: ['Take 3 deep breaths', 'Step outside for 2 minutes', 'Drink a glass of water mindfully']
    };
  }

  private getFallbackCoachingTip(): AICoachResponse {
    return {
      message: "Every day you tend to your inner garden is a step toward growth. Like plants, we need patience and care to flourish.",
      type: 'encouragement',
      metaphor: "Gardens teach us that growth takes time, but every small effort matters.",
      actionItems: ["Take 5 minutes for yourself today", "Notice one thing you're grateful for"],
      priority: 'medium'
    };
  }
}

export default new AIService();
