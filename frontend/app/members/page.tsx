'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getMembers } from '@/lib/api';

export default function MembersPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>('total_championships');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function loadMembers() {
      try {
        const data = await getMembers();
        setMembers(data);
      } catch (err) {
        console.error('Failed to load members:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  const sortedMembers = [...members].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-gray-400">
      {sortField === field ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        League Managers
      </h1>

      {/* Members Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3">Member</th>
                <th 
                  className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                  onClick={() => handleSort('total_championships')}
                >
                  Championships <SortIcon field="total_championships" />
                </th>
                <th 
                  className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                  onClick={() => handleSort('total_seasons')}
                >
                  Seasons <SortIcon field="total_seasons" />
                </th>
                <th 
                  className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                  onClick={() => handleSort('win_percentage')}
                >
                  Win % <SortIcon field="win_percentage" />
                </th>
                <th 
                  className="px-6 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                  onClick={() => handleSort('total_wins')}
                >
                  Wins <SortIcon field="total_wins" />
                </th>
                <th 
                  className="px-6 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                  onClick={() => handleSort('total_points_for')}
                >
                  Total Points <SortIcon field="total_points_for" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
              {sortedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="table-cell">
                    <Link 
                      href={`/members/${member.id}`}
                      className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {member.name}
                    </Link>
                  </td>
                  <td className="table-cell text-center">
                    {member.total_championships > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-yellow-500 dark:text-yellow-400">{'🏆'.repeat(Math.min(member.total_championships, 3))}</span>
                        {member.total_championships > 3 && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">+{member.total_championships - 3}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="table-cell text-center">{member.total_seasons}</td>
                  <td className="table-cell text-center">
                    <span className={`font-semibold ${
                      member.win_percentage >= 55 ? 'text-green-600 dark:text-green-400' :
                      member.win_percentage >= 45 ? 'text-gray-600 dark:text-gray-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {member.win_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <span className="font-mono">
                      {member.total_wins}-{member.total_losses}
                    </span>
                  </td>
                  <td className="table-cell text-right font-semibold">
                    {member.total_points_for.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Cards (Mobile-friendly view) */}
      <div className="md:hidden space-y-4">
        {sortedMembers.map((member) => (
          <Link 
            key={member.id}
            href={`/members/${member.id}`}
            className="card block hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {member.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.total_seasons} seasons | {member.total_wins}-{member.total_losses}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl">
                  {'🏆'.repeat(Math.min(member.total_championships, 3))}
                </div>
                <div className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {member.win_percentage.toFixed(1)}% wins
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
