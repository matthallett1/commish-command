'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { searchPlayers } from '@/lib/api';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  RB: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WR: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  TE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  K: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DEF: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function PlayersPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchPlayers(q.trim());
      setResults(data.players || []);
      setSearched(true);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Player Search
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Search any player to see their full history in the Top Pot League
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by player name (e.g. Russell Wilson, Seahawks DEF)"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg shadow-sm"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading && <LoadingSpinner />}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No players found matching &ldquo;{query}&rdquo;
          </p>
          <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">
            Try a different name or spelling
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {results.length} player{results.length !== 1 ? 's' : ''} found
          </p>
          <div className="space-y-2">
            {results.map((player, idx) => (
              <Link
                key={`${player.player_name}-${idx}`}
                href={`/players/${encodeURIComponent(player.player_name)}`}
                className="card flex items-center justify-between hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${POSITION_COLORS[player.player_position] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {player.player_position || '?'}
                  </span>
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {player.player_name}
                    </span>
                    {player.player_team && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        {player.player_team}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {player.draft_count > 0 && (
                    <span>Drafted {player.draft_count}x</span>
                  )}
                  {player.transaction_count > 0 && (
                    <span>{player.transaction_count} transactions</span>
                  )}
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !searched && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏈</div>
          <p className="text-gray-500 dark:text-gray-400">
            Start typing a player name to search
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['Russell Wilson', 'Patrick Mahomes', 'Derrick Henry', 'Travis Kelce', 'Seahawks DEF'].map((name) => (
              <button
                key={name}
                onClick={() => setQuery(name)}
                className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
