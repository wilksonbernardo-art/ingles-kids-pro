import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, CheckCircle2, Clock, Play, Calendar } from 'lucide-react';
import type { Module, LessonProgress } from '@/lib/supabase';
import { supabase, LESSON_DAYS } from '@/lib/supabase';

type ModuleLessonsProps = {
  module: Module;
  profileId: string;
  onBack: () => void;
  onStartLesson: (lessonDay: number) => void;
};

function isSameDay(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function ModuleLessons({ module, profileId, onBack, onStartLesson }: ModuleLessonsProps) {
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('profile_id', profileId)
        .eq('module_id', module.id)
        .order('lesson_day', { ascending: true });
      if (!error && data) setProgress(data as LessonProgress[]);
      setLoading(false);
    })();
  }, [profileId, module.id]);

  const completedDays = progress.filter((p) => p.status === 'completed');
  const todayLesson = progress.find((p) => p.status === 'in_progress' && isSameDay(p.created_at));
  const anyCompletedToday = completedDays.some((p) => p.completed_at && isSameDay(p.completed_at));

  function canStartLesson(day: number): { allowed: boolean; reason?: string } {
    // If a lesson was already completed today, block new lessons
    if (anyCompletedToday) {
      return { allowed: false, reason: 'Já concluíste a tua aula de hoje! Volta amanhã.' };
    }
    // If this specific lesson is already completed, don't allow restart
    const dayProgress = progress.find((p) => p.lesson_day === day);
    if (dayProgress?.status === 'completed') {
      return { allowed: false, reason: 'Aula já concluída!' };
    }
    // If there's an in-progress lesson today, only allow continuing that one
    if (todayLesson && todayLesson.lesson_day !== day) {
      return { allowed: false, reason: `Continua a ${LESSON_DAYS[todayLesson.lesson_day - 1].label} de hoje!` };
    }
    // Must complete previous day first
    if (day > 1) {
      const prev = progress.find((p) => p.lesson_day === day - 1);
      if (!prev || prev.status !== 'completed') {
        return { allowed: false, reason: `Conclui a Aula ${day - 1} primeiro!` };
      }
    }
    return { allowed: true };
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-bold text-sm">
          <ArrowLeft className="w-5 h-5" />
          Módulos
        </button>
      </div>

      <div className="text-center mb-6">
        <div className="text-5xl mb-2">{module.emoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-800">{module.title_pt}</h2>
        <p className="text-gray-400 font-bold text-sm">{module.title_en}</p>
        <div className="inline-flex items-center gap-2 mt-3 bg-indigo-50 text-indigo-600 rounded-2xl px-4 py-2 text-sm font-bold">
          <Calendar className="w-4 h-4" />
          5 Aulas • 1 hora por dia
        </div>
      </div>

      {/* Progress overview */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {LESSON_DAYS.map((d) => {
          const dayProgress = progress.find((p) => p.lesson_day === d.day);
          const done = dayProgress?.status === 'completed';
          return (
            <div
              key={d.day}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${
                done
                  ? 'bg-green-500 text-white shadow-lg'
                  : dayProgress?.status === 'in_progress'
                  ? 'bg-amber-400 text-white shadow-lg animate-pulse'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? <CheckCircle2 className="w-5 h-5" /> : d.day}
            </div>
          );
        })}
      </div>

      {/* Daily lock notice */}
      {anyCompletedToday && (
        <div className="bg-green-50 border-2 border-green-200 text-green-700 font-bold rounded-2xl px-4 py-3 text-center mb-4 text-sm">
          ✅ Aula de hoje concluída! Volta amanhã para a próxima aula.
        </div>
      )}

      {/* Lesson days */}
      <div className="space-y-3">
        {LESSON_DAYS.map((d) => {
          const dayProgress = progress.find((p) => p.lesson_day === d.day);
          const done = dayProgress?.status === 'completed';
          const inProgress = dayProgress?.status === 'in_progress' && isSameDay(dayProgress.created_at);
          const canStart = canStartLesson(d.day);
          const isToday = inProgress || (!anyCompletedToday && !done && canStart.allowed);

          return (
            <div
              key={d.day}
              className={`rounded-3xl border-2 p-4 transition-all ${
                done
                  ? 'bg-green-50 border-green-200'
                  : inProgress
                  ? 'bg-amber-50 border-amber-300 shadow-md'
                  : canStart.allowed
                  ? 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                  : 'bg-gray-50 border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                      done
                        ? 'bg-green-500 text-white'
                        : inProgress
                        ? 'bg-amber-400 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-6 h-6" /> : d.day}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-700">
                      {d.label} <span className="text-gray-400 font-normal">({d.weekday})</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {done ? 'Concluída!' : inProgress ? `Em progresso • Passo ${dayProgress?.current_step} de 4` : '4 passos • 1 hora'}
                    </p>
                  </div>
                </div>

                {done ? (
                  <div className="flex items-center gap-1 text-green-600 font-bold text-sm shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : canStart.allowed ? (
                  <button
                    onClick={() => onStartLesson(d.day)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-sm shrink-0 transition-all hover:scale-105 active:scale-95 ${
                      inProgress
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg'
                    }`}
                  >
                    {inProgress ? (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Continuar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Começar
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold shrink-0 max-w-[140px] text-right">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>{canStart.reason}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
