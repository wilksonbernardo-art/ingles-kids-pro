import { getWordVisualElement } from '@/lib/wordVisuals';

type WordVisualProps = {
  word?: {
    word_en?: string;
    emoji?: string;
    image_url?: string;
  } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

export default function WordVisual({ word, size = 'md', className = '' }: WordVisualProps) {
  const sizeStyles = {
    sm: 'w-8 h-8 text-2xl',
    md: 'w-12 h-12 text-4xl',
    lg: 'w-16 h-16 text-5xl',
    xl: 'w-24 h-24 text-7xl',
  };

  const visual = getWordVisualElement(word?.word_en, word?.emoji, word?.image_url);

  // 1. Se tem ilustração SVG dedicada no dicionário:
  if (visual.type === 'svg') {
    return (
      <div className={`${sizeStyles[size].split(' ')[0]} ${sizeStyles[size].split(' ')[1]} flex items-center justify-center select-none pointer-events-none ${className}`}>
        {visual.element}
      </div>
    );
  }

  // 2. Se tem imagem configurada (Supabase):
  if (visual.type === 'image' && visual.url) {
    return (
      <img
        src={visual.url}
        alt={word?.word_en || 'word'}
        loading="lazy"
        className={`${sizeStyles[size].split(' ')[0]} ${sizeStyles[size].split(' ')[1]} object-contain drop-shadow-md select-none pointer-events-none ${className}`}
      />
    );
  }

  // 3. Fallback para emoji:
  return (
    <span className={`${sizeStyles[size].split(' ')[2]} select-none leading-none drop-shadow-xs ${className}`}>
      {visual.emoji}
    </span>
  );
}