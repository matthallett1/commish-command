'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatCard from '@/components/StatCard';
import { getMember, getMemberH2H, getMemberRivalries } from '@/lib/api';

export default function MemberProfilePage() {
  const params = useParams();
  const memberId = Number(params.id);
  
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [h2h, setH2H] = useState<any>(null);
  const [rivalries, setRivalries] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [memberData, h2hData, rivalriesData] = await Promise.all([
          getMember(memberId),
          getMemberH2H(memberId),
          getMemberRivalries(memberId),
        ]);
        setMember(memberData);
        setH2H(h2hData);
        setRivalries(rivalriesData);
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Seasons Played" value={member.total_seasons} />
        <StatCard title="All-Time Record" value={`${member.total_wins}-${member.total_losses}`} />
        <StatCard title="Win Percentage" value={`${member.win_percentage}%`} />
        <StatCard title="Avg Points/Season" value={member.avg_points_per_season.toLocaleString()} />
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        <StatCard 
          title="Best Finish" 
          value={member.best_finish === 1 ? '🥇 Champion' : `#${member.best_finish}`}
        />
        <StatCard 
          title="Worst Finish" 
          value={`#${member.worst_finish}`}
        />
      </div>

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
                    vs {rivalry.member_name}
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
                    <td className="table-cell font-medium">{record.member_name}</td>
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
        </div>
      )}
    </div>
  );
}
