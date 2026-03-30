export type Locale = 'en' | 'it';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'it'];

export function detectLocale(headers?: Headers): Locale {
  if (headers) {
    const acceptLang = headers.get('accept-language') || '';
    const preferred = acceptLang.split(',')[0].toLowerCase();
    if (preferred.startsWith('it')) return 'it';
    if (preferred.startsWith('en')) return 'en';
  }
  return 'en';
}

export function detectLocaleClient(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en';
  if (lang.toLowerCase().startsWith('it')) return 'it';
  return 'en';
}

export const translations = {
  en: {
    subtitle: 'Top 100 per region · live updates',
    previous: '← Previous',
    next: 'Next →',
    page: 'Page',
    noPlayers: 'No players found.',
    searchPlaceholder: 'Search on page...',
    players: 'players',
    live: 'Live',
    rank: 'Rank',
    player: 'Player',
    mmr: 'MMR',
    topMovers: 'Top Movers · 24h',
    recent: 'Recent',
    remove: 'Remove',
    backToLeaderboard: 'Back to leaderboard',
    liveTwitchNow: 'Live on Twitch Now!',
    viewers: 'Viewers',
    watchStream: 'Watch Stream',
    liveSync: 'Live Sync',
    bgStats: 'Battlegrounds stats',
    newPeak: 'New Peak reached!',
    currentScore: 'Current Score',
    historicalPeak: 'Historical Peak',
    trend7d: '7 Day Trend',
    matchesAnalyzed: 'Matches Analyzed',
    searchingHistory: 'Searching historical data...',
    incompleteData: 'Incomplete Data Stream',
    incompleteDataDesc: 'We are configuring the database bridge. The chart will appear as soon as we have enough samples.',
    rating: 'Rating',
    databaseError: 'Database error',
    liveDataUnavailable: 'Live data unavailable',
  },
  it: {
    subtitle: 'Top 100 per regione · aggiornamento live',
    previous: '← Precedente',
    next: 'Successiva →',
    page: 'Pagina',
    noPlayers: 'Nessun giocatore trovato.',
    searchPlaceholder: 'Cerca nella pagina...',
    players: 'giocatori',
    live: 'Live',
    rank: 'Rank',
    player: 'Giocatore',
    mmr: 'MMR',
    topMovers: 'Top Movers · 24h',
    recent: 'Recenti',
    remove: 'Rimuovi',
    backToLeaderboard: 'Torna alla classifica',
    liveTwitchNow: 'Live su Twitch Ora!',
    viewers: 'Spettatori',
    watchStream: 'Guarda lo Stream',
    liveSync: 'Live Sync',
    bgStats: 'Battlegrounds stats',
    newPeak: 'New Peak raggiunto!',
    currentScore: 'Punteggio Attuale',
    historicalPeak: 'Picco Storico',
    trend7d: 'Trend 7 Giorni',
    matchesAnalyzed: 'Match Analizzati',
    searchingHistory: 'Ricerca dati storici...',
    incompleteData: 'Flusso Dati Incompleto',
    incompleteDataDesc: 'Stiamo configurando il bridge con il database. Il grafico apparirà non appena avremo abbastanza campioni.',
    rating: 'Rating',
    databaseError: 'Errore database',
    liveDataUnavailable: 'Dati live non disponibili',
  },
};

export type Translations = typeof translations['en'];
