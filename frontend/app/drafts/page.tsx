'use client';

import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import MemberLink from '@/components/MemberLink';
import PlayerLink from '@/components/PlayerLink';
import AIBlockInsight from '@/components/AIBlockInsight';
import {
  getDraftSeasons,
  getDraftBoard,
  getDraftReportCard,
  getDraftStealsAndBusts,
  getTransactions,
  getAISummary,
  checkAIStatus,
} from '@/lib/api';

// Grade colors
const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'A': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'B': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'C': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'D': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'F': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

// Position badge colors
const POS_COLORS: Record<string, string> = {
  'QB': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'RB': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'WR': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'TE': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'K': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  'DEF': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

type TabId = 'board' | 'report-cards' | 'steals-busts' | 'transactions';

export default function DraftsPage() {
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('report-cards');

  // Data states
  const [draftBoard, setDraftBoard] = useState<any>(null);
  const [reportCards, setReportCards] = useState<any>(null);
  const [stealsAndBusts, setStealsAndBusts] = useState<any>(null);
  const [transactions, setTransactions] = useState<any>(null);
  const [txTypeFilter, setTxTypeFilter] = useState<string>('');
  const [tabLoading, setTabLoading] = useState(false);

  // AI state
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(true);
  const hasFetchedAI = useRef(false);

  // Load available seasons on mount
  useEffect(() => {
    async function loadSeasons() {
      try {
        const data = await getDraftSeasons().catch(() => ({ seasons: [] }));
        setSeasons(data.seasons || []);
        if (data.seasons?.length > 0) {
          setSelectedYear(data.seasons[0].year);
        }
      } catch (err) {
        console.error('Failed to load draft seasons:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSeasons();
  }, []);

  // Load tab data when season or tab changes
  useEffect(() => {
    if (!selectedYear) return;
    const year = selectedYear;

    async function loadTabData() {
      setTabLoading(true);
      try {
        switch (activeTab) {
          case 'board':
            if (!draftBoard || draftBoard.season !== year) {
              const data = await getDraftBoard(year);
              setDraftBoard(data);
            }
            break;
          case 'report-cards':
            if (!reportCards || reportCards.season !== year) {
              const data = await getDraftReportCard(year);
              setReportCards(data);
              // Fetch AI narrative
              if (!hasFetchedAI.current) {
                fetchAINarrative(data);
                hasFetchedAI.current = true;
              }
            }
            break;
          case 'steals-busts':
            if (!stealsAndBusts || stealsAndBusts.season !== year) {
              const data = await getDraftStealsAndBusts(year);
              setStealsAndBusts(data);
            }
            break;
          case 'transactions':
            const data = await getTransactions(year, txTypeFilter || undefined);
            setTransactions(data);
            break;
        }
      } catch (err) {
        console.error('Failed to load tab data:', err);
      } finally {
        setTabLoading(false);
      }
    }
    loadTabData();
  }, [selectedYear, activeTab, txTypeFilter]);

  // Reset tab data when season changes
  useEffect(() => {
    setDraftBoard(null);
    setReportCards(null);
    setStealsAndBusts(null);
    setTransactions(null);
    hasFetchedAI.current = false;
    setAiNarrative(null);
  }, [selectedYear]);

  async function fetchAINarrative(reportData: any) {
    try {
      const status = await checkAIStatus();
      if (!status.available) {
        setAiAvailable(false);
        return;
      }
      setAiLoading(true);
      const aiContext = {
        season: selectedYear,
        report_cards: reportData?.report_cards || [],
      };
      const response = await getAISummary('draft_report', aiContext);
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

  if (seasons.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Draft Central</h1>
        <div className="card bg-gray-50 dark:bg-slate-700/50 text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No Draft Data Yet
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Draft data will appear here once you sync your league data from Yahoo.
            Run the data sync script to import draft picks and transactions.
          </p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'report-cards', label: 'Report Cards' },
    { id: 'board', label: 'Draft Board' },
    { id: 'steals-busts', label: 'Steals & Busts' },
    { id: 'transactions', label: 'Transactions' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with season selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Draft Central
        </h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Season:</label>
          <select
            value={selectedYear || ''}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500"
          >
            {seasons.map((s: any) => (
              <option key={s.year} value={s.year}>
                {s.year} ({s.num_picks} picks)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Insight */}
      {aiAvailable && activeTab === 'report-cards' && (
        <AIBlockInsight
          narrative={aiNarrative}
          isLoading={aiLoading}
          title="Draft Day Digest"
        />
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* Tab Content */}
      {tabLoading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : (
        <>
          {/* Report Cards Tab */}
          {activeTab === 'report-cards' && reportCards && (
            <div className="space-y-4">
              {reportCards.report_cards?.length === 0 ? (
                <div className="card text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    No graded draft data available for {selectedYear}. 
                    Player stats need to be synced to calculate grades.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {reportCards.report_cards?.map((card: any, index: number) => (
                    <div key={card.team_id} className="card hover:shadow-xl transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {card.team_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {card.member_id ? (
                              <MemberLink memberId={card.member_id} name={card.manager} />
                            ) : card.manager}
                          </p>
                        </div>
                        {card.overall_grade ? (
                          <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${
                            GRADE_COLORS[card.overall_grade] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {card.overall_grade}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 italic">No grade</span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
                          <p className="font-bold text-gray-900 dark:text-white">{card.total_picks}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Picks</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                          <p className="font-bold text-green-700 dark:text-green-400">{card.steals_count}</p>
                          <p className="text-xs text-green-600 dark:text-green-500">Steals</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                          <p className="font-bold text-red-700 dark:text-red-400">{card.busts_count}</p>
                          <p className="text-xs text-red-600 dark:text-red-500">Busts</p>
                        </div>
                      </div>

                      {card.total_season_points > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Total Draft Points</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {card.total_season_points.toFixed(1)}
                            </span>
                          </div>
                          {card.best_pick && (
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-500 dark:text-gray-400">Best Pick</span>
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {card.best_pick}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pick details (collapsed) */}
                      {card.picks?.length > 0 && (
                        <details className="mt-3">
                          <summary className="text-sm text-pink-600 dark:text-pink-400 cursor-pointer hover:underline">
                            View all picks
                          </summary>
                          <div className="mt-2 space-y-1">
                            {card.picks.map((pick: any) => (
                              <div
                                key={pick.pick_number}
                                className="flex items-center justify-between text-xs bg-gray-50 dark:bg-slate-700/50 rounded px-2 py-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 w-6">#{pick.pick_number}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                    POS_COLORS[pick.player_position] || 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {pick.player_position || '?'}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {pick.player_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {pick.season_points != null && (
                                    <span className="text-gray-500 dark:text-gray-400">{pick.season_points.toFixed(1)} pts</span>
                                  )}
                                  {pick.grade && (
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                      GRADE_COLORS[pick.grade] || ''
                                    }`}>
                                      {pick.grade}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Draft Board Tab */}
          {activeTab === 'board' && draftBoard && (
            <div className="card overflow-hidden">
              <h2 className="card-header">
                {selectedYear} Draft Board ({draftBoard.total_picks} picks)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="table-header">
                      <th className="px-3 py-2">Pick</th>
                      <th className="px-3 py-2">Round</th>
                      <th className="px-3 py-2">Player</th>
                      <th className="px-3 py-2">Pos</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="px-3 py-2">Manager</th>
                      <th className="px-3 py-2 text-center">ADP</th>
                      <th className="px-3 py-2 text-center">Pts</th>
                      <th className="px-3 py-2 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                    {Object.entries(draftBoard.rounds || {}).flatMap(([round, picks]: [string, any]) =>
                      picks.map((pick: any) => (
                        <tr
                          key={pick.pick_number}
                          className={`hover:bg-gray-50 dark:hover:bg-slate-700 ${
                            Number(round) === 1 ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''
                          }`}
                        >
                          <td className="px-3 py-2 font-mono font-bold text-gray-500 dark:text-gray-400">
                            {pick.pick_number}
                          </td>
                          <td className="px-3 py-2 text-gray-400">Rd {pick.round}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                            <PlayerLink name={pick.player_name} />
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              POS_COLORS[pick.player_position] || 'bg-gray-100 text-gray-600'
                            }`}>
                              {pick.player_position || '?'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {pick.team_name}
                          </td>
                          <td className="px-3 py-2">
                            {pick.member_id ? (
                              <MemberLink memberId={pick.member_id} name={pick.manager} />
                            ) : pick.manager}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">
                            {pick.adp ? pick.adp.toFixed(1) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center font-medium">
                            {pick.season_points != null ? pick.season_points.toFixed(1) : '-'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {pick.grade ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                GRADE_COLORS[pick.grade] || ''
                              }`}>
                                {pick.grade}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Steals & Busts Tab */}
          {activeTab === 'steals-busts' && stealsAndBusts && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Steals */}
              <div className="card">
                <h2 className="card-header flex items-center gap-2">
                  <span className="text-2xl">💎</span> Draft Steals
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Best value picks relative to draft position
                </p>
                {stealsAndBusts.steals?.length === 0 ? (
                  <p className="text-gray-400 text-sm">No graded data available</p>
                ) : (
                  <div className="space-y-2">
                    {stealsAndBusts.steals?.map((pick: any, i: number) => (
                      <div
                        key={`steal-${i}`}
                        className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-green-600 dark:text-green-400 w-6">
                            #{pick.pick_number}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            POS_COLORS[pick.player_position] || ''
                          }`}>
                            {pick.player_position}
                          </span>
                          <div>
                            <p className="font-medium text-sm">
                              <PlayerLink name={pick.player_name} />
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pick.member_id ? (
                                <MemberLink memberId={pick.member_id} name={pick.manager} />
                              ) : pick.manager}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {pick.season_points != null && (
                            <p className="font-bold text-green-700 dark:text-green-400 text-sm">
                              {pick.season_points.toFixed(1)} pts
                            </p>
                          )}
                          {pick.grade && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              GRADE_COLORS[pick.grade] || ''
                            }`}>
                              {pick.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Busts */}
              <div className="card">
                <h2 className="card-header flex items-center gap-2">
                  <span className="text-2xl">💀</span> Draft Busts
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Worst value picks relative to draft position
                </p>
                {stealsAndBusts.busts?.length === 0 ? (
                  <p className="text-gray-400 text-sm">No graded data available</p>
                ) : (
                  <div className="space-y-2">
                    {stealsAndBusts.busts?.map((pick: any, i: number) => (
                      <div
                        key={`bust-${i}`}
                        className="flex items-center justify-between bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-red-600 dark:text-red-400 w-6">
                            #{pick.pick_number}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            POS_COLORS[pick.player_position] || ''
                          }`}>
                            {pick.player_position}
                          </span>
                          <div>
                            <p className="font-medium text-sm">
                              <PlayerLink name={pick.player_name} />
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {pick.member_id ? (
                                <MemberLink memberId={pick.member_id} name={pick.manager} />
                              ) : pick.manager}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {pick.season_points != null && (
                            <p className="font-bold text-red-700 dark:text-red-400 text-sm">
                              {pick.season_points.toFixed(1)} pts
                            </p>
                          )}
                          {pick.grade && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              GRADE_COLORS[pick.grade] || ''
                            }`}>
                              {pick.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && transactions && (
            <div className="card overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="card-header mb-0">
                    Transactions ({transactions.total || 0})
                  </h2>
                  {transactions.type_breakdown && (
                    <div className="flex gap-3 mt-1">
                      {Object.entries(transactions.type_breakdown).map(([type, count]: [string, any]) => (
                        <span key={type} className="text-xs text-gray-500 dark:text-gray-400">
                          {type}: <span className="font-medium">{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="">All Types</option>
                  <option value="add">Adds</option>
                  <option value="drop">Drops</option>
                  <option value="trade">Trades</option>
                  <option value="waiver">Waivers</option>
                </select>
              </div>

              {transactions.transactions?.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">
                  No transactions found for {selectedYear}
                  {txTypeFilter && ` (type: ${txTypeFilter})`}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="table-header">
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Player</th>
                        <th className="px-3 py-2">Pos</th>
                        <th className="px-3 py-2">Manager</th>
                        <th className="px-3 py-2">Team</th>
                        <th className="px-3 py-2 text-center">Pts</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                      {transactions.transactions?.map((tx: any) => {
                        const typeColors: Record<string, string> = {
                          add: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                          drop: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          trade: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                          waiver: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        };
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                typeColors[tx.type] || 'bg-gray-100 text-gray-600'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium">
                              <PlayerLink name={tx.player_name} />
                            </td>
                            <td className="px-3 py-2">
                              {tx.player_position && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  POS_COLORS[tx.player_position] || 'bg-gray-100 text-gray-600'
                                }`}>
                                  {tx.player_position}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {tx.member_id ? (
                                <MemberLink memberId={tx.member_id} name={tx.manager} />
                              ) : tx.manager}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {tx.team_name}
                            </td>
                            <td className="px-3 py-2 text-center font-medium">
                              {tx.points_scored > 0 ? tx.points_scored.toFixed(1) : '-'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                              {tx.timestamp
                                ? new Date(tx.timestamp).toLocaleDateString()
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
