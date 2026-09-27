import { createClient } from '@supabase/supabase-js';

const RAW_URL = 'https://dtwmzboqtesyevzupopf.supabase.co';
const RAW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0d216Ym9xdGVzeWV2enVwb3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTM4OTQsImV4cCI6MjEwNTkyOTg5NH0.cbETbjzRBqiN7M1K8jFpJ0UF1EIkDMRWgfwilW2xA4Q'; // Insira a sua chave anon aqui

const SUPABASE_URL = RAW_URL.trim().replace(/\/+$/, '');
const SUPABASE_KEY = RAW_KEY.trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getEmojiCodePoint(emojiStr: string): string | null {
  if (!emojiStr) return null;
  const trimmed = emojiStr.trim();
  const codePoints: string[] = [];

  for (const code of trimmed) {
    const cp = code.codePointAt(0);
    if (cp && cp > 127) {
      codePoints.push(cp.toString(16).toLowerCase());
    }
  }

  const filtered = codePoints.filter((c) => c !== 'fe0f');
  return filtered.length > 0 ? filtered.join('-') : null;
}

function getImageUrl(emojiStr: string, wordEn: string): string {
  const code = getEmojiCodePoint(emojiStr);

  // 1. Ilustração nítida Twemoji HD (72x72) transparente
  if (code) {
    return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/${code}.png`;
  }

  // 2. Fallback vetorial educativo limpo baseado no termo em inglês
  const cleanWord = encodeURIComponent(wordEn.trim().toLowerCase());
  return `https://api.dicebear.com/7.x/icons/svg?icon=${cleanWord}&backgroundColor=transparent`;
}

async function runForceSync() {
  console.log('🎨 Iniciando sincronização FORÇADA de ilustrações...');

  const { data: words, error } = await supabase
    .from('words')
    .select('id, word_en, emoji');

  if (error || !words) {
    console.error('❌ Erro ao consultar palavras:', error);
    return;
  }

  console.log(`📋 Total de palavras encontradas: ${words.length}`);
  console.log('🚀 Atualizando todas as 608 ilustrações...');

  const BATCH_SIZE = 25;
  let updated = 0;

  for (let i = 0; i < words.length; i += BATCH_SIZE) {
    const chunk = words.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (item) => {
        const imgUrl = getImageUrl(item.emoji, item.word_en);

        const { error: upErr } = await supabase
          .from('words')
          .update({ image_url: imgUrl })
          .eq('id', item.id);

        if (!upErr) updated++;
      })
    );

    console.log(`🖼️ Progresso: ${updated}/${words.length} imagens atualizadas...`);
  }

  console.log(`\n🎉 Finalizado! Todas as ${updated} palavras agora têm links de ilustrações atualizados.`);
}

runForceSync();