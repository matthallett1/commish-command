'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import MemberLink from '@/components/MemberLink';
import { getPlayerHistory } from '@/lib/api';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  RB: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  WR: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  TE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  K: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DEF: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'A': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'F': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  drafted: { icon: '📋', color: 'bg-primary-500' },
  add: { icon: '➕', color: 'bg-green-500' },
  waiver: { icon: '🔄', color: 'bg-blue-500' },
  drop: { icon: '❌', color: 'bg-red-500' },
  trade: { icon: '🤝', color: 'bg-purple-500' },
};

export default function PlayerDetailPage() {
  const params = useParams();
  const playerName = decodeURIComponent(params.name as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadPlayer() {
      try {
        const result = await getPlayerHistory(playerName);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Player not found');
      } finally {
        setLoading(false);
      }
    }
    loadPlayer();
  }, [playerName]);

  if (loading) return <LoadingSpinner />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/players" className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
          ← Back to Search
        </Link>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🤷</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Player Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            &ldquo;{playerName}&rdquo; wasn&apos;t found in league history.
          </p>
          <Link href="/players" className="mt-4 inline-block text-primary-600 dark:text-primary-400 hover:underline">
            Try another search
          </Link>
        </div>
      </div>
    );
  }

  const { summary, draft_history, timeline } = data;
  const posClass = POSITION_COLORS[data.player_position] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/players" className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
        ← Back to Search
      </Link>

      {/* Player Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {data.player_name}
              </h1>
              <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${posClass}`}>
                {data.player_position || '?'}
              </span>
              {data.player_team && (
                <span className="px-2.5 py-1 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
                  {data.player_team}
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {summary.seasons_active.length > 0
                ? `Active in league: ${summary.seasons_active[0]}–${summary.seasons_active[summary.seasons_active.length - 1]}`
                : 'League history'}
            </p>
          </div>
          {summary.avg_draft_grade && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg Draft Grade</span>
              <span className={`px-3 py-1.5 rounded-lg text-lg font-bold ${GRADE_COLORS[summary.avg_draft_grade] || ''}`}>
                {summary.avg_draft_grade}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Times Drafted"
          value={summary.times_drafted}
          icon={<span className="text-xl">📋</span>}
        />
        <StatCard
          title="Transactions"
          value={summary.total_transactions}
          subtitle={[
            summary.times_added > 0 ? `${summary.times_added} adds` : '',
            summary.times_dropped > 0 ? `${summary.times_dropped} drops` : '',
            summary.times_traded > 0 ? `${summary.times_traded} trades` : '',
          ].filter(Boolean).join(', ') || 'None'}
          icon={<span className="text-xl">🔄</span>}
        />
        <StatCard
          title="Drafted By"
          value={summary.managers_drafted_by.length}
          subtitle={summary.managers_drafted_by.length <= 3 ? summary.managers_drafted_by.join(', ') : `${summary.managers_drafted_by.slice(0, 2).join(', ')} +${summary.managers_drafted_by.length - 2}`}
          icon={<span className="text-xl">👥</span>}
        />
        <StatCard
          title="Best Season"
          value={summary.best_season ? `${summary.best_season.points?.toFixed(0)} pts` : 'N/A'}
          subtitle={summary.best_season ? `${summary.best_season.season} (${summary.best_season.manager})` : ''}
          icon={<span className="text-xl">⭐</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline (2/3 width) */}
        <div className="lg:col-span-2 card">
          <h2 className="card-header">League Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No events found.</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

              <div className="space-y-4">
                {timeline.map((event: any, idx: number) => {
                  const eventInfo = EVENT_ICONS[event.event] || { icon: '📌', color: 'bg-gray-500' };
                  const gradeClass = event.grade ? GRADE_COLORS[event.grade] : null;

                  return (
                    <div key={idx} className="relative flex items-start gap-4 pl-2">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${eventInfo.color} flex items-center justify-center text-white text-sm shadow-sm`}>
                        <span>{eventInfo.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0 pb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-white capitalize">
                            {event.event === 'add' ? 'Added' :
                             event.event === 'drop' ? 'Dropped' :
                             event.event === 'trade' ? 'Traded' :
                             event.event === 'waiver' ? 'Waiver Claim' :
                             event.event.charAt(0).toUpperCase() + event.event.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {event.season}
                          </span>
                          {event.grade && gradeClass && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${gradeClass}`}>
                              {event.grade}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                          {event.event === 'drafted' ? (
                            <>
                              Round {event.round}, Pick {event.pick_number} by{' '}
                              {event.member_id ? (
                                <MemberLink memberId={event.member_id} name={event.manager} />
                              ) : (
                                event.manager
                              )}
                              <span className="text-gray-400 dark:text-gray-500"> ({event.team_name})</span>
                            </>
                          ) : (
                            <>
                              {event.event === 'add' || event.event === 'waiver' ? 'Added by ' :
                               event.event === 'drop' ? 'Dropped by ' :
                               event.event === 'trade' ? 'Traded to ' :
                               'By '}
                              {event.member_id ? (
                                <MemberLink memberId={event.member_id} name={event.manager} />
                              ) : (
                                event.manager
                              )}
                              <span className="text-gray-400 dark:text-gray-500"> ({event.team_name})</span>
                            </>
                          )}
                        </p>

                        {event.season_points != null && event.season_points > 0 && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {event.season_points.toFixed(0)} season pts
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Draft History Table (1/3 width) */}
        <div className="card">
          <h2 className="card-header">Draft History</h2>
          {draft_history.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Never drafted in this league.</p>
          ) : (
            <div className="space-y-3">
              {draft_history.map((d: any, idx: number) => {
                const gradeClass = d.grade ? GRADE_COLORS[d.grade] : null;
                return (
                  <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-white">{d.season}</span>
                      {d.grade && gradeClass && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeClass}`}>
                          {d.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Rd {d.round}, Pk {d.pick_number}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {d.member_id ? (
                        <MemberLink memberId={d.member_id} name={d.manager} />
                      ) : (
                        d.manager
                      )}
                      <span className="text-gray-400 dark:text-gray-500"> &middot; {d.team_name}</span>
                    </p>
                    {d.season_points != null && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {d.season_points.toFixed(0)} pts
                        {d.player_team && ` · ${d.player_team}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
