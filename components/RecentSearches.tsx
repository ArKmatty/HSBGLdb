"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';

export default function RecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecent(JSON.parse(saved));
    }
  }, []);

  const removeSearch = (name: string) => {
    const updated = recent.filter(n => n !== name);
    setRecent(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  if (recent.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4 text-slate-500">
        <History size={16} />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Ricerche Recenti</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {recent.map((name) => (
          <div key={name} className="group relative flex items-center">
            <Link 
              href={`/player/${name}`}
              className="px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-slate-300 hover:text-blue-400 hover:border-blue-500/30 hover:bg-slate-800 transition-all no-underline"
            >
              {name}
            </Link>
            <button 
              onClick={() => removeSearch(name)}
              className="ml-1 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Rimuovi"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
