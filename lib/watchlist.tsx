"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (playerName: string) => void;
  removeFromWatchlist: (playerName: string) => void;
  isInWatchlist: (playerName: string) => boolean;
  toggleWatchlist: (playerName: string) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

const STORAGE_KEY = "hsbg_watchlist";

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load watchlist:", e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
      } catch (e) {
        console.error("Failed to save watchlist:", e);
      }
    }
  }, [watchlist, isLoaded]);

  const addToWatchlist = (playerName: string) => {
    setWatchlist(prev => {
      if (prev.includes(playerName)) return prev;
      return [...prev, playerName];
    });
  };

  const removeFromWatchlist = (playerName: string) => {
    setWatchlist(prev => prev.filter(name => name !== playerName));
  };

  const isInWatchlist = (playerName: string) => {
    return watchlist.includes(playerName);
  };

  const toggleWatchlist = (playerName: string) => {
    if (isInWatchlist(playerName)) {
      removeFromWatchlist(playerName);
    } else {
      addToWatchlist(playerName);
    }
  };

  return (
    <WatchlistContext.Provider
      value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist, toggleWatchlist }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (context === undefined) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}
