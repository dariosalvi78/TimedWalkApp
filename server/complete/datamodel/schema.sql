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

CREATE TABLE IF NOT EXISTS "user" (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type user_type NOT NULL
);

CREATE TABLE IF NOT EXISTS team (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_details TEXT NOT NULL,
  institutions TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinician (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE RESTRICT,
  first_names TEXT NOT NULL,
  second_names TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS patient (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id BIGINT UNIQUE REFERENCES "user"(id) ON DELETE SET NULL,
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
  clinician_id BIGINT NOT NULL REFERENCES clinician(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  UNIQUE (clinician_id, team_id)
);

CREATE TABLE IF NOT EXISTS patient_team (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  UNIQUE (patient_id, team_id)
);

CREATE TABLE IF NOT EXISTS team_invitation (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  p_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  team_id BIGINT NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  role team_invitation_role_type NOT NULL,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Za-z0-9]+$'),
  invitation_messages JSON NOT NULL DEFAULT '{}'::JSON,
  expires_at TIMESTAMPTZ NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE:
-- - Every PRIMARY KEY(id) is automatically indexed.
-- - Every UNIQUE constraint (including all p_id columns) is automatically indexed.
-- - We only add complementary reverse-order indexes needed for team-driven lookups.
CREATE INDEX IF NOT EXISTS idx_clinician_team_team_clinician
  ON clinician_team(team_id, clinician_id);
CREATE INDEX IF NOT EXISTS idx_patient_team_team_patient
  ON patient_team(team_id, patient_id);
