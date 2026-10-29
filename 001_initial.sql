CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  college TEXT NOT NULL DEFAULT '',
  degree TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  graduation_year INTEGER,
  preferred_roles TEXT[] NOT NULL DEFAULT '{}',
  preferred_location TEXT NOT NULL DEFAULT '',
  experience_level TEXT NOT NULL DEFAULT 'Entry-level',
  preferred_industries TEXT[] NOT NULL DEFAULT '{}',
  career_interests TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'docx', 'text')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_analyses (
  id UUID PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  source_label TEXT NOT NULL,
  provider_mode TEXT NOT NULL CHECK (provider_mode IN ('ai', 'demo')),
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, title, company, source_url)
);

CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES resume_analyses(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_tasks (
  id BIGSERIAL PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_description_matches (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES resume_analyses(id) ON DELETE CASCADE,
  match_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_owner_created ON resume_analyses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resumes_owner_created ON resumes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_plan ON learning_tasks(plan_id, status);