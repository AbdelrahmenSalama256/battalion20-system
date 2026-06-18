-- =====================================================
-- 005: EXAMS, ANNOUNCEMENTS, DISTINCTION CONFIRMATIONS
-- =====================================================

-- =====================================================
-- 1. EXAMS (Commander-defined exam templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  section_key VARCHAR(50) NOT NULL,
  specialty_id UUID REFERENCES specialties(id),
  focus_points TEXT[] DEFAULT '{}',
  notes TEXT,
  max_score NUMERIC(5,2) DEFAULT 100,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link evaluations to exams
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id);

-- =====================================================
-- 2. ANNOUNCEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. DISTINCTION CONFIRMATIONS (multi-user agreement)
-- =====================================================
CREATE TABLE IF NOT EXISTS distinction_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distinction_id UUID REFERENCES distinctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (distinction_id, user_id)
);

ALTER TABLE distinctions ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE distinctions ADD COLUMN IF NOT EXISTS confirmation_count INT DEFAULT 0;

-- =====================================================
-- 4. SOLDIER SPECIALTY (one per soldier)
-- =====================================================
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES specialties(id);

-- =====================================================
-- 5. ENHANCE NOTIFICATIONS (bidirectional)
-- =====================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role VARCHAR(50);
