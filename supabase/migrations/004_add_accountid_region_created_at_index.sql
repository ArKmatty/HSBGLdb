-- Migration: Add composite index for getPlayerHistory queries
-- Created: 2026-04-07
-- Description: Adds a composite index optimized for player history lookups
--              that filter by accountId + optional region + order by created_at DESC

-- Composite index for the exact query pattern used by getPlayerHistory:
--   WHERE accountId = ? AND region = ? ORDER BY created_at DESC LIMIT ?
-- This covers the most common query pattern where region is specified.
-- When region is not specified, the query can still use the leading accountId column.
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_accountid_region_created_at_desc
ON leaderboard_history(accountid, region, created_at DESC);

COMMENT ON INDEX idx_leaderboard_history_accountid_region_created_at_desc
  IS 'Optimizes getPlayerHistory queries with region filter and descending time order';
