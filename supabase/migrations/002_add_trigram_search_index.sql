-- Migration: Add trigram index for fuzzy search performance
-- Created: 2026-04-03
-- Description: Enables efficient ILIKE searches with leading wildcards (%query%)
-- Impact: Search performance improves from O(n) full table scan to index-assisted lookup

-- Enable the pg_trgm extension (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram index on accountId for fuzzy search
-- This index supports ILIKE '%query%' patterns which cannot use B-tree indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_accountid_trgm
ON leaderboard_history USING gin (accountId gin_trgm_ops);

-- Document the index purpose
COMMENT ON INDEX idx_leaderboard_history_accountid_trgm IS 'Accelerates fuzzy player name searches using ILIKE with leading wildcards';
