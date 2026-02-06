'use client';

import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LeaderboardTable from '@/components/LeaderboardTable';
import MemberLink from '@/components/MemberLink';
import AIBlockInsight from '@/components/AIBlockInsight';
import InfoTooltip from '@/components/InfoTooltip';
import { getAllTimeRecords, getH2HMatrix, getLuckAnalysis, getPowerRankings, getAISummary, checkAIStatus } from '@/lib/api';

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any>(null);
  const [h2hMatrix, setH2HMatrix] = useState<any>(null);
  const [luckAnalysis, setLuckAnalysis] = useState<any>(null);
  const [powerRankings, setPowerRankings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'h2h' | 'luck' | 'power'>('power');
  
  // AI state
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [recordsData, h2hData, luckData, powerData] = await Promise.all([
          getAllTimeRecords().catch(() => null),
          getH2HMatrix().catch(() => null),
          getLuckAnalysis().catch(() => null),
          getPowerRankings().catch(() => null),
        ]);
        setRecords(recordsData);
        setH2HMatrix(h2hData);
        setLuckAnalysis(luckData);
        setPowerRankings(powerData);
        
        // Fetch AI narrative once
        if (!hasFetchedRef.current) {
          fetchAINarrative(recordsData, powerData, luckData);
          hasFetchedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to load records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  async function fetchAINarrative(recordsData: any, powerData: any, luckData: any) {
    try {
      const status = await checkAIStatus();
      if (!status.available) {
        setAiAvailable(false);
        return;
      }
      
      setAiLoading(true);
      
      const aiContext = {
        all_time_records: recordsData || {},
        power_rankings: powerData?.rankings || [],
        luck_analysis: luckData?.analysis || [],
      };
      
      const response = await getAISummary('records', aiContext);
      setAiNarrative(response.narrative);
    } catch (err) {
      console.error('Failed to fetch AI narrative:', err);
    } finally {
      setAiLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  const tabs = [
    { id: 'records', label: 'All-Time Records' },
    { id: 'h2h', label: 'H2H Matrix' },
    { id: 'luck', label: 'Luck Analysis' },
    { id: 'power', label: 'Power Rankings' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        League Records & Analytics
      </h1>

      {/* AI Insight at the top */}
      {aiAvailable && (
        <AIBlockInsight 
          narrative={aiNarrative}
          isLoading={aiLoading}
          title="League Legends"
        />
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-pink-100 text-pink-700 dark:bg-slate-700 dark:text-pink-400'
                : 'text-gray-600 hover:text-pink-600 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

        {/* All-Time Records Tab */}
        {activeTab === 'records' && (!records?.highest_score) && (
          <div className="card bg-gray-50 dark:bg-slate-700/50 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Matchup data not yet loaded. Records will appear once weekly matchups are synced.
            </p>
          </div>
        )}
        {activeTab === 'records' && records?.highest_score && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Highest Score */}
            {records.highest_score && (
              <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  🔥 Highest Single-Week Score
                </h3>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">{records.highest_score.score.toFixed(2)}</p>
                  <p className="mt-2 text-green-700 dark:text-green-300">
                    {records.highest_score.manager} ({records.highest_score.team})
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {records.highest_score.season} Week {records.highest_score.week}
                  </p>
                </div>
              </div>
            )}

            {/* Lowest Score */}
            {records.lowest_score && (
              <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  💀 Lowest Single-Week Score
                </h3>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-red-600 dark:text-red-400">{records.lowest_score.score.toFixed(2)}</p>
                  <p className="mt-2 text-red-700 dark:text-red-300">
                    {records.lowest_score.manager} ({records.lowest_score.team})
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {records.lowest_score.season} Week {records.lowest_score.week}
                  </p>
                </div>
              </div>
            )}

            {/* Biggest Blowout */}
            {records.biggest_blowout && (
              <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  😤 Biggest Blowout
                </h3>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">+{records.biggest_blowout.margin.toFixed(2)}</p>
                  <p className="mt-2 text-purple-700 dark:text-purple-300">
                    {records.biggest_blowout.winner} ({records.biggest_blowout.winner_score.toFixed(2)})
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    defeated {records.biggest_blowout.loser} ({records.biggest_blowout.loser_score.toFixed(2)})
                  </p>
                  <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                    {records.biggest_blowout.season} Week {records.biggest_blowout.week}
                  </p>
                </div>
              </div>
            )}

            {/* Closest Game */}
            {records.closest_game && (
              <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  😰 Closest Game
                </h3>
                <div className="mt-4">
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{records.closest_game.margin.toFixed(2)}</p>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    {records.closest_game.winner} ({records.closest_game.winner_score.toFixed(2)})
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    vs {records.closest_game.loser} ({records.closest_game.loser_score.toFixed(2)})
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                    {records.closest_game.season} Week {records.closest_game.week}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* H2H Matrix Tab */}
        {activeTab === 'h2h' && !h2hMatrix?.matrix && (
          <div className="card bg-gray-50 dark:bg-slate-700/50 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Matchup data not yet loaded. H2H matrix will appear once weekly matchups are synced.
            </p>
          </div>
        )}
        {activeTab === 'h2h' && h2hMatrix?.matrix && (
          <div className="card overflow-hidden">
            <h2 className="card-header">Head-to-Head Matrix</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Records shown as Wins-Losses from the row player's perspective
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 sticky left-0 bg-gray-50 dark:bg-slate-700">vs</th>
                    {h2hMatrix.members?.map((name: string) => (
                      <th key={name} className="px-3 py-2 text-center">
                        {name.split(' ')[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                  {h2hMatrix.matrix?.map((row: any) => (
                    <tr key={row.member_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-3 py-2 font-medium sticky left-0 bg-white dark:bg-slate-800">
                        <MemberLink memberId={row.member_id} name={row.member_name.split(' ')[0]} />
                      </td>
                      {h2hMatrix.members?.map((name: string) => {
                        if (name === row.member_name) {
                          return (
                            <td key={name} className="px-3 py-2 text-center bg-gray-100 dark:bg-slate-700">
                              -
                            </td>
                          );
                        }
                        const record = row.opponents.find((o: any) => o.opponent_name === name);
                        if (!record) {
                          return <td key={name} className="px-3 py-2 text-center">-</td>;
                        }
                        return (
                          <td 
                            key={name} 
                            className={`px-3 py-2 text-center font-mono ${
                              record.win_pct > 55 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                              record.win_pct < 45 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                              ''
                            }`}
                          >
                            {record.wins}-{record.losses}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Luck Analysis Tab */}
        {activeTab === 'luck' && !luckAnalysis?.analysis && (
          <div className="card bg-gray-50 dark:bg-slate-700/50 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Matchup data not yet loaded. Luck analysis will appear once weekly matchups are synced.
            </p>
          </div>
        )}
        {activeTab === 'luck' && luckAnalysis?.analysis && (
          <div className="card">
            <h2 className="card-header">Luck Analysis</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
              Compares actual wins to expected wins based on weekly scores
              <InfoTooltip text="Expected wins = how many wins you'd have if you played every team every week. If your actual wins are higher, you got lucky with your schedule. Lower? The fantasy gods weren't on your side." />
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3 text-center">Actual W</th>
                    <th className="px-4 py-3 text-center">Expected W</th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1">Luck Factor <InfoTooltip text="Actual wins minus expected wins. Positive = you won more games than your scoring deserved. Negative = you deserved better." /></span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1">Lucky Wins <InfoTooltip text="Games you won despite scoring below the league median that week. Your opponent just happened to score even worse." /></span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1">Unlucky Losses <InfoTooltip text="Games you lost despite scoring above the league median that week. You would have beaten most other teams, but ran into a buzzsaw." /></span>
                    </th>
                    <th className="px-4 py-3 text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                  {luckAnalysis.analysis?.map((entry: any) => (
                    <tr key={entry.member} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="table-cell font-medium">
                        {entry.member_id ? (
                          <MemberLink memberId={entry.member_id} name={entry.member} />
                        ) : entry.member}
                      </td>
                      <td className="table-cell text-center">{entry.actual_wins}</td>
                      <td className="table-cell text-center">{entry.expected_wins}</td>
                      <td className={`table-cell text-center font-bold ${
                        entry.luck_factor > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {entry.luck_factor > 0 ? '+' : ''}{entry.luck_factor}
                      </td>
                      <td className="table-cell text-center text-green-600 dark:text-green-400">{entry.lucky_wins}</td>
                      <td className="table-cell text-center text-red-600 dark:text-red-400">{entry.unlucky_losses}</td>
                      <td className="table-cell text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          entry.luck_rating.includes('Very Lucky') ? 'bg-green-100 text-green-800' :
                          entry.luck_rating.includes('Lucky') ? 'bg-green-50 text-green-700' :
                          entry.luck_rating.includes('Very Unlucky') ? 'bg-red-100 text-red-800' :
                          entry.luck_rating.includes('Unlucky') ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {entry.luck_rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Power Rankings Tab */}
        {activeTab === 'power' && powerRankings && (
          <div className="card">
            <h2 className="card-header">All-Time Power Rankings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
              Weighted score based on win %, championships, playoff %, points, and longevity
              <InfoTooltip text="Power Score combines multiple factors: win percentage (35%), championships (25%), playoff rate (20%), points per game (10%), and seasons played (10%). Think of it as a manager's all-time fantasy football GPA." />
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-4 py-3 w-16">Rank</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1">Power Score <InfoTooltip text="A composite rating (0–100) combining win %, titles, playoffs, scoring, and longevity. Higher = more dominant all-time." /></span>
                    </th>
                    <th className="px-4 py-3 text-center">Seasons</th>
                    <th className="px-4 py-3 text-center">Championships</th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1">Win % <InfoTooltip text="All-time regular season win percentage across all seasons played." /></span>
                    </th>
                    <th className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1">Playoff % <InfoTooltip text="Percentage of seasons this manager made the playoffs." /></span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                  {powerRankings.rankings?.map((entry: any, index: number) => (
                    <tr 
                      key={entry.member} 
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${
                        index < 3 ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                      }`}
                    >
                      <td className="table-cell font-bold">
                        {entry.rank}
                        {entry.rank === 1 && ' 🥇'}
                        {entry.rank === 2 && ' 🥈'}
                        {entry.rank === 3 && ' 🥉'}
                      </td>
                      <td className="table-cell font-medium">
                        {entry.member_id ? (
                          <MemberLink memberId={entry.member_id} name={entry.member} />
                        ) : entry.member}
                      </td>
                      <td className="table-cell text-center">
                        <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{entry.power_score}</span>
                      </td>
                      <td className="table-cell text-center">{entry.seasons}</td>
                      <td className="table-cell text-center">
                        {entry.championships > 0 ? `🏆 ${entry.championships}` : '-'}
                      </td>
                      <td className="table-cell text-center">{entry.win_percentage}%</td>
                      <td className="table-cell text-center">{entry.playoff_percentage}%</td>
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
