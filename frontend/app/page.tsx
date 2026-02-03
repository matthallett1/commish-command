'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '@/components/StatCard';
import ChampionBanner from '@/components/ChampionBanner';
import LeaderboardTable from '@/components/LeaderboardTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getLeague, getChampions, getMembers, getPowerRankings } from '@/lib/api';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<any>(null);
  const [champions, setChampions] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [powerRankings, setPowerRankings] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [leagueData, championsData, membersData, rankingsData] = await Promise.all([
          getLeague().catch(() => null),
          getChampions().catch(() => null),
          getMembers().catch(() => []),
          getPowerRankings().catch(() => null),
        ]);
        
        setLeague(leagueData);
        setChampions(championsData);
        setMembers(membersData);
        setPowerRankings(rankingsData);
      } catch (err) {
        setError('Failed to load dashboard data. Make sure the API is running.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">Error Loading Data</h2>
        <p className="mt-2 text-red-600 dark:text-red-300">{error}</p>
        <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Make sure the backend API is running:
          </p>
          <code className="block mt-2 p-2 bg-gray-100 dark:bg-slate-700 rounded text-sm">
            cd backend && uvicorn api.main:app --reload
          </code>
        </div>
      </div>
    );
  }

  // Calculate some stats
  const totalSeasons = league?.total_seasons || members.reduce((max, m) => Math.max(max, m.total_seasons || 0), 0);
  const totalMembers = members.length;
  const mostChampionships = champions?.championship_leaders?.[0];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
          Top Pot Fantasy Football
        </h1>
        <p className="mt-3 text-xl text-gray-600 dark:text-gray-300">
          {totalSeasons} Years of Glory, Heartbreak, and Trash Talk
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Seasons"
          value={totalSeasons}
          icon={
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          title="League Members"
          value={totalMembers}
          icon={
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Most Championships"
          value={mostChampionships?.championships || 0}
          subtitle={mostChampionships?.member || 'N/A'}
          icon={
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          title="12 Teams"
          value="Every Year"
          icon={
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          }
        />
      </div>

      {/* Champions Banner */}
      {champions?.yearly_champions && champions.yearly_champions.length > 0 && (
        <ChampionBanner champions={champions.yearly_champions} />
      )}

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Championship Leaders */}
        {champions?.championship_leaders && (
          <LeaderboardTable
            title="Championship Leaders"
            entries={champions.championship_leaders.map((c: any) => ({
              name: c.member,
              value: c.championships,
            }))}
            valueLabel="Titles"
          />
        )}

        {/* Power Rankings */}
        {powerRankings?.rankings && (
          <LeaderboardTable
            title="All-Time Power Rankings"
            entries={powerRankings.rankings.slice(0, 10).map((r: any) => ({
              rank: r.rank,
              name: r.member,
              value: r.power_score,
              subValue: `${r.championships} titles | ${r.win_percentage}% wins`,
            }))}
            valueLabel="Score"
          />
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/standings" className="card hover:shadow-xl transition-shadow group">
          <div className="text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Standings</h3>
            <p className="text-sm text-gray-500">Season by season</p>
          </div>
        </Link>
        <Link href="/members" className="card hover:shadow-xl transition-shadow group">
          <div className="text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">👥</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Members</h3>
            <p className="text-sm text-gray-500">Player profiles</p>
          </div>
        </Link>
        <Link href="/records" className="card hover:shadow-xl transition-shadow group">
          <div className="text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏆</div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Records</h3>
            <p className="text-sm text-gray-500">All-time bests</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
