import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lock } from 'lucide-react';
import type { Profile } from '@/lib/supabase';

interface ProfileLoginProps {
  profiles: Profile[];
  onSelectProfile: (profileId: string) => void;
  onOpenParentArea: () => void;
}

export default function ProfileLogin({ profiles, onSelectProfile, onOpenParentArea }: ProfileLoginProps) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Se o perfil tiver pin definido, valida; caso contrário (ou padrão 1234), entra direto
  function handleProfileClick(profile: Profile) {
    onSelectProfile(profile.id);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-50 to-pink-50 flex flex-col justify-between p-6">
      {/* Topo com Acesso Parental */}
      <div className="w-full max-w-5xl mx-auto flex justify-end">
        <button
          onClick={onOpenParentArea}
          className="flex items-center gap-1.5 px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Área dos Pais</span>
        </button>
      </div>

      {/* Conteúdo Central */}
      <div className="w-full max-w-3xl mx-auto text-center my-auto">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 border-2 border-amber-300 rounded-3xl text-4xl shadow-md mb-4 animate-bounce-short">
          🦁
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight mb-2">
          English Kids
        </h1>
        <p className="text-slate-500 font-bold text-base md:text-lg mb-10">
          Quem vai aprender e brincar hoje?
        </p>

        {/* Grelha de Perfis Grandes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProfileClick(p)}
              className="group relative flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-md hover:bg-white rounded-3xl border-3 border-indigo-100 hover:border-indigo-500 shadow-md hover:shadow-xl hover:-translate-y-2 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <div className="w-24 h-24 rounded-3xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-5xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                {p.avatar_url || '🧒'}
              </div>

              <h3 className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                {p.name}
              </h3>

              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  ⭐ {p.stars} estrelas
                </span>
                <span className="text-xs font-extrabold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  🔥 {p.streak_days || 0} dias
                </span>
              </div>

              <div className="mt-5 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shadow-md">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Rodapé Informativo */}
      <div className="w-full text-center text-xs text-slate-400 font-semibold py-4">
        Prática diária de 60 minutos • Aprender inglês passo a passo
      </div>
    </div>
  );
}