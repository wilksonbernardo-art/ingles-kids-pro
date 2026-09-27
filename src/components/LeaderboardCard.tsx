import { useState, useEffect } from 'react';
import { Trophy, Star, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/supabase';

type LeaderboardCardProps = {
  currentProfileId: string;
};

export default function LeaderboardCard({ currentProfileId }: LeaderboardCardProps) {
  const [topUsers, setTopUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('stars', { ascending: false })
        .limit(10);

      if (!error && data) {
        setTopUsers(data as Profile[]);
      }
      setLoading(false);
    }

    fetchLeaderboard();
  }, [currentProfileId]);

  const getPositionBadge = (index: number) => {
    if (index === 0) return <span className="text-base">🥇</span>;
    if (index === 1) return <span className="text-base">🥈</span>;
    if (index === 2) return <span className="text-base">🥉</span>;
    return (
      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-black text-[10px] flex items-center justify-center">
        {index + 1}º
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm w-full">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Trophy className="w-4 h-4 fill-amber-500 text-amber-600" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs leading-none">Top 10 Ranking</h3>
            <p className="text-[10px] font-bold text-slate-400">Classificação Geral</p>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
          Ao Vivo
        </span>
      </div>

      {loading ? (
        <div className="py-4 text-center text-slate-300 font-bold text-xs animate-pulse">
          A carregar...
        </div>
      ) : topUsers.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-3">Sem pontuações ainda.</p>
      ) : (
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
          {topUsers.map((user, idx) => {
            const isMe = user.id === currentProfileId;

            return (
              <div
                key={user.id}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-all ${
                  isMe
                    ? 'bg-amber-500/10 border border-amber-400/60 shadow-2xs'
                    : 'bg-slate-50/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 flex justify-center shrink-0">
                    {getPositionBadge(idx)}
                  </div>

                  <span className="text-lg shrink-0 select-none">
                    {user.avatar || '🦁'}
                  </span>

                  <div className="min-w-0">
                    <p
                      className={`text-[11px] font-black truncate max-w-[110px] sm:max-w-[130px] ${
                        isMe ? 'text-amber-950 font-extrabold' : 'text-slate-700'
                      }`}
                    >
                      {user.name} {isMe && '(Tu)'}
                    </p>
                    {user.streak_days > 0 && (
                      <span className="inline-flex items-center text-[9px] font-bold text-orange-500">
                        <Flame className="w-2.5 h-2.5 fill-orange-500" /> {user.streak_days}d
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 bg-white px-2 py-0.5 rounded-lg border border-slate-100 shadow-2xs">
                  <Star className="w-3 h-3 text-amber-500 fill-current" />
                  <span className="text-[11px] font-black text-slate-800">{user.stars || 0}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}