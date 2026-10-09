import { useState } from 'react';
import { getWordVisualData } from '@/lib/wordVisuals';

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
  const [imgError, setImgError] = useState(false);

  const sizeStyles = {
    sm: 'w-8 h-8 text-2xl',
    md: 'w-12 h-12 text-4xl',
    lg: 'w-16 h-16 text-5xl',
    xl: 'w-24 h-24 text-7xl',
  };

  const visualData = getWordVisualData(word?.word_en, word?.emoji, word?.image_url);

  if (visualData.imageUrl && !imgError) {
    return (
      <img
        src={visualData.imageUrl}
        alt={word?.word_en || 'word'}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`${sizeStyles[size].split(' ')[0]} ${sizeStyles[size].split(' ')[1]} object-contain drop-shadow-md select-none pointer-events-none transition-transform ${className}`}
      />
    );
  }

  return (
    <span className={`${sizeStyles[size].split(' ')[2]} select-none leading-none drop-shadow-xs ${className}`}>
      {visualData.emoji}
    </span>
  );
}