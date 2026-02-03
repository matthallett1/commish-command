'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import MemberLink from '@/components/MemberLink';
import AIBlockInsight from '@/components/AIBlockInsight';
import { getSeasons, getStandings, getSeasonRecords, getAISummary, checkAIStatus } from '@/lib/api';

function StandingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [standings, setStandings] = useState<any>(null);
  const [seasonRecords, setSeasonRecords] = useState<any>(null);
  
  // AI state
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const lastFetchedYearRef = useRef<number | null>(null);

  // Load seasons on mount
  useEffect(() => {
    async function loadSeasons() {
      try {
        const data = await getSeasons();
        setSeasons(data);
        
        // Check URL for year parameter, otherwise use most recent
        const yearParam = searchParams.get('year');
        if (yearParam && data.some((s: any) => s.year === Number(yearParam))) {
          setSelectedYear(Number(yearParam));
        } else if (data.length > 0) {
          setSelectedYear(data[0].year);
        }
      } catch (err) {
        console.error('Failed to load seasons:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSeasons();
  }, [searchParams]);

  // Load standings and records when year changes
  useEffect(() => {
    if (selectedYear) {
      loadSeasonData(selectedYear);
    }
  }, [selectedYear]);

  async function loadSeasonData(year: number) {
    try {
      // Load standings first (required)
      const standingsData = await getStandings(year);
      setStandings(standingsData);
      
      // Load season records (optional - may not exist on older backends)
      let recordsData = null;
      try {
        recordsData = await getSeasonRecords(year);
        setSeasonRecords(recordsData);
      } catch (recordsErr) {
        console.warn('Season records not available:', recordsErr);
        setSeasonRecords(null);
      }
      
      // Fetch AI narrative for this season (only if year changed)
      if (year !== lastFetchedYearRef.current) {
        fetchAINarrative(year, standingsData, recordsData);
        lastFetchedYearRef.current = year;
      }
    } catch (err) {
      console.error('Failed to load standings:', err);
    }
  }
  
  async function fetchAINarrative(year: number, standingsData: any, recordsData: any) {
    try {
      const status = await checkAIStatus();
      if (!status.available) {
        setAiAvailable(false);
        return;
      }
      
      setAiLoading(true);
      setAiNarrative(null);
      
      const aiContext = {
        season: { year },
        standings: standingsData?.standings || [],
        season_records: recordsData || {},
      };
      
      const response = await getAISummary('standings', aiContext);
      setAiNarrative(response.narrative);
    } catch (err) {
      console.error('Failed to fetch AI narrative:', err);
    } finally {
      setAiLoading(false);
    }
  }

  function handleYearChange(year: number) {
    setSelectedYear(year);
    // Update URL without full page reload
    router.push(`/standings?year=${year}`, { scroll: false });
  }

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Season Standings
      </h1>

      {/* Season Selector with AI Recap underneath */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Select Season</h3>
        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => (
            <button
              key={season.year}
              onClick={() => handleYearChange(season.year)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedYear === season.year
                  ? 'bg-pink-600 text-white'
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
        
        {/* AI Season Recap - Right under the selector */}
        {selectedYear && aiAvailable && (
          <AIBlockInsight 
            narrative={aiNarrative}
            isLoading={aiLoading}
            title={`${selectedYear} Season Recap`}
          />
        )}
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
                <span className="font-semibold">
                  {standings.standings[0].member_id ? (
                    <MemberLink 
                      memberId={standings.standings[0].member_id} 
                      name={standings.standings[0].manager}
                      className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700"
                    />
                  ) : standings.standings[0].manager}
                </span>
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
                    <td className="table-cell">
                      {team.member_id ? (
                        <MemberLink memberId={team.member_id} name={team.manager} />
                      ) : team.manager}
                    </td>
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

      {/* Season Records/Notable Events */}
      {seasonRecords && (seasonRecords.highest_score || seasonRecords.biggest_blowout) && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {selectedYear} Season Highlights
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Highest Score */}
            {seasonRecords.highest_score && (
              <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  🔥 Season High Score
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-green-600">{seasonRecords.highest_score.score}</p>
                  <p className="mt-2 text-green-700 dark:text-green-300">
                    {seasonRecords.highest_score.member_id ? (
                      <MemberLink 
                        memberId={seasonRecords.highest_score.member_id} 
                        name={seasonRecords.highest_score.manager}
                        className="text-green-700 dark:text-green-300 font-medium"
                      />
                    ) : seasonRecords.highest_score.manager}
                    {' '}({seasonRecords.highest_score.team})
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Week {seasonRecords.highest_score.week}
                    {seasonRecords.highest_score.is_playoff && ' (Playoffs)'}
                  </p>
                </div>
              </div>
            )}

            {/* Lowest Score */}
            {seasonRecords.lowest_score && (
              <div className="card bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  💀 Season Low Score
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-red-600">{seasonRecords.lowest_score.score}</p>
                  <p className="mt-2 text-red-700 dark:text-red-300">
                    {seasonRecords.lowest_score.member_id ? (
                      <MemberLink 
                        memberId={seasonRecords.lowest_score.member_id} 
                        name={seasonRecords.lowest_score.manager}
                        className="text-red-700 dark:text-red-300 font-medium"
                      />
                    ) : seasonRecords.lowest_score.manager}
                    {' '}({seasonRecords.lowest_score.team})
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Week {seasonRecords.lowest_score.week}
                  </p>
                </div>
              </div>
            )}

            {/* Biggest Blowout */}
            {seasonRecords.biggest_blowout && (
              <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                  😤 Biggest Blowout
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-purple-600">+{seasonRecords.biggest_blowout.margin}</p>
                  <p className="mt-2 text-purple-700 dark:text-purple-300">
                    {seasonRecords.biggest_blowout.winner_member_id ? (
                      <MemberLink 
                        memberId={seasonRecords.biggest_blowout.winner_member_id} 
                        name={seasonRecords.biggest_blowout.winner}
                        className="text-purple-700 dark:text-purple-300 font-medium"
                      />
                    ) : seasonRecords.biggest_blowout.winner}
                    {' '}({seasonRecords.biggest_blowout.winner_score})
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    defeated {seasonRecords.biggest_blowout.loser} ({seasonRecords.biggest_blowout.loser_score})
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    Week {seasonRecords.biggest_blowout.week}
                    {seasonRecords.biggest_blowout.is_playoff && ' (Playoffs)'}
                  </p>
                </div>
              </div>
            )}

            {/* Closest Game */}
            {seasonRecords.closest_game && (
              <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                  😰 Closest Game
                </h3>
                <div className="mt-3">
                  <p className="text-4xl font-bold text-blue-600">{seasonRecords.closest_game.margin}</p>
                  <p className="mt-2 text-blue-700 dark:text-blue-300">
                    {seasonRecords.closest_game.winner_member_id ? (
                      <MemberLink 
                        memberId={seasonRecords.closest_game.winner_member_id} 
                        name={seasonRecords.closest_game.winner}
                        className="text-blue-700 dark:text-blue-300 font-medium"
                      />
                    ) : seasonRecords.closest_game.winner}
                    {' '}({seasonRecords.closest_game.winner_score})
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    vs {seasonRecords.closest_game.loser} ({seasonRecords.closest_game.loser_score})
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Week {seasonRecords.closest_game.week}
                    {seasonRecords.closest_game.is_playoff && ' (Playoffs)'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StandingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <StandingsContent />
    </Suspense>
  );
}
