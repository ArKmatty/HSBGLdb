"use server";
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';
import type { TwitchTokenResponse, TwitchStreamsResponse, TwitchLiveStatus } from '@/lib/types';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

/**
 * Retrieves a Twitch App Access Token for API authentication.
 * Cached for 1 hour to prevent rate limiting and token revocation.
 * @returns Access token string or null if credentials missing
 */
const getTwitchAccessToken = unstable_cache(
  async () => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return null;
    }

    try {
      const response = await fetch(
        'https://id.twitch.tv/oauth2/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'client_credentials',
          }),
          cache: 'no-store',
        }
      );
      if (!response.ok) {
        console.error(`[Twitch] Token request failed: ${response.status}`);
        return null;
      }
      const data = await response.json() as TwitchTokenResponse;
      return data.access_token;
    } catch (e) {
      console.error("[Twitch] Error fetching token:", e);
      return null;
    }
  },
  ['twitch-access-token'],
  { revalidate: 3600 }
);

/**
 * Checks if one or more Twitch usernames are currently streaming.
 * @param usernames - Array of Twitch usernames to check
 * @returns Record of username to live status data
 */
export async function getTwitchLiveStatus(usernames: string[]) {
  if (!usernames || usernames.length === 0) return {};

  const token = await getTwitchAccessToken();
  if (!token || !CLIENT_ID) return {};

  try {
    const params = new URLSearchParams();
    usernames.forEach(u => params.append('user_login', u));
    const response = await fetch(`https://api.twitch.tv/helix/streams?${params.toString()}`, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      console.error(`[Twitch] Streams request failed: ${response.status}`);
      return {};
    }

    const data = await response.json() as TwitchStreamsResponse;
    const liveMap: Record<string, TwitchLiveStatus> = {};

    data.data?.forEach((stream) => {
        liveMap[stream.user_login.toLowerCase()] = {
            isLive: true,
            title: stream.title,
            viewerCount: stream.viewer_count,
            startedAt: stream.started_at,
             thumbnailUrl: stream.thumbnail_url
        };
    });

    return liveMap;
  } catch (e) {
    console.error("Error fetching Twitch streams:", e);
    return {};
  }
}

/**
 * Retrieves Twitch live status for a single player by their account ID.
 * Looks up the player's Twitch username from the database and checks if they're live.
 * @param accountId - The player's account ID (battle tag)
 * @returns Twitch status object with username and live data, or null if not found
 */
export async function getTwitchStatusForPlayer(accountId: string) {
    try {
        const { data: socials } = await supabaseAdmin
            .from('player_socials')
            .select('twitchusername')
            .ilike('accountid', accountId)
            .single();

        if (socials?.twitchusername) {
            const liveMap = await getTwitchLiveStatus([socials.twitchusername]);
            const status = liveMap[socials.twitchusername.toLowerCase()];
            return {
                username: socials.twitchusername,
                ...status,
                isLive: !!status,
            };
        }
    } catch (e) {
        console.error("Twitch server action error for player:", e);
    }
    return null;
}

/**
 * Retrieves all player social mappings from the database.
 * Cached for 5 minutes as this data changes infrequently.
 * @returns Array of account IDs with their Twitch usernames
 */
const getAllSocials = unstable_cache(
  async () => {
    const { data: socials } = await supabaseAdmin
      .from('player_socials')
      .select('accountid, twitchusername');
    return socials || [];
  },
  ['player-socials'],
  { revalidate: 300 } // 5 minuti — la tabella cambia raramente
);

/**
 * Retrieves Twitch live statuses for multiple players in the leaderboard.
 * Efficiently batches API calls for all players with linked Twitch accounts.
 * @param accountIds - Array of player account IDs to check
 * @returns Record of account IDs to Twitch live status data
 */
export async function getTwitchStatusesForLeaderboard(accountIds: string[]) {
    try {
        const socials = await getAllSocials();

        if (socials.length > 0) {
            const relevantSocials = socials.filter(s =>
                s.twitchusername && accountIds.some(id => id.toLowerCase() === s.accountid.toLowerCase())
            );

            if (relevantSocials.length === 0) return {};

            const twitchUsernames = relevantSocials.map(s => s.twitchusername!);
            const liveMap = await getTwitchLiveStatus(twitchUsernames);

            const results: Record<string, { isLive: boolean; twitchUsername: string; title?: string; viewerCount?: number }> = {};
            relevantSocials.forEach(s => {
                const status = liveMap[s.twitchusername!.toLowerCase()];
                results[s.accountid.toLowerCase()] = {
                    twitchUsername: s.twitchusername!,
                    ...status,
                    isLive: !!status,
                };
            });
            return results;
        }
    } catch (e) {
        console.error("Twitch server action error for leaderboard:", e);
    }
    return {};
}
