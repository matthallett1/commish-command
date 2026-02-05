'use client';

import { useState, useEffect } from 'react';
import { getLeagueHistory } from '@/lib/api';

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  championship: { label: 'Championship Game', emoji: '🏆', color: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800' },
  nail_biter: { label: 'Nail-Biter', emoji: '😰', color: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800' },
  blowout: { label: 'Blowout', emoji: '💀', color: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800' },
  high_score: { label: 'Scoring Explosion', emoji: '🔥', color: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800' },
  matchup: { label: 'Notable Matchup', emoji: '⚡', color: 'from-gray-50 to-gray-100 dark:from-slate-700/50 dark:to-slate-600/50 border-gray-200 dark:border-slate-600' },
};

export default function LeagueHistoryWidget() {
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeagueHistory()
      .then(data => setMoments(data.moments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || moments.length === 0) return null;

  return (
    <div className="card">
      <h2 className="card-header flex items-center gap-2">
        <span className="text-xl">📅</span>
        This Week in League History
      </h2>
      <div className="grid md:grid-cols-3 gap-4">
        {moments.map((moment, idx) => {
          const config = CATEGORY_CONFIG[moment.category] || CATEGORY_CONFIG.matchup;
          return (
            <div
              key={idx}
              className={`p-4 rounded-lg bg-gradient-to-br border ${config.color}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{config.emoji}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {config.label} &bull; {moment.season} Week {moment.week}
                </span>
              </div>
              <div className="text-center my-3">
                <div className="flex items-center justify-center gap-3">
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{moment.team1_manager}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{moment.team1_score}</p>
                  </div>
                  <span className="text-gray-400 text-sm font-medium">vs</span>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{moment.team2_manager}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{moment.team2_score}</p>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                {moment.winner} wins by {moment.margin}
                {moment.is_playoff ? ' (Playoffs)' : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
