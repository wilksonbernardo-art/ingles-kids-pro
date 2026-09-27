import { createClient } from '@supabase/supabase-js';

// 1. Configurações do Supabase
const SUPABASE_URL = 'https://dtwmzboqtesyevzupopf.supabase.co';
// Cole aqui a chave service_role (NÃO a anon) para permitir upload no Storage
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0d216Ym9xdGVzeWV2enVwb3BmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM1Mzg5NCwiZXhwIjoyMTA1OTI5ODk0fQ.PPwGQatxuYmKib9k8-dJ5ufBfJXIy5OfuN1niee1hLM';

// 2. Configurações da ElevenLabs
const ELEVENLABS_API_KEY = 'sk_144373f2331ad54d3a779b05813d32d4febae54a59463f72';
const VOICE_ID_SARAH = 'EXAVITQu4vr4xnSDxMaL'; // Sarah (voz suave infantil)

const BUCKET_NAME = 'word-audios';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Função para gerar o MP3 na ElevenLabs
async function generateAudioBuffer(text: string): Promise<Buffer | null> {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID_SARAH}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Erro ElevenLabs para "${text}":`, err);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (e: any) {
    console.error(`❌ Falha de rede para "${text}":`, e.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Iniciando processo: ElevenLabs -> Supabase Storage (Sarah)...');

  // Busca todas as palavras do banco
  const { data: words, error } = await supabase
    .from('words')
    .select('id, word_en, audio_url')
    .order('id', { ascending: true });

  if (error || !words) {
    console.error('❌ Erro ao consultar tabela words:', error);
    return;
  }

  // Filtra as que ainda não usam o áudio do nosso bucket
  const pending = words.filter(
    (w) => !w.audio_url || !w.audio_url.includes(BUCKET_NAME)
  );

  console.log(`📋 Total de palavras no banco: ${words.length}`);
  console.log(`🎙️ Palavras pendentes de gravação com a Sarah: ${pending.length}`);

  if (pending.length === 0) {
    console.log('🎉 Todas as palavras já estão com os áudios da Sarah no Storage!');
    return;
  }

  let count = 0;

  for (const item of pending) {
    const cleanWord = item.word_en.trim();
    const fileName = `${cleanWord.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${item.id}.mp3`;

    console.log(`[${count + 1}/${pending.length}] Gerando voz para: "${cleanWord}"...`);

    // 1. Gera na ElevenLabs
    const audioBuffer = await generateAudioBuffer(cleanWord);
    if (!audioBuffer) {
      console.warn(`⚠️ Pulando "${cleanWord}" por falha na geração.`);
      continue;
    }

    // 2. Faz upload para o bucket do Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ Erro ao enviar "${fileName}" para o Storage:`, uploadError.message);
      continue;
    }

    // 3. Monta a URL pública definitiva
    const { data: pubData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const publicUrl = pubData.publicUrl;

    // 4. Salva a nova URL na tabela words
    const { error: updateError } = await supabase
      .from('words')
      .update({ audio_url: publicUrl })
      .eq('id', item.id);

    if (updateError) {
      console.error(`❌ Erro ao atualizar tabela para "${cleanWord}":`, updateError.message);
    } else {
      console.log(`✅ Salvo no banco: "${cleanWord}" -> ${publicUrl}`);
      count++;
    }

    // Pausa suave de 250ms para respeitar limites de taxa da API
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\n🎉 Concluído com sucesso! ${count} áudios da Sarah gravados e salvos no Supabase Storage!`);
}

run();