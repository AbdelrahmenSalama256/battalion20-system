-- =====================================================
-- 007: LEAVES & PERSONNEL OFFICE
-- =====================================================

-- Leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES soldiers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(50) DEFAULT 'regular',
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active',
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  return_confirmed BOOLEAN DEFAULT FALSE,
  return_confirmed_by UUID REFERENCES users(id),
  return_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaves_soldier_id ON leaves(soldier_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_end_date ON leaves(end_date);

-- Soldier leave tracking columns
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS last_leave_end DATE;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS enlistment_date DATE;
