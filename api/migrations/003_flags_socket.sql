-- Add level to ranks for hierarchy (1=lowest, 14=highest)
ALTER TABLE ranks ADD COLUMN IF NOT EXISTS level SMALLINT;
UPDATE ranks SET level = sort_order WHERE level IS NULL;
ALTER TABLE ranks ALTER COLUMN level SET NOT NULL;

-- Add is_important and flag to results
ALTER TABLE results ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE;
ALTER TABLE results ADD COLUMN IF NOT EXISTS flag VARCHAR(20) DEFAULT 'normal';
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_flag_check;
ALTER TABLE results ADD CONSTRAINT results_flag_check CHECK (flag IN ('normal','exceptional','warning'));

-- Per-user notification targeting
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_result_id UUID REFERENCES results(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;

-- Backfill titles
UPDATE notifications SET title = CASE
  WHEN type = 'evaluation' THEN 'تقييم جديد'
  WHEN type = 'important_note' THEN 'ملاحظة مهمة'
  WHEN type = 'flag_updated' THEN 'تحديث علم النتيجة'
  WHEN type = 'system_alert' THEN 'تنبيه النظام'
  WHEN type = 'unauthorized' THEN 'محاولة تقييم غير مصرح بها'
  ELSE 'إشعار'
END WHERE title IS NULL;

-- Index for user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;
