import React, { useState, useEffect } from 'react';
import { X, Lock, Sparkles, Trophy, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { playSuccessSound } from '@/lib/speech';
import confetti from 'canvas-confetti';

interface Badge {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement_type: string;
  requirement_value: number;
}

interface BadgesModalProps {
  profileId: string;
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
}

const RARITY_THEMES = {
  common: {
    name: 'Comum',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    cardBg: 'bg-gradient-to-b from-amber-50 to-orange-50 border-amber-200 shadow-amber-100',
    iconBorder: 'border-amber-300 bg-amber-50',
  },
  rare: {
    name: 'Raro',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
    cardBg: 'bg-gradient-to-b from-sky-50 to-blue-50 border-sky-200 shadow-sky-100',
    iconBorder: 'border-sky-300 bg-sky-50',
  },
  epic: {
    name: 'Épico',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    cardBg: 'bg-gradient-to-b from-purple-50 to-fuchsia-50 border-purple-200 shadow-purple-100',
    iconBorder: 'border-purple-300 bg-purple-50',
  },
  legendary: {
    name: 'Lendário',
    badgeBg: 'bg-yellow-200 text-yellow-900 border-yellow-400 font-black',
    cardBg: 'bg-gradient-to-b from-yellow-50 via-amber-50 to-orange-100 border-yellow-400 shadow-yellow-200 ring-2 ring-yellow-400/50',
    iconBorder: 'border-yellow-400 bg-yellow-100 animate-pulse',
  },
};

export default function BadgesModal({ profileId, profileName, isOpen, onClose }: BadgesModalProps) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRarity, setFilterRarity] = useState<string>('all');

  useEffect(() => {
    if (!isOpen || !profileId) return;

    (async () => {
      setLoading(true);

      try {
        // 1. Buscar todas as medalhas cadastradas no sistema
        const { data: allBadges } = await supabase
          .from('badges')
          .select('*')
          .order('requirement_value', { ascending: true });

        // 2. Buscar medalhas já conquistadas por este perfil
        const { data: userBadges } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('profile_id', profileId);

        const currentUnlockedIds = new Set((userBadges || []).map((b: any) => b.badge_id));

        // 3. Buscar o progresso atual do perfil para avaliar se tem direito a novas medalhas
        const { data: profile } = await supabase
          .from('profiles')
          .select('stars, streak_days')
          .eq('id', profileId)
          .maybeSingle();

        const { count: completedLessonsCount } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', profileId)
          .eq('status', 'completed');

        const stars = profile?.stars || 0;
        const streak = profile?.streak_days || 0;
        const lessons = completedLessonsCount || 0;

        // 4. Checar cada medalha que ainda não foi desbloqueada
        const newBadgesToAward: string[] = [];

        if (allBadges) {
          for (const badge of allBadges) {
            if (currentUnlockedIds.has(badge.id)) continue;

            let earned = false;
            const reqType = badge.requirement_type?.toLowerCase();
            const reqVal = Number(badge.requirement_value) || 0;

            if (reqType === 'lessons' || reqType === 'lesson') {
              if (lessons >= reqVal) earned = true;
            } else if (reqType === 'stars' || reqType === 'star') {
              if (stars >= reqVal) earned = true;
            } else if (reqType === 'streak' || reqType === 'days') {
              if (streak >= reqVal) earned = true;
            }

            if (earned) {
              newBadgesToAward.push(badge.id);
            }
          }
        }

        // 5. Se houver medalhas merecidas, salvar no banco agora!
        if (newBadgesToAward.length > 0) {
          const rowsToInsert = newBadgesToAward.map((badge_id) => ({
            profile_id: profileId,
            badge_id,
          }));

          const { error: insertError } = await supabase.from('user_badges').insert(rowsToInsert);

          if (!insertError) {
            newBadgesToAward.forEach((id) => currentUnlockedIds.add(id));
            try {
              playSuccessSound();
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            } catch (e) {}
          } else {
            console.warn('Erro ao registrar user_badges:', insertError);
          }
        }

        if (allBadges) setBadges(allBadges as Badge[]);
        setUnlockedBadgeIds(Array.from(currentUnlockedIds));
      } catch (err) {
        console.error('Erro ao carregar ou conceder medalhas:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  const filteredBadges = filterRarity === 'all' 
    ? badges 
    : badges.filter(b => b.rarity === filterRarity);

  const totalUnlocked = unlockedBadgeIds.length;
  const progressPercent = badges.length > 0 ? (totalUnlocked / badges.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-6 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div className="p-5 md:p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              🏆
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black leading-tight">Álbum de Conquistas</h2>
              <p className="text-white/80 text-xs md:text-sm font-medium">Medalhas de {profileName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progresso da Coleção */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-500" />
              Coleção Desbloqueada
            </span>
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              {totalUnlocked} de {badges.length} Medalhas
            </span>
          </div>
          <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-700" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Filtros por Raridade */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'common', label: 'Comum' },
              { key: 'rare', label: 'Raro' },
              { key: 'epic', label: 'Épico' },
              { key: 'legendary', label: 'Lendário' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilterRarity(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterRarity === f.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grelha de Medalhas (Coloridas vs Bloqueadas) */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filteredBadges.map((badge) => {
            const isUnlocked = unlockedBadgeIds.includes(badge.id);
            const theme = RARITY_THEMES[badge.rarity] || RARITY_THEMES.common;

            return (
              <div
                key={badge.id}
                className={`relative flex flex-col items-center text-center p-4 rounded-3xl border-2 transition-all duration-300 ${
                  isUnlocked
                    ? `${theme.cardBg} shadow-md hover:-translate-y-1`
                    : 'bg-slate-50 border-dashed border-slate-300 opacity-60 grayscale hover:opacity-75'
                }`}
              >
                {/* Rótulo de Raridade */}
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border mb-2 uppercase tracking-wider ${
                    isUnlocked ? theme.badgeBg : 'bg-slate-200 text-slate-500 border-slate-300'
                  }`}
                >
                  {theme.name}
                </span>

                {/* Ícone Central */}
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-2 border-2 shadow-xs transition-transform ${
                    isUnlocked
                      ? `${theme.iconBorder} scale-100`
                      : 'bg-slate-200 border-slate-300 scale-95'
                  }`}
                >
                  {badge.icon}
                </div>

                {/* Nome da Medalha */}
                <h4 className={`text-sm font-extrabold leading-tight mb-1 ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>
                  {badge.title}
                </h4>

                {/* Descrição do Requisito */}
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {badge.description}
                </p>

                {/* Cadeado ou Brilho de Conquista */}
                <div className="mt-3">
                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" /> Conquistada!
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" /> Bloqueada
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}