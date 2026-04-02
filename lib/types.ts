/**
 * Centralized TypeScript interfaces for external API responses
 */

/**
 * Twitch API Types
 * @see https://dev.twitch.tv/docs/api
 */

export interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  tags: string[];
}

export interface TwitchStreamsResponse {
  data: TwitchStream[];
  pagination: {
    cursor: string;
  };
}

export interface TwitchLiveStatus {
  isLive: boolean;
  title: string;
  viewerCount: number;
  startedAt: string;
  thumbnailUrl: string;
}

/**
 * Blizzard Hearthstone Battlegrounds API Types
 * @see https://hearthstone.blizzard.com/en-us/api/community/leaderboardsData
 */

export interface BlizzardLeaderboardRow {
  rank: number;
  accountid: string;
  rating: number;
  lastRating?: number;
}

export interface BlizzardLeaderboardData {
  leaderboard?: {
    rows?: BlizzardLeaderboardRow[];
  };
}

export interface BlizzardPlayerLive extends BlizzardLeaderboardRow {
  region: string;
}

/**
 * Blizzard CN API Types
 * @see https://webapi.blizzard.cn/hs-rank-api-server/api
 */

export interface CnLeaderboardItem {
  position: number;
  battle_tag: string;
  score: number;
}

export interface CnLeaderboardResponse {
  code: number;
  message: string;
  data: {
    list: CnLeaderboardItem[];
    total: number;
  };
}

/**
 * Supabase Database Types
 */

export interface LeaderboardHistoryRecord {
  accountId: string;
  rating: number;
  rank: number;
  region: string;
  created_at: string;
}

export interface PlayerSocialRecord {
  accountid: string;
  twitchusername?: string;
  twitter?: string;
  youtube?: string;
  discord?: string;
}

export interface SocialSubmissionRecord {
  id: number;
  accountid: string;
  username: string;
  twitch?: string;
  youtube?: string;
  twitter?: string;
  discord?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
