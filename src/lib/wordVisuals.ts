// Dicionário de ilustrações educativas infantis de alta definição (3D & Ilustrado)
const CDN_3D = 'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets';

// Mapa de URLs diretas e emojis representativos precisos
export const WORD_VISUALS_MAP: Record<string, { url: string; fallbackEmoji: string }> = {
  // --- Móveis e Casa (Resolvendo as ambiguidades anteriores) ---
  door: {
    url: `${CDN_3D}/🚪_3d.png`,
    fallbackEmoji: '🚪',
  },
  wardrobe: {
    url: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=256&q=80',
    fallbackEmoji: '🗄️',
  },
  closet: {
    url: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=256&q=80',
    fallbackEmoji: '🗄️',
  },
  box: {
    url: `${CDN_3D}/📦_3d.png`,
    fallbackEmoji: '📦',
  },
  messy: {
    url: `${CDN_3D}/🌪️_3d.png`,
    fallbackEmoji: '🌪️',
  },
  bed: {
    url: `${CDN_3D}/🛏️_3d.png`,
    fallbackEmoji: '🛏️',
  },
  bedroom: {
    url: `${CDN_3D}/🛏️_3d.png`,
    fallbackEmoji: '🛏️',
  },
  house: {
    url: `${CDN_3D}/🏠_3d.png`,
    fallbackEmoji: '🏠',
  },
  chair: {
    url: `${CDN_3D}/🪑_3d.png`,
    fallbackEmoji: '🪑',
  },
  table: {
    url: `${CDN_3D}/🪵_3d.png`,
    fallbackEmoji: '🪵',
  },
  window: {
    url: `${CDN_3D}/🪟_3d.png`,
    fallbackEmoji: '🪟',
  },

  // --- Animais ---
  cat: {
    url: `${CDN_3D}/🐱_3d.png`,
    fallbackEmoji: '🐱',
  },
  dog: {
    url: `${CDN_3D}/🐶_3d.png`,
    fallbackEmoji: '🐶',
  },
  lion: {
    url: `${CDN_3D}/🦁_3d.png`,
    fallbackEmoji: '🦁',
  },
  bird: {
    url: `${CDN_3D}/🐦_3d.png`,
    fallbackEmoji: '🐦',
  },
  fish: {
    url: `${CDN_3D}/🐟_3d.png`,
    fallbackEmoji: '🐟',
  },
  duck: {
    url: `${CDN_3D}/🦆_3d.png`,
    fallbackEmoji: '🦆',
  },
  elephant: {
    url: `${CDN_3D}/🐘_3d.png`,
    fallbackEmoji: '🐘',
  },
  monkey: {
    url: `${CDN_3D}/🐵_3d.png`,
    fallbackEmoji: '🐵',
  },
  bear: {
    url: `${CDN_3D}/🐻_3d.png`,
    fallbackEmoji: '🐻',
  },

  // --- Escola e Objetos ---
  book: {
    url: `${CDN_3D}/📚_3d.png`,
    fallbackEmoji: '📚',
  },
  pencil: {
    url: `${CDN_3D}/✏️_3d.png`,
    fallbackEmoji: '✏️',
  },
  pen: {
    url: `${CDN_3D}/🖊️_3d.png`,
    fallbackEmoji: '🖊️',
  },
  backpack: {
    url: `${CDN_3D}/🎒_3d.png`,
    fallbackEmoji: '🎒',
  },
  ruler: {
    url: `${CDN_3D}/📏_3d.png`,
    fallbackEmoji: '📏',
  },

  // --- Alimentos ---
  apple: {
    url: `${CDN_3D}/🍎_3d.png`,
    fallbackEmoji: '🍎',
  },
  banana: {
    url: `${CDN_3D}/🍌_3d.png`,
    fallbackEmoji: '🍌',
  },
  water: {
    url: `${CDN_3D}/💧_3d.png`,
    fallbackEmoji: '💧',
  },
  milk: {
    url: `${CDN_3D}/🥛_3d.png`,
    fallbackEmoji: '🥛',
  },
  bread: {
    url: `${CDN_3D}/🍞_3d.png`,
    fallbackEmoji: '🍞',
  },
  cookie: {
    url: `${CDN_3D}/🍪_3d.png`,
    fallbackEmoji: '🍪',
  },

  // --- Natureza & Cores ---
  sun: {
    url: `${CDN_3D}/☀️_3d.png`,
    fallbackEmoji: '☀️',
  },
  star: {
    url: `${CDN_3D}/⭐_3d.png`,
    fallbackEmoji: '⭐',
  },
  tree: {
    url: `${CDN_3D}/🌳_3d.png`,
    fallbackEmoji: '🌳',
  },
  flower: {
    url: `${CDN_3D}/🌸_3d.png`,
    fallbackEmoji: '🌸',
  },
  moon: {
    url: `${CDN_3D}/🌙_3d.png`,
    fallbackEmoji: '🌙',
  },
};

/**
 * Retorna os dados visuais garantidos da palavra
 */
export function getWordVisualData(wordEn?: string, defaultEmoji?: string, defaultImageUrl?: string) {
  const cleanKey = (wordEn || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const matched = WORD_VISUALS_MAP[cleanKey];

  return {
    imageUrl: defaultImageUrl || matched?.url || null,
    emoji: matched?.fallbackEmoji || defaultEmoji || '⭐',
  };
}