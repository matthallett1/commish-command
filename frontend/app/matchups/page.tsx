'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getCloseGames, getBlowouts, getHighestScores, getLowestScores, getSeasons } from '@/lib/api';

export default function MatchupsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'close' | 'blowouts' | 'high' | 'low'>('close');
  const [closeGames, setCloseGames] = useState<any>(null);
  const [blowouts, setBlowouts] = useState<any>(null);
  const [highScores, setHighScores] = useState<any>(null);
  const [lowScores, setLowScores] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [close, blow, high, low] = await Promise.all([
          getCloseGames(30).catch(() => null),
          getBlowouts(30).catch(() => null),
          getHighestScores(30).catch(() => null),
          getLowestScores(30).catch(() => null),
        ]);
        setCloseGames(close);
        setBlowouts(blow);
        setHighScores(high);
        setLowScores(low);
      } catch (err) {
        console.error('Failed to load matchups:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  const tabs = [
    { id: 'close', label: 'Closest Games', icon: '😰' },
    { id: 'blowouts', label: 'Biggest Blowouts', icon: '💥' },
    { id: 'high', label: 'Highest Scores', icon: '🔥' },
    { id: 'low', label: 'Lowest Scores', icon: '💀' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Notable Matchups
      </h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-pink-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State Message */}
      {((activeTab === 'close' && !closeGames?.games?.length) ||
        (activeTab === 'blowouts' && !blowouts?.games?.length) ||
        (activeTab === 'high' && !highScores?.scores?.length) ||
        (activeTab === 'low' && !lowScores?.scores?.length)) && (
        <div className="card bg-gray-50 dark:bg-slate-700/50 text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            Matchup data not yet loaded. Weekly matchups will appear once synced from Yahoo.
          </p>
        </div>
      )}

      {/* Close Games */}
      {activeTab === 'close' && closeGames?.games?.length > 0 && (
        <div className="card">
          <h2 className="card-header">😰 Closest Games in League History</h2>
          <div className="space-y-3">
            {closeGames.games?.map((game: any, index: number) => (
              <div 
                key={index}
                className={`p-4 rounded-lg ${
                  game.is_playoff 
                    ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                    : 'bg-gray-50 dark:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{game.team1_manager}</span>
                      <span className="font-bold text-lg">{game.team1_score.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{game.team1_name}</div>
                  </div>
                  <div className="px-4 text-center">
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {game.point_differential.toFixed(2)}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">margin</div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg">{game.team2_score.toFixed(2)}</span>
                      <span className="font-medium">{game.team2_manager}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{game.team2_name}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{game.season} Week {game.week}</span>
                  {game.is_playoff && (
                    <span className="px-2 py-0.5 bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
                      Playoffs
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blowouts */}
      {activeTab === 'blowouts' && blowouts && (
        <div className="card">
          <h2 className="card-header">💥 Biggest Blowouts in League History</h2>
          <div className="space-y-3">
            {blowouts.games?.map((game: any, index: number) => (
              <div 
                key={index}
                className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400 font-bold text-lg">W</span>
                      <span className="font-medium">{game.winner_manager}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{game.winner_name}</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {game.winner_score.toFixed(2)}
                    </div>
                  </div>
                  <div className="px-6 text-center">
                    <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                      +{game.margin.toFixed(0)}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">margin</div>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-medium">{game.loser_manager}</span>
                      <span className="text-red-600 dark:text-red-400 font-bold text-lg">L</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{game.loser_name}</div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {game.loser_score.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                  {game.season} Week {game.week}
                  {game.is_playoff && ' (Playoffs)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Highest Scores */}
      {activeTab === 'high' && highScores && (
        <div className="card">
          <h2 className="card-header">🔥 Highest Weekly Scores</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Season</th>
                  <th className="px-4 py-3 text-center">Week</th>
                  <th className="px-4 py-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {highScores.scores?.map((score: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="table-cell font-bold">
                      {index + 1}
                      {index === 0 && ' 🥇'}
                      {index === 1 && ' 🥈'}
                      {index === 2 && ' 🥉'}
                    </td>
                    <td className="table-cell font-medium">{score.manager}</td>
                    <td className="table-cell text-sm text-gray-500 dark:text-gray-400">{score.team_name}</td>
                    <td className="table-cell text-center">
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {score.score.toFixed(2)}
                      </span>
                    </td>
                    <td className="table-cell text-center">{score.season}</td>
                    <td className="table-cell text-center">
                      {score.week}
                      {score.is_playoff && <span className="ml-1 text-purple-600 dark:text-purple-400">🏆</span>}
                    </td>
                    <td className="table-cell text-center">
                      {score.won ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">W</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">L 😢</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lowest Scores */}
      {activeTab === 'low' && lowScores && (
        <div className="card">
          <h2 className="card-header">💀 Lowest Weekly Scores (Hall of Shame)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Season</th>
                  <th className="px-4 py-3 text-center">Week</th>
                  <th className="px-4 py-3 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {lowScores.scores?.map((score: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="table-cell font-bold">
                      {index + 1}
                      {index === 0 && ' 💩'}
                    </td>
                    <td className="table-cell font-medium">{score.manager}</td>
                    <td className="table-cell text-sm text-gray-500 dark:text-gray-400">{score.team_name}</td>
                    <td className="table-cell text-center">
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        {score.score.toFixed(2)}
                      </span>
                    </td>
                    <td className="table-cell text-center">{score.season}</td>
                    <td className="table-cell text-center">{score.week}</td>
                    <td className="table-cell text-center">
                      {score.won ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">W 🍀</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-medium">L</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
