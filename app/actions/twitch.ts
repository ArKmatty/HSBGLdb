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
  console.log(`[Twitch] getTwitchLiveStatus called for: ${usernames.join(', ')}, token present: ${!!token}, CLIENT_ID present: ${!!CLIENT_ID}`);

  if (!token || !CLIENT_ID) {
    console.log(`[Twitch] Missing auth, returning empty`);
    return {};
  }

  try {
    const query = usernames.map(u => `user_login=${u}`).join('&');
    const url = `https://api.twitch.tv/helix/streams?${query}`;
    console.log(`[Twitch] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 60 }
    });

    console.log(`[Twitch] Response status: ${response.status}`);
    const data = await response.json() as TwitchStreamsResponse;
    console.log(`[Twitch] Response data:`, JSON.stringify(data).slice(0, 500));

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
        console.log(`[Twitch] getAllSocials returned ${socials?.length || 0} records`);
        console.log(`[Twitch] Leaderboard accountIds:`, accountIds.slice(0, 10).join(', '));

        if (socials.length > 0) {
            const relevantSocials = socials.filter(s =>
                accountIds.some(id => id.toLowerCase() === s.accountid.toLowerCase())
            );

            console.log(`[Twitch] Found ${relevantSocials.length} relevant socials for leaderboard`);
            if (relevantSocials.length > 0) {
              console.log(`[Twitch] Relevant:`, JSON.stringify(relevantSocials.map(s => ({ accountid: s.accountid, twitch: s.twitchusername }))));
            } else {
              console.log(`[Twitch] No matches. Socials accountIds:`, socials.map(s => s.accountid).join(', '));
            }

            if (relevantSocials.length === 0) return {};

            const twitchUsernames = relevantSocials.map(s => s.twitchusername);
            const liveMap = await getTwitchLiveStatus(twitchUsernames);
            console.log(`[Twitch] Live map keys:`, Object.keys(liveMap).join(', ') || '(none)');

            const results: Record<string, { isLive: boolean; twitchUsername: string; title?: string; viewerCount?: number }> = {};
            relevantSocials.forEach(s => {
                const key = s.accountid.toLowerCase();
                const status = liveMap[s.twitchusername.toLowerCase()];
                results[key] = {
                    twitchUsername: s.twitchusername,
                    ...status,
                    isLive: !!status,
                };
                console.log(`[Twitch] Result for ${key}: isLive=${!!status}`);
            });
            return results;
        }
    } catch (e) {
        console.error("Twitch server action error for leaderboard:", e);
    }
    return {};
}
