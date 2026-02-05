'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import MemberLink from '@/components/MemberLink';
import AIBlockInsight from '@/components/AIBlockInsight';
import ShareButton from '@/components/ShareButton';
import { getMember, getMemberH2H, getMemberRivalries, getMemberNotableEvents, getBatchInsights, checkAIStatus, getMemberAchievements, getDraftTendencies, getMemberTransactionActivity } from '@/lib/api';

const BADGE_ICONS: Record<string, string> = {
  dynasty_builder: '👑',
  one_hit_wonder: '🌟',
  bridesmaid: '💍',
  ironman: '🦾',
  boom_or_bust: '💣',
  closer: '🎯',
  punching_bag: '🥊',
  lucky_charm: '🍀',
};

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = Number(params.id);
  
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [h2h, setH2H] = useState<any>(null);
  const [rivalries, setRivalries] = useState<any>(null);
  const [notableEvents, setNotableEvents] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [draftTendencies, setDraftTendencies] = useState<any>(null);
  const [txActivity, setTxActivity] = useState<any>(null);
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [currentTone, setCurrentTone] = useState('commissioner');

  // Store fetched data for regeneration
  const [fetchedData, setFetchedData] = useState<any>(null);

  // Fetch AI insights for all blocks
  const fetchAIInsights = useCallback(async (memberData: any, h2hData: any, rivalriesData: any, eventsData: any, tone: string = 'commissioner') => {
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
        { block_type: 'stats_overview', context: { member: memberData }, member_context: memberContext },
        { block_type: 'notable_moments', context: { notable_events: eventsData }, member_context: memberContext },
        { block_type: 'season_history', context: { seasons: memberData.seasons || [] }, member_context: memberContext },
        { block_type: 'rivalries', context: { rivalries: rivalriesData?.rivalries || [] }, member_context: memberContext },
        { block_type: 'h2h_records', context: { head_to_head: h2hData?.head_to_head || [] }, member_context: memberContext },
      ];

      const response = await getBatchInsights(blocks, tone);
      setAiInsights(response.insights);
      setCurrentTone(tone);
    } catch (err) {
      console.error('Failed to load AI insights:', err);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleToneChange = useCallback((tone: string) => {
    if (fetchedData) {
      fetchAIInsights(fetchedData.member, fetchedData.h2h, fetchedData.rivalries, fetchedData.events, tone);
    }
  }, [fetchedData, fetchAIInsights]);

  useEffect(() => {
    async function loadData() {
      try {
        const [memberData, h2hData, rivalriesData, eventsData, achievementsData, draftData, txData] = await Promise.all([
          getMember(memberId),
          getMemberH2H(memberId),
          getMemberRivalries(memberId),
          getMemberNotableEvents(memberId),
          getMemberAchievements(memberId).catch(() => []),
          getDraftTendencies(memberId).catch(() => null),
          getMemberTransactionActivity(memberId).catch(() => null),
        ]);
        setMember(memberData);
        setH2H(h2hData);
        setRivalries(rivalriesData);
        setNotableEvents(eventsData);
        setAchievements(achievementsData?.achievements || []);
        setDraftTendencies(draftData);
        setTxActivity(txData);
        setFetchedData({ member: memberData, h2h: h2hData, rivalries: rivalriesData, events: eventsData });
        
        fetchAIInsights(memberData, h2hData, rivalriesData, eventsData);
      } catch (err) {
        console.error('Failed to load member:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [memberId, fetchAIInsights]);

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
      <Link href="/members" className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
        ← Back to Members
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {member.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              League member since {member.seasons?.[member.seasons.length - 1]?.year || 'N/A'}
            </p>
            {/* Achievement Badges */}
            {achievements.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {achievements.map((badge: any) => (
                  <span
                    key={badge.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 text-pink-800 dark:text-pink-200 border border-pink-200 dark:border-pink-700"
                    title={badge.description}
                  >
                    <span>{BADGE_ICONS[badge.id] || '🏅'}</span>
                    <span>{badge.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {member.total_championships > 0 && (
              <div className="text-center">
                <div className="text-4xl">
                  {'🏆'.repeat(Math.min(member.total_championships, 5))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{member.total_championships} Championship{member.total_championships > 1 ? 's' : ''}</p>
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
            currentTone={currentTone}
            onRegenerate={handleToneChange}
          />
        )}
      </div>

      {/* Notable Events */}
      {notableEvents && (
        <div className="card">
          <h2 className="card-header">Notable Moments</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {notableEvents.highest_score && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 relative group">
                <ShareButton text={`${member.name} scored ${notableEvents.highest_score.score} points in Week ${notableEvents.highest_score.week}, ${notableEvents.highest_score.year} — their career high! Via Commish Command`} />
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  🔥 Career High Score
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400">{notableEvents.highest_score.score}</p>
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

            {notableEvents.biggest_win && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 relative group">
                <ShareButton text={`${member.name} won by +${notableEvents.biggest_win.margin} points — their biggest blowout ever! Via Commish Command`} />
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  😤 Biggest Blowout Victory
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">+{notableEvents.biggest_win.margin}</p>
                  <p className="mt-2 text-purple-700 dark:text-purple-300">
                    {notableEvents.biggest_win.score} vs {notableEvents.biggest_win.opponent} ({notableEvents.biggest_win.opponent_score})
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {notableEvents.biggest_win.year} Week {notableEvents.biggest_win.week}
                  </p>
                </div>
              </div>
            )}

            {notableEvents.closest_win && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 relative group">
                <ShareButton text={`${member.name} won by just ${notableEvents.closest_win.margin} points — talk about a nail-biter! Via Commish Command`} />
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  😰 Closest Victory
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">+{notableEvents.closest_win.margin}</p>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    {notableEvents.closest_win.score} vs {notableEvents.closest_win.opponent} ({notableEvents.closest_win.opponent_score})
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {notableEvents.closest_win.year} Week {notableEvents.closest_win.week}
                  </p>
                </div>
              </div>
            )}

            {notableEvents.worst_loss && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 relative group">
                <ShareButton text={`${member.name} lost by ${notableEvents.worst_loss.margin} points — their worst defeat ever. Via Commish Command`} />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  💀 Worst Defeat
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-red-600 dark:text-red-400">-{notableEvents.worst_loss.margin}</p>
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
          
          {aiAvailable && (
            <AIBlockInsight 
              narrative={aiInsights['notable_moments'] || null}
              isLoading={aiLoading && !aiInsights['notable_moments']}
              compact
              currentTone={currentTone}
              onRegenerate={handleToneChange}
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
        {aiAvailable && (
          <AIBlockInsight 
            narrative={aiInsights['season_history'] || null}
            isLoading={aiLoading && !aiInsights['season_history']}
            compact
            currentTone={currentTone}
            onRegenerate={handleToneChange}
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
                  <span className="text-green-600 dark:text-green-400">{rivalry.wins}</span>
                  <span className="text-gray-400 mx-2">-</span>
                  <span className="text-red-600 dark:text-red-400">{rivalry.losses}</span>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {rivalry.total_games} total games
                </p>
              </div>
            ))}
          </div>
          {aiAvailable && (
            <AIBlockInsight 
              narrative={aiInsights['rivalries'] || null}
              isLoading={aiLoading && !aiInsights['rivalries']}
              compact
              currentTone={currentTone}
              onRegenerate={handleToneChange}
            />
          )}
        </div>
      )}

      {/* Draft Tendencies */}
      {draftTendencies && draftTendencies.total_picks > 0 && (
        <div className="card">
          <h2 className="card-header">Draft Profile</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftTendencies.total_picks}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Picks</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{draftTendencies.seasons_drafted}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Drafts</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">{draftTendencies.favorite_position || '-'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Favorite Position</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${
                draftTendencies.avg_grade === 'A+' || draftTendencies.avg_grade === 'A' ? 'text-green-600 dark:text-green-400' :
                draftTendencies.avg_grade === 'B' ? 'text-blue-600 dark:text-blue-400' :
                draftTendencies.avg_grade === 'C' ? 'text-yellow-600' :
                'text-red-600 dark:text-red-400'
              }`}>{draftTendencies.avg_grade || '-'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Grade</p>
            </div>
          </div>

          {/* Position breakdown */}
          {draftTendencies.position_breakdown && Object.keys(draftTendencies.position_breakdown).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Position Preferences</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(draftTendencies.position_breakdown).map(([pos, data]: [string, any]) => (
                  <div key={pos} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-bold text-gray-900 dark:text-white">{pos}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      {data.count} ({data.percentage}%)
                    </span>
                    {data.avg_points > 0 && (
                      <span className="text-gray-400 ml-1 text-xs">
                        avg {data.avg_points} pts
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Round 1 History */}
          {draftTendencies.round_1_history?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">First Round Picks</h3>
              <div className="space-y-1">
                {draftTendencies.round_1_history.map((pick: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-yellow-50/50 dark:bg-yellow-900/10 rounded px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono w-10">{pick.season}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{pick.player_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pick.player_position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pick.season_points != null && (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{pick.season_points?.toFixed(1)} pts</span>
                      )}
                      {pick.grade && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                          pick.grade === 'A+' || pick.grade === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          pick.grade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          pick.grade === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {pick.grade}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transaction Activity */}
      {txActivity && txActivity.total_transactions > 0 && (
        <div className="card">
          <h2 className="card-header">Transaction Activity</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{txActivity.total_transactions}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Transactions</p>
            </div>
            {txActivity.type_breakdown && Object.entries(txActivity.type_breakdown).map(([type, count]: [string, any]) => (
              <div key={type} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
                <p className={`text-2xl font-bold ${
                  type === 'add' ? 'text-green-600 dark:text-green-400' :
                  type === 'drop' ? 'text-red-600 dark:text-red-400' :
                  type === 'trade' ? 'text-purple-600 dark:text-purple-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>{count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{type}s</p>
              </div>
            ))}
          </div>

          {/* Top Waiver Pickups */}
          {txActivity.top_waiver_pickups?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Waiver Wire Pickups</h3>
              <div className="space-y-1">
                {txActivity.top_waiver_pickups.map((pickup: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-green-50/50 dark:bg-green-900/10 rounded px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono w-10">{pickup.season}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{pickup.player_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{pickup.player_position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {pickup.points_scored?.toFixed(1)} pts
                      </span>
                      {pickup.games_played > 0 && (
                        <span className="text-xs text-gray-400">{pickup.games_played}G</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                      <span className="text-green-600 dark:text-green-400">{record.wins}</span>
                      -
                      <span className="text-red-600 dark:text-red-400">{record.losses}</span>
                      {record.ties > 0 && <span className="text-gray-500 dark:text-gray-400">-{record.ties}</span>}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`font-semibold ${
                        record.win_percentage >= 55 ? 'text-green-600 dark:text-green-400' :
                        record.win_percentage >= 45 ? 'text-gray-600' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {record.win_percentage}%
                      </span>
                    </td>
                    <td className="table-cell text-right text-green-600 dark:text-green-400">{record.points_for.toLocaleString()}</td>
                    <td className="table-cell text-right text-red-600 dark:text-red-400">{record.points_against.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {aiAvailable && (
            <AIBlockInsight 
              narrative={aiInsights['h2h_records'] || null}
              isLoading={aiLoading && !aiInsights['h2h_records']}
              compact
              currentTone={currentTone}
              onRegenerate={handleToneChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
