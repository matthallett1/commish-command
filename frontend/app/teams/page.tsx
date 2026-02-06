'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getNFLTeams } from '@/lib/api';

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-600 dark:text-emerald-400',
  'A': 'text-green-600 dark:text-green-400',
  'B': 'text-blue-600 dark:text-blue-400',
  'C': 'text-yellow-600 dark:text-yellow-400',
  'D': 'text-orange-600 dark:text-orange-400',
  'F': 'text-red-600 dark:text-red-400',
};

interface Division {
  name: string;
  teams: { abbr: string; name: string; city: string }[];
}

interface Conference {
  name: string;
  color: string;
  darkColor: string;
  accentBg: string;
  divisions: Division[];
}

const CONFERENCES: Conference[] = [
  {
    name: 'AFC',
    color: 'text-red-700',
    darkColor: 'dark:text-red-400',
    accentBg: 'from-red-500/10 to-red-600/5 dark:from-red-500/10 dark:to-red-900/5',
    divisions: [
      {
        name: 'East',
        teams: [
          { abbr: 'BUF', name: 'Bills', city: 'Buffalo' },
          { abbr: 'MIA', name: 'Dolphins', city: 'Miami' },
          { abbr: 'NE', name: 'Patriots', city: 'New England' },
          { abbr: 'NYJ', name: 'Jets', city: 'NY Jets' },
        ],
      },
      {
        name: 'North',
        teams: [
          { abbr: 'BAL', name: 'Ravens', city: 'Baltimore' },
          { abbr: 'CIN', name: 'Bengals', city: 'Cincinnati' },
          { abbr: 'CLE', name: 'Browns', city: 'Cleveland' },
          { abbr: 'PIT', name: 'Steelers', city: 'Pittsburgh' },
        ],
      },
      {
        name: 'South',
        teams: [
          { abbr: 'HOU', name: 'Texans', city: 'Houston' },
          { abbr: 'IND', name: 'Colts', city: 'Indianapolis' },
          { abbr: 'JAX', name: 'Jaguars', city: 'Jacksonville' },
          { abbr: 'TEN', name: 'Titans', city: 'Tennessee' },
        ],
      },
      {
        name: 'West',
        teams: [
          { abbr: 'DEN', name: 'Broncos', city: 'Denver' },
          { abbr: 'KC', name: 'Chiefs', city: 'Kansas City' },
          { abbr: 'LV', name: 'Raiders', city: 'Las Vegas' },
          { abbr: 'LAC', name: 'Chargers', city: 'LA Chargers' },
        ],
      },
    ],
  },
  {
    name: 'NFC',
    color: 'text-blue-700',
    darkColor: 'dark:text-blue-400',
    accentBg: 'from-blue-500/10 to-blue-600/5 dark:from-blue-500/10 dark:to-blue-900/5',
    divisions: [
      {
        name: 'East',
        teams: [
          { abbr: 'DAL', name: 'Cowboys', city: 'Dallas' },
          { abbr: 'NYG', name: 'Giants', city: 'NY Giants' },
          { abbr: 'PHI', name: 'Eagles', city: 'Philadelphia' },
          { abbr: 'WAS', name: 'Commanders', city: 'Washington' },
        ],
      },
      {
        name: 'North',
        teams: [
          { abbr: 'CHI', name: 'Bears', city: 'Chicago' },
          { abbr: 'DET', name: 'Lions', city: 'Detroit' },
          { abbr: 'GB', name: 'Packers', city: 'Green Bay' },
          { abbr: 'MIN', name: 'Vikings', city: 'Minnesota' },
        ],
      },
      {
        name: 'South',
        teams: [
          { abbr: 'ATL', name: 'Falcons', city: 'Atlanta' },
          { abbr: 'CAR', name: 'Panthers', city: 'Carolina' },
          { abbr: 'NO', name: 'Saints', city: 'New Orleans' },
          { abbr: 'TB', name: 'Buccaneers', city: 'Tampa Bay' },
        ],
      },
      {
        name: 'West',
        teams: [
          { abbr: 'ARI', name: 'Cardinals', city: 'Arizona' },
          { abbr: 'LAR', name: 'Rams', city: 'LA Rams' },
          { abbr: 'SF', name: '49ers', city: 'San Francisco' },
          { abbr: 'SEA', name: 'Seahawks', city: 'Seattle' },
        ],
      },
    ],
  },
];

export default function TeamsPage() {
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState<Record<string, any>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await getNFLTeams();
        const map: Record<string, any> = {};
        for (const t of data.teams || []) {
          map[t.abbr] = t;
        }
        setTeamData(map);
      } catch (err) {
        console.error('Failed to load NFL teams:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          NFL Teams
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Which NFL franchises dominate Top Pot drafts?
        </p>
      </div>

      {/* Conference Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {CONFERENCES.map((conf) => (
          <div key={conf.name}>
            {/* Conference Header */}
            <div className={`flex items-center gap-3 mb-5`}>
              <h2 className={`text-2xl font-extrabold tracking-tight ${conf.color} ${conf.darkColor}`}>
                {conf.name}
              </h2>
              <div className="flex-grow h-px bg-gray-200 dark:bg-slate-700" />
            </div>

            {/* Divisions */}
            <div className="space-y-6">
              {conf.divisions.map((div) => (
                <div key={div.name}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 pl-1">
                    {conf.name} {div.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {div.teams.map((team) => {
                      const stats = teamData[team.abbr];
                      const picks = stats?.total_picks || 0;
                      const grade = stats?.avg_grade;
                      const gradeColor = grade ? GRADE_COLORS[grade] : '';

                      return (
                        <Link
                          key={team.abbr}
                          href={`/teams/${team.abbr}`}
                          className={`group relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-gradient-to-br ${conf.accentBg} p-3 hover:shadow-lg hover:border-gray-300 dark:hover:border-slate-500 transition-all`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                {team.city}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {team.name}
                              </p>
                            </div>
                            <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                              {team.abbr}
                            </span>
                          </div>

                          {picks > 0 ? (
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{picks}</span> picks
                              </span>
                              {grade && (
                                <span className={`font-bold ${gradeColor}`}>
                                  {grade}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
                              No draft data
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
