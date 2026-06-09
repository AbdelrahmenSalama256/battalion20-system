CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE rank_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  color VARCHAR(7) DEFAULT '#c9a84c',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES rank_types(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  sort_order SMALLINT DEFAULT 0
);

CREATE TABLE weapons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#2d6a4f',
  icon VARCHAR(10) DEFAULT '⚔️',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_id UUID NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  username VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) CHECK (role IN ('commander','officer','nco')) DEFAULT 'officer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE soldiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  military_id VARCHAR(60),
  rank_id UUID REFERENCES ranks(id) ON DELETE SET NULL,
  weapon_id UUID REFERENCES weapons(id) ON DELETE SET NULL,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('general','weapon','specialty')) DEFAULT 'general',
  weapon_id UUID REFERENCES weapons(id) ON DELETE SET NULL,
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  max_score NUMERIC(7,2) NOT NULL DEFAULT 10,
  sort_order SMALLINT DEFAULT 0
);

CREATE TABLE fitness_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(30),
  higher_is_better BOOLEAN DEFAULT TRUE,
  pass_mark NUMERIC(8,2) DEFAULT 60
);

CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  soldier_id UUID NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  result_type VARCHAR(20) DEFAULT 'exam',
  total_score NUMERIC(6,2) NOT NULL,
  notes TEXT,
  exam_date DATE DEFAULT CURRENT_DATE,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE result_item_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  item_id UUID,
  score_value NUMERIC(8,2) DEFAULT 0
);

CREATE TABLE fitness_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES fitness_exercises(id) ON DELETE CASCADE,
  score_value NUMERIC(8,2) NOT NULL,
  score_percent NUMERIC(6,2) NOT NULL,
  result_id UUID REFERENCES results(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  body TEXT,
  priority VARCHAR(20) CHECK (priority IN ('urgent','info','normal')) DEFAULT 'normal',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: admin (password = 1234)
INSERT INTO users (name, username, password_hash, role)
VALUES ('القائد','commander',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lFEC',
  'commander');

-- Seed: rank types
INSERT INTO rank_types (name,color) VALUES
  ('عسكري','#5a6845'),('صف ضابط','#8a6d1f'),('ضابط','#c9a84c');

-- Seed: ranks
INSERT INTO ranks (type_id, name, sort_order)
SELECT id, r.name, r.ord FROM rank_types rt
CROSS JOIN (VALUES
  ('عسكري','جندي',1),('عسكري','جندي أول',2),('عسكري','عريف',3),
  ('صف ضابط','وكيل رقيب',4),('صف ضابط','رقيب',5),('صف ضابط','رقيب أول',6),
  ('صف ضابط','مساعد',7),('صف ضابط','مساعد أول',8),
  ('ضابط','ملازم',9),('ضابط','ملازم أول',10),('ضابط','نقيب',11),
  ('ضابط','رائد',12),('ضابط','مقدم',13),('ضابط','عقيد',14)
) AS r(type_name, name, ord)
WHERE rt.name = r.type_name;
