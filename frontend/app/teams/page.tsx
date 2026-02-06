'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getNFLTeams } from '@/lib/api';

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'A': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'F': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// NFL team full names
const NFL_NAMES: Record<string, string> = {
  ARI: 'Arizona Cardinals', ATL: 'Atlanta Falcons', BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills', CAR: 'Carolina Panthers', CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals', CLE: 'Cleveland Browns', DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos', DET: 'Detroit Lions', GB: 'Green Bay Packers',
  HOU: 'Houston Texans', IND: 'Indianapolis Colts', JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs', LAC: 'Los Angeles Chargers', LAR: 'Los Angeles Rams',
  LV: 'Las Vegas Raiders', MIA: 'Miami Dolphins', MIN: 'Minnesota Vikings',
  NE: 'New England Patriots', NO: 'New Orleans Saints', NYG: 'New York Giants',
  NYJ: 'New York Jets', PHI: 'Philadelphia Eagles', PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks', SF: 'San Francisco 49ers', TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans', WAS: 'Washington Commanders',
  // Legacy abbreviations
  OAK: 'Oakland Raiders', SD: 'San Diego Chargers', STL: 'St. Louis Rams',
  JAC: 'Jacksonville Jaguars',
};

type SortField = 'total_picks' | 'avg_grade' | 'total_points' | 'unique_managers';

export default function TeamsPage() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_picks');

  useEffect(() => {
    async function load() {
      try {
        const data = await getNFLTeams();
        setTeams(data.teams || []);
      } catch (err) {
        console.error('Failed to load NFL teams:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const gradeOrder: Record<string, number> = { 'A+': 6, 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };

  const filtered = teams
    .filter((t) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      const name = (NFL_NAMES[t.abbr] || t.abbr).toLowerCase();
      return t.abbr.toLowerCase().includes(q) || name.includes(q);
    })
    .sort((a, b) => {
      if (sortField === 'avg_grade') {
        return (gradeOrder[b.avg_grade] || 0) - (gradeOrder[a.avg_grade] || 0);
      }
      return (b[sortField] || 0) - (a[sortField] || 0);
    });

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          NFL Teams
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Which NFL franchises dominate Top Pot drafts?
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter teams..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value as SortField)}
          className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
        >
          <option value="total_picks">Most Drafted</option>
          <option value="avg_grade">Best Grade</option>
          <option value="total_points">Most Points</option>
          <option value="unique_managers">Most Managers</option>
        </select>
      </div>

      {/* Teams Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No teams found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
          {filtered.map((team) => {
            const fullName = NFL_NAMES[team.abbr] || team.abbr;
            const gradeClass = team.avg_grade ? GRADE_COLORS[team.avg_grade] : null;

            return (
              <Link
                key={team.abbr}
                href={`/teams/${team.abbr}`}
                className="card hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {team.abbr}
                    </span>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{fullName}</p>
                  </div>
                  {gradeClass && (
                    <span className={`px-2 py-0.5 rounded text-sm font-bold ${gradeClass}`}>
                      {team.avg_grade}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="font-bold text-gray-900 dark:text-white">{team.total_picks}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Picks</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="font-bold text-gray-900 dark:text-white">{team.total_points.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Points</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                    <p className="font-bold text-gray-900 dark:text-white">{team.unique_managers}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Mgrs</p>
                  </div>
                </div>

                {team.top_position && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Top drafted position: {team.top_position}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
