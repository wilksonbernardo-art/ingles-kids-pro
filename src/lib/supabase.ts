import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Mantém a sessão salva no navegador ao dar F5
    autoRefreshToken: true, // Renova os tokens de acesso em segundo plano
    detectSessionInUrl: true,
  },
});

export type Profile = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  stars: number;
};

export type Module = {
  id: string;
  module_order: number;
  title_en: string;
  title_pt: string;
  emoji: string;
  color: string;
};

export type Word = {
  id: string;
  module_id: string;
  word_en: string;
  word_pt: string;
  pronunciation: string;
  emoji: string;
  word_order: number;
};

export type QuestSubmission = {
  id: string;
  profile_id: string;
  profile_name: string;
  quest_type: string;
  quest_title: string;
  quest_emoji: string;
  points: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type LessonProgress = {
  id: string;
  profile_id: string;
  module_id: string;
  lesson_day: number;
  current_step: number;
  status: 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
};

export const QUEST_DEFINITIONS = [
  { type: 'cartoon', emoji: '🎬', title: 'Assistir a desenho animado em inglês', points: 30 },
  { type: 'book', emoji: '📚', title: 'Ler ou ouvir livrinho em inglês', points: 50 },
  { type: 'movie', emoji: '🍿', title: 'Assistir a um filme em inglês', points: 80 },
  { type: 'speak', emoji: '🗣️', title: 'Falar 3 palavras em inglês em casa', points: 20 },
] as const;

export const LESSON_DAYS = [
  { day: 1, label: 'Aula 1', weekday: 'Seg' },
  { day: 2, label: 'Aula 2', weekday: 'Ter' },
  { day: 3, label: 'Aula 3', weekday: 'Qua' },
  { day: 4, label: 'Aula 4', weekday: 'Qui' },
  { day: 5, label: 'Aula 5', weekday: 'Sex' },
] as const;

export const LESSON_STEPS = [
  { step: 1, title: 'Flashcards', subtitle: 'Pronúncia em Voz Alta', duration: 15, emoji: '🔊', color: 'blue' },
  { step: 2, title: 'Hora do Desenho', subtitle: 'Atividade Off-line', duration: 15, emoji: '✏️', color: 'amber' },
  { step: 3, title: 'Minijogos', subtitle: 'Jogos Interativos', duration: 15, emoji: '🎮', color: 'green' },
  { step: 4, title: 'Desafio Real', subtitle: 'Falar com os Pais', duration: 15, emoji: '🏆', color: 'rose' },
] as const;