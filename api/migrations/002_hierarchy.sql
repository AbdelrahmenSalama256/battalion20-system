-- Add specific_specialty to soldiers
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS specific_specialty VARCHAR(200);

-- Add distinction columns to soldiers
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinction_badge VARCHAR(10) CHECK (distinction_badge IN ('gold','silver','bronze'));
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinction_citation TEXT;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinguished_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS distinguished_at TIMESTAMPTZ;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS promoted BOOLEAN DEFAULT FALSE;

-- Add three separate score columns to results
ALTER TABLE results ADD COLUMN IF NOT EXISTS fitness_score NUMERIC(6,2);
ALTER TABLE results ADD COLUMN IF NOT EXISTS specialty_score NUMERIC(6,2);
ALTER TABLE results ADD COLUMN IF NOT EXISTS discipline_score NUMERIC(6,2);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL DEFAULT 'evaluation',
  message TEXT,
  evaluator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  evaluator_name VARCHAR(120),
  evaluator_rank VARCHAR(80),
  evaluator_weapon VARCHAR(100),
  evaluated_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  evaluated_name VARCHAR(150),
  evaluated_rank VARCHAR(80),
  evaluated_specialty VARCHAR(100),
  fitness_score NUMERIC(6,2),
  specialty_score NUMERIC(6,2),
  discipline_score NUMERIC(6,2),
  total_score NUMERIC(6,2),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add rank_id to users for hierarchy
ALTER TABLE users ADD COLUMN IF NOT EXISTS rank_id UUID REFERENCES ranks(id) ON DELETE SET NULL;
