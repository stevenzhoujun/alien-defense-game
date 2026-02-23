import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Rocket, Missile, Explosion, Building, Battery, PowerUp } from './game/entities';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  COLORS, 
  ROCKET_BASE_SPEED, 
  ROCKET_SPEED_INCREMENT, 
  ROCKET_SPEED_STEP,
  INITIAL_AMMO,
  SCORES,
  WINNING_SCORE,
  POWERUP_DURATION
} from './constants';
import { Point, Language, translations, PowerUpType } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Skull, Play, Languages, Volume2, VolumeX, Info, Zap, Shield, Target, Layers } from 'lucide-react';

// --- Audio Helper ---
const playSound = (type: 'launch' | 'explode' | 'win' | 'lose' | 'hit' | 'powerup', muted: boolean) => {
  if (muted) return;
  const frequencies = {
    launch: [200, 400, 100],
    explode: [100, 50, 20],
    win: [400, 500, 600, 800],
    lose: [300, 200, 100],
    hit: [150, 100, 50],
    powerup: [300, 600, 900]
  };
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const freq = frequencies[type];
  const now = ctx.currentTime;
  
  if (type === 'explode' || type === 'hit') {
    osc.type = 'sawtooth';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.frequency.setValueAtTime(freq[0], now);
    osc.frequency.exponentialRampToValueAtTime(freq[2], now + 0.5);
    osc.start();
    osc.stop(now + 0.5);
  } else if (type === 'launch') {
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.frequency.setValueAtTime(freq[0], now);
    osc.frequency.exponentialRampToValueAtTime(freq[1], now + 0.3);
    osc.start();
    osc.stop(now + 0.3);
  } else if (type === 'powerup') {
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    freq.forEach((f, i) => {
      osc.frequency.setValueAtTime(f, now + i * 0.1);
    });
    osc.start();
    osc.stop(now + 0.5);
  } else {
    osc.type = 'square';
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
    freq.forEach((f, i) => {
      osc.frequency.setValueAtTime(f, now + i * 0.2);
    });
    osc.start();
    osc.stop(now + 1);
  }
};

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'victory' | 'defeat'>('menu');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('neo_lang');
    return (saved as Language) || Language.ZH;
  });
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rocketsDestroyed, setRocketsDestroyed] = useState(0);
  const [remainingAmmoCount, setRemainingAmmoCount] = useState(0);
  const [activeSkills, setActiveSkills] = useState<Record<PowerUpType, number>>({
    [PowerUpType.SHIELD]: 0,
    [PowerUpType.FAST_MISSILE]: 0,
    [PowerUpType.BIG_EXPLOSION]: 0,
    [PowerUpType.MULTI_SHOT]: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Game Entities
  const rocketsRef = useRef<Rocket[]>([]);
  const missilesRef = useRef<Missile[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const buildingsRef = useRef<Building[]>([]);
  const batteriesRef = useRef<Battery[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const targetPosRef = useRef<Point | null>(null);
  const spawnTimerRef = useRef<number>(0);

  const t = translations[lang];

  const toggleLang = () => {
    const next = lang === Language.EN ? Language.ZH : Language.EN;
    setLang(next);
    localStorage.setItem('neo_lang', next);
  };

  const initGame = useCallback(() => {
    rocketsRef.current = [];
    missilesRef.current = [];
    explosionsRef.current = [];
    powerUpsRef.current = [];
    
    // Init Buildings
    const buildings: Building[] = [];
    const buildingWidth = 60;
    const spacing = 20;
    const startX = 100;
    for (let i = 0; i < 6; i++) {
        const x = startX + i * (buildingWidth + spacing);
        if (Math.abs(x - 50) < 40 || Math.abs(x - 400) < 40 || Math.abs(x - 750) < 40) continue;
        buildings.push(new Building(`b${i}`, x, buildingWidth, 40 + Math.random() * 60));
    }
    buildingsRef.current = buildings;

    // Init Batteries
    batteriesRef.current = [
      new Battery('L', 50, INITIAL_AMMO.LEFT),
      new Battery('M', 400, INITIAL_AMMO.MIDDLE),
      new Battery('R', 750, INITIAL_AMMO.RIGHT),
    ];

    setScore(0);
    setRocketsDestroyed(0);
    setActiveSkills({
      [PowerUpType.SHIELD]: 0,
      [PowerUpType.FAST_MISSILE]: 0,
      [PowerUpType.BIG_EXPLOSION]: 0,
      [PowerUpType.MULTI_SHOT]: 0,
    });
    setGameState('playing');
    lastTimeRef.current = performance.now();
  }, []);

  const handleFire = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Check if clicking a power-up
    let powerUpCollected = false;
    powerUpsRef.current = powerUpsRef.current.filter(p => {
      const dx = p.pos.x - x;
      const dy = p.pos.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        collectPowerUp(p.type);
        powerUpCollected = true;
        return false;
      }
      return true;
    });

    if (powerUpCollected) return;

    // Don't fire if clicking UI area or too low
    if (y > GAME_HEIGHT - 60) return;

    targetPosRef.current = { x, y };

    // Find closest battery with ammo
    let bestBattery: Battery | null = null;
    let minDist = Infinity;

    batteriesRef.current.forEach(b => {
      if (b.ammo > 0 && !b.isDisabled) {
        const dist = Math.abs(b.x - x);
        if (dist < minDist) {
          minDist = dist;
          bestBattery = b;
        }
      }
    });

    if (bestBattery) {
      const isMultiShot = activeSkills[PowerUpType.MULTI_SHOT] > 0;
      const speedMult = activeSkills[PowerUpType.FAST_MISSILE] > 0 ? 2 : 1;
      const radiusMult = activeSkills[PowerUpType.BIG_EXPLOSION] > 0 ? 2 : 1;

      const fire = (targetX: number, targetY: number) => {
        (bestBattery as Battery).ammo--;
        playSound('launch', muted);
        missilesRef.current.push(new Missile(
          { x: (bestBattery as Battery).x, y: GAME_HEIGHT - 40 },
          { x: targetX, y: targetY },
          (pos) => {
            playSound('explode', muted);
            explosionsRef.current.push(new Explosion(pos, radiusMult));
          },
          speedMult
        ));
      };

      fire(x, y);

      if (isMultiShot) {
        if ((bestBattery as Battery).ammo > 0) fire(x - 40, y);
        if ((bestBattery as Battery).ammo > 0) fire(x + 40, y);
      }
    }
  };

  const collectPowerUp = (type: PowerUpType) => {
    playSound('powerup', muted);
    setActiveSkills(prev => ({
      ...prev,
      [type]: Date.now() + POWERUP_DURATION
    }));
    
    if (type === PowerUpType.SHIELD) {
      batteriesRef.current.forEach(b => b.hasShield = true);
    }
  };

  const update = useCallback((time: number) => {
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // Always draw background and stars
      ctx.fillStyle = COLORS.BACKGROUND;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Stars
      ctx.fillStyle = 'white';
      for(let i=0; i<80; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * GAME_WIDTH;
        const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * GAME_HEIGHT;
        const size = Math.random() * 2;
        ctx.globalAlpha = Math.random();
        ctx.fillRect(x, y, size, size);
      }
      ctx.globalAlpha = 1;

      if (gameState === 'playing') {
        // Update Skill Timers
        const now = Date.now();
        let skillsChanged = false;
        const newSkills = { ...activeSkills };
        for (const type in newSkills) {
          if (newSkills[type as PowerUpType] > 0 && now > newSkills[type as PowerUpType]) {
            newSkills[type as PowerUpType] = 0;
            skillsChanged = true;
            if (type === PowerUpType.SHIELD) {
              batteriesRef.current.forEach(b => b.hasShield = false);
            }
          }
        }
        if (skillsChanged) setActiveSkills(newSkills);

        // Spawn Rockets
        spawnTimerRef.current += dt;
        const currentRocketSpeed = ROCKET_BASE_SPEED + Math.floor(score / ROCKET_SPEED_STEP) * ROCKET_SPEED_INCREMENT;
        const spawnInterval = Math.max(800, 2500 - (score / 100) * 150);

        if (spawnTimerRef.current > spawnInterval) {
          spawnTimerRef.current = 0;
          const startX = Math.random() * GAME_WIDTH;
          const targets = [...buildingsRef.current.filter(b => !b.isDestroyed), ...batteriesRef.current];
          const targetEntity = targets[Math.floor(Math.random() * targets.length)];
          const targetX = targetEntity ? (targetEntity as any).x : Math.random() * GAME_WIDTH;
          
          rocketsRef.current.push(new Rocket(
            { x: startX, y: -20 },
            { x: targetX, y: GAME_HEIGHT },
            currentRocketSpeed
          ));
        }

        // Update Entities
        rocketsRef.current = rocketsRef.current.filter(r => r.update(dt));
        missilesRef.current = missilesRef.current.filter(m => m.update(dt));
        explosionsRef.current = explosionsRef.current.filter(e => e.update(dt));
        powerUpsRef.current = powerUpsRef.current.filter(p => p.update(dt));

        // Collision Detection: Explosion vs Rockets
        explosionsRef.current.forEach(exp => {
          rocketsRef.current.forEach(rock => {
            const dx = exp.pos.x - rock.pos.x;
            const dy = exp.pos.y - rock.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < exp.radius) {
              rock.isDestroyed = true;
              setScore(s => s + SCORES.ROCKET_DESTROYED);
              setRocketsDestroyed(d => d + 1);
              
              // Random PowerUp Drop
              if (Math.random() < 0.15) {
                const types = Object.values(PowerUpType);
                const type = types[Math.floor(Math.random() * types.length)];
                powerUpsRef.current.push(new PowerUp(rock.pos, type));
              }
            }
          });
        });

        // Collision Detection: Rocket vs City/Batteries
        rocketsRef.current.forEach(rock => {
          batteriesRef.current.forEach(bat => {
            if (!bat.isDisabled && Math.abs(rock.pos.x - bat.x) < 30 && rock.pos.y > GAME_HEIGHT - 35) {
              if (bat.hasShield) {
                bat.hasShield = false;
                setActiveSkills(prev => ({ ...prev, [PowerUpType.SHIELD]: 0 }));
              } else {
                bat.isDisabled = true;
              }
              rock.isDestroyed = true;
              playSound('hit', muted);
            }
          });
          buildingsRef.current.forEach(build => {
            if (!build.isDestroyed && rock.pos.x > build.x && rock.pos.x < build.x + build.width && rock.pos.y > GAME_HEIGHT - build.height) {
              build.isDestroyed = true;
              rock.isDestroyed = true;
              playSound('hit', muted);
            }
          });
        });

        // Win/Loss Conditions
        if (score >= WINNING_SCORE) {
          const remainingAmmo = batteriesRef.current.reduce((acc, b) => acc + b.ammo, 0);
          setRemainingAmmoCount(remainingAmmo);
          setScore(s => s + remainingAmmo * SCORES.AMMO_BONUS);
          setGameState('victory');
          playSound('win', muted);
        }

        const allBatteriesDown = batteriesRef.current.every(b => b.isDisabled || b.ammo === 0);
        const allBuildingsDown = buildingsRef.current.every(b => b.isDestroyed);
        
        if ((allBatteriesDown && missilesRef.current.length === 0 && explosionsRef.current.length === 0) || allBuildingsDown) {
           if (rocketsRef.current.length === 0 || allBuildingsDown) {
              setGameState('defeat');
              playSound('lose', muted);
           }
        }
      }

      // Draw Entities
      buildingsRef.current.forEach(b => b.draw(ctx));
      batteriesRef.current.forEach(b => b.draw(ctx));
      rocketsRef.current.forEach(r => r.draw(ctx));
      missilesRef.current.forEach(m => m.draw(ctx));
      explosionsRef.current.forEach(e => e.draw(ctx));
      powerUpsRef.current.forEach(p => p.draw(ctx));

      // Draw Target X
      if (gameState === 'playing' && targetPosRef.current) {
        ctx.strokeStyle = COLORS.TARGET;
        ctx.lineWidth = 1;
        const { x, y } = targetPosRef.current;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x + 5, y - 5);
        ctx.lineTo(x - 5, y + 5);
        ctx.stroke();
      }
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, score, muted]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  useEffect(() => {
    console.log('Game State:', gameState);
  }, [gameState]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans flex flex-col items-center justify-center p-4">
      
      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-30 pointer-events-none">
          <div className="flex flex-col gap-2">
            <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-2xl">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">{t.score}</div>
              <div className="text-2xl md:text-3xl font-bold tabular-nums">
                {score}
              </div>
            </div>
            
            {/* Active Skills UI */}
            <div className="flex gap-2">
              {activeSkills[PowerUpType.SHIELD] > 0 && <SkillBadge icon={<Shield size={14}/>} color="bg-blue-500" label={t.skillShield} />}
              {activeSkills[PowerUpType.FAST_MISSILE] > 0 && <SkillBadge icon={<Zap size={14}/>} color="bg-yellow-500" label={t.skillFast} />}
              {activeSkills[PowerUpType.BIG_EXPLOSION] > 0 && <SkillBadge icon={<Target size={14}/>} color="bg-orange-500" label={t.skillBig} />}
              {activeSkills[PowerUpType.MULTI_SHOT] > 0 && <SkillBadge icon={<Layers size={14}/>} color="bg-purple-500" label={t.skillMulti} />}
            </div>
          </div>
          
          <div className="flex gap-2">
            {batteriesRef.current.map(b => (
              <div key={b.id} className="bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/20 flex flex-col items-center min-w-[50px] md:min-w-[60px] shadow-2xl">
                <div className="text-[8px] md:text-[10px] uppercase tracking-tighter text-slate-400">{b.id}</div>
                <div className={`text-sm md:text-lg font-bold ${b.ammo === 0 ? 'text-red-500' : 'text-cyan-400'}`}>{b.ammo}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <div className="relative w-full max-w-[1000px] aspect-[4/3] bg-black shadow-[0_0_80px_rgba(34,211,238,0.2)] rounded-3xl overflow-hidden border-4 border-slate-900">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="w-full h-full block"
          onMouseDown={handleFire}
          onTouchStart={handleFire}
        />

        {/* Controls Overlay */}
        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/60 uppercase tracking-widest flex items-center gap-2 z-20 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            <Info size={12} />
            {window.matchMedia('(pointer: coarse)').matches ? t.touchToFire : t.clickToFire}
          </div>
        )}

        {/* UI Overlays */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-50">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-4 text-white bg-gradient-to-b from-white to-cyan-500 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-slate-400 max-w-md mb-10 text-sm md:text-base leading-relaxed">
              {t.howToPlayDesc}
            </p>

            <div className="flex flex-col gap-4 w-full max-w-xs">
              <button 
                onClick={initGame}
                className="px-8 py-5 bg-cyan-500 text-white font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-2xl shadow-cyan-500/20"
              >
                <Play size={20} fill="currentColor" />
                <span className="text-lg uppercase tracking-widest">{t.start}</span>
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={toggleLang}
                  className="flex-1 px-4 py-4 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-white/10 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Languages size={18} />
                  {lang === Language.EN ? '中文' : 'English'}
                </button>
                <button 
                  onClick={() => setMuted(!muted)}
                  className="px-5 py-4 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-white/10 flex items-center justify-center"
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-cyan-950/90 flex flex-col items-center justify-center p-6 z-50">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border-2 border-cyan-500 shadow-2xl text-center max-w-sm w-full">
              <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Trophy size={40} className="text-white" />
              </div>
              <h2 className="text-4xl font-black mb-2 text-cyan-400">{t.victory}</h2>
              <div className="space-y-3 mb-8 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-slate-400 text-xs uppercase tracking-widest">
                  <span>{t.finalScore}</span>
                  <span className="text-white font-bold text-base">{score}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs uppercase tracking-widest">
                  <span>{t.rocketsDestroyed}</span>
                  <span className="text-white font-bold text-base">{rocketsDestroyed}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs uppercase tracking-widest">
                  <span>{t.remainingAmmo}</span>
                  <span className="text-white font-bold text-base">{remainingAmmoCount}</span>
                </div>
              </div>
              <button 
                onClick={initGame}
                className="w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-2xl transition-all active:scale-95"
              >
                {t.playAgain}
              </button>
              <button 
                onClick={() => setGameState('menu')}
                className="w-full mt-4 py-2 text-slate-500 hover:text-white font-medium text-sm"
              >
                {t.backToMenu}
              </button>
            </div>
          </div>
        )}

        {gameState === 'defeat' && (
          <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center p-6 z-50">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] border-2 border-red-500 shadow-2xl text-center max-w-sm w-full">
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Skull size={40} className="text-white" />
              </div>
              <h2 className="text-4xl font-black mb-2 text-red-400">{t.defeat}</h2>
              <div className="space-y-3 mb-8 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between text-slate-400 text-xs uppercase tracking-widest">
                  <span>{t.finalScore}</span>
                  <span className="text-white font-bold text-base">{score}</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs uppercase tracking-widest">
                  <span>{t.rocketsDestroyed}</span>
                  <span className="text-white font-bold text-base">{rocketsDestroyed}</span>
                </div>
              </div>
              <button 
                onClick={initGame}
                className="w-full py-5 bg-red-500 hover:bg-red-400 text-white font-bold rounded-2xl transition-all active:scale-95"
              >
                {t.playAgain}
              </button>
              <button 
                onClick={() => setGameState('menu')}
                className="w-full mt-4 py-2 text-slate-500 hover:text-white font-medium text-sm"
              >
                {t.backToMenu}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-slate-800 text-[10px] uppercase tracking-[0.4em] font-bold">
        Neo Nova Defense System v2.0 // Deep Space Protocol
      </div>
    </div>
  );
}

function SkillBadge({ icon, color, label }: { icon: React.ReactNode, color: string, label: string }) {
  return (
    <motion.div 
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${color} p-1 rounded-lg flex items-center gap-1 shadow-lg border border-white/20`}
    >
      {icon}
      <span className="text-[8px] font-bold uppercase pr-1">{label}</span>
    </motion.div>
  );
}
