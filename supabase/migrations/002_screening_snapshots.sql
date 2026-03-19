-- ============================================
-- Screening snapshots for snapshot-first responses
-- ============================================

CREATE TABLE IF NOT EXISTS screening_snapshots (
  snapshot_key TEXT PRIMARY KEY,
  payload_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  source_updated_at TIMESTAMPTZ NOT NULL,
  fresh_until TIMESTAMPTZ NOT NULL,
  stale_until TIMESTAMPTZ NOT NULL,
  partial_failure BOOLEAN NOT NULL DEFAULT FALSE,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screening_snapshots_stale_until
  ON screening_snapshots (stale_until DESC);
