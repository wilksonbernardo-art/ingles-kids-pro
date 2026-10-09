import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Volume2, Check, Lock, Star, Pencil, ChevronRight } from 'lucide-react';
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

const STEP_DURATION = 15 * 60;
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
  const isExam = lessonDay === 6;
  const [words, setWords] = useState<Word[]>([]);
  const [currentStep, setCurrentStep] = useState(existingProgress?.current_step || 1);
  const [timeLeft, setTimeLeft] = useState(STEP_DURATION);
  const [stepDone, setStepDone] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [parentPin, setParentPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      if (isExam) {
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .eq('module_id', module.id)
          .order('word_order', { ascending: true });

        if (!error && data) setWords(data as Word[]);
      } else {
        let targetLessonId: string | null = null;
        if (lessonDay) {
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', module.id)
            .eq('lesson_day', lessonDay)
            .maybeSingle();

          if (lessonData?.id) targetLessonId = lessonData.id;
        }

        let query = supabase.from('words').select('*').order('word_order', { ascending: true });
        if (targetLessonId) {
          query = query.eq('lesson_id', targetLessonId);
        } else {
          query = query.eq('module_id', module.id);
        }

        const { data, error } = await query;
        if (!error && data) setWords(data as Word[]);
      }

      setLoading(false);
    })();
  }, [module.id, lessonDay, isExam]);

  useEffect(() => {
    if (isExam) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, isExam]);

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

  async function finishLesson(customScoreBonus?: number) {
    const bonusToAward = customScoreBonus !== undefined ? customScoreBonus : LESSON_BONUS;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      localStorage.setItem(`daily_done_${profileId}_${todayStr}`, 'true');
      localStorage.setItem(`lesson_completed_${profileId}_${module.id}_${lessonDay}`, 'true');
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }

    try {
      const payload = {
        profile_id: profileId,
        user_id: profileId,
        module_id: String(module.id),
        lesson_day: Number(lessonDay),
        current_step: 4,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      if (existingProgress?.id) {
        await supabase
          .from('lesson_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_step: 4,
            user_id: profileId,
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('lesson_progress')
          .upsert(payload, { onConflict: 'profile_id,module_id,lesson_day' });
      }
    } catch (err) {
      console.error('Exceção ao salvar lesson_progress:', err);
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('streak_days, last_activity_date, stars, monthly_stars')
        .eq('id', profileId)
        .maybeSingle();

      const newStreak = (profileData?.streak_days || 0) + 1;
      const newStars = (profileData?.stars || profileStars) + bonusToAward;
      const newMonthlyStars = (profileData?.monthly_stars || 0) + bonusToAward;

      await supabase
        .from('profiles')
        .update({
          stars: newStars,
          monthly_stars: newMonthlyStars,
          streak_days: newStreak,
          last_activity_date: todayStr,
        })
        .eq('id', profileId);
    } catch (err) {
      console.warn('Erro ao atualizar estrelas do perfil:', err);
    }

    try {
      onStarsUpdated();
    } catch (e) {}

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

  if (isExam) {
    return (
      <WeeklyExamRunner
        words={words}
        moduleTitle={module.title || module.title_pt}
        onBack={onBack}
        onFinishExam={async (_score, earnedStars) => {
          await finishLesson(earnedStars);
          onComplete();
        }}
      />
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
            <span className="text-slate-600 font-bold">pontos ganhos</span>
          </div>

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
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          Sair da Aula
        </button>
        <div className="text-center">
          <p className="font-extrabold text-slate-800 text-lg">Aula {lessonDay}: {module.title || module.title_pt}</p>
          <span className="text-xs text-slate-400 font-semibold">{module.title_en}</span>
        </div>
        <div className="w-16" />
      </div>

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

      <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8 md:p-12 min-h-[420px] flex flex-col justify-center">
        {currentStep === 1 && <Step1Flashcards words={words} onComplete={() => completeStep(1)} />}
        {currentStep === 2 && <Step2Offline words={words} onComplete={() => completeStep(2)} />}
        {currentStep === 3 && <Step3MiniGames words={words} onComplete={() => completeStep(3)} />}
        {currentStep === 4 && <Step4RealChallenge words={words} onShowPin={() => setShowPinModal(true)} />}
      </div>

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

/* ==================== PROVA AVALIATIVA SEM QUEDA DE TELA BRANCA ==================== */
type ExamPhase = 'listening' | 'spelling' | 'sound_match';

interface ExamQuestion {
  id: number;
  phase: ExamPhase;
  target: Word;
  options?: Word[];
  scrambledLetters?: { id: number; char: string }[];
}

interface ExamAnswerRecord {
  question: ExamQuestion;
  userAnswerText: string;
  isCorrect: boolean;
  correctAnswerText: string;
}

function WeeklyExamRunner({
  words,
  moduleTitle,
  onBack,
  onFinishExam,
}: {
  words: Word[];
  moduleTitle: string;
  onBack: () => void;
  onFinishExam: (score: number, earnedStars: number) => void;
}) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [selectedLetterIndices, setSelectedLetterIndices] = useState<number[]>([]);
  const [examRecords, setExamRecords] = useState<ExamAnswerRecord[]>([]);
  const [examFinished, setExamFinished] = useState(false);

  useEffect(() => {
    if (!words || words.length < 5) return;

    const shuffled = [...words].sort(() => Math.random() - 0.5);

    const eligibleForSpelling = shuffled.filter(
      (w) => w.word_en && w.word_en.trim().replace(/[^A-Za-z]/g, '').length >= 3
    );

    let spellingWords: Word[] = [];
    if (eligibleForSpelling.length >= 3) {
      spellingWords = eligibleForSpelling.slice(0, 3);
    }

    const remainingWords = shuffled.filter((w) => !spellingWords.some((sw) => sw.id === w.id));

    const listeningCount = spellingWords.length > 0 ? 4 : 5;
    const soundMatchCount = spellingWords.length > 0 ? 3 : 5;

    const listeningWords = remainingWords.slice(0, listeningCount);
    const soundMatchWords = remainingWords.slice(listeningCount, listeningCount + soundMatchCount);

    const generated: ExamQuestion[] = [];
    let qId = 1;

    listeningWords.forEach((target) => {
      const wrong = words.filter((w) => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3);
      generated.push({
        id: qId++,
        phase: 'listening',
        target,
        options: [target, ...wrong].sort(() => Math.random() - 0.5),
      });
    });

    spellingWords.forEach((target) => {
      const letters = target.word_en.toUpperCase().replace(/[^A-Z]/g, '').split('');
      const scrambled = letters
        .map((char, index) => ({ id: index, char }))
        .sort(() => Math.random() - 0.5);

      generated.push({
        id: qId++,
        phase: 'spelling',
        target,
        scrambledLetters: scrambled,
      });
    });

    soundMatchWords.forEach((target) => {
      const wrong = words.filter((w) => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3);
      generated.push({
        id: qId++,
        phase: 'sound_match',
        target,
        options: [target, ...wrong].sort(() => Math.random() - 0.5),
      });
    });

    setQuestions(generated);
  }, [words]);

  const q = questions[currentIdx];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (q && (q.phase === 'listening' || q.phase === 'sound_match')) {
      setTimeout(() => speakWord(q.target.word_en), 300);
    }
    setSelectedLetterIndices([]);
    setAnswered(false);
    setSelectedOpt(null);
  }, [currentIdx, q]);

  if (!q) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 font-bold">A preparar os desafios da prova...</p>
      </div>
    );
  }

  const advanceWithRecord = (isCorrect: boolean, userAnswerText: string, correctAnswerText: string) => {
    setAnswered(true);
    if (isCorrect) {
      setScore((s) => s + 1);
      playSuccessSound();
    }

    setExamRecords((prev) => [
      ...prev,
      {
        question: q,
        isCorrect,
        userAnswerText,
        correctAnswerText,
      },
    ]);

    setTimeout(() => {
      if (currentIdx < totalQuestions - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        setExamFinished(true);
      }
    }, 1200);
  };

  const handleSelectOption = (chosenWord: Word) => {
    if (answered) return;
    setSelectedOpt(chosenWord.id);
    const isCorrect = chosenWord.id === q.target.id;
    advanceWithRecord(
      isCorrect,
      chosenWord.word_pt || chosenWord.word_en,
      q.target.word_pt || q.target.word_en
    );
  };

  const handlePickLetter = (scrambleIdx: number) => {
    if (answered || selectedLetterIndices.includes(scrambleIdx)) return;
    setSelectedLetterIndices((prev) => [...prev, scrambleIdx]);
  };

  const handleRemoveLastLetter = () => {
    if (answered || selectedLetterIndices.length === 0) return;
    setSelectedLetterIndices((prev) => prev.slice(0, -1));
  };

  const handleConfirmSpelling = () => {
    if (answered) return;
    const targetClean = (q.target.word_en || '').toUpperCase().replace(/[^A-Z]/g, '');

    // Proteção contra undefined em tempo de execução
    const currentSpelled = selectedLetterIndices
      .map((idx) => q.scrambledLetters?.[idx]?.char || '')
      .join('');

    const isCorrect = currentSpelled === targetClean;
    advanceWithRecord(isCorrect, currentSpelled || '(Em branco)', targetClean);
  };

  if (examFinished) {
    const finalStars = score * 5;
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 60;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-slate-100 text-center mb-6">
          <div className="text-7xl mb-3">{passed ? '🎖️' : '📚'}</div>
          <h2 className="text-2xl font-black text-slate-800 mb-1">
            {passed ? 'Desafio Semanal Superado!' : 'Prova Finalizada!'}
          </h2>
          <p className="text-slate-500 font-semibold mb-6">Módulo: {moduleTitle}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 uppercase">Pontuação Final</span>
              <p className="text-3xl font-black text-slate-800">{score} / {totalQuestions}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-amber-700 uppercase">Estrelas Ganhas</span>
              <p className="text-3xl font-black text-amber-600">+{finalStars} ⭐</p>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-600 mb-6">
            Aproveitamento: <span className={passed ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}>{percentage}%</span>
          </p>

          <button
            onClick={() => onFinishExam(score, finalStars)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg cursor-pointer text-base transition-all hover:scale-105 active:scale-95"
          >
            Gravar Resultado & Concluir Módulo
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-extrabold text-slate-800 text-lg mb-1 flex items-center gap-2">
            📋 Gabarito & Correção das Questões
          </h3>
          <p className="text-xs text-slate-400 mb-4">Revisão detalhada de cada pergunta:</p>

          <div className="space-y-3">
            {examRecords.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                  item.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl shrink-0">{item.question.target.emoji || '⭐'}</span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <span>{item.question.target.word_en}</span>
                      <button
                        onClick={() => speakWord(item.question.target.word_en)}
                        className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        title="Ouvir som"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </p>
                    <p className="text-xs text-slate-500">
                      Sua resposta: <strong className={item.isCorrect ? 'text-emerald-700' : 'text-rose-600 line-through'}>{item.userAnswerText}</strong>
                    </p>
                    {!item.isCorrect && (
                      <p className="text-xs text-emerald-700 font-bold mt-0.5">
                        Resposta certa: {item.correctAnswerText}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {item.isCorrect ? (
                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                      Correto +1
                    </span>
                  ) : (
                    <span className="text-xs font-black bg-rose-100 text-rose-800 px-3 py-1 rounded-full">
                      Errou +0
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const targetCleanLength = (q.target.word_en || '').toUpperCase().replace(/[^A-Z]/g, '').length;
  const isSpellingComplete = selectedLetterIndices.length === targetCleanLength;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          Sair
        </button>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-800 font-black text-xs px-3 py-1 rounded-full uppercase">
            {q.phase === 'listening' 
              ? '🎧 Fase 1: Listening' 
              : q.phase === 'spelling' 
              ? '🔤 Fase 2: Montar Palavra' 
              : '👀 Fase 3: Ouve e Encontra'}
          </span>
          <span className="text-xs text-slate-400 font-bold">
            {currentIdx + 1} de {totalQuestions}
          </span>
        </div>
        <div className="font-extrabold text-sm text-slate-600">
          Nota: <strong className="text-emerald-600">{score}</strong>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-md border-2 border-slate-100 p-8 text-center min-h-[420px] flex flex-col justify-between">
        {q.phase === 'listening' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ouve o áudio com atenção!</p>
              <button
                onClick={() => speakWord(q.target.word_en)}
                className="w-24 h-24 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl mx-auto my-6 active:scale-95 transition-all cursor-pointer"
              >
                <Volume2 className="w-12 h-12" />
              </button>
              <p className="text-slate-500 text-sm font-semibold">Qual palavra foi dita?</p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 mt-4">
              {q.options?.map((opt) => {
                const isCorrect = opt.id === q.target.id;
                const isSelected = selectedOpt === opt.id;
                let style = 'border-slate-200 bg-white text-slate-800 hover:border-indigo-400';

                if (answered) {
                  if (isCorrect) style = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-black';
                  else if (isSelected) style = 'border-rose-500 bg-rose-50 text-rose-800 line-through';
                  else style = 'border-slate-100 bg-slate-50 text-slate-400 opacity-40';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    disabled={answered}
                    className={`p-4 rounded-2xl border-2 font-bold text-base transition-all cursor-pointer flex items-center justify-center gap-2 ${style}`}
                  >
                    <span className="text-2xl">{opt.emoji || '⭐'}</span>
                    <span>{opt.word_pt}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {q.phase === 'spelling' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toca nas letras para formar o nome!</p>
              <div className="text-6xl my-2">{q.target.emoji || '⭐'}</div>
              <h3 className="text-xl font-black text-slate-800">{q.target.word_pt}</h3>

              <div className="flex justify-center gap-2 my-5 min-h-[48px] flex-wrap">
                {Array.from({ length: targetCleanLength }).map((_, i) => {
                  const letterIdx = selectedLetterIndices[i];
                  // Leitura 100% blindada contra undefined
                  const char = (letterIdx !== undefined && q.scrambledLetters && q.scrambledLetters[letterIdx])
                    ? q.scrambledLetters[letterIdx]?.char
                    : '';

                  return (
                    <div
                      key={i}
                      onClick={i === selectedLetterIndices.length - 1 ? handleRemoveLastLetter : undefined}
                      className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center font-black text-xl transition-all ${
                        char
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer shadow-xs active:scale-95'
                          : 'border-dashed border-slate-300 bg-slate-50 text-transparent'
                      }`}
                      title={char ? 'Toca para apagar' : ''}
                    >
                      {char || ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 my-2">
              {q.scrambledLetters?.map((item, i) => {
                const isUsed = selectedLetterIndices.includes(i);
                return (
                  <button
                    key={item?.id ?? i}
                    onClick={() => handlePickLetter(i)}
                    disabled={isUsed || answered}
                    className={`w-12 h-12 rounded-2xl border-2 font-black text-lg transition-all ${
                      isUsed
                        ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-indigo-500 text-slate-700 shadow-sm active:scale-95 cursor-pointer'
                    }`}
                  >
                    {item?.char || ''}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleRemoveLastLetter}
                disabled={selectedLetterIndices.length === 0 || answered}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⌫ Apagar Letra
              </button>

              <button
                type="button"
                onClick={handleConfirmSpelling}
                disabled={!isSpellingComplete || answered}
                className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm ${
                  isSpellingComplete && !answered
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirmar Palavra ✔
              </button>
            </div>
          </>
        )}

        {q.phase === 'sound_match' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toca no som e encontra a figura!</p>
              <button
                onClick={() => speakWord(q.target.word_en)}
                className="w-20 h-20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg mx-auto my-4 active:scale-95 transition-all cursor-pointer"
              >
                <Volume2 className="w-10 h-10" />
              </button>
              <p className="text-xs text-slate-400 font-semibold">Qual desenho corresponde ao som?</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              {q.options?.map((opt) => {
                const isCorrect = opt.id === q.target.id;
                const isSelected = selectedOpt === opt.id;
                let cardStyle = 'border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400';

                if (answered) {
                  if (isCorrect) cardStyle = 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-400';
                  else if (isSelected) cardStyle = 'border-rose-500 bg-rose-50 opacity-60';
                  else cardStyle = 'border-slate-100 opacity-30';
                }

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt)}
                    disabled={answered}
                    className={`py-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${cardStyle}`}
                  >
                    <span className="text-5xl">{opt.emoji || '⭐'}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

/* ==================== COMPONENTES REGULARES (AULAS 1 A 5) ==================== */
function Step1Flashcards({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const word = words[idx] || { word_en: 'HELLO', word_pt: 'Olá', emoji: '👋', phonetic: '(hé-lou)' };
  const isLast = idx >= words.length - 1;

  return (
    <div className="text-center py-4 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">🔊 Flashcards & Pronúncia</h3>
      <p className="text-slate-400 text-base mb-8">Toca para ouvir o áudio e repete bem alto!</p>

      <div className="text-8xl md:text-9xl mb-6 select-none drop-shadow-sm">{word.emoji || '⭐'}</div>
      <h2 className="text-5xl md:text-6xl font-black text-slate-800 tracking-wide mb-2">{word.word_en}</h2>
      <p className="text-2xl text-indigo-600 font-bold mb-1">{word.word_pt}</p>
      <p className="text-slate-400 font-medium text-base mb-8">{word.phonetic || ''}</p>

      <button
        onClick={() => speakWord(word.word_en)}
        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg mx-auto mb-8 transition-all cursor-pointer"
      >
        <Volume2 className="w-10 h-10" />
      </button>

      <button
        onClick={() => (isLast ? onComplete() : setIdx((i) => i + 1))}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <span>{isLast ? 'Concluir Passo 1' : 'Próxima Palavra'}</span>
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

function Step2Offline({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const drawWords = words.slice(0, 3);
  return (
    <div className="text-center py-4 max-w-3xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">✏️ Hora do Caderno</h3>
      <p className="text-slate-400 text-base mb-6">Pega no teu caderno e no lápis de cor!</p>

      <div className="bg-amber-50 rounded-3xl p-6 md:p-8 mb-6 text-left border border-amber-200">
        <p className="font-extrabold text-amber-800 text-lg mb-4 flex items-center gap-2">
          <Pencil className="w-6 h-6" /> Missão no caderno:
        </p>
        <div className="flex justify-around gap-4 my-4 bg-white/90 p-5 rounded-2xl shadow-xs">
          {drawWords.map((w) => (
            <div key={w.id} className="text-center">
              <div className="text-5xl mb-2">{w.emoji || '⭐'}</div>
              <p className="font-black text-slate-800 text-base">{w.word_en}</p>
              <p className="text-xs text-slate-500 font-semibold">{w.word_pt}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 py-4 rounded-2xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <Check className="w-6 h-6" /> Já desenhei no caderno!
      </button>
    </div>
  );
}

/* ==================== PASSO 3: CIRCUITO DE 4 MINIJOGOS ==================== */
function Step3MiniGames({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const [currentGame, setCurrentGame] = useState<1 | 2 | 3 | 4>(1);
  const [game1Done, setGame1Done] = useState(false);
  const [game2Done, setGame2Done] = useState(false);
  const [game3Done, setGame3Done] = useState(false);
  const [game4Done, setGame4Done] = useState(false);

  const lessonWords = useRef<Word[]>([]);
  useEffect(() => {
    if (lessonWords.current.length === 0 && words.length > 0) {
      lessonWords.current = words;
    }
  }, [words]);

  const activeWords = lessonWords.current.length > 0 ? lessonWords.current : words;

  if (activeWords.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 font-bold mb-4">Sem palavras cadastradas para esta aula.</p>
        <button
          onClick={onComplete}
          className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-2xl cursor-pointer"
        >
          Avançar
        </button>
      </div>
    );
  }

  if (game1Done && game2Done && game3Done && game4Done) {
    return (
      <div className="text-center py-6 max-w-md mx-auto">
        <div className="text-7xl mb-3 animate-bounce">🏆</div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">Circuito Concluído!</h3>
        <p className="text-slate-500 font-semibold text-sm mb-6">
          Você superou todos os 4 minijogos com sucesso!
        </p>
        <button
          onClick={onComplete}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-4 px-8 rounded-2xl shadow-lg hover:scale-102 active:scale-95 transition-all cursor-pointer text-base"
        >
          Avançar para o Desafio com os Pais ➔
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-2">
      <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 flex-wrap">
        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${
            currentGame === 1
              ? 'bg-indigo-600 text-white'
              : game1Done
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {game1Done ? '✔ 1. Escuta' : '1. Escuta'}
        </span>
        <span className="text-slate-300 font-bold">➔</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${
            currentGame === 2
              ? 'bg-purple-600 text-white'
              : game2Done
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {game2Done ? '✔ 2. Memória' : '2. Memória'}
        </span>
        <span className="text-slate-300 font-bold">➔</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${
            currentGame === 3
              ? 'bg-amber-600 text-white'
              : game3Done
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {game3Done ? '✔ 3. Escrever' : '3. Escrever'}
        </span>
        <span className="text-slate-300 font-bold">➔</span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-black ${
            currentGame === 4
              ? 'bg-sky-600 text-white'
              : game4Done
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {game4Done ? '✔ 4. Balões' : '4. Balões'}
        </span>
      </div>

      {currentGame === 1 && (
        <SubGameListening
          key="subgame-1"
          words={activeWords.slice(0, 4)}
          onFinish={() => {
            setGame1Done(true);
            setCurrentGame(2);
            playSuccessSound();
          }}
        />
      )}

      {currentGame === 2 && (
        <SubGameMemory
          key="subgame-2"
          words={activeWords.length >= 6 ? activeWords.slice(0, 6) : activeWords}
          onFinish={() => {
            setGame2Done(true);
            setCurrentGame(3);
            playSuccessSound();
          }}
        />
      )}

      {currentGame === 3 && (
        <SubGameSpelling
          key="subgame-3"
          words={activeWords.slice(0, 3)}
          onFinish={() => {
            setGame3Done(true);
            setCurrentGame(4);
            playSuccessSound();
          }}
        />
      )}

      {currentGame === 4 && (
        <SubGameBalloon
          key="subgame-4"
          words={activeWords.slice(0, 4)}
          onFinish={() => {
            setGame4Done(true);
            playSuccessSound();
            celebrate();
          }}
        />
      )}
    </div>
  );
}

/* ==================== SUB-JOGO 1: ESCUTA E ENCONTRA ==================== */
function SubGameListening({ words, onFinish }: { words: Word[]; onFinish: () => void }) {
  const [round, setRound] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [options, setOptions] = useState<Word[]>([]);
  const lastSpokenRound = useRef<number>(-1);

  const target = words[round];

  useEffect(() => {
    if (!target) return;
    const wrong = words.filter((w) => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3);
    setOptions([target, ...wrong].sort(() => Math.random() - 0.5));
    setSelectedId(null);
    setAnswered(false);

    if (lastSpokenRound.current !== round) {
      lastSpokenRound.current = round;
      speakWord(target.word_en);
    }
  }, [round, target, words]);

  const handlePick = (w: Word) => {
    if (answered) return;
    setSelectedId(w.id);
    setAnswered(true);

    if (w.id === target.id) {
      playSuccessSound();
    }

    setTimeout(() => {
      if (round < words.length - 1) {
        setRound((r) => r + 1);
      } else {
        onFinish();
      }
    }, 1000);
  };

  if (!target) return null;

  return (
    <div className="bg-indigo-50/60 border-2 border-indigo-100 rounded-3xl p-6 text-center">
      <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">
        Fase 1 • Escuta & Figura ({round + 1}/{words.length})
      </span>

      <button
        onClick={() => speakWord(target.word_en)}
        className="w-20 h-20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg mx-auto my-4 active:scale-95 transition-all cursor-pointer"
      >
        <Volume2 className="w-10 h-10" />
      </button>

      <h4 className="text-xl font-black text-slate-700 mb-5">"{target.word_en}"</h4>

      <div className="grid grid-cols-2 gap-3.5">
        {options.map((opt) => {
          const isCorrect = opt.id === target.id;
          const isSelected = selectedId === opt.id;
          let btnStyle = 'border-slate-200 bg-white hover:border-indigo-400 text-slate-800';

          if (answered) {
            if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm';
            else if (isSelected) btnStyle = 'border-rose-400 bg-rose-50 text-rose-700 opacity-60';
            else btnStyle = 'border-slate-100 bg-slate-50 text-slate-300 opacity-30';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handlePick(opt)}
              disabled={answered}
              className={`p-4 rounded-2xl border-2 font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 ${btnStyle}`}
            >
              <span className="text-4xl">{opt.emoji || '⭐'}</span>
              <span className="text-xs font-extrabold mt-1">{opt.word_pt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== SUB-JOGO 2: SUPER MEMÓRIA ==================== */
function SubGameMemory({ words, onFinish }: { words: Word[]; onFinish: () => void }) {
  type Card = { uid: string; word: Word; flipped: boolean; matched: boolean };
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    const deck: Card[] = [];
    words.forEach((w) => {
      deck.push({ uid: `${w.id}-1`, word: w, flipped: false, matched: false });
      deck.push({ uid: `${w.id}-2`, word: w, flipped: false, matched: false });
    });
    setCards(deck.sort(() => Math.random() - 0.5));
  }, [words]);

  const handleCardClick = (card: Card) => {
    if (card.flipped || card.matched) return;
    const flipped = cards.filter((c) => c.flipped && !c.matched);
    if (flipped.length >= 2) return;

    speakWord(card.word.word_en);
    const updated = cards.map((c) => (c.uid === card.uid ? { ...c, flipped: true } : c));
    setCards(updated);

    if (flipped.length === 1) {
      const first = flipped[0];
      if (first.word.id === card.word.id) {
        setTimeout(() => {
          setCards((prev) => {
            const next = prev.map((c) => (c.word.id === card.word.id ? { ...c, matched: true } : c));
            if (next.every((c) => c.matched)) {
              setTimeout(onFinish, 600);
            }
            return next;
          });
        }, 400);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.matched ? c : { ...c, flipped: false })));
        }, 800);
      }
    }
  };

  return (
    <div className="bg-purple-50/70 border-2 border-purple-100 rounded-3xl p-5 md:p-8 text-center max-w-lg mx-auto shadow-xs">
      <span className="text-xs font-black text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
        Fase 2 • Super Memória ({cards.length / 2} pares)
      </span>
      <p className="text-xs font-bold text-slate-400 mt-2 mb-6">
        Encontre os pares das palavras de hoje!
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
        {cards.map((c) => (
          <button
            key={c.uid}
            onClick={() => handleCardClick(c)}
            className={`w-full aspect-square rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center p-2 transition-all duration-200 cursor-pointer ${
              c.flipped || c.matched
                ? 'bg-white border-purple-400 shadow-md scale-102 ring-2 ring-purple-100'
                : 'bg-gradient-to-br from-purple-500 via-indigo-500 to-indigo-600 border-purple-300 shadow-sm hover:shadow-md hover:scale-103 active:scale-95 text-white'
            }`}
          >
            {c.flipped || c.matched ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <span className="text-3xl sm:text-4xl drop-shadow-xs select-none">
                  {c.word.emoji || '⭐'}
                </span>
                <span className="text-[11px] sm:text-xs font-black text-slate-800 mt-1.5 truncate max-w-full px-1">
                  {c.word.word_en}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full w-full select-none">
                <span className="text-2xl sm:text-3xl font-black text-white/90 drop-shadow-xs">
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

/* ==================== SUB-JOGO 3: OUVE & ESCREVE ==================== */
function SubGameSpelling({ words, onFinish }: { words: Word[]; onFinish: () => void }) {
  const [round, setRound] = useState(0);
  const [pickedIndices, setPickedIndices] = useState<number[]>([]);
  const [scramble, setScramble] = useState<{ id: number; char: string }[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  const lastSpokenRound = useRef<number>(-1);

  const target = words[round];
  const targetClean = target ? target.word_en.toUpperCase().replace(/[^A-Z]/g, '') : '';

  useEffect(() => {
    if (!target) return;
    const chars = targetClean.split('').map((char, index) => ({ id: index, char }));
    setScramble(chars.sort(() => Math.random() - 0.5));
    setPickedIndices([]);
    setFeedback('idle');

    if (lastSpokenRound.current !== round) {
      lastSpokenRound.current = round;
      speakWord(target.word_en);
    }
  }, [round, target, targetClean]);

  const handlePickLetter = (idx: number) => {
    if (pickedIndices.includes(idx) || feedback === 'success') return;
    setPickedIndices((prev) => [...prev, idx]);
  };

  const handleRemoveLetter = () => {
    if (pickedIndices.length === 0 || feedback === 'success') return;
    setPickedIndices((prev) => prev.slice(0, -1));
  };

  const handleCheckSpelling = () => {
    // Proteção de leitura do índice
    const currentWord = pickedIndices
      .map((i) => scramble[i]?.char || '')
      .join('');

    if (currentWord === targetClean) {
      setFeedback('success');
      playSuccessSound();
      setTimeout(() => {
        if (round < words.length - 1) {
          setRound((r) => r + 1);
        } else {
          onFinish();
        }
      }, 1000);
    } else {
      setFeedback('error');
      setTimeout(() => {
        setPickedIndices([]);
        setFeedback('idle');
      }, 800);
    }
  };

  if (!target) return null;

  return (
    <div className="bg-amber-50/70 border-2 border-amber-200 rounded-3xl p-6 text-center max-w-lg mx-auto shadow-xs">
      <span className="text-xs font-black text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full uppercase tracking-wider">
        Fase 3 • Ouve & Escreve em Inglês ({round + 1}/{words.length})
      </span>

      <div className="my-4">
        <button
          onClick={() => speakWord(target.word_en)}
          className="w-18 h-18 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg mx-auto active:scale-95 transition-all cursor-pointer"
        >
          <Volume2 className="w-9 h-9" />
        </button>
        <p className="text-xs text-slate-500 font-bold mt-2.5">
          Significado em português: <strong className="text-slate-800">{target.word_pt}</strong> {target.emoji}
        </p>
      </div>

      <div className="flex justify-center gap-2 sm:gap-2.5 my-6 flex-wrap">
        {Array.from({ length: targetClean.length }).map((_, i) => {
          const letterIdx = pickedIndices[i];
          const char = (letterIdx !== undefined && scramble[letterIdx]) ? scramble[letterIdx]?.char : '';

          return (
            <div
              key={i}
              onClick={i === pickedIndices.length - 1 ? handleRemoveLetter : undefined}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex items-center justify-center font-black text-xl sm:text-2xl transition-all ${
                char
                  ? feedback === 'success'
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-800 shadow-sm'
                    : feedback === 'error'
                    ? 'border-rose-400 bg-rose-100 text-rose-800 shadow-sm'
                    : 'border-amber-500 bg-white text-amber-800 shadow-xs cursor-pointer hover:border-rose-400'
                  : 'border-dashed border-slate-300 bg-white/60'
              }`}
            >
              {char}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 sm:gap-2.5 flex-wrap mb-6">
        {scramble.map((item, idx) => {
          const isUsed = pickedIndices.includes(idx);
          return (
            <button
              key={item?.id ?? idx}
              onClick={() => handlePickLetter(idx)}
              disabled={isUsed || feedback === 'success'}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl font-black text-lg sm:text-xl border-2 transition-all duration-150 ${
                isUsed
                  ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed'
                  : 'border-amber-300 bg-white text-amber-900 shadow-sm hover:border-amber-500 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              {item?.char || ''}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRemoveLetter}
          disabled={pickedIndices.length === 0 || feedback === 'success'}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer transition-all disabled:opacity-40"
        >
          ⌫ Apagar
        </button>
        <button
          type="button"
          onClick={handleCheckSpelling}
          disabled={pickedIndices.length !== targetClean.length || feedback === 'success'}
          className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm ${
            pickedIndices.length === targetClean.length && feedback !== 'success'
              ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Conferir Palavra ✔
        </button>
      </div>
    </div>
  );
}

/* ==================== SUB-JOGO 4: BALÃO MÁGICO ==================== */
function SubGameBalloon({ words, onFinish }: { words: Word[]; onFinish: () => void }) {
  const [round, setRound] = useState(0);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const lastSpokenRound = useRef<number>(-1);

  const target = words[round];

  useEffect(() => {
    if (!target) return;
    const wrong = words.filter((w) => w.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 2);
    setOptions([target, ...wrong].sort(() => Math.random() - 0.5));
    setPoppedId(null);

    if (lastSpokenRound.current !== round) {
      lastSpokenRound.current = round;
      speakWord(target.word_en);
    }
  }, [round, target, words]);

  const handlePop = (item: Word) => {
    if (poppedId) return;
    setPoppedId(item.id);

    if (item.id === target.id) {
      playSuccessSound();
      setTimeout(() => {
        if (round < words.length - 1) {
          setRound((r) => r + 1);
        } else {
          onFinish();
        }
      }, 700);
    } else {
      setTimeout(() => setPoppedId(null), 600);
    }
  };

  if (!target) return null;

  return (
    <div className="bg-sky-50/60 border-2 border-sky-100 rounded-3xl p-6 text-center">
      <span className="text-xs font-bold text-sky-700 uppercase tracking-widest">
        Fase 4 • Estoure o Balão ({round + 1}/{words.length})
      </span>

      <h4 className="text-lg font-black text-slate-800 mt-3 mb-1">
        Qual é o balão de: <span className="text-sky-600">"{target.word_en}"</span>?
      </h4>

      <button
        onClick={() => speakWord(target.word_en)}
        className="inline-flex items-center gap-1 text-sky-600 bg-white border border-sky-200 text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-sky-100 mb-5"
      >
        <Volume2 className="w-3.5 h-3.5" /> Ouvir som
      </button>

      <div className="flex justify-around items-center my-4">
        {options.map((opt) => {
          const isPopped = poppedId === opt.id;
          const isCorrect = opt.id === target.id;

          return (
            <button
              key={opt.id}
              onClick={() => handlePop(opt)}
              className={`w-24 h-32 rounded-full border-4 shadow-md flex flex-col items-center justify-center transition-all cursor-pointer ${
                isPopped
                  ? isCorrect
                    ? 'scale-110 bg-emerald-200 border-emerald-400 rotate-6'
                    : 'opacity-40 border-rose-300 bg-rose-50'
                  : 'bg-white hover:scale-105 border-sky-300 animate-bounce'
              }`}
              style={{ animationDuration: '2.5s' }}
            >
              <span className="text-4xl">{opt.emoji || '🎈'}</span>
              <span className="text-xs font-bold text-slate-600 mt-1">{opt.word_pt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step4RealChallenge({ words, onShowPin }: { words: Word[]; onShowPin: () => void }) {
  const challengeWords = words.slice(0, 3);
  return (
    <div className="text-center py-4 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">🏆 Desafio Real</h3>
      <p className="text-slate-400 text-base mb-6">Fala estas palavras em inglês para os teus pais!</p>
      <div className="bg-rose-50 rounded-3xl p-6 mb-6 border border-rose-200">
        <div className="flex justify-around gap-4 bg-white/90 p-4 rounded-2xl max-w-md mx-auto shadow-xs">
          {challengeWords.map((w) => (
            <div key={w.id} className="text-center">
              <div className="text-4xl mb-1">{w.emoji || '⭐'}</div>
              <p className="font-black text-slate-800 text-base">{w.word_en}</p>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onShowPin}
        className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg cursor-pointer text-base"
      >
        <Lock className="w-6 h-6 inline mr-2" />
        Pedir confirmação dos pais (PIN)
      </button>
    </div>
  );
}