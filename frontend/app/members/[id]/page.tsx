'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import MemberLink from '@/components/MemberLink';
import AIBlockInsight from '@/components/AIBlockInsight';
import { getMember, getMemberH2H, getMemberRivalries, getMemberNotableEvents, getBatchInsights, checkAIStatus } from '@/lib/api';

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = Number(params.id);
  
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [h2h, setH2H] = useState<any>(null);
  const [rivalries, setRivalries] = useState<any>(null);
  const [notableEvents, setNotableEvents] = useState<any>(null);
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);

  // Fetch AI insights for all blocks
  const fetchAIInsights = async (memberData: any, h2hData: any, rivalriesData: any, eventsData: any) => {
    try {
      const status = await checkAIStatus();
      if (!status.available) {
        setAiAvailable(false);
        return;
      }

      setAiLoading(true);
      
      const memberContext = {
        name: memberData.name,
        total_seasons: memberData.total_seasons,
        total_championships: memberData.total_championships,
        total_wins: memberData.total_wins,
        total_losses: memberData.total_losses,
        win_percentage: memberData.win_percentage,
      };

      const blocks = [
        {
          block_type: 'stats_overview',
          context: { member: memberData },
          member_context: memberContext,
        },
        {
          block_type: 'notable_moments',
          context: { notable_events: eventsData },
          member_context: memberContext,
        },
        {
          block_type: 'season_history',
          context: { seasons: memberData.seasons || [] },
          member_context: memberContext,
        },
        {
          block_type: 'rivalries',
          context: { rivalries: rivalriesData?.rivalries || [] },
          member_context: memberContext,
        },
        {
          block_type: 'h2h_records',
          context: { head_to_head: h2hData?.head_to_head || [] },
          member_context: memberContext,
        },
      ];

      const response = await getBatchInsights(blocks);
      setAiInsights(response.insights);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [memberData, h2hData, rivalriesData, eventsData] = await Promise.all([
          getMember(memberId),
          getMemberH2H(memberId),
          getMemberRivalries(memberId),
          getMemberNotableEvents(memberId),
        ]);
        setMember(memberData);
        setH2H(h2hData);
        setRivalries(rivalriesData);
        setNotableEvents(eventsData);
        
        // Fetch AI insights after data loads
        fetchAIInsights(memberData, h2hData, rivalriesData, eventsData);
      } catch (err) {
        console.error('Failed to load member:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [memberId]);

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Member Not Found</h1>
        <Link href="/members" className="mt-4 btn-primary inline-block">
          Back to Members
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/members" className="text-primary-600 hover:underline flex items-center gap-1">
        ← Back to Members
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {member.name}
            </h1>
            <p className="text-gray-500 mt-1">
              League member since {member.seasons?.[member.seasons.length - 1]?.year || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {member.total_championships > 0 && (
              <div className="text-center">
                <div className="text-4xl">
                  {'🏆'.repeat(Math.min(member.total_championships, 5))}
                </div>
                <p className="text-sm text-gray-500">{member.total_championships} Championship{member.total_championships > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid with AI Overview */}
      <div className="card">
        <h2 className="card-header">Career Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="Seasons" value={member.total_seasons} />
          <StatCard title="Record" value={`${member.total_wins}-${member.total_losses}`} />
          <StatCard title="Win %" value={`${member.win_percentage}%`} />
          <StatCard title="Avg Pts/Season" value={member.avg_points_per_season.toLocaleString()} />
          <StatCard 
            title="Best Finish" 
            value={member.best_finish === 1 ? '🥇 Champ' : `#${member.best_finish}`}
          />
          <StatCard 
            title="Worst Finish" 
            value={`#${member.worst_finish}`}
          />
        </div>
        {aiAvailable && (
          <AIBlockInsight 
            narrative={aiInsights['stats_overview'] || null}
            isLoading={aiLoading && !aiInsights['stats_overview']}
            compact
          />
        )}
      </div>

      {/* Notable Events */}
      {notableEvents && (
        <div className="card">
          <h2 className="card-header">Notable Moments</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Highest Score */}
            {notableEvents.highest_score && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  🔥 Career High Score
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-green-600">{notableEvents.highest_score.score}</p>
                  <p className="mt-2 text-green-700 dark:text-green-300">
                    vs {notableEvents.highest_score.opponent} ({notableEvents.highest_score.opponent_score})
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {notableEvents.highest_score.year} Week {notableEvents.highest_score.week}
                    {notableEvents.highest_score.won ? ' • Won' : ' • Lost'}
                  </p>
                </div>
              </div>
            )}

            {/* Biggest Win */}
            {notableEvents.biggest_win && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  😤 Biggest Blowout Victory
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-purple-600">+{notableEvents.biggest_win.margin}</p>
                  <p className="mt-2 text-purple-700 dark:text-purple-300">
                    {notableEvents.biggest_win.score} vs {notableEvents.biggest_win.opponent} ({notableEvents.biggest_win.opponent_score})
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {notableEvents.biggest_win.year} Week {notableEvents.biggest_win.week}
                  </p>
                </div>
              </div>
            )}

            {/* Closest Win */}
            {notableEvents.closest_win && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  😰 Closest Victory
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-blue-600">+{notableEvents.closest_win.margin}</p>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    {notableEvents.closest_win.score} vs {notableEvents.closest_win.opponent} ({notableEvents.closest_win.opponent_score})
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {notableEvents.closest_win.year} Week {notableEvents.closest_win.week}
                  </p>
                </div>
              </div>
            )}

            {/* Worst Loss */}
            {notableEvents.worst_loss && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  💀 Worst Defeat
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-red-600">-{notableEvents.worst_loss.margin}</p>
                  <p className="mt-2 text-red-700 dark:text-red-300">
                    {notableEvents.worst_loss.score} vs {notableEvents.worst_loss.opponent} ({notableEvents.worst_loss.opponent_score})
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {notableEvents.worst_loss.year} Week {notableEvents.worst_loss.week}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Championship Years */}
          {notableEvents.championship_years && notableEvents.championship_years.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                🏆 Championship Years
              </h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {notableEvents.championship_years.map((champ: any) => (
                  <Link
                    key={champ.year}
                    href={`/standings?year=${champ.year}`}
                    className="px-4 py-2 bg-yellow-200 dark:bg-yellow-800 rounded-lg hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors"
                  >
                    <span className="font-bold text-yellow-900 dark:text-yellow-100">{champ.year}</span>
                    <span className="text-sm text-yellow-700 dark:text-yellow-300 ml-2">({champ.record})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Insight for Notable Moments */}
          {aiAvailable && (
            <AIBlockInsight 
              narrative={aiInsights['notable_moments'] || null}
              isLoading={aiLoading && !aiInsights['notable_moments']}
              compact
            />
          )}
        </div>
      )}

      {/* Season History */}
      <div className="card">
        <h2 className="card-header">Season History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Team Name</th>
                <th className="px-4 py-3 text-center">Record</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-center">Finish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {member.seasons?.map((season: any) => (
                <tr 
                  key={season.year}
                  className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${
                    season.is_champion ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                  }`}
                >
                  <td className="table-cell font-medium">{season.year}</td>
                  <td className="table-cell">{season.team_name}</td>
                  <td className="table-cell text-center font-mono">{season.record}</td>
                  <td className="table-cell text-right">{season.points_for.toLocaleString()}</td>
                  <td className="table-cell text-center">
                    {season.is_champion ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xl">🏆</span>
                        <span className="font-semibold text-yellow-600">Champion</span>
                      </span>
                    ) : (
                      <span>#{season.final_rank}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* AI Insight for Season History */}
        {aiAvailable && (
          <AIBlockInsight 
            narrative={aiInsights['season_history'] || null}
            isLoading={aiLoading && !aiInsights['season_history']}
            compact
          />
        )}
      </div>

      {/* Rivalries */}
      {rivalries?.rivalries && rivalries.rivalries.length > 0 && (
        <div className="card">
          <h2 className="card-header">Top Rivalries</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rivalries.rivalries.map((rivalry: any) => (
              <div 
                key={rivalry.member_id}
                className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    vs <MemberLink memberId={rivalry.member_id} name={rivalry.member_name} />
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    rivalry.classification === 'Heated Rivalry' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {rivalry.classification}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-center">
                  <span className="text-green-600">{rivalry.wins}</span>
                  <span className="text-gray-400 mx-2">-</span>
                  <span className="text-red-600">{rivalry.losses}</span>
                </div>
                <p className="text-center text-sm text-gray-500 mt-1">
                  {rivalry.total_games} total games
                </p>
              </div>
            ))}
          </div>
          {/* AI Insight for Rivalries */}
          {aiAvailable && (
            <AIBlockInsight 
              narrative={aiInsights['rivalries'] || null}
              isLoading={aiLoading && !aiInsights['rivalries']}
              compact
            />
          )}
        </div>
      )}

      {/* Head-to-Head Records */}
      {h2h?.head_to_head && h2h.head_to_head.length > 0 && (
        <div className="card">
          <h2 className="card-header">Head-to-Head Records</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Opponent</th>
                  <th className="px-4 py-3 text-center">Record</th>
                  <th className="px-4 py-3 text-center">Win %</th>
                  <th className="px-4 py-3 text-right">Points For</th>
                  <th className="px-4 py-3 text-right">Points Against</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {h2h.head_to_head.map((record: any) => (
                  <tr key={record.member_id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="table-cell font-medium">
                      <MemberLink memberId={record.member_id} name={record.member_name} />
                    </td>
                    <td className="table-cell text-center font-mono">
                      <span className="text-green-600">{record.wins}</span>
                      -
                      <span className="text-red-600">{record.losses}</span>
                      {record.ties > 0 && <span className="text-gray-500">-{record.ties}</span>}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`font-semibold ${
                        record.win_percentage >= 55 ? 'text-green-600' :
                        record.win_percentage >= 45 ? 'text-gray-600' :
                        'text-red-600'
                      }`}>
                        {record.win_percentage}%
                      </span>
                    </td>
                    <td className="table-cell text-right text-green-600">{record.points_for.toLocaleString()}</td>
                    <td className="table-cell text-right text-red-600">{record.points_against.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* AI Insight for H2H Records */}
          {aiAvailable && (
            <AIBlockInsight 
              narrative={aiInsights['h2h_records'] || null}
              isLoading={aiLoading && !aiInsights['h2h_records']}
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}
