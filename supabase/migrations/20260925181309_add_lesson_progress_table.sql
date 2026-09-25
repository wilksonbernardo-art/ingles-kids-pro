/*
# Add lesson_progress table for Daily Guided Lessons

1. New Tables
- `lesson_progress`: tracks each child's progress through the 5-day lesson plan per module.
  - `id` (uuid, primary key)
  - `profile_id` (uuid, references profiles)
  - `module_id` (uuid, references modules)
  - `lesson_day` (int 1-5, which day of the week the lesson belongs to)
  - `current_step` (int 1-4, which step within the lesson they're on)
  - `status` (text: 'in_progress' | 'completed')
  - `completed_at` (timestamptz, when the lesson was finished)
  - `created_at` (timestamptz)

2. Security
- RLS enabled, anon+authenticated CRUD (no sign-in screen).

3. Purpose
- Enforces daily lock: only 1 guided lesson can be completed per day per profile.
- Tracks which step the child is currently on within a lesson.
- Records completion timestamp for daily-lock enforcement.
*/

CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_day int NOT NULL CHECK (lesson_day >= 1 AND lesson_day <= 5),
  current_step int NOT NULL DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 4),
  status text NOT NULL DEFAULT 'in_progress',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (profile_id, module_id, lesson_day)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_select_lesson_progress" ON lesson_progress FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_insert_lesson_progress" ON lesson_progress FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_update_lesson_progress" ON lesson_progress FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_lesson_progress" ON lesson_progress;
CREATE POLICY "anon_delete_lesson_progress" ON lesson_progress FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_profile_module ON lesson_progress(profile_id, module_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON lesson_progress(profile_id, completed_at);
