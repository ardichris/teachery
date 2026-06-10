-- Fresh Supabase/Postgres schema for Teachery.
-- Run this in Supabase Dashboard > SQL Editor for a new empty project.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);

CREATE TABLE IF NOT EXISTS credit_balances (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN (
    'generate_questions',
    'regenerate_question',
    'improve_question',
    'generate_explanation',
    'generate_blueprint',
    'generate_question_image'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'waiting',
    'processing',
    'completed',
    'failed',
    'partially_failed'
  )),
  input_snapshot_json TEXT NOT NULL,
  estimated_credit INTEGER NOT NULL DEFAULT 0 CHECK (estimated_credit >= 0),
  actual_credit INTEGER NOT NULL DEFAULT 0 CHECK (actual_credit >= 0),
  credit_status TEXT NOT NULL CHECK (credit_status IN (
    'not_charged',
    'reserved',
    'charged',
    'partially_charged',
    'refunded'
  )),
  error_message TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_owner_user_id ON jobs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_owner_status ON jobs(owner_user_id, status);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  source_job_id TEXT NULL REFERENCES jobs(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  creation_mode TEXT NOT NULL CHECK (creation_mode IN ('manual', 'ai')),
  material_text TEXT NULL,
  material_source_filename TEXT NULL,
  material_extracted_at TEXT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'draft',
    'published'
  )),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_owner_user_id ON assessments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_source_job_id ON assessments(source_job_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_updated_at ON assessments(updated_at);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ai_charge', 'ai_refund', 'admin_add', 'admin_subtract')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  job_id TEXT NULL REFERENCES jobs(id),
  assessment_id TEXT NULL REFERENCES assessments(id),
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'guru', 'system')),
  reason TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_job_id ON credit_transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_assessment_id ON credit_transactions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at);

CREATE TABLE IF NOT EXISTS question_categories (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NULL,
  grade TEXT NULL,
  parent_category_id TEXT NULL REFERENCES question_categories(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_question_categories_owner_user_id
ON question_categories(owner_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_question_categories_owner_name
ON question_categories(owner_user_id, name);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NULL REFERENCES question_categories(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'essay')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')),
  prompt TEXT NOT NULL,
  image_url TEXT NULL,
  correct_answer TEXT NULL,
  explanation TEXT NULL,
  blueprint_item TEXT NULL,
  tags_json TEXT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'import')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_owner_user_id ON questions(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_grade ON questions(subject, grade);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_updated_at ON questions(updated_at);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  number INTEGER NOT NULL CHECK (number > 0),
  points INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment_id
ON assessment_questions(assessment_id);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_question_id
ON assessment_questions(question_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_questions_assessment_number
ON assessment_questions(assessment_id, number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_questions_assessment_question
ON assessment_questions(assessment_id, question_id);

CREATE TABLE IF NOT EXISTS answer_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answer_options_question_id ON answer_options(question_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_answer_options_question_label ON answer_options(question_id, label);
CREATE UNIQUE INDEX IF NOT EXISTS idx_answer_options_one_correct
ON answer_options(question_id)
WHERE is_correct = 1;

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id),
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  output_types_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  file_path TEXT NULL,
  error_message TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exports_assessment_id ON exports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_exports_owner_user_id ON exports(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);
CREATE INDEX IF NOT EXISTS idx_exports_created_at ON exports(created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'guru', 'system')),
  target_user_id TEXT NULL REFERENCES users(id),
  related_job_id TEXT NULL REFERENCES jobs(id),
  related_transaction_id TEXT NULL REFERENCES credit_transactions(id),
  related_assessment_id TEXT NULL REFERENCES assessments(id),
  metadata_json TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_related_job_id ON audit_logs(related_job_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_related_transaction_id ON audit_logs(related_transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS job_credit_costs (
  job_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('fixed', 'per_question')),
  unit_credit INTEGER NOT NULL DEFAULT 0 CHECK (unit_credit >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_publications (
  assessment_id TEXT PRIMARY KEY REFERENCES assessments(id) ON DELETE CASCADE,
  public_slug TEXT NOT NULL UNIQUE,
  public_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_submissions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  student_identifier TEXT,
  score INTEGER,
  total_questions INTEGER NOT NULL,
  scored_questions INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessment_submissions_assessment_id
ON assessment_submissions(assessment_id);

INSERT INTO job_credit_costs (
  job_type, display_name, calculation_type, unit_credit, is_active, created_at, updated_at
) VALUES
  ('generate_questions', 'Generate Soal AI', 'per_question', 1, 1, NOW()::text, NOW()::text),
  ('generate_explanation', 'Generate Pembahasan AI', 'fixed', 1, 1, NOW()::text, NOW()::text),
  ('generate_question_image', 'Generate Gambar Soal AI', 'fixed', 5, 1, NOW()::text, NOW()::text)
ON CONFLICT (job_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  calculation_type = EXCLUDED.calculation_type,
  unit_credit = EXCLUDED.unit_credit,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- Optional first admin for a fresh database.
-- Login: admin@teachery.local / admin12345
-- Change this password immediately after first login.
INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
VALUES (
  'usr_seed_admin',
  'Admin Teachery',
  'admin@teachery.local',
  '$2b$10$BxKpxLugm6jTPmJJcWdq5u5s7SH8WV5jNW3IT64L3N01FsBa.saYC',
  'admin',
  'active',
  NOW()::text,
  NOW()::text
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO credit_balances (user_id, balance, updated_at)
VALUES ('usr_seed_admin', 0, NOW()::text)
ON CONFLICT (user_id) DO NOTHING;
