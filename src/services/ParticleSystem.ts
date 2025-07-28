// Advanced Particle System for MoodGarden 3D Effects
// Handles magical sparkles, pollen, weather effects, and creature trails

export interface Particle {
  id: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  type: 'sparkle' | 'pollen' | 'rain' | 'mist' | 'magic' | 'love' | 'trail';
  behavior: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.startAnimation();
  }

  // Create magical sparkles around plants
  createMagicalSparkles(
    centerX: number, 
    centerY: number, 
    count: number = 10,
    emotion: string = 'neutral'
  ): void {
    const colors = this.getEmotionColors(emotion);
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 30 + Math.random() * 50;
      
      const particle: Particle = {
        id: `sparkle-${Date.now()}-${i}`,
        position: {
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          z: Math.random() * 20 - 10
        },
        velocity: {
          x: Math.cos(angle) * 0.5,
          y: Math.sin(angle) * 0.5 - 1,
          z: (Math.random() - 0.5) * 0.3
        },
        acceleration: {
          x: 0,
          y: 0.02,
          z: 0
        },
        life: 0,
        maxLife: 120 + Math.random() * 60,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        type: 'sparkle',
        behavior: 'float'
      };
      
      this.particles.push(particle);
    }
  }

  // Create pollen particles for plant interactions
  createPollenBurst(
    centerX: number, 
    centerY: number, 
    plantType: string,
    count: number = 15
  ): void {
    const colors = this.getPlantPollenColors(plantType);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      
      const particle: Particle = {
        id: `pollen-${Date.now()}-${i}`,
        position: {
          x: centerX,
          y: centerY,
          z: Math.random() * 10 - 5
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 0.5,
          z: (Math.random() - 0.5) * 0.5
        },
        acceleration: {
          x: Math.random() * 0.02 - 0.01,
          y: 0.01,
          z: 0
        },
        life: 0,
        maxLife: 180 + Math.random() * 120,
        size: 1 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.8,
        type: 'pollen',
        behavior: 'drift'
      };
      
      this.particles.push(particle);
    }
  }

  // Create love particles for romantic interactions
  createLoveParticles(
    centerX: number, 
    centerY: number, 
    count: number = 8
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const particle: Particle = {
        id: `love-${Date.now()}-${i}`,
        position: {
          x: centerX,
          y: centerY,
          z: 0
        },
        velocity: {
          x: Math.cos(angle) * 0.3,
          y: Math.sin(angle) * 0.3 - 1,
          z: 0
        },
        acceleration: {
          x: 0,
          y: -0.02,
          z: 0
        },
        life: 0,
        maxLife: 200,
        size: 8,
        color: '#ff69b4',
        opacity: 1,
        type: 'love',
        behavior: 'heart'
      };
      
      this.particles.push(particle);
    }
  }

  // Create creature trails
  createCreatureTrail(
    x: number, 
    y: number, 
    creatureType: string
  ): void {
    const colors = this.getCreatureTrailColors(creatureType);
    
    const particle: Particle = {
      id: `trail-${Date.now()}`,
      position: { x, y, z: 0 },
      velocity: {
        x: (Math.random() - 0.5) * 0.2,
        y: (Math.random() - 0.5) * 0.2,
        z: 0
      },
      acceleration: { x: 0, y: 0, z: 0 },
      life: 0,
      maxLife: 60,
      size: 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 0.6,
      type: 'trail',
      behavior: 'fade'
    };
    
    this.particles.push(particle);
  }

  // Create weather effects
  createWeatherEffect(weatherType: string, intensity: number = 1): void {
    switch (weatherType) {
      case 'rain':
        this.createRainParticles(intensity);
        break;
      case 'mist':
        this.createMistParticles(intensity);
        break;
      case 'snow':
        this.createSnowParticles(intensity);
        break;
    }
  }

  private createRainParticles(intensity: number): void {
    const count = Math.floor(20 * intensity);
    
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: `rain-${Date.now()}-${i}`,
        position: {
          x: Math.random() * (this.canvas?.width || 800),
          y: -10,
          z: Math.random() * 100 - 50
        },
        velocity: {
          x: Math.random() * 2 - 1,
          y: 3 + Math.random() * 2,
          z: 0
        },
        acceleration: { x: 0, y: 0.1, z: 0 },
        life: 0,
        maxLife: 300,
        size: 1,
        color: 'rgba(135, 206, 235, 0.6)',
        opacity: 0.6,
        type: 'rain',
        behavior: 'fall'
      };
      
      this.particles.push(particle);
    }
  }

  private createMistParticles(intensity: number): void {
    const count = Math.floor(15 * intensity);
    
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: `mist-${Date.now()}-${i}`,
        position: {
          x: Math.random() * (this.canvas?.width || 800),
          y: Math.random() * (this.canvas?.height || 600),
          z: Math.random() * 50 - 25
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.3,
          z: 0
        },
        acceleration: { x: 0, y: 0, z: 0 },
        life: 0,
        maxLife: 600 + Math.random() * 300,
        size: 20 + Math.random() * 30,
        color: 'rgba(255, 255, 255, 0.1)',
        opacity: 0.1,
        type: 'mist',
        behavior: 'float'
      };
      
      this.particles.push(particle);
    }
  }

  private createSnowParticles(intensity: number): void {
    const count = Math.floor(25 * intensity);
    
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: `snow-${Date.now()}-${i}`,
        position: {
          x: Math.random() * (this.canvas?.width || 800),
          y: -10,
          z: Math.random() * 100 - 50
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: 0.5 + Math.random() * 1,
          z: 0
        },
        acceleration: { x: 0, y: 0.01, z: 0 },
        life: 0,
        maxLife: 500,
        size: 2 + Math.random() * 3,
        color: 'rgba(255, 255, 255, 0.9)',
        opacity: 0.9,
        type: 'rain',
        behavior: 'flutter'
      };
      
      this.particles.push(particle);
    }
  }

  // Helper methods for colors
  private getEmotionColors(emotion: string): string[] {
    const colorMappings: Record<string, string[]> = {
      happy: ['#FFD700', '#FFA500', '#FF6347', '#FF69B4'],
      sad: ['#87CEEB', '#4682B4', '#6495ED', '#B0C4DE'],
      calm: ['#98FB98', '#90EE90', '#87CEEB', '#E0FFFF'],
      angry: ['#FF4500', '#DC143C', '#B22222', '#8B0000'],
      love: ['#FF69B4', '#FF1493', '#DC143C', '#FFB6C1'],
      excited: ['#FF6347', '#FF4500', '#FFD700', '#FFA500'],
      peaceful: ['#E6E6FA', '#D8BFD8', '#DDA0DD', '#F0E68C'],
      neutral: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#D3D3D3']
    };
    
    return colorMappings[emotion] || colorMappings.neutral;
  }

  private getPlantPollenColors(plantType: string): string[] {
    const pollenColors: Record<string, string[]> = {
      lavender: ['#9370DB', '#DDA0DD', '#DA70D6'],
      rose: ['#FF69B4', '#FFB6C1', '#FFC0CB'],
      sunflower: ['#FFD700', '#FFA500', '#FFFF00'],
      lotus: ['#FFB6C1', '#FF69B4', '#FFFFFF'],
      willow: ['#9ACD32', '#ADFF2F', '#7CFC00'],
      bamboo: ['#228B22', '#32CD32', '#7CFC00'],
      cherry: ['#FFB6C1', '#FF69B4', '#FFFFFF']
    };
    
    return pollenColors[plantType] || ['#FFFF00', '#FFD700'];
  }

  private getCreatureTrailColors(creatureType: string): string[] {
    const trailColors: Record<string, string[]> = {
      butterfly: ['#FF69B4', '#FFB6C1', '#DDA0DD'],
      firefly: ['#FFD700', '#FFFF00', '#FFA500'],
      bird: ['#87CEEB', '#B0C4DE', '#E0FFFF'],
      bee: ['#FFD700', '#FFA500', '#000000'],
      dragonfly: ['#40E0D0', '#48D1CC', '#00CED1']
    };
    
    return trailColors[creatureType] || ['#FFFFFF'];
  }

  // Animation and rendering
  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update physics
      particle.velocity.x += particle.acceleration.x;
      particle.velocity.y += particle.acceleration.y;
      particle.velocity.z += particle.acceleration.z;
      
      particle.position.x += particle.velocity.x;
      particle.position.y += particle.velocity.y;
      particle.position.z += particle.velocity.z;
      
      // Update life
      particle.life++;
      
      // Update opacity based on life
      const lifeRatio = particle.life / particle.maxLife;
      particle.opacity = 1 - lifeRatio;
      
      // Apply behaviors
      this.applyBehavior(particle);
      
      // Remove dead particles
      if (particle.life >= particle.maxLife || this.isOffScreen(particle)) {
        this.particles.splice(i, 1);
      }
    }
  }

  private applyBehavior(particle: Particle): void {
    const time = Date.now() * 0.001;
    
    switch (particle.behavior) {
      case 'float':
        particle.velocity.x += Math.sin(time + particle.position.x * 0.01) * 0.01;
        particle.velocity.y += Math.cos(time + particle.position.y * 0.01) * 0.01;
        break;
        
      case 'drift':
        particle.velocity.x += (Math.random() - 0.5) * 0.01;
        particle.velocity.y += (Math.random() - 0.5) * 0.01;
        break;
        
      case 'heart':
        // Create heart-shaped movement
        const t = particle.life * 0.1;
        particle.velocity.x = Math.sin(t) * 0.5;
        particle.velocity.y = (Math.cos(t) - Math.cos(2 * t) / 2) * -0.3;
        break;
        
      case 'fall':
        particle.acceleration.y = 0.05;
        break;
        
      case 'flutter':
        particle.velocity.x += Math.sin(time * 3 + particle.position.x * 0.1) * 0.02;
        break;
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    
    // Sort particles by z-index for proper depth
    this.particles.sort((a, b) => a.position.z - b.position.z);
    
    for (const particle of this.particles) {
      this.renderParticle(particle);
    }
  }

  private renderParticle(particle: Particle): void {
    if (!this.ctx) return;
    
    this.ctx.save();
    this.ctx.globalAlpha = particle.opacity;
    
    // Calculate screen position with perspective
    const perspective = 1000;
    const scale = perspective / (perspective + particle.position.z);
    const screenX = particle.position.x * scale;
    const screenY = particle.position.y * scale;
    const screenSize = particle.size * scale;
    
    switch (particle.type) {
      case 'sparkle':
        this.renderSparkle(screenX, screenY, screenSize, particle.color);
        break;
        
      case 'pollen':
        this.renderPollen(screenX, screenY, screenSize, particle.color);
        break;
        
      case 'love':
        this.renderHeart(screenX, screenY, screenSize, particle.color);
        break;
        
      case 'trail':
        this.renderTrail(screenX, screenY, screenSize, particle.color);
        break;
        
      default:
        this.renderDefault(screenX, screenY, screenSize, particle.color);
        break;
    }
    
    this.ctx.restore();
  }

  private renderSparkle(x: number, y: number, size: number, color: string): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = size * 2;
    
    // Draw star shape
    this.ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const radius = i % 2 === 0 ? size : size / 3;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private renderPollen(x: number, y: number, size: number, color: string): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderHeart(x: number, y: number, size: number, color: string): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = size;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + size / 2);
    this.ctx.bezierCurveTo(x - size, y - size / 2, x - size * 2, y + size / 2, x, y + size * 2);
    this.ctx.bezierCurveTo(x + size * 2, y + size / 2, x + size, y - size / 2, x, y + size / 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private renderTrail(x: number, y: number, size: number, color: string): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderDefault(x: number, y: number, size: number, color: string): void {
    if (!this.ctx) return;
    
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private isOffScreen(particle: Particle): boolean {
    if (!this.canvas) return true;
    
    return (
      particle.position.x < -50 ||
      particle.position.x > this.canvas.width + 50 ||
      particle.position.y < -50 ||
      particle.position.y > this.canvas.height + 50
    );
  }

  // Public methods
  clear(): void {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particles = [];
  }
}
