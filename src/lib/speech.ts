// Cache do áudio em reprodução para evitar sons sobrepostos
let currentAudio: HTMLAudioElement | null = null;

// Cache local de vozes do navegador (fallback)
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const list = window.speechSynthesis.getVoices();
  if (list && list.length > 0) {
    cachedVoices = list;
  }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

function pickBestEnglishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoices.length === 0) loadVoices();
  const voices = cachedVoices;
  if (!voices || voices.length === 0) return null;

  const topPriority = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') ||
        v.name.includes('Online') ||
        v.name.includes('Neural') ||
        v.name.includes('Jenny') ||
        v.name.includes('Aria') ||
        v.name.includes('Ava') ||
        v.name.includes('Samantha'))
  );
  if (topPriority) return topPriority;

  const googleVoice = voices.find(
    (v) => (v.lang === 'en-US' || v.lang.startsWith('en')) && v.name.includes('Google')
  );
  if (googleVoice) return googleVoice;

  return voices.find((v) => v.lang === 'en-US') || voices.find((v) => v.lang.startsWith('en')) || null;
}

/**
 * Fala ou reproduz a palavra.
 * @param wordOrText Nome da palavra ou texto a ser falado
 * @param audioUrl URL opcional do ficheiro MP3 real da palavra
 */
export function speakWord(wordOrText: string, audioUrl?: string | null): void {
  if (typeof window === 'undefined') return;

  // Interrompe qualquer áudio ou síntese que ainda esteja a tocar
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // Ignora eventuais exceções ao pausar áudios em curso
    }
    currentAudio = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  // 1. Prioridade Máxima: Reproduzir o ficheiro MP3 real gravado
  if (audioUrl && audioUrl.trim().length > 0) {
    try {
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Se for AbortError (interrompido por troca rápida de tela/clique), ignora
          // e NÃO ativa a voz robótica por engano
          if (err?.name === 'AbortError') {
            return;
          }
          console.warn('Falha na reprodução do áudio MP3, a recorrer ao fallback:', err);
          speakWithBrowser(wordOrText);
        });
      }
      return;
    } catch (e) {
      console.warn('Erro ao instanciar elemento de áudio:', e);
    }
  }

  // 2. Plano B (Fallback): Síntese de voz do navegador caso não exista audioUrl
  speakWithBrowser(wordOrText);
}

function speakWithBrowser(text: string): void {
  if (!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  utterance.pitch = 1.08;

  const voice = pickBestEnglishVoice();
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

export function playSuccessSound(): void {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';

      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.start(t);
      osc.stop(t + 0.28);
    });
  } catch {
    // AudioContext indisponível
  }
}

export function playErrorSound(): void {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);
    osc.type = 'triangle';

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // AudioContext indisponível
  }
}