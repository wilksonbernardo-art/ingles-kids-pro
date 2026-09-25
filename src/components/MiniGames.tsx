import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle2, XCircle, ArrowRight, Trophy, Sparkles, RefreshCw, Star, FastForward } from 'lucide-react';

interface Word {
  id: string;
  word_en: string;
  word_pt: string;
  phonetic: string;
  emoji?: string;
}

interface MiniGamesProps {
  words: Word[];
  onComplete: () => void;
}

type GameType = 'listen_spell' | 'unscramble' | 'word_match' | 'memory';

export default function MiniGames({ words, onComplete }: MiniGamesProps) {
  const gamesList: { type: GameType; title: string; desc: string; icon: string }[] = [
    { type: 'listen_spell', title: 'Ditado Mágico', desc: 'Ouça o áudio e escreva a palavra certa!', icon: '🎧' },
    { type: 'unscramble', title: 'Monta-Palavra', desc: 'Coloque as letrinhas embaralhadas na ordem!', icon: '🧩' },
    { type: 'word_match', title: 'Desafio Rápido', desc: 'Qual é o par correto da palavra?', icon: '🎯' },
    { type: 'memory', title: 'Jogo da Memória', desc: 'Encontre todos os pares em inglês e português!', icon: '🃏' },
  ];

  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [completedGames, setCompletedGames] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Estados dos jogos
  const [inputSpell, setInputSpell] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [unscrambledLetters, setUnscrambledLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<{ id: number; char: string }[]>([]);

  // Feedback visual
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Estado do Jogo da Memória
  const [memoryCards, setMemoryCards] = useState<{ id: number; text: string; wordId: string; type: 'en' | 'pt'; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);

  const currentWord = (words && words.length > 0) ? (words[currentIndex] || words[0]) : { id: '1', word_en: 'HELLO', word_pt: 'Olá', phonetic: '(hé-lou)', emoji: '👋' };
  const currentGame = gamesList[activeGameIndex];

  // Síntese de voz nativa da Web
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Inicializa o jogo de desembaralhar letras
  useEffect(() => {
    if (currentGame.type === 'unscramble' && currentWord) {
      const letters = currentWord.word_en.toUpperCase().split('');
      const shuffled = letters
        .map((char, index) => ({ id: index, char }))
        .sort(() => Math.random() - 0.5);
      setAvailableLetters(shuffled);
      setUnscrambledLetters([]);
    }
    if (currentGame.type === 'listen_spell' && currentWord) {
      speak(currentWord.word_en);
    }
  }, [activeGameIndex, currentIndex, currentWord]);

  // Inicializa o jogo da memória
  useEffect(() => {
    if (currentGame.type === 'memory' && words && words.length > 0) {
      const sample = words.slice(0, 4);
      const cards: any[] = [];
      sample.forEach((w, i) => {
        cards.push({ id: i * 2, text: `${w.emoji || ''} ${w.word_en}`, wordId: w.id, type: 'en', isFlipped: false, isMatched: false });
        cards.push({ id: i * 2 + 1, text: w.word_pt, wordId: w.id, type: 'pt', isFlipped: false, isMatched: false });
      });
      setMemoryCards(cards.sort(() => Math.random() - 0.5));
      setFlippedCards([]);
    }
  }, [activeGameIndex, words]);

  const markCurrentGameComplete = () => {
    if (!completedGames.includes(currentGame.type)) {
      setCompletedGames(prev => [...prev, currentGame.type]);
    }
    setFeedback('idle');
    setInputSpell('');
    setSelectedMatch(null);

    if (activeGameIndex < gamesList.length - 1) {
      setActiveGameIndex(prev => prev + 1);
      setCurrentIndex(0);
    }
  };

  // 1. Ditado
  const handleCheckSpell = () => {
    if (inputSpell.trim().toLowerCase() === currentWord.word_en.toLowerCase()) {
      setFeedback('correct');
      speak(currentWord.word_en);
      setTimeout(() => {
        setFeedback('idle');
        setInputSpell('');
        if (currentIndex < Math.min(words.length - 1, 3)) {
          setCurrentIndex(prev => prev + 1);
        } else {
          markCurrentGameComplete();
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('idle'), 1500);
    }
  };

  // 2. Monta-Palavra
  const handleLetterClick = (item: { id: number; char: string }) => {
    const nextLetters = [...unscrambledLetters, item.char];
    setUnscrambledLetters(nextLetters);
    setAvailableLetters(prev => prev.filter(l => l.id !== item.id));

    if (nextLetters.length === currentWord.word_en.length) {
      const wordBuilt = nextLetters.join('');
      if (wordBuilt.toUpperCase() === currentWord.word_en.toUpperCase()) {
        setFeedback('correct');
        speak(currentWord.word_en);
        setTimeout(() => {
          setFeedback('idle');
          if (currentIndex < Math.min(words.length - 1, 3)) {
            setCurrentIndex(prev => prev + 1);
          } else {
            markCurrentGameComplete();
          }
        }, 1200);
      } else {
        setFeedback('wrong');
        setTimeout(() => {
          setFeedback('idle');
          const letters = currentWord.word_en.toUpperCase().split('');
          setAvailableLetters(letters.map((char, index) => ({ id: index, char })).sort(() => Math.random() - 0.5));
          setUnscrambledLetters([]);
        }, 1200);
      }
    }
  };

  // 3. Desafio Rápido
  const handleCheckMatch = (selectedPt: string) => {
    setSelectedMatch(selectedPt);
    if (selectedPt === currentWord.word_pt) {
      setFeedback('correct');
      speak(currentWord.word_en);
      setTimeout(() => {
        setFeedback('idle');
        setSelectedMatch(null);
        if (currentIndex < Math.min(words.length - 1, 3)) {
          setCurrentIndex(prev => prev + 1);
        } else {
          markCurrentGameComplete();
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback('idle'), 1200);
    }
  };

  // 4. Jogo da Memória
  const handleFlipCard = (index: number) => {
    if (flippedCards.length === 2 || memoryCards[index].isFlipped || memoryCards[index].isMatched) return;

    const newCards = [...memoryCards];
    newCards[index].isFlipped = true;
    const newFlipped = [...flippedCards, index];
    setMemoryCards(newCards);
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (newCards[first].wordId === newCards[second].wordId) {
        newCards[first].isMatched = true;
        newCards[second].isMatched = true;
        setMemoryCards(newCards);
        setFlippedCards([]);

        if (newCards.every(c => c.isMatched)) {
          setFeedback('correct');
          setTimeout(() => markCurrentGameComplete(), 1500);
        }
      } else {
        setTimeout(() => {
          newCards[first].isFlipped = false;
          newCards[second].isFlipped = false;
          setMemoryCards(newCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const allCompleted = completedGames.length === gamesList.length;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Navegação entre os 4 Minijogos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full mb-6">
        {gamesList.map((g, idx) => {
          const isDone = completedGames.includes(g.type);
          const isCurrent = activeGameIndex === idx;
          return (
            <button
              key={g.type}
              onClick={() => {
                setActiveGameIndex(idx);
                setCurrentIndex(0);
                setFeedback('idle');
              }}
              className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-left transition-all ${
                isCurrent
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm'
                  : isDone
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className="text-xl">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{g.title}</p>
                <span className="text-[10px] font-semibold text-slate-400">
                  {isDone ? 'Feito ✅' : `Fase ${idx + 1}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cartão Central do Jogo */}
      <div className="w-full bg-white rounded-3xl border-2 border-slate-100 shadow-md p-6 flex flex-col items-center min-h-[380px] justify-between">
        <div className="text-center mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
            {currentGame.title}
          </span>
          <p className="text-sm text-slate-500 mt-1 font-medium">{currentGame.desc}</p>
        </div>

        {/* 1. DITADO */}
        {currentGame.type === 'listen_spell' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-md my-auto">
            <button
              onClick={() => speak(currentWord.word_en)}
              className="w-20 h-20 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-transform"
            >
              <Volume2 className="w-10 h-10" />
            </button>
            <p className="text-xs font-semibold text-slate-400">Clique para ouvir novamente</p>

            <div className="w-full flex gap-2 mt-2">
              <input
                type="text"
                value={inputSpell}
                onChange={e => setInputSpell(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheckSpell()}
                placeholder="Escreva em inglês..."
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 text-center text-lg font-bold uppercase tracking-wider focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleCheckSpell}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl active:scale-95 transition-all"
              >
                Conferir
              </button>
            </div>
            <p className="text-xs text-slate-400">Significado: <strong className="text-slate-600">{currentWord.word_pt}</strong></p>
          </div>
        )}

        {/* 2. MONTA-PALAVRA */}
        {currentGame.type === 'unscramble' && (
          <div className="flex flex-col items-center gap-5 w-full my-auto">
            <div className="text-5xl select-none">{currentWord.emoji || '⭐'}</div>
            <p className="text-sm font-semibold text-slate-500">Significa: <strong>{currentWord.word_pt}</strong></p>

            <div className="flex gap-2 min-h-[50px] p-2 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl items-center px-4">
              {unscrambledLetters.length === 0 ? (
                <span className="text-xs text-slate-400 font-medium">Toque nas letras abaixo para montar</span>
              ) : (
                unscrambledLetters.map((char, i) => (
                  <span key={i} className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-sm">
                    {char}
                  </span>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {availableLetters.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleLetterClick(item)}
                  className="w-12 h-12 bg-amber-100 border-2 border-amber-300 hover:bg-amber-200 active:scale-90 text-amber-900 rounded-xl font-black text-xl shadow-sm transition-all"
                >
                  {item.char}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. DESAFIO RÁPIDO */}
        {currentGame.type === 'word_match' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-md my-auto">
            <div className="flex items-center gap-3 bg-indigo-50 px-6 py-4 rounded-3xl border border-indigo-100">
              <span className="text-4xl">{currentWord.emoji || '⭐'}</span>
              <span className="text-2xl font-black text-indigo-900 tracking-wide">{currentWord.word_en}</span>
              <button onClick={() => speak(currentWord.word_en)} className="text-indigo-600 hover:scale-110">
                <Volume2 className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              {words.slice(0, 4).map(w => (
                <button
                  key={w.id}
                  onClick={() => handleCheckMatch(w.word_pt)}
                  className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all active:scale-95 ${
                    selectedMatch === w.word_pt
                      ? feedback === 'correct'
                        ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                        : 'border-rose-400 bg-rose-50 text-rose-700'
                      : 'border-slate-200 bg-white hover:border-indigo-300 text-slate-700'
                  }`}
                >
                  {w.word_pt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. MEMÓRIA */}
        {currentGame.type === 'memory' && (
          <div className="grid grid-cols-4 gap-3 w-full max-w-md my-auto">
            {memoryCards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => handleFlipCard(idx)}
                className={`h-20 rounded-2xl font-bold text-xs flex flex-col items-center justify-center p-2 border-2 transition-all ${
                  card.isFlipped || card.isMatched
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-inner'
                    : 'bg-indigo-600 border-indigo-700 text-white shadow hover:bg-indigo-700'
                }`}
              >
                {card.isFlipped || card.isMatched ? (
                  <span>{card.text}</span>
                ) : (
                  <span className="text-xl font-black select-none">?</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Feedbacks de Acerto / Erro */}
        {feedback === 'correct' && (
          <div className="flex items-center gap-2 text-emerald-600 font-extrabold animate-bounce mt-4">
            <CheckCircle2 className="w-6 h-6" />
            <span>Muito bem! Acertou!</span>
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="flex items-center gap-2 text-rose-500 font-extrabold mt-4">
            <XCircle className="w-6 h-6" />
            <span>Ops! Tente mais uma vez!</span>
          </div>
        )}
      </div>

      {/* Barra de Conclusão / Avanço */}
      <div className="w-full mt-6 flex flex-wrap justify-between items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Star className={`w-5 h-5 ${allCompleted ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
          <span className="text-xs md:text-sm font-semibold text-slate-600">
            Concluídos: <strong>{completedGames.length} de {gamesList.length}</strong>
          </span>
        </div>

        <button
          onClick={onComplete}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-md transition-all bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white cursor-pointer"
        >
          <span>Avançar para Passo 4 🚀</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Exportações de compatibilidade para o LessonRunner
export const SpellingPuzzle = MiniGames;
export const ListeningQuiz = MiniGames;
export const WordMatchGame = MiniGames;
export const MemoryGame = MiniGames;
export const MiniGamesHub = MiniGames;