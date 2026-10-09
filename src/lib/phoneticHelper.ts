/**
 * Converte qualquer caractere IPA técnico em uma pronúncia infantil amigável em português
 */
export function formatFriendlyPhonetic(phonetic?: string | null): string {
  if (!phonetic) return '';

  return phonetic
    .replace(/θ/g, 'f')      // θ (bath) -> f / ss
    .replace(/ð/g, 'd')      // ð (father) -> d
    .replace(/ʃ/g, 'ch')     // ʃ (shoe) -> ch
    .replace(/ʒ/g, 'j')      // ʒ (television) -> j
    .replace(/tʃ/g, 'tch')   // tʃ (chair) -> tch
    .replace(/dʒ/g, 'dj')    // dʒ (juice) -> dj
    .replace(/ŋ/g, 'ng')     // ŋ (sing) -> ng
    .replace(/æ/g, 'é')      // æ (cat) -> é
    .replace(/ʌ/g, 'ã')      // ʌ (cup) -> ã
    .replace(/ə/g, 'e')      // schwa -> e
    .replace(/ɪ/g, 'i')      // ɪ -> i
    .replace(/ʊ/g, 'u');     // ʊ -> u
}