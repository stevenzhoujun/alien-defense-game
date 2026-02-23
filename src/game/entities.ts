import { Point, Entity, PowerUpType } from '../types';
import { COLORS, MISSILE_SPEED, EXPLOSION_RADIUS, EXPLOSION_DURATION, GAME_HEIGHT } from '../constants';

export class Rocket implements Entity {
  id: string = Math.random().toString(36).substr(2, 9);
  pos: Point;
  target: Point;
  speed: number;
  angle: number;
  isDestroyed: boolean = false;
  pulse: number = 0;

  constructor(start: Point, target: Point, speed: number) {
    this.pos = { ...start };
    this.target = { ...target };
    this.speed = speed;
    this.angle = Math.atan2(target.y - start.y, target.x - start.x);
  }

  update(dt: number): boolean {
    if (this.isDestroyed) return false;
    
    this.pos.x += Math.cos(this.angle) * this.speed * dt;
    this.pos.y += Math.sin(this.angle) * this.speed * dt;
    this.pulse += dt * 0.005;

    if (this.pos.y >= this.target.y) {
      return false;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle + Math.PI / 2);
    
    // Alien Warship Body
    const glow = Math.sin(this.pulse) * 5 + 5;
    ctx.shadowBlur = glow;
    ctx.shadowColor = COLORS.ROCKET;
    
    ctx.fillStyle = COLORS.ROCKET;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(10, 5);
    ctx.lineTo(15, 15);
    ctx.lineTo(-15, 15);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fill();

    // Core
    ctx.fillStyle = COLORS.ROCKET_CORE;
    ctx.beginPath();
    ctx.arc(0, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Side lights
    ctx.fillStyle = '#fff';
    ctx.fillRect(-8, 10, 2, 2);
    ctx.fillRect(6, 10, 2, 2);

    ctx.restore();
  }
}

export class Missile implements Entity {
  id: string = Math.random().toString(36).substr(2, 9);
  pos: Point;
  target: Point;
  speed: number = MISSILE_SPEED;
  angle: number;
  onExplode: (pos: Point) => void;
  color: string = COLORS.MISSILE;

  constructor(start: Point, target: Point, onExplode: (pos: Point) => void, speedMultiplier: number = 1) {
    this.pos = { ...start };
    this.target = { ...target };
    this.angle = Math.atan2(target.y - start.y, target.x - start.x);
    this.onExplode = onExplode;
    this.speed = MISSILE_SPEED * speedMultiplier;
  }

  update(dt: number): boolean {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const moveDist = this.speed * dt;
    if (moveDist >= dist) {
      this.onExplode(this.target);
      return false;
    }

    this.pos.x += Math.cos(this.angle) * moveDist;
    this.pos.y += Math.sin(this.angle) * moveDist;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x - Math.cos(this.angle) * 15, this.pos.y - Math.sin(this.angle) * 15);
    ctx.stroke();
    ctx.restore();
  }
}

export class Explosion implements Entity {
  id: string = Math.random().toString(36).substr(2, 9);
  pos: Point;
  radius: number = 0;
  maxRadius: number = EXPLOSION_RADIUS;
  duration: number = EXPLOSION_DURATION;
  elapsed: number = 0;

  constructor(pos: Point, radiusMultiplier: number = 1) {
    this.pos = { ...pos };
    this.maxRadius = EXPLOSION_RADIUS * radiusMultiplier;
  }

  update(dt: number): boolean {
    this.elapsed += dt;
    const progress = this.elapsed / this.duration;
    if (progress >= 1) return false;

    if (progress < 0.5) {
      this.radius = (progress / 0.5) * this.maxRadius;
    } else {
      this.radius = (1 - (progress - 0.5) / 0.5) * this.maxRadius;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, this.radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, COLORS.EXPLOSION);
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class PowerUp implements Entity {
  id: string = Math.random().toString(36).substr(2, 9);
  pos: Point;
  type: PowerUpType;
  speed: number = 0.1;
  pulse: number = 0;

  constructor(pos: Point, type: PowerUpType) {
    this.pos = { ...pos };
    this.type = type;
  }

  update(dt: number): boolean {
    this.pos.y += this.speed * dt;
    this.pulse += dt * 0.005;
    return this.pos.y < GAME_HEIGHT;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const color = this.getColor();
    const glow = Math.sin(this.pulse) * 10 + 10;
    
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = this.type[0];
    ctx.fillText(icon, this.pos.x, this.pos.y);
    ctx.restore();
  }

  getColor() {
    switch(this.type) {
      case PowerUpType.SHIELD: return COLORS.POWERUP_SHIELD;
      case PowerUpType.FAST_MISSILE: return COLORS.POWERUP_SPEED;
      case PowerUpType.BIG_EXPLOSION: return COLORS.POWERUP_BIG;
      case PowerUpType.MULTI_SHOT: return COLORS.POWERUP_MULTI;
    }
  }
}

export class Battery {
  id: string;
  x: number;
  ammo: number;
  maxAmmo: number;
  isDisabled: boolean = false;
  hasShield: boolean = false;
  pulse: number = 0;

  constructor(id: string, x: number, maxAmmo: number) {
    this.id = id;
    this.x = x;
    this.ammo = maxAmmo;
    this.maxAmmo = maxAmmo;
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.pulse += 0.05;
    const glow = Math.sin(this.pulse) * 5 + 10;
    
    ctx.save();
    if (!this.isDisabled) {
      ctx.shadowBlur = glow;
      ctx.shadowColor = COLORS.BATTERY_GLOW;
    }

    // Base - Dreamy Crystal Style
    const gradient = ctx.createLinearGradient(this.x - 30, GAME_HEIGHT - 30, this.x + 30, GAME_HEIGHT);
    gradient.addColorStop(0, this.isDisabled ? '#475569' : COLORS.BATTERY);
    gradient.addColorStop(1, this.isDisabled ? '#1e293b' : '#1e3a8a');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, GAME_HEIGHT, 35, Math.PI, 0);
    ctx.fill();
    
    // Turret
    ctx.fillStyle = this.isDisabled ? '#64748b' : COLORS.BATTERY_GLOW;
    ctx.fillRect(this.x - 6, GAME_HEIGHT - 45, 12, 25);
    
    // Shield
    if (this.hasShield) {
      ctx.strokeStyle = COLORS.POWERUP_SHIELD;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, GAME_HEIGHT, 50, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fill();
    }

    // Ammo bar
    const barWidth = 50;
    const ammoWidth = (this.ammo / this.maxAmmo) * barWidth;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(this.x - barWidth/2, GAME_HEIGHT - 60, barWidth, 6);
    ctx.fillStyle = this.ammo > 0 ? COLORS.BATTERY_GLOW : '#ef4444';
    ctx.fillRect(this.x - barWidth/2, GAME_HEIGHT - 60, ammoWidth, 6);
    ctx.restore();
  }
}

export class Building {
  id: string;
  x: number;
  width: number;
  height: number;
  isDestroyed: boolean = false;

  constructor(id: string, x: number, width: number, height: number) {
    this.id = id;
    this.x = x;
    this.width = width;
    this.height = height;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isDestroyed) return;
    
    const gradient = ctx.createLinearGradient(this.x, GAME_HEIGHT - this.height, this.x + this.width, GAME_HEIGHT);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, COLORS.CITY);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x, GAME_HEIGHT - this.height, this.width, this.height);
    
    // Windows with glow
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < this.width; i += 12) {
      for (let j = 0; j < this.height; j += 18) {
        if (Math.random() > 0.4) {
           ctx.fillRect(this.x + i + 3, GAME_HEIGHT - this.height + j + 3, 6, 12);
        }
      }
    }
  }
}
