-- Migration: Add database indexes for performance optimization
-- Created: 2024-01-03
-- Description: Adds indexes to frequently queried columns in leaderboard_history and player_socials tables

-- Index on accountId for player lookups
-- Used by: getPlayerHistory, getPlayerLiveStats, searchPlayers
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_accountid 
ON leaderboard_history(accountid);

-- Index on region for regional leaderboard filtering
-- Used by: getLeaderboard, fetchRegionLeaderboard, getTopMovers, getTopFallers
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_region 
ON leaderboard_history(region);

-- Index on created_at for time-based queries
-- Used by: All history queries with date ranges (last 24h, 7d, etc.)
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_created_at 
ON leaderboard_history(created_at);

-- Composite index for common query pattern: region + accountId + created_at
-- Used by: Region-specific player history lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_region_accountid_created_at 
ON leaderboard_history(region, accountid, created_at);

-- Composite index for accountId + created_at (cross-region player history)
-- Used by: getPlayerHistory when no region specified
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_accountid_created_at 
ON leaderboard_history(accountid, created_at);

-- Index on accountid for player_socials lookups
-- Used by: getTwitchStatusForPlayer, getTwitchStatusesForLeaderboard
CREATE INDEX IF NOT EXISTS idx_player_socials_accountid 
ON player_socials(accountid);

-- Index on status for social_submissions filtering
-- Used by: getPendingSubmissions
CREATE INDEX IF NOT EXISTS idx_social_submissions_status 
ON social_submissions(status);

-- Index on created_at for descending order queries
-- Used by: getPatchNotes, recent submission lookups
CREATE INDEX IF NOT EXISTS idx_social_submissions_created_at 
ON social_submissions(created_at DESC);

-- Comment documenting the indexes
COMMENT ON INDEX idx_leaderboard_history_accountid IS 'Accelerates player-specific history queries';
COMMENT ON INDEX idx_leaderboard_history_region IS 'Accelerates regional leaderboard queries';
COMMENT ON INDEX idx_leaderboard_history_created_at IS 'Accelerates time-based filtering';
COMMENT ON INDEX idx_leaderboard_history_region_accountid_created_at IS 'Optimizes region-specific player history queries';
COMMENT ON INDEX idx_leaderboard_history_accountid_created_at IS 'Optimizes cross-region player history queries';
COMMENT ON INDEX idx_player_socials_accountid IS 'Accelerates social link lookups by player';
COMMENT ON INDEX idx_social_submissions_status IS 'Accelerates pending submission queries';
COMMENT ON INDEX idx_social_submissions_created_at IS 'Accelerates recent submission ordering';
