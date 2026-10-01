import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, Trophy, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Word } from '@/lib/supabase';
import { speakWord, playSuccessSound } from '@/lib/speech';

type GateOption = {
  lane: number;
  word: Word;
  isCorrect: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
};

type LionDashGameProps = {
  pool: Word[];
  profileId: string;
  onBack: () => void;
  onWinBonus?: (stars: number) => void;
};

const LANE_X_OFFSET = 115;
const ROAD_HORIZON_Y = 130;

export default function LionDashGame({ pool = [], onBack, onWinBonus }: LionDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eligibleWords = (pool || []).filter((w) => w && w.word_en && w.word_en.trim().length > 1);

  const [currentTarget, setCurrentTarget] = useState<Word | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);

  const engineRef = useRef({
    lane: 0,
    playerX: 0,
    playerTargetX: 0,
    speed: 1.1,
    progressZ: 0,
    gates: [] as GateOption[],
    particles: [] as Particle[],
    roadOffset: 0,
    active: true,
    lastTime: performance.now(),
    swipeStartX: 0,
    swipeStartY: 0,
  });

  const setupRound = useCallback(() => {
    if (eligibleWords.length < 3) return;

    const shuffled = [...eligibleWords].sort(() => Math.random() - 0.5);
    const target = shuffled[0];
    const decoy1 = shuffled[1];
    const decoy2 = shuffled[2];
    const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);

    engineRef.current.gates = [
      { lane: lanes[0], word: target, isCorrect: true },
      { lane: lanes[1], word: decoy1, isCorrect: false },
      { lane: lanes[2], word: decoy2, isCorrect: false },
    ];
    engineRef.current.progressZ = 0;
    setCurrentTarget(target);
    speakWord(target.word_en, (target as any).audio_url);
  }, [eligibleWords]);

  useEffect(() => {
    setupRound();
  }, [setupRound]);

  const changeLane = useCallback((direction: 'left' | 'right') => {
    const engine = engineRef.current;
    if (!engine.active) return;
    if (direction === 'left' && engine.lane > -1) engine.lane -= 1;
    else if (direction === 'right' && engine.lane < 1) engine.lane += 1;
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) changeLane('left');
      if (['ArrowRight', 'KeyD'].includes(e.code)) changeLane('right');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [changeLane]);

  const handleTouchStart = (e: React.TouchEvent) => {
    engineRef.current.swipeStartX = e.touches[0].clientX;
    engineRef.current.swipeStartY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - engineRef.current.swipeStartX;
    const diffY = e.changedTouches[0].clientY - engineRef.current.swipeStartY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 25) {
      if (diffX > 0) changeLane('right');
      else changeLane('left');
    }
  };

  const createBurst = (x: number, y: number, color: string) => {
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 3,
        life: 1.0,
      });
    }
  };

  useEffect(() => {
    let animId: number;
    engineRef.current.lastTime = performance.now();

    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const engine = engineRef.current;
      const dt = Math.min((timestamp - engine.lastTime) / 1000, 0.1);
      engine.lastTime = timestamp;

      const W = canvas.width;
      const H = canvas.height;
      const midX = W / 2;

      if (engine.active) {
        engine.playerTargetX = engine.lane * LANE_X_OFFSET;
        engine.playerX += (engine.playerTargetX - engine.playerX) * 14 * dt;
        engine.roadOffset = (engine.roadOffset + engine.speed * 40 * dt) % 1;
        engine.progressZ += engine.speed * 0.35 * dt;

        if (engine.progressZ >= 0.88 && engine.progressZ <= 0.98) {
          const hitGate = engine.gates.find((g) => g.lane === engine.lane);
          if (hitGate) {
            engine.progressZ = 1.05;
            if (hitGate.isCorrect) {
              playSuccessSound();
              confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
              setScore((s) => s + 20);
              setCombo((cb) => cb + 1);
              createBurst(midX + engine.playerX, H - 75, '#10b981');
              if (onWinBonus) onWinBonus(2);
            } else {
              setLives((l) => {
                const next = l - 1;
                if (next <= 0) {
                  engine.active = false;
                  setGameOver(true);
                }
                return Math.max(0, next);
              });
              setCombo(0);
              createBurst(midX + engine.playerX, H - 75, '#ef4444');
            }
          }
        }

        if (engine.progressZ >= 1.05) {
          setupRound();
        }
      }

      // Céu
      const skyGrad = ctx.createLinearGradient(0, 0, 0, ROAD_HORIZON_Y);
      skyGrad.addColorStop(0, '#4338ca');
      skyGrad.addColorStop(0.5, '#7c3aed');
      skyGrad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, ROAD_HORIZON_Y);

      // Sol
      const sunGrad = ctx.createRadialGradient(midX, ROAD_HORIZON_Y, 10, midX, ROAD_HORIZON_Y, 70);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.6, '#f97316');
      sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(midX, ROAD_HORIZON_Y, 70, 0, Math.PI * 2);
      ctx.fill();

      // Montanhas
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(0, ROAD_HORIZON_Y);
      ctx.lineTo(80, ROAD_HORIZON_Y - 35);
      ctx.lineTo(160, ROAD_HORIZON_Y);
      ctx.lineTo(240, ROAD_HORIZON_Y - 50);
      ctx.lineTo(340, ROAD_HORIZON_Y);
      ctx.lineTo(W, ROAD_HORIZON_Y - 30);
      ctx.lineTo(W, ROAD_HORIZON_Y);
      ctx.closePath();
      ctx.fill();

      // Grama
      const groundGrad = ctx.createLinearGradient(0, ROAD_HORIZON_Y, 0, H);
      groundGrad.addColorStop(0, '#064e3b');
      groundGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, ROAD_HORIZON_Y, W, H - ROAD_HORIZON_Y);

      // Pista
      ctx.beginPath();
      ctx.moveTo(midX - 35, ROAD_HORIZON_Y);
      ctx.lineTo(midX + 35, ROAD_HORIZON_Y);
      ctx.lineTo(midX + 185, H);
      ctx.lineTo(midX - 185, H);
      ctx.closePath();
      const roadGrad = ctx.createLinearGradient(0, ROAD_HORIZON_Y, 0, H);
      roadGrad.addColorStop(0, '#1e1b4b');
      roadGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = roadGrad;
      ctx.fill();

      // Bordas Neon
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(midX - 35, ROAD_HORIZON_Y);
      ctx.lineTo(midX - 185, H);
      ctx.moveTo(midX + 35, ROAD_HORIZON_Y);
      ctx.lineTo(midX + 185, H);
      ctx.stroke();

      // Divisórias com movimento
      const numLines = 8;
      for (let i = 0; i < numLines; i++) {
        const pz = (i / numLines + engine.roadOffset) % 1;
        const lineY = ROAD_HORIZON_Y + (H - ROAD_HORIZON_Y) * pz;
        const nextY = ROAD_HORIZON_Y + (H - ROAD_HORIZON_Y) * Math.min(pz + 0.05, 1);
        const spread = 20 + 95 * pz;

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + pz * 0.4})`;
        ctx.lineWidth = 1.5 + pz * 2.5;
        ctx.beginPath();
        ctx.moveTo(midX - spread / 3, lineY);
        ctx.lineTo(midX - spread / 3, nextY);
        ctx.moveTo(midX + spread / 3, lineY);
        ctx.lineTo(midX + spread / 3, nextY);
        ctx.stroke();
      }

      // Portais
      const z = engine.progressZ;
      if (z >= 0 && z <= 1.0) {
        const portalY = ROAD_HORIZON_Y + (H - ROAD_HORIZON_Y) * z;
        const scale = 0.25 + z * 0.85;

        engine.gates.forEach((gate) => {
          const laneOffset = gate.lane * (LANE_X_OFFSET * z);
          const gateX = midX + laneOffset;
          const gateW = 85 * scale;
          const gateH = 110 * scale;

          ctx.save();
          ctx.translate(gateX, portalY - gateH / 2);
          ctx.shadowColor = gate.isCorrect ? '#10b981' : '#f43f5e';
          ctx.shadowBlur = 12 * scale;
          ctx.strokeStyle = gate.isCorrect ? '#34d399' : '#fb7185';
          ctx.lineWidth = 4 * scale;

          ctx.beginPath();
          ctx.roundRect(-gateW / 2, -gateH / 2, gateW, gateH, 16 * scale);
          ctx.stroke();

          const insideGrad = ctx.createLinearGradient(0, -gateH / 2, 0, gateH / 2);
          insideGrad.addColorStop(0, gate.isCorrect ? 'rgba(52, 211, 153, 0.45)' : 'rgba(244, 63, 94, 0.4)');
          insideGrad.addColorStop(1, 'rgba(15, 23, 42, 0.8)');
          ctx.fillStyle = insideGrad;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.font = `${Math.floor(36 * scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(gate.word.emoji || '📦', 0, -12 * scale);

          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.floor(13 * scale)}px sans-serif`;
          ctx.fillText(gate.word.word_en, 0, 24 * scale);
          ctx.restore();
        });
      }

      // Leão
      const playerY = H - 75;
      const currentX = midX + engine.playerX;
      const bobbing = Math.sin(timestamp / 70) * 3.5;

      ctx.save();
      ctx.translate(currentX, playerY + bobbing);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 28 - bobbing, 28, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      const tilt = (engine.playerTargetX - engine.playerX) * 0.04;
      ctx.rotate(tilt);

      ctx.font = '56px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦁', 0, 0);
      ctx.restore();

      // Partículas
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const p = engine.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 2.2;
        if (p.life <= 0) {
          engine.particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [setupRound, onWinBonus]);

  const restartGame = () => {
    setLives(3);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    engineRef.current.active = true;
    engineRef.current.lane = 0;
    engineRef.current.playerX = 0;
    setupRound();
  };

  if (!currentTarget) {
    return (
      <div className="text-center py-16 text-slate-400 font-bold">
        A carregar palavras...
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto bg-slate-900 rounded-3xl border-4 border-indigo-400 shadow-2xl overflow-hidden flex flex-col justify-between select-none">
      <div className="p-3.5 z-20 bg-slate-900/85 backdrop-blur-md rounded-b-3xl border-b border-indigo-500/40 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-300 hover:text-white font-bold text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>

          <div className="flex items-center gap-1 bg-slate-800/90 px-3 py-1 rounded-xl border border-rose-500/40">
            {[1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-4 h-4 transition-all ${
                  heart <= lives ? 'text-rose-500 fill-rose-500 scale-105' : 'text-slate-600'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {combo > 1 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-lg animate-bounce">
                {combo}x COMBO! 🔥
              </span>
            )}
            <div className="bg-indigo-950 border border-indigo-400 text-amber-300 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> {score}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-900/70 via-purple-900/70 to-indigo-900/70 border border-indigo-400/50 rounded-2xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl filter drop-shadow-md">{currentTarget.emoji}</span>
            <div>
              <p className="text-[10px] font-extrabold uppercase text-indigo-300 tracking-wider">
                Corra para o portal de:
              </p>
              <h3 className="text-sm font-black text-white leading-tight">
                {currentTarget.word_pt || (currentTarget as any).translation}
              </h3>
            </div>
          </div>

          <button
            onClick={() => speakWord(currentTarget.word_en, (currentTarget as any).audio_url)}
            className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs px-3 py-1.5 rounded-xl cursor-pointer active:scale-95 shadow-md"
          >
            <Volume2 className="w-4 h-4" /> Ouvir
          </button>
        </div>
      </div>

      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 w-full flex items-center justify-center p-2"
      >
        <canvas
          ref={canvasRef}
          width={420}
          height={480}
          className="w-full max-w-[420px] aspect-[420/480] rounded-2xl shadow-2xl border-2 border-indigo-500/50 block touch-none"
        />

        <button
          onClick={() => changeLane('left')}
          className="absolute left-4 bottom-6 w-14 h-14 bg-indigo-600/80 hover:bg-indigo-500 active:scale-90 border-2 border-white/50 rounded-2xl text-white font-black text-2xl flex items-center justify-center shadow-xl cursor-pointer"
        >
          ◀
        </button>
        <button
          onClick={() => changeLane('right')}
          className="absolute right-4 bottom-6 w-14 h-14 bg-indigo-600/80 hover:bg-indigo-500 active:scale-90 border-2 border-white/50 rounded-2xl text-white font-black text-2xl flex items-center justify-center shadow-xl cursor-pointer"
        >
          ▶
        </button>
      </div>

      <div className="pb-3 text-center">
        <p className="text-[11px] font-bold text-indigo-300">
          Deslize ou toque nas setas para passar pelo portal correto! 🌟
        </p>
      </div>

      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-40 animate-in zoom-in-95">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl">
            <div className="text-5xl mb-2 animate-bounce">🦁💥</div>
            <h3 className="text-xl font-black text-white">Ops, o leão tropeçou!</h3>
            <p className="text-xs text-slate-400 font-bold mt-1 mb-4">
              Você fez <strong>{score} pontos</strong> na corrida!
            </p>
            <button
              onClick={restartGame}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-3 rounded-2xl shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all text-sm"
            >
              Correr de Novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}