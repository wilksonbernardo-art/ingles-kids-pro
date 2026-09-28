import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, Play, Calendar, Lock, Trophy, Award } from 'lucide-react';
import type { Module, LessonProgress } from '@/lib/supabase';
import { supabase, LESSON_DAYS } from '@/lib/supabase';

type ModuleLessonsProps = {
  module: Module;
  profileId: string;
  onBack: () => void;
  onStartLesson: (lessonDay: number) => void;
};

function isSameDay(dateStr?: string | null): boolean {
  if (!dateStr) return false;
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

  const fetchProgress = useCallback(async () => {
    try {
      // 1. Busca tanto por profile_id quanto por user_id
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .or(`profile_id.eq.${profileId},user_id.eq.${profileId}`)
        .eq('module_id', module.id)
        .order('lesson_day', { ascending: true });

      let list: LessonProgress[] = (!error && data) ? (data as LessonProgress[]) : [];

      // 2. Mescla com conclusões locais do localStorage para tolerância a falhas
      LESSON_DAYS.forEach((d) => {
        const localKey = `lesson_completed_${profileId}_${module.id}_${d.day}`;
        if (localStorage.getItem(localKey) === 'true') {
          const exists = list.find((p) => p.lesson_day === d.day);
          if (exists) {
            exists.status = 'completed';
          } else {
            list.push({
              id: `local-${d.day}`,
              profile_id: profileId,
              module_id: module.id,
              lesson_day: d.day,
              current_step: 4,
              status: 'completed',
              completed_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            } as LessonProgress);
          }
        }
      });

      setProgress([...list]);
    } catch (err) {
      console.error('Erro ao buscar progresso:', err);
    } finally {
      setLoading(false);
    }
  }, [profileId, module.id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  // Verifica se o aluno já concluiu alguma lição hoje
  const todayStr = new Date().toISOString().split('T')[0];
  const localDaily = localStorage.getItem(`daily_done_${profileId}_${todayStr}`) === 'true';

  const completedToday = localDaily || progress.some(
    (p) => p.status === 'completed' && isSameDay(p.completed_at || p.created_at)
  );

  // Contagem das 5 aulas concluídas
  const completedDaysCount = progress.filter(
    (p) => p.lesson_day >= 1 && p.lesson_day <= 5 && p.status === 'completed'
  ).length;
  const isWeeklyChallengeUnlocked = completedDaysCount === 5;

  const challengeProgress = progress.find((p) => p.lesson_day === 6);
  const challengeDone = challengeProgress?.status === 'completed';

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          Módulos
        </button>
      </div>

      <div className="text-center mb-6">
        <div className="text-5xl mb-2">{module.emoji || module.icon || '🌟'}</div>
        <h2 className="text-2xl font-extrabold text-gray-800">{module.title || module.title_pt}</h2>
        <p className="text-gray-400 font-bold text-sm">{module.title_en}</p>
        
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 rounded-2xl px-4 py-2 text-sm font-bold">
            <Calendar className="w-4 h-4" />
            1 Aula por Dia • 5 Aulas + Prova Semanal
          </div>
        </div>
      </div>

      {/* Visão geral de progresso */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {LESSON_DAYS.map((d) => {
          const dayProgress = progress.find((p) => p.lesson_day === d.day);
          const done = dayProgress?.status === 'completed';
          return (
            <div
              key={d.day}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all ${
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
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all border-2 ${
            challengeDone
              ? 'bg-amber-500 border-amber-600 text-white shadow-lg'
              : isWeeklyChallengeUnlocked
              ? 'bg-amber-100 border-amber-400 text-amber-800'
              : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
          }`}
          title="Prova Avaliativa Semanal"
        >
          🏆
        </div>
      </div>

      {/* Aulas Regulares (1 a 5) */}
      <div className="space-y-3">
        {LESSON_DAYS.map((d) => {
          const dayProgress = progress.find((p) => p.lesson_day === d.day);
          const done = dayProgress?.status === 'completed';
          const inProgress = dayProgress?.status === 'in_progress';

          // Regras de Bloqueio:
          // 1. Anterior precisa estar concluída
          const prevDayDone = d.day === 1 || progress.some((p) => p.lesson_day === d.day - 1 && p.status === 'completed');
          
          // 2. Se ainda não fez essa aula e já concluiu outra hoje, bloqueia até amanhã (regra pedagógica de 1 aula por dia)
          const lockedByDailyLimit = !done && completedToday && !inProgress;

          // Aula liberada se a anterior foi feita e não atingiu o limite de 1 por dia
          const isUnlocked = done || inProgress || (prevDayDone && !lockedByDailyLimit);

          return (
            <div
              key={d.day}
              className={`rounded-3xl border-2 p-4 transition-all ${
                done
                  ? 'bg-green-50/60 border-green-200 shadow-xs'
                  : inProgress
                  ? 'bg-amber-50 border-amber-300 shadow-md'
                  : isUnlocked
                  ? 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                  : 'bg-slate-50 border-slate-200 opacity-70'
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
                        : isUnlocked
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-6 h-6" /> : !isUnlocked ? <Lock className="w-5 h-5" /> : d.day}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-700">
                      {d.label} <span className="text-gray-400 font-normal">({d.weekday})</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {done
                        ? 'Aula Concluída'
                        : inProgress
                        ? `Em progresso • Passo ${dayProgress?.current_step || 1} de 4`
                        : !prevDayDone
                        ? `Conclua a Aula ${d.day - 1} primeiro`
                        : lockedByDailyLimit
                        ? 'Disponível amanhã (1 aula por dia)'
                        : '4 passos diários'}
                    </p>
                  </div>
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => onStartLesson(d.day)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-bold text-sm shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md ${
                      done
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : inProgress
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {done ? 'Revisar' : inProgress ? 'Continuar' : 'Começar'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs bg-slate-200/80 px-4 py-2.5 rounded-2xl shrink-0">
                    <Lock className="w-4 h-4" />
                    Bloqueado
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Card Destaque: Prova / Desafio Semanal */}
        <div
          className={`rounded-3xl border-2 p-5 shadow-sm mt-5 transition-all ${
            isWeeklyChallengeUnlocked
              ? 'border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60'
              : 'border-slate-200 bg-slate-50 opacity-75'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md shrink-0 ${
                  isWeeklyChallengeUnlocked ? 'bg-amber-500 text-white' : 'bg-slate-300 text-slate-500'
                }`}
              >
                <Trophy className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-800 text-base">Prova Avaliativa da Semana</p>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isWeeklyChallengeUnlocked
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isWeeklyChallengeUnlocked ? 'Liberado!' : 'Bloqueado'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isWeeklyChallengeUnlocked
                    ? '10 Questões Sem Repetição • Nota Real & Pontuação Justa'
                    : `Conclua todas as 5 aulas primeiro (${completedDaysCount}/5 concluídas)`}
                </p>
              </div>
            </div>

            {isWeeklyChallengeUnlocked ? (
              <button
                onClick={() => onStartLesson(6)}
                disabled={challengeDone}
                className={`flex items-center gap-2 rounded-2xl px-6 py-3.5 font-black text-sm shrink-0 transition-all ${
                  challengeDone
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
                }`}
              >
                <Award className="w-4 h-4" />
                {challengeDone ? 'Prova Realizada' : 'Fazer Prova'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs bg-slate-200/80 px-4 py-2.5 rounded-2xl">
                <Lock className="w-4 h-4" />
                Bloqueado
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}