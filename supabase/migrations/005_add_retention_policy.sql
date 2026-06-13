-- Migration: Add data retention policy for leaderboard_history
-- Created: 2026-06-13
-- Description: Keeps only the last 30 days of leaderboard history to prevent
--              database bloat and Supabase free tier limit exhaustion.
--              Without this, ~96,000 rows/day accumulate indefinitely.

-- Delete rows older than 30 days
DELETE FROM leaderboard_history
WHERE created_at < NOW() - INTERVAL '30 days';

-- Add a comment documenting the retention policy
COMMENT ON TABLE leaderboard_history IS 'Retention: 30 days. Rows older than 30 days are automatically deleted.';
