import React from 'react';

// Ilustrações Vetoriais Educativas (SVG nítido e colorido)
export const WORD_SVG_MAP: Record<string, { svg: React.ReactNode; fallbackEmoji: string }> = {
  // --- Quarto / Casa (Diferenciados com precisão) ---
  bed: {
    fallbackEmoji: '🛏️',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        <rect x="6" y="24" width="8" height="32" rx="3" fill="#854d0e" />
        <rect x="50" y="32" width="8" height="24" rx="3" fill="#854d0e" />
        <rect x="12" y="36" width="40" height="10" rx="3" fill="#3b82f6" />
        <rect x="12" y="30" width="14" height="8" rx="3" fill="#e2e8f0" />
        <rect x="22" y="34" width="30" height="12" rx="4" fill="#60a5fa" />
        <path d="M6 52h52" stroke="#713f12" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  sheet: {
    fallbackEmoji: '🧺',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        {/* Lençol / Pano estendido e dobrado com ondas */}
        <path d="M12 20c8-4 20 4 38-2v24c-16 4-26-4-38 2V20z" fill="#93c5fd" />
        <path d="M12 28c8-4 20 4 38-2v6c-16 4-26-4-38 2v-6z" fill="#60a5fa" />
        <path d="M10 44c10-3 24 3 42-1v4c-18 4-32-2-42 1v-4z" fill="#3b82f6" />
        {/* Dobraduras do tecido */}
        <path d="M16 16c6-2 16 3 32-1l4 8c-14 3-24-3-32 1l-4-8z" fill="#dbeafe" />
      </svg>
    ),
  },
  wardrobe: {
    fallbackEmoji: '🗄️',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        <rect x="14" y="8" width="36" height="48" rx="4" fill="#a16207" />
        <line x1="32" y1="8" x2="32" y2="52" stroke="#713f12" strokeWidth="2.5" />
        <circle cx="28" cy="30" r="2.5" fill="#fef08a" />
        <circle cx="36" cy="30" r="2.5" fill="#fef08a" />
        <rect x="18" y="52" width="6" height="6" rx="1.5" fill="#713f12" />
        <rect x="40" y="52" width="6" height="6" rx="1.5" fill="#713f12" />
      </svg>
    ),
  },
  door: {
    fallbackEmoji: '🚪',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        <rect x="12" y="6" width="40" height="52" rx="3" fill="#cbd5e1" />
        <rect x="16" y="9" width="32" height="49" rx="2" fill="#d97706" />
        <rect x="20" y="14" width="10" height="16" rx="2" fill="#b45309" />
        <rect x="34" y="14" width="10" height="16" rx="2" fill="#b45309" />
        <rect x="20" y="34" width="10" height="18" rx="2" fill="#b45309" />
        <rect x="34" y="34" width="10" height="18" rx="2" fill="#b45309" />
        <circle cx="42" cy="34" r="2.5" fill="#fef08a" />
      </svg>
    ),
  },
  box: {
    fallbackEmoji: '📦',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        <path d="M12 24l20-10 20 10v24l-20 10-20-10V24z" fill="#d97706" />
        <path d="M32 14l20 10-20 10-20-10 20-10z" fill="#f59e0b" />
        <path d="M32 34v24l20-10V24L32 34z" fill="#b45309" />
        <line x1="32" y1="24" x2="32" y2="34" stroke="#78350f" strokeWidth="2" />
      </svg>
    ),
  },
  messy: {
    fallbackEmoji: '🌪️',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        {/* Bagunça: Meia jogada, brinquedo torto e rabiscos */}
        <path d="M12 44c4-12 18-8 24-16s14 6 18-2" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="20" cy="22" r="6" fill="#eab308" />
        <rect x="36" y="36" width="14" height="10" rx="2" fill="#3b82f6" transform="rotate(15 36 36)" />
        <path d="M16 48l8-4 4 6-8 4z" fill="#10b981" />
        <path d="M28 14l4 8-8 2z" fill="#ec4899" />
      </svg>
    ),
  },
  pillow: {
    fallbackEmoji: '🛌',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        <rect x="10" y="18" width="44" height="28" rx="14" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="3" />
        <path d="M16 26c10-2 22-2 32 0" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  bedroom: {
    fallbackEmoji: '🏠',
    svg: (
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md" fill="none">
        <rect x="8" y="12" width="48" height="42" rx="4" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
        <rect x="12" y="30" width="28" height="18" rx="2" fill="#60a5fa" />
        <rect x="42" y="24" width="10" height="24" rx="2" fill="#a16207" />
        <circle cx="26" cy="20" r="4" fill="#fbbf24" />
      </svg>
    ),
  },
};

export function getWordVisualElement(wordEn?: string, defaultEmoji?: string, defaultImageUrl?: string) {
  const cleanKey = (wordEn || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const matched = WORD_SVG_MAP[cleanKey];

  if (matched?.svg) {
    return { type: 'svg' as const, element: matched.svg, emoji: matched.fallbackEmoji };
  }

  if (defaultImageUrl) {
    return { type: 'image' as const, url: defaultImageUrl, emoji: defaultEmoji || '⭐' };
  }

  return { type: 'emoji' as const, emoji: matched?.fallbackEmoji || defaultEmoji || '⭐' };
}