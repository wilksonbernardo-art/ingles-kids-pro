import { createClient } from '@supabase/supabase-js';

const RAW_URL = 'https://dtwmzboqtesyevzupopf.supabase.co';
const RAW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0d216Ym9xdGVzeWV2enVwb3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTM4OTQsImV4cCI6MjEwNTkyOTg5NH0.cbETbjzRBqiN7M1K8jFpJ0UF1EIkDMRWgfwilW2xA4Q'; // mantenha a sua chave aqui

const SUPABASE_URL = RAW_URL.trim().replace(/\/+$/, '');
const SUPABASE_KEY = RAW_KEY.trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getAudioUrl(word: string): string {
  const cleanWord = word.trim().toLowerCase();
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanWord)}&tl=en-US&client=tw-ob`;
}

async function runTurbo() {
  console.log('⚡ Modo Turbo Iniciado!');
  console.log('🔍 Buscando palavras sem áudio no Supabase...');

  const { data: words, error } = await supabase
    .from('words')
    .select('id, word_en, audio_url');

  if (error || !words) {
    console.error('❌ Erro ao buscar palavras:', error);
    return;
  }

  const pending = words.filter((w) => !w.audio_url);
  console.log(`📋 Total pendente: ${pending.length} palavras.`);

  if (pending.length === 0) {
    console.log('🎉 Todas as palavras já possuem áudio!');
    return;
  }

  // Processa em blocos de 20 em paralelo para voar
  const BATCH_SIZE = 20;
  let updated = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (item) => {
        if (!item.word_en) return;
        const audioUrl = getAudioUrl(item.word_en);
        const { error: upErr } = await supabase
          .from('words')
          .update({ audio_url: audioUrl })
          .eq('id', item.id);

        if (!upErr) {
          updated++;
        }
      })
    );

    console.log(`🚀 Progresso: ${updated}/${pending.length} palavras salvas...`);
  }

  console.log(`\n🎉 Finalizado com sucesso! ${updated} palavras atualizadas instantaneamente!`);
}

runTurbo();