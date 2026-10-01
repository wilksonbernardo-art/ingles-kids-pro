import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, RefreshCw, Heart, Wind, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

type WordTarget = {
  word: string;
  translation: string;
  emoji: string;
};

const WORDS_POOL: WordTarget[] = [
  { word: 'CAT', translation: 'Gato', emoji: '🐱' },
  { word: 'DOG', translation: 'Cachorro', emoji: '🐶' },
  { word: 'SUN', translation: 'Sol', emoji: '☀️' },
  { word: 'STAR', translation: 'Estrela', emoji: '⭐' },
  { word: 'BOOK', translation: 'Livro', emoji: '📚' },
  { word: 'FISH', translation: 'Peixe', emoji: '🐟' },
  { word: 'BIRD', translation: 'Pássaro', emoji: '🐦' },
  { word: 'LION', translation: 'Leão', emoji: '🦁' },
  { word: 'TREE', translation: 'Árvore', emoji: '🌳' },
  { word: 'WATER', translation: 'Água', emoji: '💧' },
];

const BALLOON_COLOR_PALETTES = [
  { main: '#f43f5e', dark: '#be123c', highlight: '#fecdd3' }, // Vermelho
  { main: '#0ea5e9', dark: '#0369a1', highlight: '#bae6fd' }, // Azul
  { main: '#10b981', dark: '#047857', highlight: '#a7f3d0' }, // Verde
  { main: '#f59e0b', dark: '#b45309', highlight: '#fde68a' }, // Laranja
  { main: '#8b5cf6', dark: '#6d28d9', highlight: '#ddd6fe' }, // Roxo
  { main: '#ec4899', dark: '#be185d', highlight: '#fbcfe8' }, // Rosa
];

type InternalBalloon = {
  id: number;
  letter: string;
  isBomb: boolean;
  baseX: number;
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  color: typeof BALLOON_COLOR_PALETTES[0];
  popped: boolean;
  popProgress: number;
  wiggleSeed: number;
};

type BalloonArcherGameProps = {
  onBack: () => void;
  onStarsEarned?: (count: number) => void;
};

export default function BalloonArcherGame({ onBack, onStarsEarned }: BalloonArcherGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);

  const currentTarget = WORDS_POOL[wordIndex];
  const targetWord = currentTarget.word;
  const targetLetter = targetWord[currentLetterIdx];

  const gameStateRef = useRef({
    balloons: [] as InternalBalloon[],
    targetLetter,
    wordIndex,
    currentLetterIdx,
    targetWord,
    lives: 3,
    active: true,
    nextId: 1,
    lastTime: performance.now(),
    arrow: null as { x: number; y: number; startX: number; startY: number; targetX: number; targetY: number; progress: number } | null,
    canvasW: 420,
    canvasH: 480,
  });

  // Mantém refs sincronizadas para evitar re-criação de loops
  useEffect(() => {
    gameStateRef.current.targetLetter = targetLetter;
    gameStateRef.current.wordIndex = wordIndex;
    gameStateRef.current.currentLetterIdx = currentLetterIdx;
    gameStateRef.current.targetWord = targetWord;
    gameStateRef.current.lives = lives;
    gameStateRef.current.active = !gameOver && !victory;
  }, [targetLetter, wordIndex, currentLetterIdx, targetWord, lives, gameOver, victory]);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    speakText(currentTarget.word);
  }, [wordIndex, currentTarget.word, speakText]);

  const playSoundEffect = useCallback((type: 'pop' | 'bomb' | 'miss') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'pop') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(540, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(35, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(170, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
    } catch {}
  }, []);

  // Timer independente para gerar balões
  useEffect(() => {
    if (gameOver || victory) return;

    const interval = setInterval(() => {
      const state = gameStateRef.current;
      if (!state.active || state.balloons.length >= 6) return;

      const isBomb = Math.random() < 0.12;
      const needTarget = !isBomb && Math.random() < 0.55;
      const letter = isBomb
        ? '💣'
        : needTarget
        ? state.targetLetter
        : String.fromCharCode(65 + Math.floor(Math.random() * 26));

      const w = state.canvasW;
      const h = state.canvasH;
      const baseX = Math.floor(Math.random() * (w - 140)) + 70;

      // Velocidade idêntica em pixels por segundo
      const speedPxPerSec = (65 + Math.random() * 20) * (1 + state.wordIndex * 0.04);

      const newBalloon: InternalBalloon = {
        id: state.nextId++,
        letter,
        isBomb,
        baseX,
        x: baseX,
        y: h + 60,
        radiusX: 36, // Diâmetro generoso de 72px
        radiusY: 44, // Altura 88px
        speed: speedPxPerSec,
        color: isBomb
          ? { main: '#334155', dark: '#0f172a', highlight: '#94a3b8' }
          : BALLOON_COLOR_PALETTES[Math.floor(Math.random() * BALLOON_COLOR_PALETTES.length)],
        popped: false,
        popProgress: 0,
        wiggleSeed: Math.random() * 10,
      };

      state.balloons.push(newBalloon);
    }, 1100);

    return () => clearInterval(interval);
  }, [gameOver, victory]);

  // Loop de Renderização e Física no Canvas (Isolado de re-renders)
  useEffect(() => {
    let animId: number;
    gameStateRef.current.lastTime = performance.now();

    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = gameStateRef.current;
      const dt = Math.min((timestamp - state.lastTime) / 1000, 0.1);
      state.lastTime = timestamp;

      // Limpeza do Canvas
      ctx.clearRect(0, 0, state.canvasW, state.canvasH);

      // Fundo suave de céu
      const grad = ctx.createLinearGradient(0, 0, 0, state.canvasH);
      grad.addColorStop(0, '#bae6fd');
      grad.addColorStop(1, '#f0fdf4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, state.canvasW, state.canvasH);

      // Nuvens decorativas ao fundo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(60, 80, 35, 0, Math.PI * 2);
      ctx.arc(100, 80, 45, 0, Math.PI * 2);
      ctx.arc(140, 80, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(state.canvasW - 80, 140, 40, 0, Math.PI * 2);
      ctx.arc(state.canvasW - 40, 140, 30, 0, Math.PI * 2);
      ctx.fill();

      if (state.active) {
        const timeSec = timestamp / 1000;

        // Atualização de posições com delta time absoluto
        for (let i = state.balloons.length - 1; i >= 0; i--) {
          const b = state.balloons[i];

          if (b.popped) {
            b.popProgress += dt * 4;
            if (b.popProgress >= 1) {
              state.balloons.splice(i, 1);
              continue;
            }
          } else {
            b.y -= b.speed * dt;
            const wiggle = Math.sin(timeSec * 2.5 + b.wiggleSeed) * 16;
            b.x = b.baseX + wiggle;

            // Se a letra correta escapou pelo topo
            if (b.y < -b.radiusY && b.letter === state.targetLetter && !b.isBomb) {
              playSoundEffect('miss');
              state.balloons.splice(i, 1);
              setLives((l) => {
                const rem = l - 1;
                if (rem <= 0) setGameOver(true);
                return Math.max(0, rem);
              });
              continue;
            }

            // Remove balões que saíram totalmente da tela
            if (b.y < -b.radiusY * 2) {
              state.balloons.splice(i, 1);
              continue;
            }
          }

          // Desenho do balão
          ctx.save();
          if (b.popped) {
            // Efeito de estouro
            ctx.translate(b.x, b.y);
            ctx.scale(1 + b.popProgress * 0.8, 1 + b.popProgress * 0.8);
            ctx.fillStyle = b.color.main;
            ctx.globalAlpha = Math.max(0, 1 - b.popProgress);
            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(b.isBomb ? '💥' : '✨', 0, 0);
          } else {
            // Cordão do balão
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + b.radiusY);
            ctx.lineTo(b.x, b.y + b.radiusY + 16);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Corpo do balão
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.radiusX, b.radiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = b.color.main;
            ctx.fill();

            // Contorno
            ctx.lineWidth = 3;
            ctx.strokeStyle = b.color.dark;
            ctx.stroke();

            // Brilho do balão
            ctx.beginPath();
            ctx.ellipse(b.x - b.radiusX * 0.35, b.y - b.radiusY * 0.35, 8, 12, -0.3, 0, Math.PI * 2);
            ctx.fillStyle = b.color.highlight;
            ctx.fill();

            // Texto/Letra dentro do balão
            ctx.fillStyle = '#ffffff';
            ctx.font = '900 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 4;
            ctx.fillText(b.letter, b.x, b.y + 2);
          }
          ctx.restore();
        }

        // Desenho da flecha voando
        if (state.arrow) {
          state.arrow.progress += dt * 4.5;
          const currentArrowX = state.arrow.startX + (state.arrow.targetX - state.arrow.startX) * state.arrow.progress;
          const currentArrowY = state.arrow.startY + (state.arrow.targetY - state.arrow.startY) * state.arrow.progress;

          ctx.save();
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🏹', currentArrowX, currentArrowY);
          ctx.restore();

          if (state.arrow.progress >= 1) {
            state.arrow = null;
          }
        }
      }
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playSoundEffect]);

  // Disparo ao tocar no Canvas (Touch e Mouse unificados)
  const handlePointerInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || gameOver || victory) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;

    // Ângulo do leão arqueiro
    const angle = (clickX - canvas.width / 2) * 0.12;
    setAimAngle(angle);

    const state = gameStateRef.current;

    // Dispara animação da flecha
    state.arrow = {
      startX: canvas.width / 2,
      startY: canvas.height - 30,
      targetX: clickX,
      targetY: clickY,
      x: canvas.width / 2,
      y: canvas.height - 30,
      progress: 0,
    };

    // Procura colisão com balão (área generosa de toque)
    const hitBalloon = state.balloons.find(
      (b) => !b.popped && Math.hypot(b.x - clickX, b.y - clickY) <= b.radiusY + 12
    );

    if (!hitBalloon) return;

    // Acertou BOMBA 💣
    if (hitBalloon.isBomb) {
      playSoundEffect('bomb');
      hitBalloon.popped = true;
      setLives((l) => {
        const next = l - 1;
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
      return;
    }

    // Acertou a letra CORRETA
    if (hitBalloon.letter === state.targetLetter) {
      playSoundEffect('pop');
      speakText(hitBalloon.letter);
      hitBalloon.popped = true;

      const nextIdx = currentLetterIdx + 1;
      if (nextIdx >= targetWord.length) {
        confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
        speakText(targetWord);
        setScore((s) => s + 15);
        if (onStarsEarned) onStarsEarned(2);

        if (wordIndex + 1 < WORDS_POOL.length) {
          setTimeout(() => {
            setWordIndex((w) => w + 1);
            setCurrentLetterIdx(0);
            gameStateRef.current.balloons = [];
          }, 850);
        } else {
          setVictory(true);
        }
      } else {
        setCurrentLetterIdx(nextIdx);
      }
    } else {
      // Letra ERRADA
      playSoundEffect('miss');
      setLives((l) => {
        const next = l - 1;
        if (next <= 0) setGameOver(true);
        return Math.max(0, next);
      });
    }
  };

  const restartGame = () => {
    setWordIndex(0);
    setCurrentLetterIdx(0);
    setLives(3);
    setScore(0);
    setGameOver(false);
    setVictory(false);
    gameStateRef.current.balloons = [];
    gameStateRef.current.active = true;
  };

  return (
    <div className="relative w-full max-w-lg mx-auto bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 rounded-3xl border-4 border-white shadow-2xl overflow-hidden flex flex-col justify-between select-none">
      {/* Topo / Barra de Progresso */}
      <div className="p-3.5 z-20 bg-white/90 backdrop-blur-md rounded-b-3xl border-b border-white/60 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-xs bg-white px-3 py-1.5 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>

          {/* Vidas */}
          <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-xl shadow-xs border border-rose-100">
            {[1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-4 h-4 transition-all ${
                  heart <= lives ? 'text-rose-500 fill-rose-500 scale-105' : 'text-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Nível e Pontos */}
          <div className="flex items-center gap-1.5">
            <span className="bg-orange-100 text-orange-800 text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-2xs border border-orange-200">
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" /> Nível {wordIndex + 1}
            </span>
            <div className="bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs">
              ⭐ {score}
            </div>
          </div>
        </div>

        {/* Palavra Alvo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">{currentTarget.emoji}</span>
            <span className="text-base font-black text-slate-800">({currentTarget.translation})</span>
            <button
              onClick={() => speakText(targetWord)}
              className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title="Ouvir palavra"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {targetWord.split('').map((letter, idx) => {
              const isFilled = idx < currentLetterIdx;
              const isCurrent = idx === currentLetterIdx;

              return (
                <div
                  key={idx}
                  className={`w-10 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-xs ${
                    isFilled
                      ? 'bg-emerald-500 text-white scale-105 shadow-emerald-200'
                      : isCurrent
                      ? 'bg-white border-2 border-indigo-500 text-indigo-600 animate-bounce'
                      : 'bg-white/70 border-2 border-dashed border-slate-300 text-slate-300'
                  }`}
                >
                  {isFilled ? letter : isCurrent ? '?' : ''}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs font-bold">
            <span className="text-slate-600">
              Mire em: <strong className="text-indigo-600 text-base uppercase font-black">{targetLetter}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
              Cuidado com 💣!
            </span>
          </div>
        </div>
      </div>

      {/* Área do Jogo em Canvas Nativo (Sem lag do React) */}
      <div className="relative flex-1 w-full flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={420}
          height={480}
          onClick={(e) => handlePointerInteraction(e.clientX, e.clientY)}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            handlePointerInteraction(touch.clientX, touch.clientY);
          }}
          className="w-full max-w-[420px] aspect-[420/480] rounded-2xl shadow-inner border-2 border-sky-300 cursor-crosshair touch-none select-none block"
        />
      </div>

      {/* Arqueiro Leão na Base */}
      <div className="relative z-10 flex flex-col items-center pb-3">
        <div
          style={{ transform: `rotate(${aimAngle}deg)` }}
          className="transition-transform duration-100 flex items-center justify-center"
        >
          <div className="text-5xl drop-shadow-md">🦁</div>
          <div className="text-3xl -ml-2 drop-shadow-md">🏹</div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-black text-slate-700 bg-white/80 px-4 py-1.5 rounded-full mt-1 border border-white shadow-2xs">
          <Wind className="w-3.5 h-3.5 text-sky-600" />
          <span>Toque no balão com a letra certa para atirar a flecha!</span>
        </div>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl border-4 border-rose-300 animate-in zoom-in-95">
            <div className="text-5xl mb-2">🎈💔</div>
            <h3 className="text-xl font-black text-slate-800">Tente Outra Vez!</h3>
            <p className="text-xs text-slate-500 font-bold mt-1 mb-4">
              Os balões escaparam! Mire com calma na letra certa.
            </p>
            <button
              onClick={restartGame}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-3 rounded-2xl shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Jogar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Vitória */}
      {victory && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl border-4 border-amber-300 animate-in zoom-in-95">
            <div className="text-5xl mb-2">🏆🏹</div>
            <h3 className="text-xl font-black text-slate-800">Parabéns Arqueiro!</h3>
            <p className="text-xs text-slate-500 font-bold mt-1 mb-4">
              Você completou todas as palavras com ótima pontaria!
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl font-black text-sm mb-4">
              Pontuação Final: {score} Pontos! ⭐
            </div>
            <div className="flex gap-2">
              <button
                onClick={restartGame}
                className="flex-1 bg-indigo-500 text-white font-black py-3 rounded-2xl cursor-pointer hover:bg-indigo-600 transition-all text-xs"
              >
                Jogar de Novo
              </button>
              <button
                onClick={onBack}
                className="flex-1 bg-slate-100 text-slate-600 font-black py-3 rounded-2xl cursor-pointer hover:bg-slate-200 transition-all text-xs"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}