"use server";
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

/**
 * Ottiene un App Access Token da Twitch.
 * Cachato per 1 ora per evitare token scaduti o revocati.
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
      const data = await response.json();
      return data.access_token;
    } catch (e) {
      console.error("Error fetching Twitch Token:", e);
      return null;
    }
  },
  ['twitch-access-token'],
  { revalidate: 3600 } // 1 ora
);

/**
 * Controlla se uno o più username sono live.
 */
export async function getTwitchLiveStatus(usernames: string[]) {
  if (!usernames || usernames.length === 0) return {};
  
  const token = await getTwitchAccessToken();
  if (!token || !CLIENT_ID) return {};

  try {
    const query = usernames.map(u => `user_login=${u}`).join('&');
    const response = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`
      },
      next: { revalidate: 60 } // Cache per 60 secondi
    });

    const data = await response.json();
    const liveMap: Record<string, { isLive: boolean; title: string; viewerCount: number; startedAt: string; thumbnailUrl: string }> = {};
    
    data.data?.forEach((stream: { user_login: string; title: string; viewer_count: number; started_at: string; thumbnail_url: string }) => {
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
 * [SERVER SIDE] Recupera i dati Twitch per un singolo giocatore.
 * Combina la query del DB e dell'API di Twitch.
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
 * Recupera tutte le mappature social dalla cache.
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
 * [SERVER SIDE] Recupera massivamente gli stati Twitch per la classifica.
 */
export async function getTwitchStatusesForLeaderboard(accountIds: string[]) {
    try {
        const socials = await getAllSocials();

        if (socials.length > 0) {
            const relevantSocials = socials.filter(s =>
                accountIds.some(id => id.toLowerCase() === s.accountid.toLowerCase())
            );

            if (relevantSocials.length === 0) return {};

            const twitchUsernames = relevantSocials.map(s => s.twitchusername);
            const liveMap = await getTwitchLiveStatus(twitchUsernames);
            
            const results: Record<string, { isLive: boolean; twitchUsername: string; title?: string; viewerCount?: number }> = {};
            relevantSocials.forEach(s => {
                const status = liveMap[s.twitchusername.toLowerCase()];
                results[s.accountid.toLowerCase()] = {
                    twitchUsername: s.twitchusername,
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
