import { useState, useMemo } from 'react';
import { Check, X, ArrowLeft, Star, Trophy } from 'lucide-react';
import type { Word } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { speakWord, playSuccessSound, playErrorSound } from '@/lib/speech';
import { celebrate } from '@/lib/confetti';

type QuizProps = {
  words: Word[];
  profileId: string;
  profileStars: number;
  onBack: () => void;
  onStarsUpdated: () => void;
};

type QuizState = 'playing' | 'finished';

export default function Quiz({ words, profileId, profileStars, onBack, onStarsUpdated }: QuizProps) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<QuizState>('playing');
  const [totalAwarded, setTotalAwarded] = useState(0);

  // Build quiz questions: pick 4-5 words, generate 3 options each
  const questions = useMemo(() => {
    const quizWords = words.slice(0, Math.min(5, words.length));
    return quizWords.map((correctWord) => {
      const wrongOptions = words
        .filter((w) => w.id !== correctWord.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .map((w) => w.word_en);
      const options = [...wrongOptions, correctWord.word_en].sort(() => Math.random() - 0.5);
      return { correctWord, options };
    });
  }, [words]);

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Sem perguntas disponíveis.</p>
        <button onClick={onBack} className="mt-4 text-blue-500 font-bold">Voltar</button>
      </div>
    );
  }

  const currentQ = questions[questionIdx];
  const isLast = questionIdx === questions.length - 1;

  function handleAnswer(answer: string) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQ.correctWord.word_en;

    if (isCorrect) {
      playSuccessSound();
      celebrate();
      setScore((s) => s + 1);
      const newPoints = 10;
      setTotalAwarded((t) => t + newPoints);
      // Save to Supabase
      (async () => {
        const newStars = profileStars + newPoints;
        await supabase.from('profiles').update({ stars: newStars }).eq('id', profileId);
        onStarsUpdated();
      })();
    } else {
      playErrorSound();
      // Speak the correct word so they learn
      setTimeout(() => speakWord(currentQ.correctWord.word_en), 600);
    }
  }

  function nextQuestion() {
    if (isLast) {
      setState('finished');
    } else {
      setQuestionIdx((i) => i + 1);
      setSelectedAnswer(null);
    }
  }

  if (state === 'finished') {
    const perfect = score === questions.length;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {perfect ? (
            <>
              <div className="text-7xl mb-4">🏆</div>
              <h2 className="text-3xl font-extrabold text-amber-500 mb-2">Perfeito!</h2>
            </>
          ) : (
            <>
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="text-3xl font-extrabold text-gray-700 mb-2">Bom trabalho!</h2>
            </>
          )}
          <p className="text-xl text-gray-500 mb-4">
            Acertaste <span className="font-bold text-green-500">{score}</span> de <span className="font-bold">{questions.length}</span>!
          </p>
          <div className="bg-amber-50 rounded-2xl p-4 mb-6 inline-flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-current" />
            <span className="text-2xl font-extrabold text-amber-600">+{totalAwarded}</span>
            <span className="text-gray-500 font-bold">pontos</span>
          </div>
          <div>
            <button
              onClick={onBack}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Voltar aos Módulos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-bold text-sm">
          <ArrowLeft className="w-5 h-5" />
          Sair
        </button>
        <div className="text-center">
          <p className="font-bold text-gray-700 text-sm">Quiz</p>
        </div>
        <div className="text-sm font-bold text-gray-400">
          {questionIdx + 1} / {questions.length}
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${((questionIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
        <p className="text-gray-400 font-bold text-sm mb-4">Qual é esta palavra?</p>
        <div className="text-8xl mb-4">{currentQ.correctWord.emoji}</div>

        {/* Options */}
        <div className="grid gap-3 mt-6">
          {currentQ.options.map((option) => {
            const isCorrect = option === currentQ.correctWord.word_en;
            const isSelected = selectedAnswer === option;
            let style = 'bg-gray-50 hover:bg-blue-50 text-gray-700 border-gray-200';
            if (selectedAnswer !== null) {
              if (isCorrect) {
                style = 'bg-green-100 text-green-700 border-green-400';
              } else if (isSelected) {
                style = 'bg-red-100 text-red-600 border-red-400';
              } else {
                style = 'bg-gray-50 text-gray-400 border-gray-200';
              }
            }
            return (
              <button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={selectedAnswer !== null}
                className={`relative ${style} border-2 rounded-2xl py-4 px-6 font-extrabold text-xl transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-default`}
              >
                <span className="flex items-center justify-center gap-2">
                  {option}
                  {selectedAnswer !== null && isCorrect && <Check className="w-6 h-6 text-green-500" />}
                  {selectedAnswer !== null && isSelected && !isCorrect && <X className="w-6 h-6 text-red-500" />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback + Next */}
        {selectedAnswer !== null && (
          <div className="mt-6">
            {selectedAnswer === currentQ.correctWord.word_en ? (
              <p className="text-green-600 font-bold text-lg mb-3">✅ Correto! +10 pontos</p>
            ) : (
              <p className="text-red-500 font-bold text-lg mb-3">
                ❌ A resposta certa é: <span className="text-green-600">{currentQ.correctWord.word_en}</span> ({currentQ.correctWord.word_pt})
              </p>
            )}
            <button
              onClick={nextQuestion}
              className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {isLast ? 'Ver Resultado' : 'Próxima'}
            </button>
          </div>
        )}
      </div>

      {/* Score badge */}
      <div className="flex items-center justify-center gap-2 mt-4 text-amber-500 font-bold">
        <Trophy className="w-5 h-5" />
        <span>{score} acertos</span>
      </div>
    </div>
  );
}
