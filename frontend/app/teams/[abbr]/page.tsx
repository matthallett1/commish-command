'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import MemberLink from '@/components/MemberLink';
import PlayerLink from '@/components/PlayerLink';
import InfoTooltip from '@/components/InfoTooltip';
import { getNFLTeamDetail } from '@/lib/api';

// ESPN uses slightly different abbreviations for some teams
const ESPN_ABBR: Record<string, string> = { WAS: 'wsh' };

function teamLogoUrl(abbr: string): string {
  const espn = ESPN_ABBR[abbr] || abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${espn}.png`;
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'A': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'F': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const POS_COLORS: Record<string, string> = {
  QB: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RB: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  TE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  K: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  DEF: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

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
  OAK: 'Oakland Raiders', SD: 'San Diego Chargers', STL: 'St. Louis Rams',
  JAC: 'Jacksonville Jaguars',
};

export default function NFLTeamDetailPage() {
  const params = useParams();
  const abbr = (params.abbr as string).toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const result = await getNFLTeamDetail(abbr);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Team not found');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [abbr]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/teams" className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
          &larr; Back to NFL Teams
        </Link>
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏈</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            No draft data found for &ldquo;{abbr}&rdquo;.
          </p>
          <Link href="/teams" className="mt-4 inline-block text-primary-600 dark:text-primary-400 hover:underline">
            Browse all teams
          </Link>
        </div>
      </div>
    );
  }

  const fullName = NFL_NAMES[data.abbr] || data.abbr;
  const gradeClass = data.avg_grade ? GRADE_COLORS[data.avg_grade] : null;

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/teams" className="text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
        &larr; Back to NFL Teams
      </Link>

      {/* Team Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={teamLogoUrl(data.abbr)}
              alt={fullName}
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {fullName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Draft history across the Top Pot League
              </p>
            </div>
          </div>
          {gradeClass && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                Avg Draft Grade
                <InfoTooltip text="Average letter grade for all draft picks of this team. Grades compare where a player was drafted vs. how they actually performed that season. A+ = huge steal, F = major bust." />
              </span>
              <span className={`px-3 py-1.5 rounded-lg text-lg font-bold ${gradeClass}`}>
                {data.avg_grade}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Picks"
          value={data.total_picks}
          icon={<span className="text-xl">📋</span>}
        />
        <StatCard
          title="Total Points"
          value={data.total_points.toLocaleString()}
          icon={<span className="text-xl">📊</span>}
        />
        <StatCard
          title="Seasons Span"
          value={data.by_season.length > 0
            ? `${data.by_season[0].season}–${data.by_season[data.by_season.length - 1].season}`
            : 'N/A'}
          icon={<span className="text-xl">📅</span>}
        />
        <StatCard
          title="Managers"
          value={data.homer_leaderboard.length}
          subtitle="have drafted from this team"
          icon={<span className="text-xl">👥</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Homer Leaderboard (main column) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Homer Leaderboard */}
          <div className="card">
            <h2 className="card-header flex items-center gap-2">
              <span className="text-xl">🏠</span> Homer Leaderboard
              <InfoTooltip text="Ranks managers by how many times they've drafted players from this NFL team. A high homer score means this manager really loves this franchise." />
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Who drafts the most {fullName} players?
            </p>
            <div className="space-y-3">
              {data.homer_leaderboard.map((h: any, idx: number) => {
                const hGradeClass = h.avg_grade ? GRADE_COLORS[h.avg_grade] : null;
                return (
                  <div
                    key={h.member_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      idx === 0
                        ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/30'
                        : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        #{idx + 1}
                      </span>
                      <div>
                        <MemberLink memberId={h.member_id} name={h.manager} className="font-semibold" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {h.notable_players.join(', ')}
                          {h.pick_count > h.notable_players.length && ` +${h.pick_count - h.notable_players.length} more`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{h.pick_count} picks</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{h.seasons_count} seasons</p>
                      </div>
                      {hGradeClass && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${hGradeClass}`}>
                          {h.avg_grade}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best & Worst Picks */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Best Picks */}
            <div className="card">
              <h2 className="card-header flex items-center gap-2">
                <span className="text-lg">💎</span> Best Picks
              </h2>
              {data.best_picks.length === 0 ? (
                <p className="text-sm text-gray-400">No graded data</p>
              ) : (
                <div className="space-y-2">
                  {data.best_picks.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">
                          <PlayerLink name={p.player_name} />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.season} &middot; Rd {p.round} &middot;{' '}
                          {p.member_id ? <MemberLink memberId={p.member_id} name={p.manager} /> : p.manager}
                        </p>
                      </div>
                      <div className="text-right">
                        {p.season_points != null && (
                          <p className="font-bold text-green-700 dark:text-green-400">{p.season_points.toFixed(0)} pts</p>
                        )}
                        {p.grade && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[p.grade] || ''}`}>
                            {p.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Worst Picks */}
            <div className="card">
              <h2 className="card-header flex items-center gap-2">
                <span className="text-lg">💀</span> Worst Picks
              </h2>
              {data.worst_picks.length === 0 ? (
                <p className="text-sm text-gray-400">No graded data</p>
              ) : (
                <div className="space-y-2">
                  {data.worst_picks.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium">
                          <PlayerLink name={p.player_name} />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {p.season} &middot; Rd {p.round} &middot;{' '}
                          {p.member_id ? <MemberLink memberId={p.member_id} name={p.manager} /> : p.manager}
                        </p>
                      </div>
                      <div className="text-right">
                        {p.season_points != null && (
                          <p className="font-bold text-red-700 dark:text-red-400">{p.season_points.toFixed(0)} pts</p>
                        )}
                        {p.grade && (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[p.grade] || ''}`}>
                            {p.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* All Picks Table */}
          <div className="card overflow-hidden">
            <h2 className="card-header">All Draft Picks ({data.total_picks})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2">Season</th>
                    <th className="px-3 py-2">Pick</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Pos</th>
                    <th className="px-3 py-2">Manager</th>
                    <th className="px-3 py-2 text-center">Pts</th>
                    <th className="px-3 py-2 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                  {data.all_picks.map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{p.season}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                        Rd {p.round} Pk {p.pick_number}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <PlayerLink name={p.player_name} />
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${POS_COLORS[p.player_position] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                          {p.player_position || '?'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {p.member_id ? <MemberLink memberId={p.member_id} name={p.manager} /> : p.manager}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.season_points != null ? p.season_points.toFixed(0) : '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {p.grade ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[p.grade] || ''}`}>
                            {p.grade}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Grade Breakdown */}
          <div className="card">
            <h2 className="card-header">Grade Breakdown</h2>
            {Object.keys(data.grade_breakdown).length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No graded picks yet</p>
            ) : (
              <div className="space-y-2">
                {['A+', 'A', 'B', 'C', 'D', 'F'].map((grade) => {
                  const count = data.grade_breakdown[grade] || 0;
                  if (count === 0) return null;
                  const totalGraded = Object.values(data.grade_breakdown as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
                  const pct = totalGraded > 0 ? (count / totalGraded) * 100 : 0;
                  return (
                    <div key={grade} className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold w-8 text-center ${GRADE_COLORS[grade]}`}>
                        {grade}
                      </span>
                      <div className="flex-grow h-4 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 dark:bg-primary-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Position Breakdown */}
          <div className="card">
            <h2 className="card-header">By Position</h2>
            <div className="space-y-2">
              {data.position_breakdown.map((ps: any) => (
                <div key={ps.position} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${POS_COLORS[ps.position] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                      {ps.position}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{ps.count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {ps.total_points.toLocaleString()} pts
                    </span>
                    {ps.avg_grade && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[ps.avg_grade] || ''}`}>
                        {ps.avg_grade}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Season-by-Season */}
          <div className="card">
            <h2 className="card-header">By Season</h2>
            <div className="space-y-2">
              {data.by_season.map((s: any) => {
                const sGradeClass = s.avg_grade ? GRADE_COLORS[s.avg_grade] : null;
                return (
                  <div key={s.season} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <span className="font-bold text-gray-900 dark:text-white">{s.season}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{s.picks} picks</span>
                      {sGradeClass && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${sGradeClass}`}>
                          {s.avg_grade}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
