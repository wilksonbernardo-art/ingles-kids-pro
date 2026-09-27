import fs from 'fs';
import path from 'path';

// Cole aqui sua chave da ElevenLabs
const ELEVENLABS_API_KEY = 'sk_144373f2331ad54d3a779b05813d32d4febae54a59463f72';

const VOICES = [
  { name: 'charlotte', id: 'XB0fDUnXU5powFXDhCwa' }, // Doce / Contadora de histórias
  { name: 'alice', id: 'Xb7hH8MSUJpSbSDYk0k2' },     // Clara / Expressiva
];

const TEST_WORDS = ['Apple', 'Butterfly', 'Father'];

async function generateSample(voiceName: string, voiceId: string, word: string) {
  console.log(`🎙️ [${voiceName.toUpperCase()}] Gerando "${word}"...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: word,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Erro em "${word}" com a voz ${voiceName}:`, errorText);
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outDir = path.join(process.cwd(), 'public', 'audio_samples');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const fileName = `${word.toLowerCase()}_${voiceName}.mp3`;
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Salvo: public/audio_samples/${fileName}`);
}

async function run() {
  for (const voice of VOICES) {
    for (const word of TEST_WORDS) {
      await generateSample(voice.name, voice.id, word);
    }
  }
  console.log('\n🎉 Amostras geradas! Ouça e compare as duas no navegador ou tocador.');
}

run();