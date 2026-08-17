-- PostgreSQL schema (BIGINT internal IDs + UUIDv4 public IDs)
-- Assumes PostgreSQL 16+ (built-in gen_random_uuid()).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type') THEN
    CREATE TYPE user_type AS ENUM ('admin', 'patient', 'clinician');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sex_type') THEN
    CREATE TYPE sex_type AS ENUM ('male', 'female', 'other', 'unknown');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_invitation_role_type') THEN
    CREATE TYPE team_invitation_role_type AS ENUM ('clinician_member', 'clinician_owner', 'patient');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_clinician_role_type') THEN
    CREATE TYPE team_clinician_role_type AS ENUM ('clinician_member', 'clinician_owner');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0  CHECK (failed_login_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  role user_type NOT NULL
);

CREATE TABLE IF NOT EXISTS user_security_questions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question)
);

CREATE TABLE IF NOT EXISTS login_codes (
  email TEXT NOT NULL,
  code VARCHAR(6) NOT NULL CHECK (code ~ '^[0-9]+$'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, code)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT PRIMARY KEY,
  csfr_code TEXT NOT NULL,
  is_public_client BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  public_client_hard_expiry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_device_ids (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_details TEXT NOT NULL,
  institutions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinicians (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  first_names TEXT NOT NULL,
  second_names TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  first_names TEXT NOT NULL,
  second_names TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  sex sex_type NOT NULL DEFAULT 'unknown',
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinician_team (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinician_id BIGINT NOT NULL REFERENCES clinicians(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role team_clinician_role_type NOT NULL,
  UNIQUE (clinician_id, team_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient_team (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE (patient_id, team_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_invitations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  clinician_id BIGINT REFERENCES clinicians(id) ON DELETE CASCADE,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  role team_invitation_role_type NOT NULL,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Za-z0-9]+$'),
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE:
-- - Every PRIMARY KEY column is automatically indexed.
-- - Every UNIQUE constraint (including all p_id columns) is automatically indexed.
-- - We only add complementary reverse-order indexes needed for team-driven lookups.
CREATE INDEX IF NOT EXISTS idx_clinician_team_team_clinician
  ON clinician_team(team_id, clinician_id);
CREATE INDEX IF NOT EXISTS idx_patient_team_team_patient
  ON patient_team(team_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
  ON user_sessions(expires_at);
