/*
# English Learning App for Maisa & Ethan

1. New Tables
- `profiles`: stores each child's profile (name, stars, avatar emoji)
- `modules`: 12 themed learning modules with order, titles (EN/PT), emoji, color
- `words`: vocabulary words linked to modules (word_en, word_pt, pronunciation, emoji)
- `quest_submissions`: home mission submissions from children (pending/approved/rejected)

2. Security
- RLS enabled on all tables.
- All tables use `TO anon, authenticated` policies (no sign-in screen — kids pick a profile).
- All CRUD operations allowed for anon + authenticated since data is intentionally shared.

3. Seed Data
- Two profiles: Maisa (8 years) and Ethan (6 years)
- 12 modules with themed vocabulary
- 72 words across all modules with Portuguese pronunciation guides
- 4 home mission quest definitions are handled in frontend
*/

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  age int NOT NULL DEFAULT 0,
  avatar text NOT NULL DEFAULT '🧒',
  stars int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- ==================== MODULES ====================
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_order int NOT NULL,
  title_en text NOT NULL,
  title_pt text NOT NULL,
  emoji text NOT NULL DEFAULT '📚',
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_modules" ON modules;
CREATE POLICY "anon_select_modules" ON modules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_modules" ON modules;
CREATE POLICY "anon_insert_modules" ON modules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_modules" ON modules;
CREATE POLICY "anon_update_modules" ON modules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_modules" ON modules;
CREATE POLICY "anon_delete_modules" ON modules FOR DELETE
  TO anon, authenticated USING (true);

-- ==================== WORDS ====================
CREATE TABLE IF NOT EXISTS words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  word_en text NOT NULL,
  word_pt text NOT NULL,
  pronunciation text NOT NULL,
  emoji text NOT NULL DEFAULT '🔤',
  word_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_words" ON words;
CREATE POLICY "anon_select_words" ON words FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_words" ON words;
CREATE POLICY "anon_insert_words" ON words FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_words" ON words;
CREATE POLICY "anon_update_words" ON words FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_words" ON words;
CREATE POLICY "anon_delete_words" ON words FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_words_module_id ON words(module_id);

-- ==================== QUEST SUBMISSIONS ====================
CREATE TABLE IF NOT EXISTS quest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  quest_type text NOT NULL,
  quest_title text NOT NULL,
  quest_emoji text NOT NULL DEFAULT '⭐',
  points int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quest_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_quests" ON quest_submissions;
CREATE POLICY "anon_select_quests" ON quest_submissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_quests" ON quest_submissions;
CREATE POLICY "anon_insert_quests" ON quest_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_quests" ON quest_submissions;
CREATE POLICY "anon_update_quests" ON quest_submissions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_quests" ON quest_submissions;
CREATE POLICY "anon_delete_quests" ON quest_submissions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_quests_status ON quest_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quests_profile_id ON quest_submissions(profile_id);

-- ==================== SEED: PROFILES ====================
INSERT INTO profiles (name, age, avatar, stars) VALUES
  ('Maisa', 8, '👧', 0),
  ('Ethan', 6, '👦', 0)
ON CONFLICT (name) DO NOTHING;

-- ==================== SEED: MODULES ====================
INSERT INTO modules (module_order, title_en, title_pt, emoji, color) VALUES
  (1,  'My Family',       'Minha Família',      '👨‍👩‍👧‍👦', 'rose'),
  (2,  'My Room',         'Meu Quarto',         '🛏️',  'amber'),
  (3,  'Bath Time',       'Hora do Banho',      '🛁',  'cyan'),
  (4,  'Clothes',         'Roupas',             '👕',  'violet'),
  (5,  'Breakfast',       'Café da Manhã',      '🥣',  'orange'),
  (6,  'Toys',            'Brinquedos',         '🧸',  'pink'),
  (7,  'School',         'Escola',             '✏️',  'yellow'),
  (8,  'Recess',          'Recreio',            '⚽',  'green'),
  (9,  'Park',            'Parque',             '🌳',  'emerald'),
  (10, 'Transport',       'Transportes',        '🚌',  'blue'),
  (11, 'Feelings',        'Sentimentos',        '😊',  'fuchsia'),
  (12, 'Essential Dialogue', 'Diálogo Essencial', '💬', 'red')
ON CONFLICT DO NOTHING;

-- ==================== SEED: WORDS ====================
-- Helper: we need module IDs. Use subqueries.
INSERT INTO words (module_id, word_en, word_pt, pronunciation, emoji, word_order)
SELECT m.id, w.word_en, w.word_pt, w.pronunciation, w.emoji, w.word_order
FROM modules m
JOIN (VALUES
  -- 1. My Family
  ('My Family', 'MOTHER', 'mãe', 'mâ-der', '👩', 1),
  ('My Family', 'FATHER', 'pai', 'fá-der', '👨', 2),
  ('My Family', 'SISTER', 'irmã', 'sís-ter', '👧', 3),
  ('My Family', 'BROTHER', 'irmão', 'brá-ther', '👦', 4),
  ('My Family', 'BABY', 'bebê', 'béi-bi', '👶', 5),
  ('My Family', 'GRANDMA', 'avó', 'grând-ma', '👵', 6),
  -- 2. My Room
  ('My Room', 'BED', 'cama', 'béd', '🛏️', 1),
  ('My Room', 'BOOK', 'livro', 'búk', '📖', 2),
  ('My Room', 'LAMP', 'lâmpada', 'lémp', '💡', 3),
  ('My Room', 'CHAIR', 'cadeira', 'tchér', '🪑', 4),
  ('My Room', 'DESK', 'mesa', 'désk', '🪟', 5),
  ('My Room', 'TOY', 'brinquedo', 'tói', '🧸', 6),
  -- 3. Bath Time
  ('Bath Time', 'WATER', 'água', 'uó-ter', '💧', 1),
  ('Bath Time', 'SOAP', 'sabão', 'sôup', '🧼', 2),
  ('Bath Time', 'TOWEL', 'toalha', 'táu-el', '🧖', 3),
  ('Bath Time', 'BATH', 'banho', 'báth', '🛁', 4),
  ('Bath Time', 'TOOTHBRUSH', 'escova de dentes', 'túth-brâsh', '🪥', 5),
  ('Bath Time', 'SHAMPOO', 'shampoo', 'shãmpú', '🧴', 6),
  -- 4. Clothes
  ('Clothes', 'SHIRT', 'camisa', 'shért', '👕', 1),
  ('Clothes', 'PANTS', 'calça', 'pénts', '👖', 2),
  ('Clothes', 'SHOES', 'sapatos', 'shúz', '👟', 3),
  ('Clothes', 'SOCKS', 'meias', 'sóks', '🧦', 4),
  ('Clothes', 'DRESS', 'vestido', 'drés', '👗', 5),
  ('Clothes', 'HAT', 'chapéu', 'hét', '🎩', 6),
  -- 5. Breakfast
  ('Breakfast', 'MILK', 'leite', 'mílk', '🥛', 1),
  ('Breakfast', 'BREAD', 'pão', 'bréd', '🍞', 2),
  ('Breakfast', 'APPLE', 'maçã', 'é-pol', '🍎', 3),
  ('Breakfast', 'JUICE', 'suco', 'djús', '🧃', 4),
  ('Breakfast', 'EGG', 'ovo', 'ég', '🥚', 5),
  ('Breakfast', 'CEREAL', 'cereal', 'sí-ri-ol', '🥣', 6),
  -- 6. Toys
  ('Toys', 'BALL', 'bola', 'ból', '⚽', 1),
  ('Toys', 'DOLL', 'boneca', 'dól', '🪆', 2),
  ('Toys', 'CAR', 'carro', 'kár', '🚗', 3),
  ('Toys', 'BEAR', 'urso', 'bér', '🧸', 4),
  ('Toys', 'BLOCKS', 'blocos', 'blóks', '🧱', 5),
  ('Toys', 'PUZZLE', 'quebra-cabeça', 'pá-zol', '🧩', 6),
  -- 7. School
  ('School', 'PENCIL', 'lápis', 'pén-sol', '✏️', 1),
  ('School', 'ERASER', 'borracha', 'i-réi-zer', '🧹', 2),
  ('School', 'NOTEBOOK', 'caderno', 'nôut-búk', '📓', 3),
  ('School', 'TEACHER', 'professora', 'tít-cher', '👩‍🏫', 4),
  ('School', 'RULER', 'régua', 'rú-ler', '📏', 5),
  ('School', 'SCISSORS', 'tesoura', 'síz-orz', '✂️', 6),
  -- 8. Recess
  ('Recess', 'FRIEND', 'amigo', 'frénd', '🤝', 1),
  ('Recess', 'BALL', 'bola', 'ból', '⚽', 2),
  ('Recess', 'SLIDE', 'escorregador', 'sláid', '🛝', 3),
  ('Recess', 'SWING', 'balanço', 'suíng', '🎠', 4),
  ('Recess', 'RUN', 'correr', 'rãn', '🏃', 5),
  ('Recess', 'PLAY', 'brincar', 'pléi', '🎮', 6),
  -- 9. Park
  ('Park', 'TREE', 'árvore', 'trí', '🌳', 1),
  ('Park', 'FLOWER', 'flor', 'fláu-er', '🌸', 2),
  ('Park', 'BIRD', 'pássaro', 'bérd', '🐦', 3),
  ('Park', 'DOG', 'cachorro', 'dóg', '🐕', 4),
  ('Park', 'GRASS', 'grama', 'grés', '🌱', 5),
  ('Park', 'SUN', 'sol', 'sãn', '☀️', 6),
  -- 10. Transport
  ('Transport', 'CAR', 'carro', 'kár', '🚗', 1),
  ('Transport', 'BUS', 'ônibus', 'bás', '🚌', 2),
  ('Transport', 'TRAIN', 'trem', 'trén', '🚆', 3),
  ('Transport', 'PLANE', 'avião', 'plén', '✈️', 4),
  ('Transport', 'BIKE', 'bicicleta', 'báik', '🚲', 5),
  ('Transport', 'BOAT', 'barco', 'bôut', '⛵', 6),
  -- 11. Feelings
  ('Feelings', 'HAPPY', 'feliz', 'hé-pi', '😄', 1),
  ('Feelings', 'SAD', 'triste', 'séd', '😢', 2),
  ('Feelings', 'ANGRY', 'bravo', 'én-gri', '😠', 3),
  ('Feelings', 'SCARED', 'assustado', 'skéerd', '😨', 4),
  ('Feelings', 'TIRED', 'cansado', 'tái-erd', '😴', 5),
  ('Feelings', 'EXCITED', 'animado', 'ik-sái-tid', '🤩', 6),
  -- 12. Essential Dialogue
  ('Essential Dialogue', 'HELLO', 'olá', 'he-lôu', '👋', 1),
  ('Essential Dialogue', 'GOODBYE', 'tchau', 'gúd-bái', '👋', 2),
  ('Essential Dialogue', 'PLEASE', 'por favor', 'plíz', '🙏', 3),
  ('Essential Dialogue', 'THANK YOU', 'obrigado', 'sénk-iú', '🙏', 4),
  ('Essential Dialogue', 'YES', 'sim', 'iés', '✅', 5),
  ('Essential Dialogue', 'NO', 'não', 'nôu', '❌', 6)
) AS w(title_en, word_en, word_pt, pronunciation, emoji, word_order)
ON m.title_en = w.title_en
ON CONFLICT DO NOTHING;