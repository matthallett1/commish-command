'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getSeasons, getStandings } from '@/lib/api';

export default function StandingsPage() {
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [standings, setStandings] = useState<any>(null);

  useEffect(() => {
    async function loadSeasons() {
      try {
        const data = await getSeasons();
        setSeasons(data);
        if (data.length > 0) {
          setSelectedYear(data[0].year);
        }
      } catch (err) {
        console.error('Failed to load seasons:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      loadStandings(selectedYear);
    }
  }, [selectedYear]);

  async function loadStandings(year: number) {
    try {
      const data = await getStandings(year);
      setStandings(data);
    } catch (err) {
      console.error('Failed to load standings:', err);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Season Standings
        </h1>
        
        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Season:</label>
          <select
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
          >
            {seasons.map((season) => (
              <option key={season.year} value={season.year}>
                {season.year} {season.champion_member && `- ${season.champion_member}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Season Info Card */}
      {standings && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {standings.season} Season
            </h2>
            {standings.standings?.[0]?.is_champion && (
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <span className="text-2xl">🏆</span>
                <span className="font-semibold">{standings.standings[0].manager}</span>
              </div>
            )}
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 w-16">Rank</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3 text-center">Record</th>
                  <th className="px-4 py-3 text-right">Points For</th>
                  <th className="px-4 py-3 text-right">Points Against</th>
                  <th className="px-4 py-3 text-center">Playoffs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {standings.standings?.map((team: any, index: number) => (
                  <tr
                    key={index}
                    className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${
                      team.is_champion ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                    }`}
                  >
                    <td className="table-cell font-medium">
                      {team.rank}
                      {team.is_champion && <span className="ml-1">🏆</span>}
                    </td>
                    <td className="table-cell font-medium">{team.team_name}</td>
                    <td className="table-cell">{team.manager}</td>
                    <td className="table-cell text-center font-mono">{team.record}</td>
                    <td className="table-cell text-right font-semibold text-green-600 dark:text-green-400">
                      {team.points_for.toFixed(2)}
                    </td>
                    <td className="table-cell text-right text-red-600 dark:text-red-400">
                      {team.points_against.toFixed(2)}
                    </td>
                    <td className="table-cell text-center">
                      {team.made_playoffs ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Made It
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Season Quick Nav */}
      <div className="card">
        <h3 className="card-header">All Seasons</h3>
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <button
              key={season.year}
              onClick={() => setSelectedYear(season.year)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedYear === season.year
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {season.year}
              {season.champion_member && (
                <span className="ml-1 text-xs opacity-75">({season.champion_member.split(' ')[0]})</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
