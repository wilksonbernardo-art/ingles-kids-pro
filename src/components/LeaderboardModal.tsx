import React, { useState, useEffect } from 'react';
import { X, Trophy, Flame, Star, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfileId: string;
}

export default function LeaderboardModal({ isOpen, onClose, activeProfileId }: LeaderboardModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rankingType, setRankingType] = useState<'monthly' | 'all_time'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order(rankingType === 'monthly' ? 'monthly_stars' : 'stars', { ascending: false });

      if (!error && data) {
        setProfiles(data as Profile[]);
      }
      setLoading(false);
    })();
  }, [isOpen, rankingType]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
              🏅
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight">Quadro de Campeões</h2>
              <p className="text-white/90 text-xs font-semibold">Quem tem mais estrelas acumuladas?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternador Mensal vs Geral */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-center">
          <div className="bg-slate-200/70 p-1 rounded-2xl flex w-full max-w-xs">
            <button
              onClick={() => setRankingType('monthly')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                rankingType === 'monthly'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📅 Mensal
            </button>
            <button
              onClick={() => setRankingType('all_time')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                rankingType === 'all_time'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ⭐ Geral (Total)
            </button>
          </div>
        </div>

        {/* Lista de Classificação */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm font-bold">A carregar...</div>
          ) : (
            profiles.map((p, index) => {
              const isCurrentUser = p.id === activeProfileId;
              const points = rankingType === 'monthly' ? (p.monthly_stars || 0) : p.stars;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                    isCurrentUser
                      ? 'border-orange-400 bg-orange-50/60 shadow-sm'
                      : index === 0
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  {/* Posição no Pódio */}
                  <div className="w-8 flex items-center justify-center font-black text-base">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  {/* Avatar & Nome */}
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-xs">
                    {p.avatar_url || '🦁'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-extrabold text-slate-800 truncate">{p.name}</p>
                      {isCurrentUser && (
                        <span className="text-[10px] font-black bg-orange-200 text-orange-800 px-1.5 py-0.2 rounded-md">
                          Tu
                        </span>
                      )}
                    </div>
                    {/* Sequência Diária */}
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                      <Flame className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{p.streak_days || 0} dias seguidos</span>
                    </div>
                  </div>

                  {/* Estrelas */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-black text-sm text-slate-800">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span>{points}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">estrelas</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}