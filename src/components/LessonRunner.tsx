import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, Check, Lock, Star, Pencil, Home, ChevronRight, CheckCircle2, XCircle, Award } from 'lucide-react';
import type { Module, Word, LessonProgress } from '@/lib/supabase';
import { supabase, LESSON_STEPS } from '@/lib/supabase';
import { speakWord, playSuccessSound } from '@/lib/speech';
import { celebrate } from '@/lib/confetti';

type LessonRunnerProps = {
  module: Module;
  lessonDay: number;
  profileId: string;
  profileName: string;
  existingProgress: LessonProgress | null;
  onBack: () => void;
  onComplete: () => void;
  onStarsUpdated: () => void;
  profileStars: number;
};

const STEP_DURATION = 15 * 60; // 15 minutos
const PARENT_PIN = '1234';
const LESSON_BONUS = 20;

export default function LessonRunner({
  module,
  lessonDay,
  profileId,
  profileName,
  existingProgress,
  onBack,
  onComplete,
  onStarsUpdated,
  profileStars,
}: LessonRunnerProps) {
  const [words, setWords] = useState<Word[]>([]);
  const [currentStep, setCurrentStep] = useState(existingProgress?.current_step || 1);
  const [timeLeft, setTimeLeft] = useState(STEP_DURATION);
  const [stepDone, setStepDone] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [parentPin, setParentPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [newBadgesUnlocked, setNewBadgesUnlocked] = useState<any[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('module_id', module.id)
        .order('word_order', { ascending: true });
      if (!error && data) setWords(data as Word[]);
      setLoading(false);
    })();
  }, [module.id]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep]);

  const saveProgress = useCallback(
    async (step: number, status: 'in_progress' | 'completed' = 'in_progress') => {
      if (existingProgress?.id) {
        await supabase
          .from('lesson_progress')
          .update({ current_step: step, status })
          .eq('id', existingProgress.id);
      } else {
        const { data } = await supabase
          .from('lesson_progress')
          .upsert(
            {
              profile_id: profileId,
              module_id: module.id,
              lesson_day: lessonDay,
              current_step: step,
              status,
            },
            { onConflict: 'profile_id,module_id,lesson_day' }
          )
          .select('*')
          .single();
        if (data) existingProgress = data as LessonProgress;
      }
    },
    [existingProgress, profileId, module.id, lessonDay]
  );

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function completeStep(step: number) {
    setStepDone((prev) => new Set(prev).add(step));
    playSuccessSound();
    if (step < 4) {
      saveProgress(step + 1);
      setTimeout(() => {
        setCurrentStep(step + 1);
        setTimeLeft(STEP_DURATION);
      }, 600);
    }
  }

  async function checkAndAwardBadges(currentStreak: number, totalStars: number) {
    try {
      const { data: allBadges } = await supabase.from('badges').select('*');
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('profile_id', profileId);

      if (!allBadges) return [];

      const unlockedSet = new Set((userBadges || []).map((ub: any) => ub.badge_id));
      const newlyEarned: any[] = [];

      for (const badge of allBadges) {
        if (unlockedSet.has(badge.id)) continue;

        let shouldUnlock = false;

        if (badge.requirement_type === 'lessons') {
          shouldUnlock = true;
        } else if (badge.requirement_type === 'real_missions') {
          shouldUnlock = true;
        } else if (badge.requirement_type === 'streak' && currentStreak >= badge.requirement_value) {
          shouldUnlock = true;
        } else if (badge.requirement_type === 'stars' && totalStars >= badge.requirement_value) {
          shouldUnlock = true;
        }

        if (shouldUnlock) {
          await supabase.from('user_badges').insert({
            profile_id: profileId,
            badge_id: badge.id,
          });
          newlyEarned.push(badge);
        }
      }

      return newlyEarned;
    } catch {
      return [];
    }
  }

  async function finishLesson() {
    if (existingProgress?.id) {
      await supabase
        .from('lesson_progress')
        .update({ status: 'completed', completed_at: new Date().toISOString(), current_step: 4 })
        .eq('id', existingProgress.id);
    } else {
      await supabase.from('lesson_progress').upsert(
        {
          profile_id: profileId,
          module_id: module.id,
          lesson_day: lessonDay,
          current_step: 4,
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,module_id,lesson_day' }
      );
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('streak_days, last_activity_date, stars, monthly_stars')
      .eq('id', profileId)
      .single();

    const todayStr = new Date().toISOString().split('T')[0];
    let newStreak = 1;

    if (profileData?.last_activity_date) {
      const lastDate = new Date(profileData.last_activity_date);
      const currentDate = new Date(todayStr);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = (profileData.streak_days || 0) + 1;
      } else if (diffDays === 0) {
        newStreak = profileData.streak_days || 1;
      } else {
        newStreak = 1;
      }
    }

    const newStars = profileStars + LESSON_BONUS;
    const newMonthlyStars = (profileData?.monthly_stars || 0) + LESSON_BONUS;

    await supabase
      .from('profiles')
      .update({
        stars: newStars,
        monthly_stars: newMonthlyStars,
        streak_days: newStreak,
        last_activity_date: todayStr,
      })
      .eq('id', profileId);

    const earned = await checkAndAwardBadges(newStreak, newStars);
    setNewBadgesUnlocked(earned);

    onStarsUpdated();
    celebrate();
    setLessonComplete(true);
  }

  function handleParentApprove(e: React.FormEvent) {
    e.preventDefault();
    if (parentPin === PARENT_PIN) {
      setShowPinModal(false);
      setPinError('');
      finishLesson();
    } else {
      setPinError('PIN errado! O código padrão é 1234');
      setParentPin('');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  if (lessonComplete) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-3xl shadow-xl p-10 border-2 border-slate-100">
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Aula Concluída!</h2>
          <p className="text-xl text-slate-500 mb-4">Parabéns, {profileName}!</p>
          <div className="bg-amber-50 rounded-2xl p-4 mb-6 inline-flex items-center gap-2 border border-amber-200">
            <Star className="w-6 h-6 text-amber-500 fill-current" />
            <span className="text-2xl font-extrabold text-amber-600">+{LESSON_BONUS}</span>
            <span className="text-slate-600 font-bold">pontos bónus</span>
          </div>

          {newBadgesUnlocked.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 via-purple-50 to-pink-50 border-2 border-amber-300 rounded-3xl p-5 mb-6 text-center">
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-200/60 px-3 py-1 rounded-full">
                Nova Conquista Desbloqueada!
              </span>
              <div className="flex justify-center gap-4 mt-3">
                {newBadgesUnlocked.map((b) => (
                  <div key={b.id} className="flex flex-col items-center">
                    <span className="text-4xl">{b.icon}</span>
                    <strong className="text-sm text-slate-800 mt-1">{b.title}</strong>
                    <span className="text-[10px] text-slate-500">{b.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <button
              onClick={onComplete}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer text-base"
            >
              Voltar aos Módulos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepInfo = LESSON_STEPS[currentStep - 1] || { emoji: '⭐', title: 'Passo', subtitle: 'Atividade', duration: 15 };
  const timerProgress = ((STEP_DURATION - timeLeft) / STEP_DURATION) * 100;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          Sair da Aula
        </button>
        <div className="text-center">
          <p className="font-extrabold text-slate-800 text-lg">Aula {lessonDay} • {module.title || module.title_pt}</p>
          <span className="text-xs text-slate-400 font-semibold">{module.title_en}</span>
        </div>
        <div className="w-16" />
      </div>

      {/* Indicadores de Passo */}
      <div className="flex items-center justify-center gap-3 mb-5">
        {LESSON_STEPS.map((s, i) => {
          const stepNum = i + 1;
          const done = stepDone.has(stepNum);
          const active = stepNum === currentStep;
          const canAccess = done || stepNum === currentStep;

          return (
            <div key={s.step || i} className="flex items-center">
              <button
                onClick={() => {
                  if (canAccess) setCurrentStep(stepNum);
                }}
                disabled={!canAccess}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                  done
                    ? 'bg-emerald-500 text-white cursor-pointer shadow-sm'
                    : active
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                {done ? <Check className="w-5 h-5" /> : stepNum}
              </button>
              {i < LESSON_STEPS.length - 1 && (
                <div className={`w-6 md:w-10 h-1.5 mx-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Timer Panorâmico */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3.5">
            <span className="text-3xl">{stepInfo.emoji}</span>
            <div>
              <p className="font-extrabold text-slate-800 text-base">Passo {currentStep}: {stepInfo.title}</p>
              <p className="text-xs text-slate-400 font-medium">{stepInfo.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${timeLeft < 60 ? 'text-rose-500' : 'text-indigo-600'}`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-slate-400 font-semibold">{stepInfo.duration} min</p>
          </div>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft < 60 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-sky-400'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      {/* Conteúdo do Passo Expandido */}
      <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8 md:p-12 min-h-[420px] flex flex-col justify-center">
        {currentStep === 1 && <Step1Flashcards words={words} onComplete={() => completeStep(1)} />}
        {currentStep === 2 && <Step2Offline words={words} module={module} onComplete={() => completeStep(2)} />}
        {currentStep === 3 && <Step3MiniGames words={words} onComplete={() => completeStep(3)} />}
        {currentStep === 4 && <Step4RealChallenge words={words} onShowPin={() => setShowPinModal(true)} />}
      </div>

      {/* Modal PIN dos Pais */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowPinModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Confirmação dos Pais</h3>
              <p className="text-xs text-slate-400 mt-1">A criança completou a missão real em casa?</p>
            </div>
            <form onSubmit={handleParentApprove}>
              <input
                type="password"
                value={parentPin}
                onChange={(e) => setParentPin(e.target.value)}
                maxLength={4}
                inputMode="numeric"
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[0.3em] font-black rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none py-3 mb-3 bg-slate-50"
                autoFocus
              />
              {pinError && <p className="text-rose-500 text-xs font-bold text-center mb-3">{pinError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-all">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow transition-all cursor-pointer">
                  Aprovar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== STEP 1: FLASHCARDS ==================== */
function Step1Flashcards({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const [spoken, setSpoken] = useState<Set<number>>(new Set());

  const word = words[idx] || { word_en: 'HELLO', word_pt: 'Olá', emoji: '👋', phonetic: '(hé-lou)' };
  const isLast = idx >= words.length - 1;

  function next() {
    if (isLast) {
      onComplete();
    } else {
      setIdx((i) => i + 1);
    }
  }

  function handleSpeak() {
    speakWord(word.word_en);
    setSpoken((prev) => new Set(prev).add(idx));
  }

  return (
    <div className="text-center py-4 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">🔊 Flashcards & Pronúncia</h3>
      <p className="text-slate-400 text-base mb-8">Toca para ouvir o áudio e repete bem alto!</p>

      <div className="text-8xl md:text-9xl mb-6 select-none drop-shadow-sm">{word.emoji || '⭐'}</div>
      <h2 className="text-5xl md:text-6xl font-black text-slate-800 tracking-wide mb-2">{word.word_en}</h2>
      <p className="text-2xl text-indigo-600 font-bold mb-1">{word.word_pt}</p>
      <p className="text-slate-400 font-medium text-base mb-8">{word.phonetic || word.pronunciation || ''}</p>

      <button
        onClick={handleSpeak}
        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg mx-auto mb-6 transition-all cursor-pointer"
      >
        <Volume2 className="w-10 h-10" />
      </button>

      {spoken.has(idx) && <p className="text-emerald-500 text-sm font-bold mb-4">✅ Pronúncia ouvida!</p>}

      <div className="flex items-center justify-center gap-2 mb-8">
        {words.map((_, i) => (
          <div key={i} className={`h-2.5 rounded-full transition-all ${i === idx ? 'w-8 bg-indigo-600' : 'w-2.5 bg-slate-200'}`} />
        ))}
      </div>

      <button
        onClick={next}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <span>{isLast ? 'Concluir Passo 1' : 'Próxima Palavra'}</span>
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

/* ==================== STEP 2: OFFLINE ACTIVITY ==================== */
function Step2Offline({ words, onComplete }: { words: Word[]; module: Module; onComplete: () => void }) {
  const drawWords = words.slice(0, 3);

  return (
    <div className="text-center py-4 max-w-3xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">✏️ Hora do Caderno</h3>
      <p className="text-slate-400 text-base mb-6">Pega no teu caderno e no lápis de cor!</p>

      <div className="bg-amber-50 rounded-3xl p-6 md:p-8 mb-6 text-left border border-amber-200">
        <p className="font-extrabold text-amber-800 text-lg mb-4 flex items-center gap-2">
          <Pencil className="w-6 h-6" />
          Missão no caderno:
        </p>
        <ol className="space-y-3 text-base text-slate-700">
          <li className="flex items-start gap-2.5">
            <span className="bg-amber-200 text-amber-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
            Desenha estes itens no teu caderno:
          </li>
        </ol>
        <div className="flex justify-around gap-4 my-6 bg-white/90 p-5 rounded-2xl shadow-xs">
          {drawWords.map((w) => (
            <div key={w.id} className="text-center">
              <div className="text-5xl mb-2">{w.emoji || '⭐'}</div>
              <p className="font-black text-slate-800 text-base">{w.word_en}</p>
              <p className="text-xs text-slate-500 font-semibold">{w.word_pt}</p>
            </div>
          ))}
        </div>
        <ol className="space-y-3 text-base text-slate-700">
          <li className="flex items-start gap-2.5">
            <span className="bg-amber-200 text-amber-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
            Escreve o nome em inglês por baixo do desenho em letras grandes!
          </li>
          <li className="flex items-start gap-2.5">
            <span className="bg-amber-200 text-amber-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
            Lê cada palavra em voz alta enquanto mostras o desenho.
          </li>
        </ol>
      </div>

      <button
        onClick={onComplete}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 py-4 rounded-2xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <Check className="w-6 h-6" />
        Já desenhei e escrevi no caderno!
      </button>
    </div>
  );
}

/* ==================== STEP 3: MINI GAMES (EXPANDIDO PARA MONITOR) ==================== */
function Step3MiniGames({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const [activeGame, setActiveGame] = useState<'memory' | 'spelling' | 'listening'>('memory');
  const [completedGames, setCompletedGames] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [typedInput, setTypedInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const [memoryCards, setMemoryCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);

  const [shuffledListeningQueue, setShuffledListeningQueue] = useState<Word[]>([]);
  const [listeningOptions, setListeningOptions] = useState<Word[]>([]);

  const currentSpellingWord = words[currentIndex] || words[0] || { id: '1', word_en: 'HELLO', word_pt: 'Olá', emoji: '👋' };
  const currentListeningWord = shuffledListeningQueue[currentIndex] || currentSpellingWord;

  useEffect(() => {
    if (activeGame === 'memory' && words.length > 0) {
      const sample = [...words].sort(() => Math.random() - 0.5).slice(0, 4);
      const cards: any[] = [];
      sample.forEach((w, i) => {
        cards.push({ id: i * 2, text: `${w.emoji || ''} ${w.word_en}`, wordId: w.id, isFlipped: false, isMatched: false });
        cards.push({ id: i * 2 + 1, text: w.word_pt, wordId: w.id, isFlipped: false, isMatched: false });
      });
      setMemoryCards(cards.sort(() => Math.random() - 0.5));
      setFlipped([]);
    }
  }, [activeGame, words]);

  useEffect(() => {
    if (activeGame === 'listening' && words.length > 0) {
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setShuffledListeningQueue(shuffled);
      setCurrentIndex(0);
    }
  }, [activeGame, words]);

  useEffect(() => {
    if (activeGame === 'listening' && currentListeningWord && words.length > 0) {
      const otherWords = words.filter((w) => w.id !== currentListeningWord.id);
      const randomWrong = otherWords.sort(() => Math.random() - 0.5).slice(0, 3);
      const choices = [currentListeningWord, ...randomWrong].sort(() => Math.random() - 0.5);
      setListeningOptions(choices);
    }
  }, [activeGame, currentIndex, currentListeningWord, words]);

  const markGameDone = (gameKey: 'memory' | 'spelling' | 'listening') => {
    if (!completedGames.includes(gameKey)) {
      setCompletedGames((prev) => [...prev, gameKey]);
    }
    setFeedback(null);
    setTypedInput('');
    setCurrentIndex(0);
  };

  const handleFlipCard = (index: number) => {
    if (flipped.length === 2 || memoryCards[index].isFlipped || memoryCards[index].isMatched) return;

    const newCards = [...memoryCards];
    newCards[index].isFlipped = true;
    const nextFlipped = [...flipped, index];
    setMemoryCards(newCards);
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const [first, second] = nextFlipped;
      if (newCards[first].wordId === newCards[second].wordId) {
        newCards[first].isMatched = true;
        newCards[second].isMatched = true;
        setMemoryCards(newCards);
        setFlipped([]);
        if (newCards.every((c) => c.isMatched)) {
          markGameDone('memory');
        }
      } else {
        setTimeout(() => {
          newCards[first].isFlipped = false;
          newCards[second].isFlipped = false;
          setMemoryCards(newCards);
          setFlipped([]);
        }, 1000);
      }
    }
  };

  const handleSpellCheck = () => {
    if (typedInput.trim().toUpperCase() === currentSpellingWord.word_en.toUpperCase()) {
      setFeedback('correct');
      speakWord(currentSpellingWord.word_en);
      setTimeout(() => {
        setFeedback(null);
        setTypedInput('');
        if (currentIndex < words.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          markGameDone('spelling');
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1200);
    }
  };

  const handleListeningSelect = (selectedWord: Word) => {
    if (selectedWord.id === currentListeningWord.id) {
      setFeedback('correct');
      speakWord(currentListeningWord.word_en);
      setTimeout(() => {
        setFeedback(null);
        if (currentIndex < words.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          markGameDone('listening');
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  const allThreeDone =
    completedGames.includes('memory') &&
    completedGames.includes('spelling') &&
    completedGames.includes('listening');

  return (
    <div className="w-full flex flex-col items-center max-w-3xl mx-auto">
      {/* Abas dos 3 Jogos */}
      <div className="grid grid-cols-3 gap-3 w-full mb-6">
        {[
          { key: 'memory', label: 'Memória', icon: '🧠' },
          { key: 'spelling', label: 'Spelling', icon: '🔤' },
          { key: 'listening', label: 'Listening', icon: '👂' },
        ].map((tab) => {
          const isActive = activeGame === tab.key;
          const isDone = completedGames.includes(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveGame(tab.key as any);
                setCurrentIndex(0);
                setFeedback(null);
              }}
              className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-black text-sm md:text-base border-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                  : isDone
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {isDone && <span className="text-emerald-600 font-black">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Caixa do Jogo Ativo: EXPANDIDA COM max-w-2xl */}
      <div className="w-full bg-slate-50 rounded-3xl p-8 min-h-[380px] flex flex-col items-center justify-between border-2 border-slate-200">
        {/* JOGO 1: MEMÓRIA */}
        {activeGame === 'memory' && (
          <div className="grid grid-cols-4 gap-3.5 w-full max-w-xl my-auto">
            {memoryCards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => handleFlipCard(idx)}
                className={`h-24 md:h-28 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center p-3 border-2 transition-all ${
                  card.isFlipped || card.isMatched
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-inner'
                    : 'bg-indigo-600 border-indigo-700 text-white shadow-md hover:bg-indigo-700 cursor-pointer text-2xl font-black'
                }`}
              >
                {card.isFlipped || card.isMatched ? <span>{card.text}</span> : <span>?</span>}
              </button>
            ))}
          </div>
        )}

        {/* JOGO 2: SPELLING */}
        {activeGame === 'spelling' && (
          <div className="flex flex-col items-center gap-5 my-auto w-full max-w-xl">
            <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-4 py-1.5 rounded-full uppercase tracking-wider">
              Palavra {currentIndex + 1} de {words.length}
            </span>
            <span className="text-6xl md:text-7xl">{currentSpellingWord.emoji || '📝'}</span>
            <p className="text-lg font-bold text-slate-700">
              Tradução: <span className="text-indigo-600 font-black text-xl">{currentSpellingWord.word_pt}</span>
            </p>
            <div className="flex gap-3 w-full">
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSpellCheck()}
                placeholder="Digita em inglês..."
                className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-200 bg-white text-center text-xl font-black uppercase tracking-wider focus:outline-none focus:border-indigo-500 shadow-inner"
              />
              <button
                onClick={handleSpellCheck}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl active:scale-95 transition-all cursor-pointer text-base"
              >
                Conferir
              </button>
            </div>
          </div>
        )}

        {/* JOGO 3: LISTENING */}
        {activeGame === 'listening' && (
          <div className="flex flex-col items-center gap-4 my-auto w-full max-w-xl">
            <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-4 py-1.5 rounded-full uppercase tracking-wider">
              Palavra {currentIndex + 1} de {words.length}
            </span>
            <button
              onClick={() => speakWord(currentListeningWord.word_en)}
              className="w-24 h-24 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer my-1"
            >
              <Volume2 className="w-12 h-12" />
            </button>
            <p className="text-xs font-bold text-slate-400">Clica para ouvir o áudio</p>
            <div className="grid grid-cols-2 gap-4 w-full mt-2">
              {listeningOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleListeningSelect(opt)}
                  className="p-5 rounded-2xl border-2 border-slate-200 bg-white font-extrabold text-slate-700 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer shadow-sm text-center text-base"
                >
                  {opt.word_pt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedbacks */}
        {feedback === 'correct' && (
          <div className="flex items-center gap-2 text-emerald-600 font-black text-base animate-bounce mt-4">
            <CheckCircle2 className="w-6 h-6" /> Muito bem! Acertaste!
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="flex items-center gap-2 text-rose-500 font-black text-base mt-4">
            <XCircle className="w-6 h-6" /> Tenta outra vez!
          </div>
        )}
      </div>

      {/* Barra Inferior com Trava */}
      <div className="w-full mt-6 flex flex-wrap justify-between items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">
            Concluídos: <strong>{completedGames.length} de 3 jogos</strong>
          </span>
          {!allThreeDone ? (
            <span className="text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-full font-bold">
              Faça todos para liberar 🔒
            </span>
          ) : (
            <span className="text-xs text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-bold">
              Liberado! ✅
            </span>
          )}
        </div>

        <button
          onClick={onComplete}
          disabled={!allThreeDone}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base shadow-md transition-all ${
            allThreeDone
              ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          <span>Concluir Passo 3 e ir para Desafio Real</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ==================== STEP 4: REAL CHALLENGE ==================== */
function Step4RealChallenge({ words, onShowPin }: { words: Word[]; onShowPin: () => void }) {
  const challengeWords = words.slice(0, 3);
  return (
    <div className="text-center py-4 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">🏆 Desafio Real</h3>
      <p className="text-slate-400 text-base mb-6">Fala estas palavras em inglês para os teus pais!</p>

      <div className="bg-rose-50 rounded-3xl p-6 md:p-8 mb-6 border border-rose-200">
        <p className="font-extrabold text-rose-700 text-lg mb-4 flex items-center justify-center gap-2">
          <Home className="w-6 h-6" />
          Como funciona:
        </p>
        <ol className="space-y-3 text-base text-slate-700 text-left max-w-md mx-auto mb-6">
          <li className="flex items-start gap-2.5">
            <span className="bg-rose-200 text-rose-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
            Chama o papá ou a mamã.
          </li>
          <li className="flex items-start gap-2.5">
            <span className="bg-rose-200 text-rose-800 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
            Diz estas 3 palavras em inglês em voz alta:
          </li>
        </ol>
        <div className="flex justify-around gap-4 bg-white/90 p-4 rounded-2xl max-w-md mx-auto shadow-xs">
          {challengeWords.map((w) => (
            <div key={w.id} className="text-center">
              <div className="text-4xl mb-1">{w.emoji || '⭐'}</div>
              <p className="font-black text-slate-800 text-base">{w.word_en}</p>
              <button onClick={() => speakWord(w.word_en)} className="text-indigo-600 text-xs font-bold inline-flex items-center gap-0.5 mt-1 cursor-pointer">
                <Volume2 className="w-3.5 h-3.5" /> Ouvir
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onShowPin}
        className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <Lock className="w-6 h-6" />
        Já falei em voz alta! Pedir confirmação dos pais
      </button>
    </div>
  );
}