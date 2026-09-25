import React, { useState } from 'react';
import { Lock, Star, Flame, Trophy } from 'lucide-react';
import type { Profile } from '@/lib/supabase';

interface TopBarProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onSelectProfile: (id: string) => void;
  onOpenParentArea: () => void;
}

export default function TopBar({
  profiles,
  activeProfileId,
  onSelectProfile,
  onOpenParentArea,
}: TopBarProps) {
  const [rankingType, setRankingType] = useState<'monthly' | 'all_time'>('monthly');

  // Ordena os perfis conforme o tipo de ranking selecionado
  const sortedProfiles = [...profiles].sort((a, b) => {
    const ptsA = rankingType === 'monthly' ? (a.monthly_stars || 0) : a.stars;
    const ptsB = rankingType === 'monthly' ? (b.monthly_stars || 0) : b.stars;
    return ptsB - ptsA;
  });

  return (
    <header className="w-full max-w-6xl mx-auto px-4 pt-3 pb-2 flex flex-col gap-3">
      {/* Linha 1: Logotipo + Acesso dos Pais */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-xl shadow-xs">
            🦁
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight">English Kids</h1>
            <p className="text-[11px] text-slate-400 font-bold">Aprender brincando!</p>
          </div>
        </div>

        <button
          onClick={onOpenParentArea}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Área dos Pais</span>
        </button>
      </div>

      {/* Linha 2: O Card de Ranking Integrado na Tela Principal */}
      <div className="w-full bg-white/90 backdrop-blur-md rounded-3xl border-2 border-slate-100 shadow-sm p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Lado Esquerdo: Cabeçalho do Placar + Alternador */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <span className="text-xs font-black text-slate-700 tracking-wide uppercase">Placar</span>
          </div>

          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
            <button
              onClick={() => setRankingType('monthly')}
              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                rankingType === 'monthly'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setRankingType('all_time')}
              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer ${
                rankingType === 'all_time'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Geral
            </button>
          </div>
        </div>

        {/* Lado Direito: Os Cards das Crianças (clicáveis para trocar o perfil ativo) */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end overflow-x-auto">
          {sortedProfiles.map((p, idx) => {
            const isSelected = p.id === activeProfileId;
            const score = rankingType === 'monthly' ? (p.monthly_stars || 0) : p.stars;
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';

            return (
              <button
                key={p.id}
                onClick={() => onSelectProfile(p.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-102 ring-2 ring-indigo-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {/* Medalha / Posição */}
                <span className="text-sm font-black">{medal}</span>

                {/* Avatar */}
                <span className="text-base">{p.avatar_url || '🧒'}</span>

                {/* Nome */}
                <span className="text-xs font-extrabold tracking-wide">{p.name}</span>

                {/* Fogo da Ofensiva */}
                <div className={`flex items-center gap-0.5 text-[11px] font-bold ${
                  isSelected ? 'text-amber-200' : 'text-amber-600'
                }`}>
                  <Flame className="w-3 h-3 fill-current" />
                  <span>{p.streak_days || 0}</span>
                </div>

                {/* Estrelas */}
                <div className={`flex items-center gap-1 text-xs font-black ${
                  isSelected ? 'text-yellow-300' : 'text-amber-500'
                }`}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{score}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}