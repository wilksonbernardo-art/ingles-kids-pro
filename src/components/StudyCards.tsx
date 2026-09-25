import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Volume2, GraduationCap, ArrowLeft } from 'lucide-react';
import type { Module, Word } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { speakWord } from '@/lib/speech';

type StudyCardsProps = {
  module: Module;
  onBack: () => void;
  onStartQuiz: (words: Word[]) => void;
};

export default function StudyCards({ module, onBack, onStartQuiz }: StudyCardsProps) {
  const [words, setWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
    // Preload voices for speech synthesis
    window.speechSynthesis?.getVoices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Sem palavras neste módulo.</p>
        <button onClick={onBack} className="mt-4 text-blue-500 font-bold">Voltar</button>
      </div>
    );
  }

  const word = words[index];
  const isLast = index === words.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-bold text-sm">
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <div className="text-center">
          <span className="text-2xl">{module.emoji}</span>
          <p className="font-bold text-gray-700 text-sm">{module.title_pt}</p>
        </div>
        <div className="text-sm font-bold text-gray-400">
          {index + 1} / {words.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${((index + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-50" />
        <div className="relative">
          {/* Emoji illustration */}
          <div className="text-8xl mb-4 animate-[bounce_1s_ease-in-out_1]">{word.emoji}</div>

          {/* English word */}
          <h2 className="text-5xl font-extrabold text-gray-800 mb-2 tracking-wide">{word.word_en}</h2>

          {/* Portuguese translation */}
          <p className="text-2xl text-gray-500 font-bold mb-1">{word.word_pt}</p>

          {/* Pronunciation */}
          <p className="text-lg text-indigo-400 font-bold mb-6">({word.pronunciation})</p>

          {/* Audio button */}
          <button
            onClick={() => speakWord(word.word_en)}
            className="bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-110 active:scale-95 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-xl mx-auto transition-all"
          >
            <Volume2 className="w-10 h-10" />
          </button>
          <p className="text-xs text-gray-400 mt-2">Toca para ouvir!</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 gap-4">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-2 bg-white shadow-lg rounded-2xl px-6 py-4 font-bold text-gray-600 disabled:opacity-30 hover:scale-105 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          Anterior
        </button>

        {isLast ? (
          <button
            onClick={() => onStartQuiz(words)}
            className="flex items-center gap-2 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg rounded-2xl px-6 py-4 font-bold hover:scale-105 active:scale-95 transition-all"
          >
            <GraduationCap className="w-5 h-5" />
            Fazer o Quiz!
          </button>
        ) : (
          <button
            onClick={() => setIndex((i) => Math.min(words.length - 1, i + 1))}
            className="flex items-center gap-2 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg rounded-2xl px-6 py-4 font-bold hover:scale-105 active:scale-95 transition-all"
          >
            Próximo
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
