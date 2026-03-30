"use server";
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

/**
 * Ottiene un App Access Token da Twitch.
 * Viene cachato per 24 ore (o finché non scade).
 */
const getTwitchAccessToken = unstable_cache(
  async () => {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("Twitch credentials missing in .env.local");
      return null;
    }

    try {
      const response = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
        { method: 'POST', cache: 'no-store' }
      );
      const data = await response.json();
      return data.access_token;
    } catch (e) {
      console.error("Error fetching Twitch Token:", e);
      return null;
    }
  },
  ['twitch-access-token'],
  { revalidate: 86400 } // 24 ore
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
    const liveMap: Record<string, any> = {};
    
    data.data?.forEach((stream: any) => {
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
        const { data: socials } = await supabase
            .from('player_socials')
            .select('twitchusername')
            .ilike('accountid', accountId)
            .single();

        if (socials?.twitchusername) {
            const liveMap = await getTwitchLiveStatus([socials.twitchusername]);
            const status = liveMap[socials.twitchusername.toLowerCase()];
            return {
                username: socials.twitchusername,
                isLive: !!status,
                ...status
            };
        }
    } catch (e) {
        console.error("Twitch server action error for player:", e);
    }
    return null;
}

/**
 * [SERVER SIDE] Recupera massivamente gli stati Twitch per la classifica.
 */
export async function getTwitchStatusesForLeaderboard(accountIds: string[]) {
    try {
        // Recuperiamo TUTTE le mappature (la tabella è piccola, è più veloce e case-resilient)
        const { data: socials } = await supabase
            .from('player_socials')
            .select('accountid, twitchusername');

        if (socials && socials.length > 0) {
            // Filtriamo solo quelli presenti nella pagina attuale
            const relevantSocials = socials.filter(s => 
                accountIds.some(id => id.toLowerCase() === s.accountid.toLowerCase())
            );

            if (relevantSocials.length === 0) return {};

            const twitchUsernames = relevantSocials.map(s => s.twitchusername);
            const liveMap = await getTwitchLiveStatus(twitchUsernames);
            
            const results: Record<string, any> = {};
            relevantSocials.forEach(s => {
                const status = liveMap[s.twitchusername.toLowerCase()];
                // Usiamo sempre il minuscolo per la chiave di mapping
                results[s.accountid.toLowerCase()] = {
                    isLive: !!status,
                    twitchUsername: s.twitchusername,
                    ...status
                };
            });
            return results;
        }
    } catch (e) {
        console.error("Twitch server action error for leaderboard:", e);
    }
    return {};
}
