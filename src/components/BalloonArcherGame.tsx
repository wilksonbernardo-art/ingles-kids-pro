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

const BALLOON_COLORS = [
  'from-rose-400 to-red-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-green-500',
  'from-amber-400 to-orange-500',
  'from-purple-400 to-indigo-500',
  'from-pink-400 to-rose-400',
];

type Balloon = {
  id: number;
  letter: string;
  isBomb?: boolean;
  baseX: number;
  x: number;
  y: number;
  speed: number; // Porcentagem de tela por segundo
  color: string;
  popped: boolean;
  wiggleSeed: number;
};

type BalloonArcherGameProps = {
  onBack: () => void;
  onStarsEarned?: (count: number) => void;
};

export default function BalloonArcherGame({ onBack, onStarsEarned }: BalloonArcherGameProps) {
  const [wordIndex, setWordIndex] = useState(0);
  const [currentLetterIdx, setCurrentLetterIdx] = useState(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [aimAngle, setAimAngle] = useState(0);
  const [arrowAnim, setArrowAnim] = useState<{ x: number; y: number } | null>(null);

  const currentTarget = WORDS_POOL[wordIndex];
  const targetWord = currentTarget.word;
  const targetLetter = targetWord[currentLetterIdx];

  // Aumento sutil de velocidade por nível
  const currentSpeedMultiplier = 1 + wordIndex * 0.05;

  const nextBalloonId = useRef(1);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

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
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === 'bomb') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(35, ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(170, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
    } catch {}
  }, []);

  // Gerador de balões
  useEffect(() => {
    if (gameOver || victory) return;

    const interval = setInterval(() => {
      setBalloons((prev) => {
        if (prev.length >= 7) return prev;

        const isBomb = Math.random() < 0.12;
        const needTarget = !isBomb && Math.random() < 0.5;
        const letter = isBomb
          ? '💣'
          : needTarget
          ? targetLetter
          : String.fromCharCode(65 + Math.floor(Math.random() * 26));

        const baseX = Math.floor(Math.random() * 70) + 15;
        const newBalloon: Balloon = {
          id: nextBalloonId.current++,
          letter,
          isBomb,
          baseX,
          x: baseX,
          y: 108,
          // Velocidade calibrada em % de tela por segundo (leva ~6 a 7 segundos para cruzar a tela de baixo até o topo)
          speed: (14 + Math.random() * 4) * currentSpeedMultiplier,
          color: isBomb ? 'from-slate-700 to-slate-900' : BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
          popped: false,
          wiggleSeed: Math.random() * 10,
        };

        return [...prev, newBalloon];
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [targetLetter, gameOver, victory, currentSpeedMultiplier]);

  // Loop de física sincronizado pelo tempo real (Delta Time)
  useEffect(() => {
    if (gameOver || victory) return;

    lastTimeRef.current = performance.now();

    const updateFrame = (now: number) => {
      // Delta time em segundos
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const timeSec = now / 1000;

      setBalloons((prev) => {
        const nextList: Balloon[] = [];

        for (const b of prev) {
          // O movimento é multiplicado por dt, garantindo idêntica velocidade em 60Hz, 120Hz ou 144Hz
          const nextY = b.y - b.speed * dt;
          const wiggleOffset = Math.sin(timeSec * 2 + b.wiggleSeed) * 3.5;
          const nextX = Math.max(10, Math.min(90, b.baseX + wiggleOffset));

          // Letra correta escapou pelo topo
          if (nextY <= -12 && !b.popped && b.letter === targetLetter && !b.isBomb) {
            playSoundEffect('miss');
            setLives((l) => {
              const remaining = l - 1;
              if (remaining <= 0) setGameOver(true);
              return Math.max(0, remaining);
            });
          }

          if (nextY > -18) {
            nextList.push({
              ...b,
              x: nextX,
              y: nextY,
            });
          }
        }

        return nextList;
      });

      gameLoopRef.current = requestAnimationFrame(updateFrame);
    };

    gameLoopRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameOver, victory, targetLetter, playSoundEffect]);

  // Disparo da flecha
  const handleShootBalloon = (balloon: Balloon) => {
    if (balloon.popped || gameOver || victory) return;

    const angle = (balloon.x - 50) * 0.8;
    setAimAngle(angle);
    setArrowAnim({ x: balloon.x, y: balloon.y });
    setTimeout(() => setArrowAnim(null), 240);

    if (balloon.isBomb) {
      playSoundEffect('bomb');
      setBalloons((prev) => prev.map((b) => (b.id === balloon.id ? { ...b, popped: true } : b)));
      setLives((l) => {
        const nextLives = l - 1;
        if (nextLives <= 0) setGameOver(true);
        return Math.max(0, nextLives);
      });
      return;
    }

    if (balloon.letter === targetLetter) {
      playSoundEffect('pop');
      speakText(balloon.letter);

      setBalloons((prev) => prev.map((b) => (b.id === balloon.id ? { ...b, popped: true } : b)));

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
            setBalloons([]);
          }, 900);
        } else {
          setVictory(true);
        }
      } else {
        setCurrentLetterIdx(nextIdx);
      }
    } else {
      playSoundEffect('miss');
      setLives((l) => {
        const nextLives = l - 1;
        if (nextLives <= 0) setGameOver(true);
        return Math.max(0, nextLives);
      });
    }
  };

  const restartGame = () => {
    setWordIndex(0);
    setCurrentLetterIdx(0);
    setBalloons([]);
    setLives(3);
    setScore(0);
    setGameOver(false);
    setVictory(false);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto h-[620px] bg-gradient-to-b from-sky-300 via-sky-100 to-amber-100 rounded-3xl border-4 border-white shadow-2xl overflow-hidden flex flex-col justify-between select-none">
      {/* Topo / Barra de Progresso */}
      <div className="p-3.5 z-20 bg-white/85 backdrop-blur-md rounded-b-3xl border-b border-white/60 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold text-xs bg-white px-3.5 py-1.5 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>

          {/* Vidas */}
          <div className="flex items-center gap-1.5 bg-white px-3.5 py-1 rounded-xl shadow-xs border border-rose-100">
            {[1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-5 h-5 transition-all ${
                  heart <= lives ? 'text-rose-500 fill-rose-500 scale-105' : 'text-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Nível e Pontos */}
          <div className="flex items-center gap-1.5">
            <span className="bg-orange-100 text-orange-800 text-xs font-black px-3 py-1 rounded-xl flex items-center gap-1 shadow-2xs border border-orange-200">
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-current" /> Nível {wordIndex + 1}
            </span>
            <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 rounded-xl text-xs font-black shadow-2xs">
              ⭐ {score}
            </div>
          </div>
        </div>

        {/* Palavra Alvo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-4xl">{currentTarget.emoji}</span>
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
                  className={`w-11 h-13 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-xs ${
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
              Estoure a letra: <strong className="text-indigo-600 text-base uppercase font-black">{targetLetter}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
              Cuidado com 💣!
            </span>
          </div>
        </div>
      </div>

      {/* Área dos Balões Ampliada */}
      <div className="relative flex-1 w-full overflow-hidden">
        {balloons.map((b) => {
          if (b.popped) {
            return (
              <div
                key={b.id}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                className="absolute text-4xl animate-ping select-none pointer-events-none -translate-x-1/2 -translate-y-1/2"
              >
                {b.isBomb ? '💥🔥' : '🎈✨'}
              </div>
            );
          }

          return (
            <button
              key={b.id}
              onClick={() => handleShootBalloon(b)}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 group focus:outline-none"
            >
              {/* Balão com formato e tamanho consistente */}
              <div
                className={`w-18 h-22 rounded-[50%] bg-gradient-to-t ${b.color} shadow-xl flex items-center justify-center text-white font-black text-3xl relative border-3 border-white/50 ${
                  b.isBomb ? 'animate-pulse ring-4 ring-rose-400' : ''
                }`}
              >
                {b.letter}
                <div className="absolute top-2.5 left-3 w-4 h-4 bg-white/45 rounded-full" />
              </div>
              <div className="w-1 h-5 bg-slate-400/80 -mt-0.5 rounded-full" />
            </button>
          );
        })}

        {/* Flecha Voando */}
        {arrowAnim && (
          <div
            style={{
              left: `${arrowAnim.x}%`,
              top: `${arrowAnim.y}%`,
              transition: 'all 0.20s ease-out',
            }}
            className="absolute text-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2 scale-125"
          >
            🏹
          </div>
        )}
      </div>

      {/* Arqueiro na Base */}
      <div className="relative z-10 flex flex-col items-center pb-3">
        <div
          style={{ transform: `rotate(${aimAngle}deg)` }}
          className="transition-transform duration-100 flex items-center justify-center"
        >
          <div className="text-6xl drop-shadow-md">🦁</div>
          <div className="text-4xl -ml-2 drop-shadow-md">🏹</div>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-black text-slate-700 bg-white/80 px-4 py-1.5 rounded-full mt-1.5 border border-white shadow-2xs">
          <Wind className="w-3.5 h-3.5 text-sky-600" />
          <span>Toque no balão com a letra certa para atirar!</span>
        </div>
      </div>

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-40">
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
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-40">
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