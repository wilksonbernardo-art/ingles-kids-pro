import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, Sparkles, RefreshCw, Trophy, Heart } from 'lucide-react';
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
  { word: 'BALL', translation: 'Bola', emoji: '⚽' },
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
  x: number; // percentual horizontal (10% a 85%)
  y: number; // percentual vertical (0 a 110)
  speed: number;
  color: string;
  popped: boolean;
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

  const nextBalloonId = useRef(1);
  const gameLoopRef = useRef<number | null>(null);

  // Pronunciar palavra ou letra em inglês
  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Falar palavra ao trocar de alvo
  useEffect(() => {
    speakText(currentTarget.word);
  }, [wordIndex, currentTarget.word, speakText]);

  // Efeito sonoro suave gerado via Web Audio API (sem dependência de ficheiros externos)
  const playPopSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }, []);

  // Gerador de balões em subida
  useEffect(() => {
    if (gameOver || victory) return;

    const interval = setInterval(() => {
      setBalloons((prev) => {
        if (prev.length >= 7) return prev;

        // 50% de chance de vir a letra necessária, ou sorteia do alfabeto
        const needTarget = Math.random() < 0.55;
        const letter = needTarget
          ? targetLetter
          : String.fromCharCode(65 + Math.floor(Math.random() * 26));

        const newBalloon: Balloon = {
          id: nextBalloonId.current++,
          letter,
          x: Math.floor(Math.random() * 75) + 10,
          y: 105, // começa abaixo da tela
          speed: Math.random() * 0.35 + 0.25,
          color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
          popped: false,
        };

        return [...prev, newBalloon];
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [targetLetter, gameOver, victory]);

  // Loop de física dos balões
  useEffect(() => {
    if (gameOver || victory) return;

    const updateFrame = () => {
      setBalloons((prev) =>
        prev
          .map((b) => ({
            ...b,
            y: b.y - b.speed,
          }))
          // remove os que saíram pelo topo da tela
          .filter((b) => b.y > -15)
      );

      gameLoopRef.current = requestAnimationFrame(updateFrame);
    };

    gameLoopRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameOver, victory]);

  // Ação ao atirar no balão
  const handleShootBalloon = (balloon: Balloon) => {
    if (balloon.popped || gameOver || victory) return;

    // Calcular ângulo da flecha do leão em direção ao balão
    const angle = (balloon.x - 50) * 0.8;
    setAimAngle(angle);
    setArrowAnim({ x: balloon.x, y: balloon.y });
    setTimeout(() => setArrowAnim(null), 250);

    if (balloon.letter === targetLetter) {
      // Acerto!
      playPopSound();
      speakText(balloon.letter);

      // Marca como estourado
      setBalloons((prev) =>
        prev.map((b) => (b.id === balloon.id ? { ...b, popped: true } : b))
      );

      const nextIdx = currentLetterIdx + 1;
      if (nextIdx >= targetWord.length) {
        // Palavra completa!
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        speakText(targetWord);
        setScore((s) => s + 10);
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
      // Letra errada (ops)
      setLives((l) => {
        const nextLives = l - 1;
        if (nextLives <= 0) {
          setGameOver(true);
        }
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
    <div className="relative w-full max-w-3xl mx-auto h-[580px] bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 rounded-3xl border-4 border-white shadow-2xl overflow-hidden flex flex-col justify-between select-none">
      {/* Topo / Barra de Progresso e Palavra */}
      <div className="p-4 z-20 bg-white/70 backdrop-blur-md rounded-b-3xl border-b border-white/50 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold text-xs bg-white px-3 py-1.5 rounded-xl shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Sair
          </button>

          <div className="flex items-center gap-1">
            {[1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-5 h-5 transition-all ${
                  heart <= lives ? 'text-rose-500 fill-rose-500 scale-105' : 'text-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-xs">
            ⭐ {score} pts
          </div>
        </div>

        {/* Palavra Alvo com Letras */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">{currentTarget.emoji}</span>
            <span className="text-sm font-bold text-slate-600">({currentTarget.translation})</span>
            <button
              onClick={() => speakText(targetWord)}
              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg cursor-pointer transition-transform hover:scale-110"
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
                  className={`w-11 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-sm ${
                    isFilled
                      ? 'bg-emerald-500 text-white scale-105 shadow-emerald-200'
                      : isCurrent
                      ? 'bg-white border-2 border-indigo-500 text-indigo-600 animate-bounce'
                      : 'bg-white/60 border-2 border-dashed border-slate-300 text-slate-300'
                  }`}
                >
                  {isFilled ? letter : isCurrent ? '?' : ''}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] font-bold text-slate-400 mt-1">
            Acerte a letra: <span className="text-indigo-600 font-extrabold text-sm uppercase">{targetLetter}</span>
          </p>
        </div>
      </div>

      {/* Área de Vôo dos Balões */}
      <div className="relative flex-1 w-full overflow-hidden">
        {balloons.map((b) => {
          if (b.popped) {
            return (
              <div
                key={b.id}
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                className="absolute text-2xl animate-ping select-none pointer-events-none"
              >
                💥
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
              className={`absolute flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 group focus:outline-none`}
            >
              {/* Corpo do Balão */}
              <div
                className={`w-14 h-16 rounded-[50%] bg-gradient-to-t ${b.color} shadow-lg flex items-center justify-center text-white font-black text-2xl relative border-2 border-white/40`}
              >
                {b.letter}
                {/* Brilho do balão */}
                <div className="absolute top-2 left-2 w-3 h-3 bg-white/40 rounded-full" />
              </div>
              {/* Cordão do Balão */}
              <div className="w-0.5 h-4 bg-slate-400/80 -mt-0.5" />
            </button>
          );
        })}

        {/* Linha/Flecha voando ao disparar */}
        {arrowAnim && (
          <div
            style={{
              left: `${arrowAnim.x}%`,
              top: `${arrowAnim.y}%`,
              transition: 'all 0.2s linear',
            }}
            className="absolute text-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-bounce"
          >
            🏹
          </div>
        )}
      </div>

      {/* Base: Arqueiro (Leãozinho) */}
      <div className="relative z-10 flex flex-col items-center pb-3">
        <div
          style={{ transform: `rotate(${aimAngle}deg)` }}
          className="transition-transform duration-150 flex items-center justify-center"
        >
          <div className="text-6xl drop-shadow-md">🦁</div>
          <div className="text-4xl -ml-3 drop-shadow-md">🏹</div>
        </div>
        <p className="text-[11px] font-black text-emerald-800 bg-white/60 px-3 py-1 rounded-full mt-1">
          Toque no balão correto para atirar a flecha! 🎯
        </p>
      </div>

      {/* Modal de Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl border-4 border-rose-200 animate-in fade-in zoom-in duration-200">
            <div className="text-5xl mb-2">🎈💔</div>
            <h3 className="text-xl font-black text-slate-800">Quase lá!</h3>
            <p className="text-xs text-slate-500 font-bold mt-1 mb-4">
              Os balões fugiram, mas não desista! Quer tentar de novo?
            </p>
            <button
              onClick={restartGame}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-3 rounded-2xl shadow-lg cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Modal de Vitória */}
      {victory && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl border-4 border-amber-300 animate-in fade-in zoom-in duration-200">
            <div className="text-5xl mb-2">🏆🎉</div>
            <h3 className="text-xl font-black text-slate-800">Excelente Pontaria!</h3>
            <p className="text-xs text-slate-500 font-bold mt-1 mb-4">
              Você acertou todas as palavras com arco e flecha!
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