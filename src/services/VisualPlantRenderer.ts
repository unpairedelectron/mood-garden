// Visual Plant Renderer - Converts PlantDNA to SVG graphics
import type { PlantDNA } from '../types/advanced';

export class VisualPlantRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 300;
      this.canvas.height = 400;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  /**
   * Generate SVG representation of a plant from PlantDNA
   */
  generatePlantSVG(plantDNA: PlantDNA): string {
    const { visualTraits, growthTraits, behaviorTraits } = plantDNA;
    
    // Calculate dimensions based on growth traits
    const baseWidth = 150;
    const baseHeight = 200;
    const actualHeight = baseHeight * (0.5 + visualTraits.height * 0.5);
    const actualWidth = baseWidth * (0.7 + visualTraits.width * 0.3);
    
    // Generate stem path
    const stemPath = this.generateStemPath(actualHeight, visualTraits.stemColor, growthTraits.speed);
    
    // Generate leaves
    const leaves = this.generateLeaves(
      visualTraits.leafShape,
      visualTraits.leafSize,
      growthTraits.resilience,
      actualWidth
    );
    
    // Generate flowers if plant is mature enough
    const flowers = this.generateFlowers(
      visualTraits.flowerColor,
      visualTraits.flowerShape,
      growthTraits.speed,
      behaviorTraits.interactivity
    );
    
    // Add wind animation based on wind response
    const windAnimation = behaviorTraits.windResponse > 0.5 ? this.generateWindAnimation() : '';
    
    return `
      <svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ground" cx="50%" cy="100%" r="60%">
            <stop offset="0%" style="stop-color:#8B7355;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#5D4E37;stop-opacity:1" />
          </radialGradient>
          <linearGradient id="stemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${this.lightenColor(visualTraits.stemColor, 20)}" />
            <stop offset="100%" style="stop-color:${visualTraits.stemColor}" />
          </linearGradient>
          ${windAnimation}
        </defs>
        
        <!-- Ground -->
        <ellipse cx="150" cy="380" rx="100" ry="20" fill="url(#ground)" />
        
        <!-- Roots (subtle) -->
        <g opacity="0.3">
          ${this.generateRoots(growthTraits.resilience)}
        </g>
        
        <!-- Stem -->
        <path d="${stemPath}" stroke="url(#stemGradient)" stroke-width="8" fill="none" stroke-linecap="round" />
        
        <!-- Leaves -->
        <g class="leaves">
          ${leaves}
        </g>
        
        <!-- Flowers -->
        <g class="flowers">
          ${flowers}
        </g>
        
        <!-- Glow effect for magical plants -->
        ${behaviorTraits.interactivity > 0.7 ? this.generateGlowEffect() : ''}
        
        <!-- Particles for highly interactive plants -->
        ${behaviorTraits.interactivity > 0.8 ? this.generateParticles() : ''}
        
        <style>
          .leaves { animation: ${windAnimation ? 'gentle-sway 3s ease-in-out infinite' : 'none'}; }
          .flowers { animation: ${windAnimation ? 'flower-dance 4s ease-in-out infinite' : 'none'}; }
          
          @keyframes gentle-sway {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            50% { transform: translateX(2px) rotate(1deg); }
          }
          
          @keyframes flower-dance {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          
          .glow { 
            filter: drop-shadow(0 0 8px ${visualTraits.flowerColor}); 
            animation: glow-pulse 2s ease-in-out infinite;
          }
          
          @keyframes glow-pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 1; }
          }
        </style>
      </svg>
    `;
  }

  private generateStemPath(height: number, _color: string, growthSpeed: number): string {
    const startX = 150;
    const startY = 380;
    const endY = startY - height;
    
    // Add curve based on growth speed (faster growth = more curved)
    const curve = growthSpeed * 15;
    
    return `M ${startX} ${startY} Q ${startX + curve} ${startY - height/2} ${startX} ${endY}`;
  }

  private generateLeaves(
    shape: string, 
    size: string, 
    resilience: number, 
    _plantWidth: number
  ): string {
    const leafCount = Math.floor(3 + resilience * 4);
    const sizeMultiplier = size === 'large' ? 1.3 : size === 'small' ? 0.7 : 1;
    let leaves = '';
    
    for (let i = 0; i < leafCount; i++) {
      const y = 380 - (i + 1) * 30 - Math.random() * 20;
      const x = 150 + (i % 2 === 0 ? -1 : 1) * (15 + Math.random() * 15);
      const rotation = (Math.random() - 0.5) * 30;
      
      const leafSVG = this.generateLeafShape(shape, sizeMultiplier);
      
      leaves += `
        <g transform="translate(${x}, ${y}) rotate(${rotation})">
          ${leafSVG}
        </g>
      `;
    }
    
    return leaves;
  }

  private generateLeafShape(shape: string, sizeMultiplier: number): string {
    const size = 20 * sizeMultiplier;
    const color = this.generateLeafColor();
    
    switch (shape) {
      case 'round':
        return `<circle r="${size/2}" fill="${color}" />`;
      
      case 'oval':
        return `<ellipse rx="${size*0.6}" ry="${size*0.4}" fill="${color}" />`;
      
      case 'heart':
        return `<path d="M 0 ${size*0.3} C -${size*0.3} 0, -${size*0.3} -${size*0.3}, 0 -${size*0.1} C ${size*0.3} -${size*0.3}, ${size*0.3} 0, 0 ${size*0.3} Z" fill="${color}" />`;
      
      case 'pointed':
        return `<path d="M 0 ${size*0.4} L -${size*0.3} -${size*0.4} L 0 -${size*0.5} L ${size*0.3} -${size*0.4} Z" fill="${color}" />`;
      
      default: // serrated
        return `<path d="M 0 ${size*0.4} L -${size*0.2} ${size*0.1} L -${size*0.3} -${size*0.2} L -${size*0.1} -${size*0.3} L 0 -${size*0.5} L ${size*0.1} -${size*0.3} L ${size*0.3} -${size*0.2} L ${size*0.2} ${size*0.1} Z" fill="${color}" />`;
    }
  }

  private generateFlowers(
    color: string, 
    shape: string, 
    growthSpeed: number, 
    interactivity: number
  ): string {
    // Only show flowers if plant is mature enough
    if (growthSpeed < 0.4) return '';
    
    const flowerCount = Math.floor(1 + interactivity * 3);
    let flowers = '';
    
    for (let i = 0; i < flowerCount; i++) {
      const y = 200 - i * 40 - Math.random() * 30;
      const x = 150 + (Math.random() - 0.5) * 60;
      
      const flowerSVG = this.generateFlowerShape(shape, color, interactivity);
      
      flowers += `
        <g transform="translate(${x}, ${y})" class="${interactivity > 0.7 ? 'glow' : ''}">
          ${flowerSVG}
        </g>
      `;
    }
    
    return flowers;
  }

  private generateFlowerShape(shape: string, color: string, interactivity: number): string {
    const size = 15 + interactivity * 10;
    const centerColor = this.lightenColor(color, 30);
    
    switch (shape) {
      case 'star':
        return `
          <path d="M 0 -${size} L ${size*0.3} -${size*0.3} L ${size} 0 L ${size*0.3} ${size*0.3} L 0 ${size} L -${size*0.3} ${size*0.3} L -${size} 0 L -${size*0.3} -${size*0.3} Z" fill="${color}" />
          <circle r="${size*0.3}" fill="${centerColor}" />
        `;
      
      case 'bell':
        return `
          <path d="M 0 0 Q -${size} -${size*0.5} 0 -${size} Q ${size} -${size*0.5} 0 0 Z" fill="${color}" />
          <circle cx="0" cy="-${size*0.3}" r="${size*0.2}" fill="${centerColor}" />
        `;
      
      case 'cup':
        return `
          <path d="M -${size*0.7} 0 Q -${size*0.7} -${size*0.7} 0 -${size*0.5} Q ${size*0.7} -${size*0.7} ${size*0.7} 0 Z" fill="${color}" />
          <ellipse cx="0" cy="-${size*0.2}" rx="${size*0.4}" ry="${size*0.1}" fill="${centerColor}" />
        `;
      
      case 'tube':
        return `
          <rect x="-${size*0.3}" y="-${size}" width="${size*0.6}" height="${size}" fill="${color}" rx="${size*0.3}" />
          <circle cy="-${size*0.7}" r="${size*0.2}" fill="${centerColor}" />
        `;
      
      default: // cluster
        return `
          <circle cx="0" cy="0" r="${size*0.4}" fill="${color}" />
          <circle cx="-${size*0.3}" cy="-${size*0.2}" r="${size*0.3}" fill="${color}" opacity="0.8" />
          <circle cx="${size*0.3}" cy="-${size*0.2}" r="${size*0.3}" fill="${color}" opacity="0.8" />
          <circle cx="0" cy="-${size*0.4}" r="${size*0.2}" fill="${centerColor}" />
        `;
    }
  }

  private generateRoots(resilience: number): string {
    const rootCount = Math.floor(2 + resilience * 3);
    let roots = '';
    
    for (let i = 0; i < rootCount; i++) {
      const angle = (i / rootCount) * Math.PI + Math.PI;
      const length = 30 + resilience * 20;
      const endX = 150 + Math.cos(angle) * length;
      const endY = 380 + Math.sin(angle) * (length * 0.3);
      
      roots += `<path d="M 150 380 Q ${150 + Math.cos(angle) * length * 0.5} ${380 + Math.sin(angle) * length * 0.15} ${endX} ${endY}" stroke="#8B7355" stroke-width="2" fill="none" />`;
    }
    
    return roots;
  }

  private generateWindAnimation(): string {
    return `
      <animateTransform
        attributeName="transform"
        type="rotate"
        values="0 150 300;2 150 300;0 150 300;-1 150 300;0 150 300"
        dur="4s"
        repeatCount="indefinite"
      />
    `;
  }

  private generateGlowEffect(): string {
    return `
      <circle cx="150" cy="250" r="80" fill="none" stroke="${this.generateLeafColor()}" stroke-width="1" opacity="0.3">
        <animate attributeName="r" values="80;90;80" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
    `;
  }

  private generateParticles(): string {
    let particles = '';
    for (let i = 0; i < 5; i++) {
      const x = 130 + Math.random() * 40;
      const y = 200 + Math.random() * 100;
      particles += `
        <circle cx="${x}" cy="${y}" r="2" fill="#FFD700" opacity="0.7">
          <animate attributeName="cy" values="${y};${y-30};${y}" dur="${2+Math.random()*2}s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.7;0;0.7" dur="${2+Math.random()*2}s" repeatCount="indefinite" />
        </circle>
      `;
    }
    return particles;
  }

  private generateLeafColor(): string {
    const leafColors = ['#228B22', '#32CD32', '#90EE90', '#006400', '#9ACD32'];
    return leafColors[Math.floor(Math.random() * leafColors.length)];
  }

  private lightenColor(color: string, percent: number): string {
    // Simple color lightening - in production, use a proper color library
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + percent);
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + percent);
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + percent);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Generate a procedural plant image as base64 data URL
   */
  async generatePlantImage(plantDNA: PlantDNA): Promise<string> {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas not available');
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Create SVG data URL
    const svgString = this.generatePlantSVG(plantDNA);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.ctx!.drawImage(img, 0, 0);
        const dataUrl = this.canvas!.toDataURL('image/png');
        URL.revokeObjectURL(svgUrl);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = svgUrl;
    });
  }
}

export default VisualPlantRenderer;
