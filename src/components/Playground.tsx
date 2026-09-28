import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, Star, Heart, Trophy } from 'lucide-react';
import type { Module, Word } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { speakWord, playSuccessSound } from '@/lib/speech';
import { celebrate } from '@/lib/confetti';

function WordVisual({ word, size = 'md' }: { word: any; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-2xl',
    md: 'w-12 h-12 text-4xl',
    lg: 'w-16 h-16 text-5xl',
  };

  if (word?.image_url) {
    return (
      <img
        src={word.image_url}
        alt={word.word_en}
        className={`${sizeClasses[size].split(' ')[0]} ${sizeClasses[size].split(' ')[1]} object-contain drop-shadow-xs select-none pointer-events-none`}
        loading="lazy"
        onError={(e) => {
          // Se a imagem falhar por qualquer motivo, oculta e cai no emoji
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <span className={`${sizeClasses[size].split(' ')[2]} select-none leading-none`}>
      {word?.emoji || '⭐'}
    </span>
  );
}

type PlaygroundProps = {
  profileId: string;
  onBack: () => void;
  onStarsUpdated: () => void;
  profileStars: number;
};

type GameType = 'highway' | 'snake' | 'bubble' | 'memory' | 'speed' | 'builder' | 'colors' | 'shadow' | null;

export default function Playground({ profileId, onBack, onStarsUpdated, profileStars }: PlaygroundProps) {
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const [{ data: mods }, { data: wrds }] = await Promise.all([
        supabase.from('modules').select('*').order('created_at', { ascending: true }),
        supabase.from('words').select('*'),
      ]);

      if (isMounted) {
        if (mods) setModules(mods as Module[]);
        if (wrds) setAllWords(wrds as Word[]);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const awardBonusStar = useCallback(async (amount: number = 2) => {
    playSuccessSound();
    celebrate();
    const newTotal = profileStars + amount;
    await supabase.from('profiles').update({ stars: newTotal }).eq('id', profileId);
    onStarsUpdated();
  }, [profileId, profileStars, onStarsUpdated]);

  const currentPool = selectedModuleId === 'all'
    ? allWords
    : allWords.filter((w) => w.module_id === selectedModuleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">🎪</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => (activeGame ? setActiveGame(null) : onBack())}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          {activeGame ? 'Trocar de Jogo' : 'Voltar ao Início'}
        </button>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-2xl">
          <Star className="w-4 h-4 text-amber-500 fill-current" />
          <span className="font-black text-amber-700 text-sm">{profileStars}</span>
        </div>
      </div>

      {/* Menu Principal dos Jogos */}
      {!activeGame && (
        <div>
          <div className="text-center mb-6">
            <span className="text-5xl mb-2 inline-block">🎪</span>
            <h2 className="text-3xl font-black text-slate-800">Parque de Jogos</h2>
            <p className="text-slate-400 font-medium text-sm mt-1">
              Pratique sem limites, divirta-se e ganhe estrelinhas bônus!
            </p>
          </div>

          {/* Filtro por Módulo */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-1">Palavras de:</span>
            <button
              onClick={() => setSelectedModuleId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedModuleId === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-400'
              }`}
            >
              🌈 Todas as Palavras
            </button>
            {modules.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setSelectedModuleId(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedModuleId === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-400'
                }`}
              >
                {m.emoji || m.icon || '📦'} {m.title || m.title_pt}
              </button>
            ))}
          </div>

          {/* Grid de Minijogos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GameCard
              emoji="🏎️"
              title="Top Word Racer"
              desc="Estilo Top Gear! Ouça o som, mude de pista e passe pela placa certa na estrada!"
              color="from-amber-500 via-orange-500 to-rose-600"
              onClick={() => setActiveGame('highway')}
            />
            <GameCard
              emoji="🐍"
              title="Word Snake"
              desc="Guie a cobrinha para comer as letrinhas e montar palavras em inglês!"
              color="from-emerald-500 via-teal-500 to-green-600"
              onClick={() => setActiveGame('snake')}
            />
            <GameCard
              emoji="🎈"
              title="Bubble Pop"
              desc="Ouça a palavra e estoure o balão antes que ele suba!"
              color="from-blue-400 to-indigo-500"
              onClick={() => setActiveGame('bubble')}
            />
            <GameCard
              emoji="🧠"
              title="Jogo da Memória"
              desc="Vire as cartas e encontre os pares de figuras correspondentes."
              color="from-purple-500 to-indigo-600"
              onClick={() => setActiveGame('memory')}
            />
            <GameCard
              emoji="⚡"
              title="Speed Tap"
              desc="Treine reflexos rápidos tocando no item dito antes que o tempo termine!"
              color="from-yellow-400 to-amber-500"
              onClick={() => setActiveGame('speed')}
            />
            <GameCard
              emoji="🔤"
              title="Word Builder"
              desc="Monte as letrinhas da palavra sem pressa nem limite de tempo."
              color="from-teal-400 to-emerald-600"
              onClick={() => setActiveGame('builder')}
            />
            <GameCard
              emoji="🎨"
              title="Cores & Formas"
              desc="Associe o som de cada cor ou figura geométrica."
              color="from-rose-400 to-pink-600"
              onClick={() => setActiveGame('colors')}
            />
            <GameCard
              emoji="🕵️‍♂️"
              title="Quem é essa Sombra?"
              desc="Descubra a figura colorida que se encaixa na silhueta misteriosa."
              color="from-violet-500 to-fuchsia-600"
              onClick={() => setActiveGame('shadow')}
            />
          </div>
        </div>
      )}

      {/* Renderização do Jogo Ativo */}
      {activeGame === 'highway' && (
        <GameTopRacer
          key="highway"
          pool={currentPool}
          profileId={profileId}
          onWin={() => awardBonusStar(2)}
        />
      )}
      {activeGame === 'snake' && (
        <GameWordSnake key="snake" pool={currentPool} onWin={() => awardBonusStar(3)} />
      )}
      {activeGame === 'bubble' && (
        <GameBubblePop key="bubble" pool={currentPool} onWin={() => awardBonusStar(2)} />
      )}
      {activeGame === 'memory' && (
        <GameMemoryMatch key="memory" pool={currentPool} onWin={() => awardBonusStar(3)} />
      )}
      {activeGame === 'speed' && (
        <GameSpeedTap key="speed" pool={currentPool} onWin={() => awardBonusStar(2)} />
      )}
      {activeGame === 'builder' && (
        <GameWordBuilder key="builder" pool={currentPool} onWin={() => awardBonusStar(2)} />
      )}
      {activeGame === 'colors' && (
        <GameColorsMatch key="colors" pool={currentPool} onWin={() => awardBonusStar(2)} />
      )}
      {activeGame === 'shadow' && (
        <GameShadowHunter key="shadow" pool={currentPool} onWin={() => awardBonusStar(2)} />
      )}
    </div>
  );
}

function GameCard({ emoji, title, desc, color, onClick }: { emoji: string; title: string; desc: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-3xl p-6 text-left text-white bg-gradient-to-br ${color} shadow-md hover:shadow-xl hover:scale-102 active:scale-98 transition-all cursor-pointer flex flex-col justify-between min-h-[160px]`}
    >
      <div>
        <span className="text-4xl block mb-2">{emoji}</span>
        <h3 className="font-black text-xl mb-1">{title}</h3>
        <p className="text-white/80 text-xs font-semibold">{desc}</p>
      </div>
      <div className="mt-4 flex items-center gap-1 font-black text-xs text-white/90">
        Jogar Agora →
      </div>
    </button>
  );
}

/* ==================== TOP SKY FLIGHT (PALAVRA CENTRALIZADA NO TOPO DO JOGO) ==================== */
const SKY_W = 380;
const SKY_H = 430;

function GameTopRacer({
  pool = [],
  profileId,
  onWin,
}: {
  pool: Word[];
  profileId: string;
  onWin: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eligible = (pool || []).filter((w) => w && w.word_en && w.word_en.trim().length >= 2);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const recordKey = `sky_flight_best_${profileId}`;

  const engineRef = useRef({
    lane: 0,
    playerX: 0,
    progressZ: 0,
    speed: 0.0016,
    leftWord: '',
    rightWord: '',
    correctLane: -1,
    score: 0,
    hearts: 3,
    active: false,
    checked: false,
    waitingNext: false,
    cloudOffset: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem(recordKey);
    if (saved) setBestScore(parseInt(saved, 10) || 0);
  }, [recordKey]);

  const setupNextWord = () => {
    if (eligible.length < 2) return;
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const target = shuffled[0];
    const decoy = shuffled[1];

    const isLeft = Math.random() > 0.5;

    engineRef.current.leftWord = isLeft ? target.word_en : decoy.word_en;
    engineRef.current.rightWord = isLeft ? decoy.word_en : target.word_en;
    engineRef.current.correctLane = isLeft ? -1 : 1;
    engineRef.current.progressZ = 0;
    engineRef.current.checked = false;
    engineRef.current.waitingNext = false;

    engineRef.current.speed = Math.min(0.0016 + engineRef.current.score * 0.0001, 0.0035);

    setCurrentWord(target);
    speakWord(target.word_en, (target as any).audio_url);
  };

  const startFlight = () => {
    if (eligible.length < 2) return;
    engineRef.current.lane = 0;
    engineRef.current.playerX = 0;
    engineRef.current.score = 0;
    engineRef.current.hearts = 3;
    engineRef.current.active = true;

    setScore(0);
    setHearts(3);
    setGameOver(false);

    setupNextWord();
  };

  useEffect(() => {
    startFlight();
  }, []);

  const moveLeft = () => {
    engineRef.current.lane = -1;
  };

  const moveRight = () => {
    engineRef.current.lane = 1;
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        moveLeft();
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        moveRight();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    let animId: number;

    const loop = () => {
      animId = requestAnimationFrame(loop);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = engineRef.current;

      // ==================== FÍSICA ====================
      if (state.active) {
        state.cloudOffset = (state.cloudOffset + state.speed * 4) % 1;

        const targetX = state.lane * 85;
        state.playerX += (targetX - state.playerX) * 0.07;

        state.progressZ += state.speed;

        if (!state.checked && state.progressZ >= 0.88) {
          state.checked = true;

          const isCorrect =
            (state.lane === -1 && state.correctLane === -1) ||
            (state.lane === 1 && state.correctLane === 1);

          if (isCorrect) {
            playSuccessSound();
            celebrate();
            state.score += 1;
            setScore(state.score);

            setBestScore((prev) => {
              if (state.score > prev) {
                localStorage.setItem(recordKey, state.score.toString());
                return state.score;
              }
              return prev;
            });

            onWin();
          } else {
            state.hearts -= 1;
            setHearts(state.hearts);

            if (state.hearts <= 0) {
              state.active = false;
              setGameOver(true);
            }
          }
        }

        if (!state.waitingNext && state.progressZ >= 1.05) {
          state.waitingNext = true;
          setTimeout(() => {
            if (state.active) setupNextWord();
          }, 600);
        }
      }

      // ==================== RENDERIZAÇÃO ====================
      const skyGrad = ctx.createLinearGradient(0, 0, 0, SKY_H);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, SKY_W, SKY_H);

      // Sol suave
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(SKY_W / 2, 75, 30, 0, Math.PI * 2);
      ctx.fill();

      // Nuvens decorativas de fundo
      const numLines = 8;
      for (let i = 0; i < numLines; i++) {
        const segZ = (i / numLines + state.cloudOffset) % 1;
        const segY = 85 + (SKY_H - 85) * segZ;
        const nextSegY = 85 + (SKY_H - 85) * Math.min(segZ + 1 / numLines, 1);

        const spread = 40 + (SKY_W / 2 - 40) * segZ;
        const cloudRadius = 12 + 18 * segZ;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(SKY_W / 2 - spread, segY, cloudRadius, 0, Math.PI * 2);
        ctx.arc(SKY_W / 2 + spread, segY, cloudRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SKY_W / 2, segY);
        ctx.lineTo(SKY_W / 2, nextSegY);
        ctx.stroke();
      }

      // Nuvens das Palavras (Descem pelas laterais)
      if (state.progressZ < 1.05) {
        const z = state.progressZ;
        const signY = 85 + (SKY_H - 150) * z;

        const spreadX = 75 + 35 * z;
        const leftX = SKY_W / 2 - spreadX;
        const rightX = SKY_W / 2 + spreadX;

        const signW = 110 + 25 * z;
        const signH = 50 + 15 * z;
        const fontSize = Math.floor(14 + 3 * z);

        // Nuvem Esquerda
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(leftX - signW / 2, signY - signH / 2, signW, signH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.leftWord, leftX, signY);
        ctx.restore();

        // Nuvem Direita
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(rightX - signW / 2, signY - signH / 2, signW, signH, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = `900 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.rightWord, rightX, signY);
        ctx.restore();
      }

      // Passarinho de costas
      const birdX = SKY_W / 2 + state.playerX;
      const birdY = SKY_H - 65;

      ctx.save();
      ctx.translate(birdX, birdY);

      const hover = Math.sin(Date.now() / 160) * 3.5;
      ctx.translate(0, hover);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(0, 30, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ca8a04';
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-8, 14);
      ctx.lineTo(0, 26);
      ctx.lineTo(8, 14);
      ctx.closePath();
      ctx.fill();

      const wingFlap = Math.sin(Date.now() / 90) * 5;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(-23, 2 + wingFlap, 9, 14, -0.25, 0, Math.PI * 2);
      ctx.ellipse(23, 2 - wingFlap, 9, 14, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(-14, -18, 28, 10, 4);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#0284c7';
      ctx.stroke();

      ctx.restore();
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onWin, recordKey]);

  if (!currentWord) return <EmptyWarning />;

  return (
    <div className="bg-sky-50/70 border-2 border-sky-200 rounded-3xl p-3 sm:p-5 md:p-6 text-center w-full max-w-md mx-auto shadow-sm overflow-hidden">
      {/* Topo: Placar e Vidas */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="bg-sky-200 text-sky-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
          ☁️ Top Sky Flight
        </span>

        {/* Vidas */}
        <div className="flex items-center gap-1 bg-white border border-rose-200 px-3 py-1 rounded-full shadow-2xs">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 transition-all ${
                i < hearts ? 'text-rose-500 fill-rose-500 scale-100' : 'text-slate-200 scale-90'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Placar de Pontos e Recorde */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-extrabold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
          Pontos: <strong className="text-sky-600 text-sm">{score}</strong>
        </span>
        <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
          <Trophy className="w-3.5 h-3.5 text-amber-500" /> Recorde:{' '}
          <strong className="text-amber-800 text-sm">{bestScore}</strong>
        </span>
      </div>

      {/* TELA DE VOO NAS NUVENS (Totalmente responsiva com aspect ratio) */}
      <div className="relative mx-auto my-2 rounded-2xl overflow-hidden border-4 border-sky-400 shadow-xl select-none w-full max-w-[380px] aspect-[380/430]">
        <canvas
          ref={canvasRef}
          width={SKY_W}
          height={SKY_H}
          className="w-full h-full block object-cover"
        />

        {/* Palavra de referência centralizada no topo dentro do jogo */}
        <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-10 w-[92%] max-w-[320px]">
          <div className="bg-white/95 backdrop-blur-md border-2 border-sky-300 rounded-2xl py-1.5 sm:py-2 px-2.5 sm:px-3 shadow-md flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <WordVisual word={currentWord} size="sm" />
              <div className="text-left min-w-0">
                <h4 className="font-black text-slate-800 text-xs sm:text-sm leading-tight truncate">
                  {currentWord.word_pt || (currentWord as any).translation}
                </h4>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400">Voe na nuvem correta</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => speakWord(currentWord.word_en, (currentWord as any).audio_url)}
              className="flex items-center gap-1 bg-sky-100 hover:bg-sky-200 text-sky-900 text-[10px] sm:text-[11px] font-black px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
              title="Ouvir som novamente"
            >
              <Volume2 className="w-3.5 h-3.5" /> Ouvir
            </button>
          </div>
        </div>

        {/* Modal de Fim de Jogo */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20 animate-in zoom-in-95">
            <span className="text-5xl mb-2 animate-bounce">🐥</span>
            <h3 className="text-xl font-black text-rose-400">Fim do Voo!</h3>
            <p className="text-xs text-white/80 font-bold mb-1">
              Pontuação: <strong>{score}</strong>
            </p>
            <p className="text-xs text-amber-300 font-bold mb-4">
              Seu melhor recorde: {bestScore}
            </p>
            <button
              type="button"
              onClick={startFlight}
              className="bg-sky-500 hover:bg-sky-600 text-white font-black px-6 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all text-xs shadow-md"
            >
              Voar de Novo ↺
            </button>
          </div>
        )}
      </div>

      {/* CONTROLES: NUVEM ESQUERDA / DIREITA */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-[380px] mx-auto mt-3">
        <button
          type="button"
          onClick={moveLeft}
          className="py-3 sm:py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 active:scale-95 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          ⬅️ Nuvem Esquerda
        </button>
        <button
          type="button"
          onClick={moveRight}
          className="py-3 sm:py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 active:scale-95 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
        >
          Nuvem Direita ➡️
        </button>
      </div>
      <p className="text-[10px] font-bold text-slate-400 mt-2">
        No computador, você também pode usar as teclas <strong>A</strong> e <strong>D</strong> ou as <strong>Setas</strong>!
      </p>
    </div>
  );
}

/* ==================== 1. WORD SNAKE ==================== */
const GRID_CELLS = 14;
const CANVAS_SIZE = 360;
const CELL_SIZE = CANVAS_SIZE / GRID_CELLS;

function GameWordSnake({ pool = [], onWin }: { pool: Word[]; onWin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const eligible = (pool || []).filter((w) => w && w.word_en && w.word_en.trim().length >= 3);

  const [targetWord, setTargetWord] = useState<Word | null>(null);
  const [spelledLetters, setSpelledLetters] = useState<string[]>([]);
  const [hearts, setHearts] = useState(3);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const stateRef = useRef({
    snake: [
      { x: 7, y: 7, char: '' },
      { x: 7, y: 8, char: '' },
    ],
    dir: { x: 0, y: -1 },
    letters: [] as { x: number; y: number; char: string; isTarget: boolean }[],
    cleanWord: '',
    spelled: [] as string[],
    hearts: 3,
    active: false,
  });

  const spawnLetters = (currentSnake: { x: number; y: number }[], neededChar: string) => {
    if (!neededChar) return [];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const items = [
      { char: neededChar, isTarget: true },
      { char: alphabet[Math.floor(Math.random() * alphabet.length)], isTarget: false },
      { char: alphabet[Math.floor(Math.random() * alphabet.length)], isTarget: false },
    ];

    const result: { x: number; y: number; char: string; isTarget: boolean }[] = [];
    const occupied = new Set(currentSnake.map((s) => `${s.x},${s.y}`));

    for (const it of items) {
      let x = 0;
      let y = 0;
      let attempts = 0;
      while (attempts < 100) {
        x = Math.floor(Math.random() * GRID_CELLS);
        y = Math.floor(Math.random() * GRID_CELLS);
        if (!occupied.has(`${x},${y}`)) {
          occupied.add(`${x},${y}`);
          break;
        }
        attempts++;
      }
      result.push({ x, y, char: it.char, isTarget: it.isTarget });
    }
    return result;
  };

  const startWord = () => {
    if (eligible.length === 0) return;
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    const clean = chosen.word_en.toUpperCase().replace(/[^A-Z]/g, '');

    const initialSnake = [
      { x: 7, y: 7, char: '' },
      { x: 7, y: 8, char: '' },
    ];
    const initialLetters = spawnLetters(initialSnake, clean[0]);

    stateRef.current = {
      snake: initialSnake,
      dir: { x: 0, y: -1 },
      letters: initialLetters,
      cleanWord: clean,
      spelled: [],
      hearts: 3,
      active: true,
    };

    setTargetWord(chosen);
    setSpelledLetters([]);
    setHearts(3);
    setGameWon(false);
    setGameOver(false);

    speakWord(chosen.word_en, (chosen as any).audio_url);
  };

  useEffect(() => {
    startWord();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { dir, active } = stateRef.current;
      if (!active) return;

      if (['ArrowUp', 'KeyW'].includes(e.code) && dir.y === 0) {
        stateRef.current.dir = { x: 0, y: -1 };
      } else if (['ArrowDown', 'KeyS'].includes(e.code) && dir.y === 0) {
        stateRef.current.dir = { x: 0, y: 1 };
      } else if (['ArrowLeft', 'KeyA'].includes(e.code) && dir.x === 0) {
        stateRef.current.dir = { x: -1, y: 0 };
      } else if (['ArrowRight', 'KeyD'].includes(e.code) && dir.x === 0) {
        stateRef.current.dir = { x: 1, y: 0 };
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let animId: number;
    let lastTick = 0;
    const TICK_INTERVAL = 170;

    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = stateRef.current;

      if (state.active && timestamp - lastTick > TICK_INTERVAL) {
        lastTick = timestamp;

        let nextX = state.snake[0].x + state.dir.x;
        let nextY = state.snake[0].y + state.dir.y;

        if (nextX < 0) nextX = GRID_CELLS - 1;
        if (nextX >= GRID_CELLS) nextX = 0;
        if (nextY < 0) nextY = GRID_CELLS - 1;
        if (nextY >= GRID_CELLS) nextY = 0;

        if (state.snake.slice(1).some((s) => s.x === nextX && s.y === nextY)) {
          state.hearts -= 1;
          setHearts(state.hearts);
          if (state.hearts <= 0) {
            state.active = false;
            setGameOver(true);
          }
        } else {
          const eatenIndex = state.letters.findIndex((l) => l.x === nextX && l.y === nextY);

          if (eatenIndex !== -1) {
            const eaten = state.letters[eatenIndex];

            if (eaten.isTarget) {
              playSuccessSound();
              state.spelled.push(eaten.char);
              setSpelledLetters([...state.spelled]);

              state.snake.unshift({ x: nextX, y: nextY, char: eaten.char });

              if (state.spelled.length === state.cleanWord.length) {
                state.active = false;
                setGameWon(true);
                celebrate();
                onWin();
              } else {
                state.letters = spawnLetters(state.snake, state.cleanWord[state.spelled.length]);
              }
            } else {
              state.hearts -= 1;
              setHearts(state.hearts);
              if (state.hearts <= 0) {
                state.active = false;
                setGameOver(true);
              } else {
                state.letters = spawnLetters(state.snake, state.cleanWord[state.spelled.length]);
              }
              state.snake.unshift({ x: nextX, y: nextY, char: '' });
              state.snake.pop();
            }
          } else {
            state.snake.unshift({ x: nextX, y: nextY, char: '' });
            state.snake.pop();
          }
        }
      }

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.fillStyle = '#1e293b';
      for (let x = 0; x < GRID_CELLS; x++) {
        for (let y = 0; y < GRID_CELLS; y++) {
          ctx.fillRect(x * CELL_SIZE + CELL_SIZE / 2 - 1, y * CELL_SIZE + CELL_SIZE / 2 - 1, 2, 2);
        }
      }

      state.letters.forEach((item) => {
        const px = item.x * CELL_SIZE;
        const py = item.y * CELL_SIZE;

        ctx.beginPath();
        ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = item.isTarget ? '#f59e0b' : '#f43f5e';
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.char, px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 1);
      });

      state.snake.forEach((seg, idx) => {
        const px = seg.x * CELL_SIZE;
        const py = seg.y * CELL_SIZE;

        if (idx === 0) {
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 8);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px + 8, py + 8, 3, 0, Math.PI * 2);
          ctx.arc(px + CELL_SIZE - 8, py + 8, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(px + 8, py + 8, 1.5, 0, Math.PI * 2);
          ctx.arc(px + CELL_SIZE - 8, py + 8, 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#059669';
          ctx.beginPath();
          ctx.roundRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4, 6);
          ctx.fill();

          if (seg.char) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(seg.char, px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 1);
          }
        }
      });
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [onWin]);

  if (!targetWord) return <EmptyWarning />;

  const clean = targetWord.word_en.toUpperCase().replace(/[^A-Z]/g, '');
  const neededLetter = clean[spelledLetters.length] || '';
  const ptWord = (targetWord as any).word_pt || (targetWord as any).translation || '';

  return (
    <div className="bg-emerald-50/60 border-2 border-emerald-200 rounded-3xl p-3 sm:p-5 md:p-7 text-center w-full max-w-md mx-auto shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="bg-emerald-200 text-emerald-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
          🐍 Word Snake
        </span>

        <div className="flex items-center gap-1 bg-white border border-rose-200 px-3 py-1 rounded-full shadow-2xs">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 transition-all ${
                i < hearts ? 'text-rose-500 fill-rose-500 scale-100' : 'text-slate-200 scale-90'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card da Palavra de Referência com Ilustração Nítida */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3.5 border border-emerald-100 shadow-xs mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <WordVisual word={targetWord} size="md" />
          <div className="text-left min-w-0">
            <h4 className="font-black text-slate-800 text-xs sm:text-sm leading-tight truncate">{ptWord}</h4>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">Monte a palavra em inglês</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => speakWord(targetWord.word_en, (targetWord as any).audio_url)}
          className="flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
        >
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Ouvir som
        </button>
      </div>

      <div className="flex justify-center gap-1.5 sm:gap-2 mb-3 flex-wrap">
        {clean.split('').map((char, index) => {
          const filled = spelledLetters[index];
          const isCurrentTarget = index === spelledLetters.length;

          return (
            <div
              key={index}
              className={`w-8 h-9 sm:w-11 sm:h-12 rounded-xl border-2 flex items-center justify-center font-black text-base sm:text-xl transition-all ${
                filled
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                  : isCurrentTarget
                  ? 'border-amber-400 bg-amber-50 text-amber-600 animate-pulse ring-2 ring-amber-200'
                  : 'border-dashed border-slate-300 bg-white text-slate-300'
              }`}
            >
              {filled || (isCurrentTarget ? '?' : '')}
            </div>
          );
        })}
      </div>

      {/* Tabuleiro Responsivo (aspect-square) */}
      <div className="relative mx-auto my-2 rounded-2xl overflow-hidden border-4 border-emerald-600 shadow-xl w-full max-w-[360px] aspect-square">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="w-full h-full block" />

        {gameWon && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20 animate-in zoom-in-95">
            <span className="text-5xl mb-2 animate-bounce">🏆</span>
            <h3 className="text-xl font-black text-emerald-400">Palavra Concluída!</h3>
            <p className="text-xs text-white/80 font-bold mb-4">
              Você montou <strong>"{targetWord.word_en}"</strong> perfeitamente!
            </p>
            <button
              type="button"
              onClick={startWord}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all text-xs shadow-md"
            >
              Próxima Palavra ➔
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20 animate-in zoom-in-95">
            <span className="text-4xl mb-2">🍎</span>
            <h3 className="text-lg font-black text-rose-400">Quase lá!</h3>
            <p className="text-xs text-white/70 font-semibold mb-4">
              Tente formar "{targetWord.word_en}" novamente!
            </p>
            <button
              type="button"
              onClick={startWord}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-6 py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all text-xs shadow-md"
            >
              Tentar Novamente ↺
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] font-bold text-slate-400 mt-2 mb-3">
        Coma a letra amarela: <strong className="text-amber-600 text-sm">[{neededLetter}]</strong>
      </p>

      {/* Controles de Direção */}
      <div className="flex flex-col items-center gap-1.5 max-w-[200px] mx-auto">
        <button
          type="button"
          onClick={() => {
            if (stateRef.current.dir.y === 0) stateRef.current.dir = { x: 0, y: -1 };
          }}
          className="w-12 h-12 bg-white border-2 border-emerald-300 hover:bg-emerald-50 active:scale-90 rounded-2xl font-black text-lg flex items-center justify-center shadow-xs cursor-pointer text-emerald-800"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              if (stateRef.current.dir.x === 0) stateRef.current.dir = { x: -1, y: 0 };
            }}
            className="w-12 h-12 bg-white border-2 border-emerald-300 hover:bg-emerald-50 active:scale-90 rounded-2xl font-black text-lg flex items-center justify-center shadow-xs cursor-pointer text-emerald-800"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => {
              if (stateRef.current.dir.y === 0) stateRef.current.dir = { x: 0, y: 1 };
            }}
            className="w-12 h-12 bg-white border-2 border-emerald-300 hover:bg-emerald-50 active:scale-90 rounded-2xl font-black text-lg flex items-center justify-center shadow-xs cursor-pointer text-emerald-800"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => {
              if (stateRef.current.dir.x === 0) stateRef.current.dir = { x: 1, y: 0 };
            }}
            className="w-12 h-12 bg-white border-2 border-emerald-300 hover:bg-emerald-50 active:scale-90 rounded-2xl font-black text-lg flex items-center justify-center shadow-xs cursor-pointer text-emerald-800"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==================== 2. BUBBLE POP ==================== */
function GameBubblePop({ pool, onWin }: { pool: Word[]; onWin: () => void }) {
  const [target, setTarget] = useState<Word | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    if (pool.length < 3) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosenTarget = shuffled[0];
    const choices = shuffled.slice(0, 3).sort(() => Math.random() - 0.5);
    setTarget(chosenTarget);
    setOptions(choices);
    setPoppedId(null);
    speakWord(chosenTarget.word_en);
  }, [pool]);

  useEffect(() => {
    startRound();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startRound]);

  const handlePop = (item: Word) => {
    if (!target || poppedId) return;
    setPoppedId(item.id);
    if (item.id === target.id) {
      onWin();
      timerRef.current = setTimeout(startRound, 800);
    } else {
      timerRef.current = setTimeout(() => setPoppedId(null), 600);
    }
  };

  if (!target) return <EmptyWarning />;

  return (
    <div className="bg-sky-50 border-2 border-sky-200 rounded-3xl p-8 text-center min-h-[460px] flex flex-col justify-between">
      <div>
        <span className="bg-sky-200 text-sky-800 text-xs font-black px-3 py-1 rounded-full uppercase">
          🎈 Bubble Pop
        </span>
        <h3 className="text-xl font-black text-slate-800 mt-3 mb-1">
          Estoure o balão de: <span className="text-sky-600">{target.word_en}</span>
        </h3>
        <button
          onClick={() => speakWord(target.word_en)}
          className="inline-flex items-center gap-1 bg-white border border-sky-300 text-sky-700 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs hover:bg-sky-100 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" /> Ouvir novamente
        </button>
      </div>

      <div className="flex justify-around items-center my-8">
        {options.map((opt) => {
          const isPopped = poppedId === opt.id;
          const isCorrect = opt.id === target.id;
          return (
            <button
              key={opt.id}
              onClick={() => handlePop(opt)}
              className={`w-28 h-36 rounded-full border-4 shadow-lg flex flex-col items-center justify-center transition-all cursor-pointer ${
                isPopped
                  ? isCorrect
                    ? 'scale-125 bg-emerald-200 border-emerald-400 rotate-12'
                    : 'opacity-40 border-rose-300 bg-rose-50'
                  : 'bg-white hover:scale-105 border-sky-300 hover:border-sky-500 animate-bounce'
              }`}
              style={{ animationDuration: '2.5s' }}
            >
              <span className="text-5xl">{opt.emoji || '🎈'}</span>
              <span className="text-xs font-bold text-slate-600 mt-1">{opt.word_pt}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400 font-bold">Toque no balão correto correspondente ao som!</p>
    </div>
  );
}

/* ==================== 3. MEMORY MATCH ==================== */
function GameMemoryMatch({ pool = [], onWin }: { pool: Word[]; onWin: () => void }) {
  type Card = { uid: string; word: Word; flipped: boolean; matched: boolean };
  const [cards, setCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);

  const setupGame = useCallback(() => {
    if (!pool || pool.length < 2) return;

    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const distinctWords = shuffledPool.slice(0, Math.min(shuffledPool.length, 6));

    const deck: Card[] = [];
    distinctWords.forEach((w) => {
      deck.push({ uid: `${w.id}-1`, word: w, flipped: false, matched: false });
      deck.push({ uid: `${w.id}-2`, word: w, flipped: false, matched: false });
    });

    setCards(deck.sort(() => Math.random() - 0.5));
    setMoves(0);
    setGameWon(false);
  }, [pool]);

  useEffect(() => {
    setupGame();
  }, [setupGame]);

  if (!pool || pool.length < 2) {
    return <EmptyWarning />;
  }

  const handleCardClick = (card: Card) => {
    if (card.flipped || card.matched || gameWon) return;

    const flippedUnmatched = cards.filter((c) => c.flipped && !c.matched);
    if (flippedUnmatched.length >= 2) return;

    if (card.word?.word_en) {
      speakWord(card.word.word_en);
    }

    const updated = cards.map((c) => (c.uid === card.uid ? { ...c, flipped: true } : c));
    setCards(updated);

    if (flippedUnmatched.length === 1) {
      setMoves((m) => m + 1);
      const first = flippedUnmatched[0];

      if (first.word.id === card.word.id) {
        setTimeout(() => {
          setCards((prev) => {
            const next = prev.map((c) => (c.word.id === card.word.id ? { ...c, matched: true } : c));
            const allDone = next.every((c) => c.matched);
            if (allDone) {
              setGameWon(true);
              playSuccessSound();
              celebrate();
              onWin();
            }
            return next;
          });
        }, 300);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.matched ? c : { ...c, flipped: false })));
        }, 850);
      }
    }
  };

  const matchedPairs = cards.filter((c) => c.matched).length / 2;
  const totalPairs = cards.length / 2;

  if (gameWon) {
    return (
      <div className="w-full max-w-md mx-auto bg-white border-2 border-purple-200 rounded-3xl p-8 text-center shadow-lg animate-in zoom-in-95">
        <div className="text-6xl mb-3 animate-bounce">🏆</div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">Parabéns!</h3>
        <p className="text-slate-500 font-semibold text-sm mb-4">
          Você encontrou todos os {totalPairs} pares em <strong>{moves} tentativas</strong>!
        </p>
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-amber-700 font-black text-sm mb-6">
          <span>⭐</span> +3 Estrelinhas ganhas!
        </div>

        <button
          onClick={setupGame}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md active:scale-95 transition-all cursor-pointer text-sm"
        >
          Jogar Novamente ↺
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center bg-purple-50/60 border-2 border-purple-100 rounded-3xl p-6">
      <div className="flex items-center justify-between w-full mb-5 px-1">
        <span className="bg-purple-100 text-purple-800 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
          Pares: {matchedPairs} / {totalPairs}
        </span>
        <span className="text-xs sm:text-sm font-bold text-slate-500 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
          Tentativas: <strong className="text-slate-800">{moves}</strong>
        </span>
      </div>

      <div
        className={`grid gap-3 sm:gap-4 w-full ${
          cards.length <= 6
            ? 'grid-cols-3 max-w-md'
            : cards.length <= 8
            ? 'grid-cols-4 max-w-lg'
            : 'grid-cols-3 sm:grid-cols-4'
        }`}
      >
        {cards.map((c) => (
          <button
            key={c.uid}
            onClick={() => handleCardClick(c)}
            className={`w-full aspect-square rounded-2xl sm:rounded-3xl border-2 sm:border-4 flex flex-col items-center justify-center p-2 transition-all duration-200 cursor-pointer ${
              c.matched
                ? 'bg-emerald-50 border-emerald-400 opacity-90 scale-98 shadow-xs'
                : c.flipped
                ? 'bg-white border-purple-500 shadow-md scale-103 ring-4 ring-purple-100'
                : 'bg-gradient-to-br from-purple-500 via-indigo-500 to-indigo-600 border-purple-300 shadow-md hover:shadow-lg hover:scale-103 active:scale-95 text-white'
            }`}
          >
            {c.flipped || c.matched ? (
              <div className="flex flex-col items-center justify-center h-full w-full select-none">
                <span className="text-4xl sm:text-5xl drop-shadow-xs mb-1">
                  {c.word?.emoji || '⭐'}
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-800 truncate max-w-full px-1">
                  {c.word?.word_en}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full w-full select-none">
                <span className="text-3xl sm:text-4xl font-black text-white/90 drop-shadow-sm">
                  ❓
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== 4. SPEED TAP ==================== */
function GameSpeedTap({ pool, onWin }: { pool: Word[]; onWin: () => void }) {
  const [target, setTarget] = useState<Word | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const [timer, setTimer] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRound = useCallback(() => {
    if (pool.length < 4) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled[0];
    setTarget(chosen);
    setOptions(shuffled.slice(0, 4).sort(() => Math.random() - 0.5));
    setTimer(5);
    speakWord(chosen.word_en);
  }, [pool]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setTimer((v) => {
        if (v <= 1) {
          startRound();
          return 5;
        }
        return v - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startRound]);

  const handlePick = (w: Word) => {
    if (!target) return;
    if (w.id === target.id) {
      onWin();
      startRound();
    }
  };

  if (!target) return <EmptyWarning />;

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 text-center">
      <div className="flex items-center justify-between mb-4">
        <span className="bg-amber-200 text-amber-800 text-xs font-black px-3 py-1 rounded-full uppercase">
          ⚡ Speed Tap
        </span>
        <span className="text-amber-800 font-black text-sm">Tempo: {timer}s</span>
      </div>

      <h3 className="text-2xl font-black text-slate-800 my-2">Toque em: "{target.word_en}"</h3>
      <button
        onClick={() => speakWord(target.word_en)}
        className="text-xs font-bold text-amber-700 bg-white border border-amber-300 px-3 py-1 rounded-full inline-flex items-center gap-1 mb-6 cursor-pointer"
      >
        <Volume2 className="w-3.5 h-3.5" /> Ouvir
      </button>

      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handlePick(opt)}
            className="p-5 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-500 shadow-sm flex flex-col items-center cursor-pointer active:scale-95 transition-all"
          >
            <span className="text-5xl mb-1">{opt.emoji || '⭐'}</span>
            <span className="text-xs font-bold text-slate-600">{opt.word_pt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== 5. WORD BUILDER ==================== */
function GameWordBuilder({ pool, onWin }: { pool: Word[]; onWin: () => void }) {
  const eligible = pool.filter((w) => w.word_en && w.word_en.trim().length >= 3);
  const [target, setTarget] = useState<Word | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [scramble, setScramble] = useState<{ id: number; char: string }[]>([]);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    if (eligible.length === 0) return;
    const chosen = eligible[Math.floor(Math.random() * eligible.length)];
    setTarget(chosen);
    setPicked([]);
    const letters = chosen.word_en.toUpperCase().replace(/[^A-Z]/g, '').split('');
    setScramble(letters.map((char, id) => ({ id, char })).sort(() => Math.random() - 0.5));
    speakWord(chosen.word_en);
  }, [eligible]);

  useEffect(() => {
    startRound();
    return () => {
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
  }, [startRound]);

  const handlePick = (id: number) => {
    if (!target || picked.includes(id)) return;
    const newPicked = [...picked, id];
    setPicked(newPicked);

    const targetClean = target.word_en.toUpperCase().replace(/[^A-Z]/g, '');
    const currentStr = newPicked.map((idx) => scramble[idx].char).join('');
    if (currentStr.length === targetClean.length) {
      if (currentStr === targetClean) {
        onWin();
        roundTimerRef.current = setTimeout(startRound, 800);
      } else {
        roundTimerRef.current = setTimeout(() => setPicked([]), 500);
      }
    }
  };

  if (!target) return <EmptyWarning />;

  return (
    <div className="bg-teal-50 border-2 border-teal-200 rounded-3xl p-6 text-center">
      <span className="bg-teal-200 text-teal-800 text-xs font-black px-3 py-1 rounded-full uppercase">
        🔤 Word Builder
      </span>

      <div className="text-6xl my-3">{target.emoji || '⭐'}</div>
      <h3 className="text-lg font-black text-slate-800">{target.word_pt}</h3>

      <div className="flex justify-center gap-2 my-5">
        {target.word_en.toUpperCase().replace(/[^A-Z]/g, '').split('').map((_, i) => {
          const char = picked[i] !== undefined ? scramble[picked[i]].char : '';
          return (
            <div
              key={i}
              className="w-11 h-12 rounded-xl border-2 border-teal-500 bg-white flex items-center justify-center font-black text-xl text-teal-700 shadow-xs"
            >
              {char}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 flex-wrap">
        {scramble.map((item, idx) => {
          const used = picked.includes(idx);
          return (
            <button
              key={item.id}
              onClick={() => handlePick(idx)}
              disabled={used}
              className={`w-12 h-12 rounded-2xl font-black text-lg border-2 transition-all ${
                used
                  ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed'
                  : 'border-teal-300 bg-white text-teal-800 shadow-sm hover:border-teal-500 active:scale-95 cursor-pointer'
              }`}
            >
              {item.char}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          onClick={() => setPicked([])}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Limpar e tentar de novo ↺
        </button>
      </div>
    </div>
  );
}

/* ==================== 6. CORES & FORMAS ==================== */
function GameColorsMatch({ pool, onWin }: { pool: Word[]; onWin: () => void }) {
  const [target, setTarget] = useState<Word | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    if (pool.length < 4) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled[0];
    setTarget(chosen);
    setOptions(shuffled.slice(0, 4).sort(() => Math.random() - 0.5));
    speakWord(chosen.word_en);
  }, [pool]);

  useEffect(() => {
    startRound();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startRound]);

  const handlePick = (w: Word) => {
    if (!target) return;
    if (w.id === target.id) {
      onWin();
      timerRef.current = setTimeout(startRound, 700);
    }
  };

  if (!target) return <EmptyWarning />;

  return (
    <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 text-center">
      <span className="bg-rose-200 text-rose-800 text-xs font-black px-3 py-1 rounded-full uppercase">
        🎨 Cores & Formas
      </span>

      <h3 className="text-xl font-black text-slate-800 my-4">
        Encontre: <span className="text-rose-600 font-extrabold">{target.word_en}</span> ({target.word_pt})
      </h3>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handlePick(opt)}
            className="p-6 rounded-2xl bg-white border-2 border-rose-200 hover:border-rose-400 shadow-sm flex flex-col items-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-6xl mb-2">{opt.emoji || '⭐'}</span>
            <span className="text-xs font-bold text-slate-500">{opt.word_pt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== 7. QUEM É ESSA SOMBRA? ==================== */
function GameShadowHunter({ pool, onWin }: { pool: Word[]; onWin: () => void }) {
  const [target, setTarget] = useState<Word | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    if (pool.length < 4) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const chosen = shuffled[0];
    setTarget(chosen);
    setOptions(shuffled.slice(0, 4).sort(() => Math.random() - 0.5));
    speakWord(chosen.word_en);
  }, [pool]);

  useEffect(() => {
    startRound();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startRound]);

  const handlePick = (w: Word) => {
    if (!target) return;
    if (w.id === target.id) {
      onWin();
      timerRef.current = setTimeout(startRound, 700);
    }
  };

  if (!target) return <EmptyWarning />;

  return (
    <div className="bg-violet-50 border-2 border-violet-200 rounded-3xl p-6 text-center">
      <span className="bg-violet-200 text-violet-800 text-xs font-black px-3 py-1 rounded-full uppercase">
        🕵️‍♂️ Quem é essa Sombra?
      </span>

      <div className="my-6">
        <span className="text-8xl inline-block filter brightness-0 opacity-80 drop-shadow-md">
          {target.emoji || '⭐'}
        </span>
      </div>

      <button
        onClick={() => speakWord(target.word_en)}
        className="text-xs font-bold text-violet-700 bg-white border border-violet-300 px-3 py-1.5 rounded-full inline-flex items-center gap-1 mb-6 cursor-pointer hover:bg-violet-100"
      >
        <Volume2 className="w-3.5 h-3.5" /> Ouvir a dica em inglês
      </button>

      <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handlePick(opt)}
            className="p-4 rounded-2xl bg-white border-2 border-violet-200 hover:border-violet-500 shadow-sm flex flex-col items-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-4xl">{opt.emoji || '⭐'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyWarning() {
  return (
    <div className="text-center py-12 text-slate-400 font-bold">
      Poucas palavras disponíveis para este modo. Selecione "🌈 Todas as Palavras".
    </div>
  );
}