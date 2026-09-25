import React from 'react';
import { Lock } from 'lucide-react';

interface Module {
  id: string;
  title: string;
  title_en: string;
  icon?: string;
  module_order: number;
  is_locked?: boolean;
}

interface ModuleTrailProps {
  modules: Module[];
  onSelectModule: (module: Module) => void;
}

const MODULE_THEMES = [
  { bg: 'bg-rose-50 hover:bg-rose-100/70', border: 'border-rose-200', text: 'text-rose-600', badge: 'bg-rose-500', emoji: '👨‍👩‍👧‍👦' },
  { bg: 'bg-amber-50 hover:bg-amber-100/70', border: 'border-amber-200', text: 'text-amber-600', badge: 'bg-amber-500', emoji: '🛏️' },
  { bg: 'bg-sky-50 hover:bg-sky-100/70', border: 'border-sky-200', text: 'text-sky-600', badge: 'bg-sky-500', emoji: '🛁' },
  { bg: 'bg-purple-50 hover:bg-purple-100/70', border: 'border-purple-200', text: 'text-purple-600', badge: 'bg-purple-500', emoji: '👕' },
  { bg: 'bg-orange-50 hover:bg-orange-100/70', border: 'border-orange-200', text: 'text-orange-600', badge: 'bg-orange-500', emoji: '🥣' },
  { bg: 'bg-pink-50 hover:bg-pink-100/70', border: 'border-pink-200', text: 'text-pink-600', badge: 'bg-pink-500', emoji: '🧸' },
  { bg: 'bg-yellow-50 hover:bg-yellow-100/70', border: 'border-yellow-200', text: 'text-yellow-600', badge: 'bg-yellow-500', emoji: '✏️' },
  { bg: 'bg-emerald-50 hover:bg-emerald-100/70', border: 'border-emerald-200', text: 'text-emerald-600', badge: 'bg-emerald-500', emoji: '⚽' },
  { bg: 'bg-green-50 hover:bg-green-100/70', border: 'border-green-200', text: 'text-green-600', badge: 'bg-green-500', emoji: '🌳' },
  { bg: 'bg-blue-50 hover:bg-blue-100/70', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-500', emoji: '🚌' },
  { bg: 'bg-fuchsia-50 hover:bg-fuchsia-100/70', border: 'border-fuchsia-200', text: 'text-fuchsia-600', badge: 'bg-fuchsia-500', emoji: '😊' },
  { bg: 'bg-red-50 hover:bg-red-100/70', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-500', emoji: '💭' },
];

export default function ModuleTrail({ modules, onSelectModule }: ModuleTrailProps) {
  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 md:px-8 flex flex-col items-center">
      {/* Título Principal */}
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
          Trilha de Módulos
        </h2>
        <p className="text-slate-500 font-semibold text-sm md:text-lg mt-1">
          Escolhe um módulo para começar a aprender!
        </p>
      </div>

      {/* Grelha Panorâmica Expandida */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 w-full">
        {modules.map((mod, index) => {
          const theme = MODULE_THEMES[index % MODULE_THEMES.length];
          const isLocked = mod.is_locked;

          return (
            <button
              key={mod.id}
              onClick={() => !isLocked && onSelectModule(mod)}
              disabled={isLocked}
              className={`relative flex flex-col items-center justify-center p-6 md:p-8 min-h-[170px] md:min-h-[190px] rounded-3xl border-2 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-1.5 active:scale-95 text-center
                ${theme.bg} ${theme.border}
                ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Badge Circular do Número */}
              <div
                className={`absolute -top-3 -left-3 w-8 h-8 md:w-9 md:h-9 rounded-2xl flex items-center justify-center text-white text-xs md:text-sm font-black shadow-md ${theme.badge}`}
              >
                {mod.module_order}
              </div>

              {/* Ícone Emoji Central */}
              <div className="text-5xl md:text-6xl mb-3 select-none drop-shadow-xs">
                {theme.emoji}
              </div>

              {/* Nome do Módulo em Português */}
              <span className={`font-black text-base md:text-lg leading-tight ${theme.text}`}>
                {mod.title}
              </span>

              {/* Subtítulo em Inglês */}
              <span className="text-slate-400 text-xs md:text-sm font-bold mt-1">
                {mod.title_en}
              </span>

              {/* Indicador de Cadeado */}
              {isLocked && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                  <Lock className="w-8 h-8 text-slate-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}