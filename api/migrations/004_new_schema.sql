-- =====================================================
-- BATTALION 20 - NEW CLEAN SCHEMA
-- =====================================================

-- =====================================================
-- 1. SECTIONS (Fixed 5 sections)
-- =====================================================
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  sort_order INT DEFAULT 0
);

-- Seed the 5 fixed sections
INSERT INTO sections (key, name, icon, sort_order) VALUES
  ('specialties', 'التخصصات', '🎯', 1),
  ('general', 'العام', '📋', 2),
  ('fitness', 'اللياقة', '💪', 3),
  ('shooting', 'الرماية', '🔫', 4),
  ('discipline', 'الانضباط', '🎖️', 5)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2. SPECIALTIES (Enhanced - under specialties section)
-- =====================================================
ALTER TABLE specialties ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE specialties ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Make weapon_id optional for new specialty system
ALTER TABLE specialties ALTER COLUMN weapon_id DROP NOT NULL;

-- Seed base specialties if they don't exist
INSERT INTO specialties (name, weapon_id, description) VALUES
  ('إشارة', NULL, 'تخصص الإشارة والاتصالات'),
  ('موجهين', NULL, 'تخصص التوجيه والإرشاد'),
  ('استطلاع', NULL, 'تخصص الاستطلاع وجمع المعلومات')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. SOLDIERS (Enhanced with status)
-- =====================================================
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS status_notes TEXT;

-- =====================================================
-- 4. SOLDIER_SPECIALTIES (Junction table)
-- =====================================================
CREATE TABLE IF NOT EXISTS soldier_specialties (
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (soldier_id, specialty_id)
);

-- =====================================================
-- 5. EVALUATIONS (Unified for all sections)
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL,
  specialty_id UUID REFERENCES specialties(id),
  score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) DEFAULT 100,
  notes TEXT,
  evaluated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_soldier ON evaluations(soldier_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_section ON evaluations(section_key);
CREATE INDEX IF NOT EXISTS idx_evaluations_specialty ON evaluations(specialty_id);

-- =====================================================
-- 6. DISTINCTIONS (Free text with colors)
-- =====================================================
CREATE TABLE IF NOT EXISTS distinctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL,
  specialty_id UUID REFERENCES specialties(id),
  reason TEXT NOT NULL,
  color VARCHAR(20) DEFAULT 'gold',
  given_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distinctions_soldier ON distinctions(soldier_id);

-- =====================================================
-- 7. PUNISHMENTS (Free text with colors)
-- =====================================================
CREATE TABLE IF NOT EXISTS punishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  section_key VARCHAR(50) NOT NULL,
  specialty_id UUID REFERENCES specialties(id),
  reason TEXT NOT NULL,
  color VARCHAR(20) DEFAULT 'red',
  given_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_punishments_soldier ON punishments(soldier_id);

-- =====================================================
-- 8. USERS (Enhanced permissions)
-- =====================================================
-- permissions structure:
-- {
--   "sections": ["specialties", "general", "fitness", "shooting", "discipline"],
--   "canEvaluate": true,
--   "canDistinguish": true,
--   "canPunish": true,
--   "pages": ["dashboard", "soldiers", "notifications", "profile"]
-- }
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- =====================================================
-- 9. MIGRATE OLD DATA (if tables exist)
-- =====================================================

-- Migrate old results to new evaluations format
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'results') THEN
    -- Migrate fitness scores to fitness evaluations
    INSERT INTO evaluations (soldier_id, section_key, score, notes, evaluated_by, created_at)
    SELECT soldier_id, 'fitness', fitness_score, notes, entered_by, created_at
    FROM results
    WHERE fitness_score IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Migrate specialty scores to specialty evaluations
    INSERT INTO evaluations (soldier_id, section_key, score, notes, evaluated_by, created_at)
    SELECT soldier_id, 'general', specialty_score, notes, entered_by, created_at
    FROM results
    WHERE specialty_score IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Migrate discipline scores to discipline evaluations
    INSERT INTO evaluations (soldier_id, section_key, score, notes, evaluated_by, created_at)
    SELECT soldier_id, 'discipline', discipline_score, notes, entered_by, created_at
    FROM results
    WHERE discipline_score IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Migrate old distinction_badge data to distinctions table
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'soldiers') THEN
    INSERT INTO distinctions (soldier_id, section_key, reason, color, given_by, created_at)
    SELECT id, 'general',
      CASE distinction_badge
        WHEN 'gold' THEN 'تمييز ذهبي'
        WHEN 'silver' THEN 'تمييز فضي'
        WHEN 'bronze' THEN 'تمييز برونزي'
        ELSE 'تمييز'
      END,
      distinction_badge,
      distinguished_by,
      distinguished_at
    FROM soldiers
    WHERE distinction_badge IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- 10. CLEANUP OLD TABLES (keep for reference, don't drop)
-- =====================================================
-- These tables are kept but no longer used by the new system:
-- results, exams, exam_items, fitness_exercises, fitness_results,
-- result_item_scores, announcements

-- Rename old tables with _deprecated suffix for clarity
ALTER TABLE IF EXISTS results RENAME TO results_deprecated;
ALTER TABLE IF EXISTS exams RENAME TO exams_deprecated;
ALTER TABLE IF EXISTS exam_items RENAME TO exam_items_deprecated;
ALTER TABLE IF EXISTS fitness_exercises RENAME TO fitness_exercises_deprecated;
ALTER TABLE IF EXISTS fitness_results RENAME TO fitness_results_deprecated;
ALTER TABLE IF EXISTS result_item_scores RENAME TO result_item_scores_deprecated;
ALTER TABLE IF EXISTS announcements RENAME TO announcements_deprecated;
