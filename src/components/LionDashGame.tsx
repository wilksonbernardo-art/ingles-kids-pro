import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, Trophy, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Word } from '@/lib/supabase';
import { speakWord, playSuccessSound } from '@/lib/speech';

type GateOption = {
  lane: number; // -1, 0, 1
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
const ROAD_HORIZON_Y = 135;

export default function LionDashGame({ pool = [], onBack, onWinBonus }: LionDashGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentTarget, setCurrentTarget] = useState<Word | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [combo, setCombo] = useState(0);

  const wordsPoolRef = useRef<Word[]>([]);
  const queueIndexRef = useRef(0);

  const engineRef = useRef({
    lane: 0,
    playerX: 0,
    playerTargetX: 0,
    speed: 0.85,
    progressZ: 0,
    gates: [] as GateOption[],
    particles: [] as Particle[],
    roadOffset: 0,
    active: true,
    hasCheckedCollision: false,
    waitingNextRound: false,
    lastTime: performance.now(),
    swipeStartX: 0,
    swipeStartY: 0,
    score: 0,
    lives: 3,
    combo: 0,
  });

  useEffect(() => {
    const valid = (pool || []).filter((w) => w && w.word_en && w.word_en.trim().length > 1);
    if (valid.length >= 3) {
      wordsPoolRef.current = [...valid].sort(() => Math.random() - 0.5);
    } else {
      wordsPoolRef.current = valid;
    }
    queueIndexRef.current = 0;
  }, [pool]);

  const nextRound = useCallback(() => {
    const poolList = wordsPoolRef.current;
    if (poolList.length < 3) return;

    const target = poolList[queueIndexRef.current % poolList.length];
    queueIndexRef.current++;

    const decoys = poolList.filter((w) => w.id !== target.id).sort(() => Math.random() - 0.5);
    const lanes = [-1, 0, 1].sort(() => Math.random() - 0.5);

    const newGates: GateOption[] = [
      { lane: lanes[0], word: target, isCorrect: true },
      { lane: lanes[1], word: decoys[0], isCorrect: false },
      { lane: lanes[2], word: decoys[1], isCorrect: false },
    ];

    const engine = engineRef.current;
    engine.gates = newGates;
    engine.progressZ = 0;
    engine.hasCheckedCollision = false;
    engine.waitingNextRound = false;

    setCurrentTarget(target);
    speakWord(target.word_en, (target as any).audio_url);
  }, []);

  useEffect(() => {
    if (wordsPoolRef.current.length >= 3) {
      nextRound();
    }
  }, [nextRound]);

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
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 2;
      engineRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: Math.random() * 3 + 2,
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
      const dt = Math.min((timestamp - engine.lastTime) / 1000, 0.05);
      engine.lastTime = timestamp;

      const W = canvas.width;
      const H = canvas.height;
      const midX = W / 2;

      // 1. Atualizar Física
      if (engine.active) {
        engine.playerTargetX = engine.lane * LANE_X_OFFSET;
        engine.playerX += (engine.playerTargetX - engine.playerX) * 12 * dt;
        engine.roadOffset = (engine.roadOffset + engine.speed * 1.5 * dt) % 1;
        engine.progressZ += engine.speed * 0.40 * dt;

        // Checagem de Colisão Única
        if (!engine.hasCheckedCollision && engine.progressZ >= 0.88) {
          engine.hasCheckedCollision = true;
          const hitGate = engine.gates.find((g) => g.lane === engine.lane);

          if (hitGate) {
            if (hitGate.isCorrect) {
              playSuccessSound();
              confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
              engine.score += 20;
              engine.combo += 1;
              setScore(engine.score);
              setCombo(engine.combo);
              createBurst(midX + engine.playerX, H - 75, '#10b981'); // Explosão verde de acerto
              if (onWinBonus) onWinBonus(2);
            } else {
              engine.lives -= 1;
              engine.combo = 0;
              setLives(engine.lives);
              setCombo(0);
              createBurst(midX + engine.playerX, H - 75, '#ef4444'); // Explosão vermelha de erro

              if (engine.lives <= 0) {
                engine.active = false;
                setGameOver(true);
              }
            }
          }
        }

        if (!engine.waitingNextRound && engine.progressZ >= 1.05) {
          engine.waitingNextRound = true;
          nextRound();
        }
      }

      // 2. Renderização Visual
      // Céu
      const skyGrad = ctx.createLinearGradient(0, 0, 0, ROAD_HORIZON_Y);
      skyGrad.addColorStop(0, '#312e81');
      skyGrad.addColorStop(0.5, '#6366f1');
      skyGrad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, ROAD_HORIZON_Y);

      // Sol Neon de Fundo
      const sunGrad = ctx.createRadialGradient(midX, ROAD_HORIZON_Y, 8, midX, ROAD_HORIZON_Y, 65);
      sunGrad.addColorStop(0, '#fef08a');
      sunGrad.addColorStop(0.6, '#f97316');
      sunGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(midX, ROAD_HORIZON_Y, 65, 0, Math.PI * 2);
      ctx.fill();

      // Montanhas
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(0, ROAD_HORIZON_Y);
      ctx.lineTo(70, ROAD_HORIZON_Y - 30);
      ctx.lineTo(150, ROAD_HORIZON_Y);
      ctx.lineTo(230, ROAD_HORIZON_Y - 45);
      ctx.lineTo(330, ROAD_HORIZON_Y);
      ctx.lineTo(W, ROAD_HORIZON_Y - 25);
      ctx.lineTo(W, ROAD_HORIZON_Y);
      ctx.closePath();
      ctx.fill();

      // Terreno
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, ROAD_HORIZON_Y, W, H - ROAD_HORIZON_Y);

      // Pista Principal
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

      // Linhas Neon das bordas
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(midX - 35, ROAD_HORIZON_Y);
      ctx.lineTo(midX - 185, H);
      ctx.moveTo(midX + 35, ROAD_HORIZON_Y);
      ctx.lineTo(midX + 185, H);
      ctx.stroke();

      // Divisórias das 3 pistas
      const numLines = 7;
      for (let i = 0; i < numLines; i++) {
        const pz = (i / numLines + engine.roadOffset) % 1;
        const lineY = ROAD_HORIZON_Y + (H - ROAD_HORIZON_Y) * pz;
        const nextY = ROAD_HORIZON_Y + (H - ROAD_HORIZON_Y) * Math.min(pz + 0.06, 1);
        const spread = 20 + 95 * pz;

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 + pz * 0.4})`;
        ctx.lineWidth = 1.2 + pz * 2.2;
        ctx.beginPath();
        ctx.moveTo(midX - spread / 3, lineY);
        ctx.lineTo(midX - spread / 3, nextY);
        ctx.moveTo(midX + spread / 3, lineY);
        ctx.lineTo(midX + spread / 3, nextY);
        ctx.stroke();
      }

      // 3. Portais Mágicos (TODOS NA MESMA COR NEON CIANO/AZUL MÁGICO)
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

          // Brilho e anel luminoso neutro (Ciano elétrico)
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12 * scale;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3.5 * scale;

          ctx.beginPath();
          ctx.roundRect(-gateW / 2, -gateH / 2, gateW, gateH, 14 * scale);
          ctx.stroke();

          // Fundo interior do portal
          const insideGrad = ctx.createLinearGradient(0, -gateH / 2, 0, gateH / 2);
          insideGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
          insideGrad.addColorStop(1, 'rgba(15, 23, 42, 0.85)');
          ctx.fillStyle = insideGrad;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.font = `${Math.floor(34 * scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(gate.word.emoji || '📦', 0, -10 * scale);

          ctx.fillStyle = '#ffffff';
          ctx.font = `900 ${Math.floor(12 * scale)}px sans-serif`;
          ctx.fillText(gate.word.word_en, 0, 24 * scale);
          ctx.restore();
        });
      }

      // 4. Personagem (Leão)
      const playerY = H - 75;
      const currentX = midX + engine.playerX;
      const bobbing = Math.sin(timestamp / 75) * 3;

      ctx.save();
      ctx.translate(currentX, playerY + bobbing);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 26 - bobbing, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      const tilt = (engine.playerTargetX - engine.playerX) * 0.035;
      ctx.rotate(tilt);

      ctx.font = '54px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦁', 0, 0);
      ctx.restore();

      // 5. Partículas
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
  }, [nextRound, onWinBonus]);

  const restartGame = () => {
    const engine = engineRef.current;
    engine.lives = 3;
    engine.score = 0;
    engine.combo = 0;
    engine.active = true;
    engine.lane = 0;
    engine.playerX = 0;
    setLives(3);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    queueIndexRef.current = 0;
    nextRound();
  };

  if (!currentTarget) {
    return (
      <div className="text-center py-16 text-slate-400 font-bold">
        A carregar palavras do Safari...
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto bg-slate-900 rounded-3xl border-4 border-indigo-400 shadow-2xl overflow-hidden flex flex-col justify-between select-none">
      {/* HUD Superior */}
      <div className="p-3.5 z-20 bg-slate-900/85 backdrop-blur-md rounded-b-3xl border-b border-indigo-500/40 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-300 hover:text-white font-bold text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>

          {/* Vidas */}
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

          {/* Pontos & Combo */}
          <div className="flex items-center gap-1.5">
            {combo > 1 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-lg">
                {combo}x COMBO! 🔥
              </span>
            )}
            <div className="bg-indigo-950 border border-indigo-400 text-amber-300 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> {score}
            </div>
          </div>
        </div>

        {/* Missão da Palavra Alvo */}
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

      {/* Tela de Jogo Canvas 2.5D */}
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

        {/* Botões Grandes para Celular */}
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
          Ouça o som e leia a placa para passar no portal certo! 🌟
        </p>
      </div>

      {/* Modal Game Over */}
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