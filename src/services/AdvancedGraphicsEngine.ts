// Advanced Graphics Engine - Preparing for Unity/UE5 Integration
import type { PlantGrowthParameters, BiomeState, MoodAnalysis } from '../types/advanced';

export type BiomeType = 'enchanted_forest' | 'desert' | 'underwater' | 'mountain' | 'cosmic' | 'arctic' | 'savanna';

export interface RenderingContext {
  engine: 'webgl' | 'unity' | 'unreal' | 'threejs';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  performanceMode: 'battery' | 'balanced' | 'performance';
  platform: 'web' | 'mobile' | 'desktop';
}

export interface LightingPreset {
  id: string;
  name: string;
  ambientColor: [number, number, number];
  directionalLight: {
    color: [number, number, number];
    intensity: number;
    direction: [number, number, number];
  };
  pointLights: Array<{
    position: [number, number, number];
    color: [number, number, number];
    intensity: number;
    range: number;
  }>;
  environmentalEffects: {
    fog: boolean;
    particles: boolean;
    bloom: boolean;
    volumetricLighting: boolean;
  };
}

export interface NaniteGeometry {
  meshId: string;
  lodLevels: number;
  triangleCount: number;
  virtualTextureSize: number;
  compressionLevel: number;
}

export interface LumenSettings {
  globalIllumination: boolean;
  reflectionQuality: 'low' | 'medium' | 'high' | 'ultra';
  indirectLightingBounces: number;
  screenSpaceReflections: boolean;
  rayTracedReflections: boolean;
}

export class AdvancedGraphicsEngine {
  private renderingContext: RenderingContext;
  private currentBiome: BiomeState | null = null;
  private activeLightingPreset: LightingPreset | null = null;
  private naniteGeometryCache: Map<string, NaniteGeometry> = new Map();
  private lumenSettings: LumenSettings;

  constructor(context: RenderingContext) {
    this.renderingContext = context;
    this.lumenSettings = this.initializeLumenSettings();
    
    console.log('AdvancedGraphicsEngine initialized:', {
      engine: context.engine,
      quality: context.quality,
      platform: context.platform
    });
  }

  private initializeLumenSettings(): LumenSettings {
    const quality = this.renderingContext.quality;
    
    return {
      globalIllumination: quality !== 'low',
      reflectionQuality: quality,
      indirectLightingBounces: quality === 'ultra' ? 4 : quality === 'high' ? 3 : 2,
      screenSpaceReflections: quality !== 'low',
      rayTracedReflections: quality === 'ultra'
    };
  }

  /**
   * Create mood-driven lighting preset based on emotional analysis
   */
  generateMoodLighting(moodAnalysis: MoodAnalysis): LightingPreset {
    const { valence, arousal, emotions } = moodAnalysis;
    
    // Base lighting influenced by valence (positive/negative)
    const baseIntensity = 0.3 + (valence * 0.4); // 0.3-0.7 range
    // Note: warmth could be used for future color temperature calculations
    
    // Color temperature based on primary emotions
    let hue = 200; // Default blue
    if (emotions.joy > 0.6) hue = 60; // Yellow
    else if (emotions.anger > 0.5) hue = 0; // Red
    else if (emotions.fear > 0.5) hue = 240; // Purple
    else if (emotions.sadness > 0.5) hue = 220; // Blue
    else if (emotions.trust > 0.5) hue = 120; // Green
    
    // Convert HSL to RGB
    const lightColor = this.hslToRgb(hue, 0.6, 0.7);
    const ambientColor = this.hslToRgb(hue, 0.3, 0.4);
    
    // Arousal affects light movement and intensity variation
    const dynamicIntensity = baseIntensity + (arousal * 0.3);
    
    return {
      id: `mood-${Date.now()}`,
      name: `${Object.keys(emotions).find(e => emotions[e as keyof typeof emotions] === Math.max(...Object.values(emotions)))} Lighting`,
      ambientColor,
      directionalLight: {
        color: lightColor,
        intensity: dynamicIntensity,
        direction: [0.3, -0.8, 0.5] // Soft angled light
      },
      pointLights: this.generateEmotionalPointLights(emotions, arousal),
      environmentalEffects: {
        fog: emotions.sadness > 0.4,
        particles: emotions.joy > 0.5 || arousal > 0.7,
        bloom: emotions.anticipation > 0.5,
        volumetricLighting: emotions.trust > 0.4
      }
    };
  }

  private generateEmotionalPointLights(emotions: any, arousal: number): LightingPreset['pointLights'] {
    const lights: LightingPreset['pointLights'] = [];
    
    // Joy creates warm, scattered lights
    if (emotions.joy > 0.4) {
      for (let i = 0; i < Math.floor(emotions.joy * 5); i++) {
        lights.push({
          position: [
            (Math.random() - 0.5) * 10,
            2 + Math.random() * 3,
            (Math.random() - 0.5) * 10
          ],
          color: this.hslToRgb(50 + Math.random() * 20, 0.8, 0.7), // Warm yellows
          intensity: 0.5 + emotions.joy * 0.5,
          range: 3 + arousal * 2
        });
      }
    }
    
    // Fear creates cool, distant lights
    if (emotions.fear > 0.4) {
      lights.push({
        position: [0, 8, -5],
        color: this.hslToRgb(240, 0.6, 0.5), // Cool blue
        intensity: 0.3 + emotions.fear * 0.4,
        range: 8
      });
    }
    
    // Anger creates intense red lighting
    if (emotions.anger > 0.4) {
      lights.push({
        position: [0, 1, 2],
        color: this.hslToRgb(0, 0.9, 0.6), // Intense red
        intensity: emotions.anger * 0.8,
        range: 4
      });
    }
    
    return lights;
  }

  /**
   * Generate Nanite virtualized geometry for plants
   */
  async generatePlantNaniteGeometry(plant: PlantGrowthParameters): Promise<NaniteGeometry> {
    const complexity = this.calculatePlantComplexity(plant);
    const lodLevels = this.renderingContext.quality === 'ultra' ? 8 : 
                     this.renderingContext.quality === 'high' ? 6 : 4;
    
    const geometry: NaniteGeometry = {
      meshId: `plant-${plant.species}-${Date.now()}`,
      lodLevels,
      triangleCount: Math.floor(complexity * 10000), // Base triangle count
      virtualTextureSize: this.renderingContext.quality === 'ultra' ? 4096 : 2048,
      compressionLevel: this.renderingContext.performanceMode === 'battery' ? 0.8 : 0.6
    };
    
    // Cache the geometry for reuse
    this.naniteGeometryCache.set(geometry.meshId, geometry);
    
    console.log('Generated Nanite geometry:', {
      meshId: geometry.meshId,
      triangles: geometry.triangleCount,
      lodLevels: geometry.lodLevels
    });
    
    return geometry;
  }

  private calculatePlantComplexity(plant: PlantGrowthParameters): number {
    // Factor in various plant characteristics to determine geometric complexity
    const baseComplexity = 1.0;
    const heightFactor = plant.height;
    const branchinessFactor = plant.branchiness * 1.5;
    const leafDensityFactor = plant.leafDensity;
    const bloomFactor = plant.bloomFrequency * 0.8;
    
    return baseComplexity + heightFactor + branchinessFactor + leafDensityFactor + bloomFactor;
  }

  /**
   * Configure Lumen global illumination based on biome and mood
   */
  configureLumenForBiome(biome: BiomeState, moodAnalysis: MoodAnalysis): LumenSettings {
    const baseLumen = { ...this.lumenSettings };
    
    // Store current biome for future reference
    this.currentBiome = biome;
    
    // Adjust settings based on biome characteristics
    // Note: BiomeState structure may need to be extended with type field
    const biomeType = 'enchanted_forest' as BiomeType; // Default for now, will be parameterized
    
    switch (biomeType) {
      case 'enchanted_forest':
        baseLumen.indirectLightingBounces = 4; // Rich, complex lighting
        baseLumen.globalIllumination = true;
        break;
      case 'desert':
        baseLumen.indirectLightingBounces = 2; // Harsh, direct lighting
        baseLumen.reflectionQuality = 'high'; // Heat shimmer effects
        break;
      case 'underwater':
        baseLumen.globalIllumination = true;
        baseLumen.rayTracedReflections = true; // Water caustics
        break;
      case 'mountain':
        baseLumen.reflectionQuality = 'ultra'; // Crystal clear air
        baseLumen.screenSpaceReflections = true;
        break;
      case 'cosmic':
        baseLumen.rayTracedReflections = true; // Starlight reflections
        baseLumen.indirectLightingBounces = 1; // Space has minimal bounce
        break;
    }
    
    // Mood influences lighting quality
    if (moodAnalysis.valence > 0.7) {
      baseLumen.reflectionQuality = 'high'; // Brighter, more reflective world
    }
    
    if (moodAnalysis.arousal > 0.8) {
      baseLumen.globalIllumination = true; // Dynamic, responsive lighting
    }
    
    this.lumenSettings = baseLumen;
    return baseLumen;
  }

  /**
   * Create time-of-day lighting cycle
   */
  generateTimeOfDayLighting(hour: number, moodAnalysis: MoodAnalysis): LightingPreset {
    const timeProgress = hour / 24;
    
    // Base sun position
    const sunAngle = (timeProgress * Math.PI * 2) - Math.PI; // -π to π
    const sunHeight = Math.sin(sunAngle);
    const sunIntensity = Math.max(0, sunHeight);
    
    // Color temperature changes throughout day
    let colorTemp = 5500; // Neutral daylight
    if (hour < 6 || hour > 18) {
      colorTemp = 2700; // Warm evening/morning
    } else if (hour >= 12 && hour <= 14) {
      colorTemp = 6500; // Cool midday
    }
    
    // Mood influences time perception
    const moodTimeShift = (moodAnalysis.valence - 0.5) * 2; // -1 to 1
    const adjustedHour = Math.max(0, Math.min(24, hour + moodTimeShift));
    
    const lightColor = this.colorTemperatureToRgb(colorTemp);
    
    return {
      id: `time-${hour}-mood`,
      name: `${this.getTimeOfDayName(adjustedHour)} (Mood Adjusted)`,
      ambientColor: [
        lightColor[0] * 0.3,
        lightColor[1] * 0.3,
        lightColor[2] * 0.3
      ],
      directionalLight: {
        color: lightColor,
        intensity: sunIntensity * (0.8 + moodAnalysis.arousal * 0.2),
        direction: [
          Math.cos(sunAngle) * 0.5,
          sunHeight,
          Math.sin(sunAngle) * 0.5
        ]
      },
      pointLights: [],
      environmentalEffects: {
        fog: hour < 8 || hour > 19 || moodAnalysis.valence < 0.3,
        particles: sunIntensity > 0.7 && moodAnalysis.arousal > 0.5,
        bloom: sunIntensity > 0.8,
        volumetricLighting: hour > 16 && hour < 20 // Golden hour
      }
    };
  }

  private getTimeOfDayName(hour: number): string {
    if (hour < 6) return 'Night';
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  }

  /**
   * Optimize rendering settings based on device performance
   */
  optimizeForDevice(): void {
    // Detect device capabilities (simplified)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      // Fallback to lower quality for older devices
      this.renderingContext.quality = 'low';
      this.renderingContext.engine = 'webgl';
    }
    
    // Adjust settings based on performance mode
    if (this.renderingContext.performanceMode === 'battery') {
      this.lumenSettings.globalIllumination = false;
      this.lumenSettings.rayTracedReflections = false;
      this.renderingContext.quality = 'medium';
    }
    
    console.log('Graphics optimized for device:', this.renderingContext);
  }

  /**
   * Generate weather particle systems
   */
  generateWeatherEffects(weather: string, intensity: number): any {
    switch (weather) {
      case 'rain':
        return {
          type: 'rain',
          particleCount: Math.floor(intensity * 1000),
          velocity: [0, -5 - intensity * 3, 0],
          color: [0.7, 0.8, 1.0, 0.6],
          size: 0.1 + intensity * 0.05
        };
      case 'snow':
        return {
          type: 'snow',
          particleCount: Math.floor(intensity * 500),
          velocity: [0, -1 - intensity, 0],
          color: [1.0, 1.0, 1.0, 0.8],
          size: 0.2 + intensity * 0.1
        };
      case 'wind':
        return {
          type: 'wind',
          particleCount: Math.floor(intensity * 200),
          velocity: [2 + intensity * 3, 0, 0],
          color: [0.9, 0.9, 0.9, 0.3],
          size: 0.05
        };
      default:
        return null;
    }
  }

  // Utility functions
  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return [f(0), f(8), f(4)];
  }

  private colorTemperatureToRgb(kelvin: number): [number, number, number] {
    const temp = kelvin / 100;
    let red, green, blue;

    if (temp <= 66) {
      red = 255;
      green = Math.max(0, Math.min(255, 99.4708025861 * Math.log(temp) - 161.1195681661));
    } else {
      red = Math.max(0, Math.min(255, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
      green = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
    }

    if (temp >= 66) {
      blue = 255;
    } else if (temp <= 19) {
      blue = 0;
    } else {
      blue = Math.max(0, Math.min(255, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
    }

    return [red / 255, green / 255, blue / 255];
  }

  /**
   * Apply lighting preset to the scene
   */
  applyLightingPreset(preset: LightingPreset): void {
    this.activeLightingPreset = preset;
    console.log('Applied lighting preset:', preset.name);
    
    // In a real Unity/UE5 integration, this would communicate with the engine
    // For now, we'll simulate the application
    if (this.renderingContext.engine === 'unity') {
      this.sendToUnity('SetLighting', preset);
    } else if (this.renderingContext.engine === 'unreal') {
      this.sendToUnreal('ApplyLightingPreset', preset);
    }
  }

  private sendToUnity(command: string, data: any): void {
    // Unity WebGL communication bridge
    console.log('Unity Command:', command, data);
    // window.unityInstance?.SendMessage('GraphicsManager', command, JSON.stringify(data));
  }

  private sendToUnreal(command: string, data: any): void {
    // Unreal Engine Pixel Streaming communication
    console.log('Unreal Command:', command, data);
    // window.ue4?.emitUIInteraction(command, JSON.stringify(data));
  }

  /**
   * Get current biome information
   */
  getCurrentBiome(): BiomeState | null {
    return this.currentBiome;
  }

  /**
   * Get current rendering statistics
   */
  getRenderingStats(): any {
    return {
      engine: this.renderingContext.engine,
      quality: this.renderingContext.quality,
      activeLighting: this.activeLightingPreset?.name || 'None',
      naniteGeometryCount: this.naniteGeometryCache.size,
      lumenEnabled: this.lumenSettings.globalIllumination,
      rayTracingEnabled: this.lumenSettings.rayTracedReflections,
      triangleCount: Array.from(this.naniteGeometryCache.values())
        .reduce((sum, geo) => sum + geo.triangleCount, 0)
    };
  }
}

export default AdvancedGraphicsEngine;
