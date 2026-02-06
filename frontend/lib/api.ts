/**
 * API client for the Commish Command backend
 */

// Remove trailing slash from API URL if present.
// NEXT_PUBLIC_API_URL must be set in production — no hardcoded fallback.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    cache: 'no-store',
  });
  
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  
  return res.json();
}

// League endpoints
export async function getLeague() {
  return fetchAPI<any>('/api/leagues');
}

export async function getSeasons() {
  return fetchAPI<any[]>('/api/leagues/seasons');
}

export async function getSeason(year: number) {
  return fetchAPI<any>(`/api/leagues/seasons/${year}`);
}

export async function getStandings(year: number) {
  return fetchAPI<any>(`/api/leagues/standings/${year}`);
}

export async function getChampions() {
  return fetchAPI<any>('/api/leagues/champions');
}

// Member endpoints
export async function getMembers() {
  return fetchAPI<any[]>('/api/members');
}

export async function getMember(id: number) {
  return fetchAPI<any>(`/api/members/${id}`);
}

export async function getMemberH2H(id: number) {
  return fetchAPI<any>(`/api/members/${id}/head-to-head`);
}

export async function getMemberRivalries(id: number) {
  return fetchAPI<any>(`/api/members/${id}/rivalries`);
}

export async function getMemberNotableEvents(id: number) {
  return fetchAPI<any>(`/api/members/${id}/notable-events`);
}

// Matchup endpoints
export async function getSeasonMatchups(year: number, week?: number) {
  const url = week 
    ? `/api/matchups/season/${year}?week=${week}`
    : `/api/matchups/season/${year}`;
  return fetchAPI<any>(url);
}

export async function getPlayoffMatchups(year: number) {
  return fetchAPI<any>(`/api/matchups/playoffs/${year}`);
}

export async function getCloseGames(limit = 20) {
  return fetchAPI<any>(`/api/matchups/close-games?limit=${limit}`);
}

export async function getBlowouts(limit = 20) {
  return fetchAPI<any>(`/api/matchups/blowouts?limit=${limit}`);
}

export async function getHighestScores(limit = 20) {
  return fetchAPI<any>(`/api/matchups/highest-scores?limit=${limit}`);
}

export async function getLowestScores(limit = 20) {
  return fetchAPI<any>(`/api/matchups/lowest-scores?limit=${limit}`);
}

// Records endpoints
export async function getAllTimeRecords() {
  return fetchAPI<any>('/api/records/all-time');
}

export async function getH2HMatrix() {
  return fetchAPI<any>('/api/records/h2h-matrix');
}

export async function getLuckAnalysis() {
  return fetchAPI<any>('/api/records/luck-analysis');
}

export async function getPowerRankings() {
  return fetchAPI<any>('/api/records/power-rankings');
}

export async function getSeasonRecords(year: number) {
  return fetchAPI<any>(`/api/records/season/${year}`);
}

// AI endpoints
export async function checkAIStatus(): Promise<{ available: boolean; provider: string | null; model: string | null }> {
  return fetchAPI('/api/ai/status');
}

export interface AITone {
  id: string;
  label: string;
}

export async function getAITones(): Promise<{ tones: AITone[]; default: string }> {
  return fetchAPI('/api/ai/tones');
}

export async function getAISummary(
  pageType: string,
  context: Record<string, unknown>,
  tone: string = 'commissioner'
): Promise<{ narrative: string; page_type: string; model?: string; tone: string; cached: boolean }> {
  const res = await fetch(`${API_BASE}/api/ai/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_type: pageType, context, tone }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to generate summary' }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export interface BlockInsight {
  block_type: string;
  context: Record<string, unknown>;
  member_context?: Record<string, unknown>;
  tone?: string;
}

export async function getBlockInsight(
  blockType: string,
  context: Record<string, unknown>,
  memberContext?: Record<string, unknown>,
  tone: string = 'commissioner'
): Promise<{ narrative: string; block_type: string; model: string; tone: string; cached: boolean }> {
  const res = await fetch(`${API_BASE}/api/ai/block-insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ block_type: blockType, context, member_context: memberContext, tone }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to generate insight' }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function getBatchInsights(
  blocks: BlockInsight[],
  tone: string = 'commissioner'
): Promise<{ insights: Record<string, string>; model: string; tone: string; cached: boolean }> {
  const blocksWithTone = blocks.map(b => ({ ...b, tone }));
  const res = await fetch(`${API_BASE}/api/ai/batch-insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks: blocksWithTone }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to generate insights' }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// Ask the Commish
export async function askCommish(
  question: string
): Promise<{ answer: string; sources_used: string[]; model: string }> {
  const res = await fetch(`${API_BASE}/api/ai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to get answer' }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function getExampleQuestions(): Promise<{ questions: string[] }> {
  return fetchAPI('/api/ai/example-questions');
}

// Draft endpoints
export async function getDraftSeasons() {
  return fetchAPI<any>('/api/drafts/seasons');
}

export async function getDraftBoard(year: number) {
  return fetchAPI<any>(`/api/drafts/board/${year}`);
}

export async function getDraftReportCard(year: number) {
  return fetchAPI<any>(`/api/drafts/report-card/${year}`);
}

export async function getDraftStealsAndBusts(year: number, limit = 10) {
  return fetchAPI<any>(`/api/drafts/steals-busts/${year}?limit=${limit}`);
}

export async function getDraftTendencies(memberId: number) {
  return fetchAPI<any>(`/api/drafts/tendencies/${memberId}`);
}

export async function getTransactions(year: number, type?: string) {
  const url = type
    ? `/api/drafts/transactions/${year}?tx_type=${type}`
    : `/api/drafts/transactions/${year}`;
  return fetchAPI<any>(url);
}

export async function getMemberTransactionActivity(memberId: number) {
  return fetchAPI<any>(`/api/drafts/transactions/activity/${memberId}`);
}

export async function getWaiverWireWins(year: number, limit = 15) {
  return fetchAPI<any>(`/api/drafts/waiver-wire-wins/${year}?limit=${limit}`);
}

// Player endpoints
export async function searchPlayers(query: string) {
  return fetchAPI<any>(`/api/players/search?q=${encodeURIComponent(query)}`);
}

export async function getPlayerHistory(playerName: string) {
  return fetchAPI<any>(`/api/players/history/${encodeURIComponent(playerName)}`);
}

// NFL Team endpoints
export async function getNFLTeams() {
  return fetchAPI<any>('/api/nfl-teams');
}

export async function getNFLTeamDetail(abbr: string) {
  return fetchAPI<any>(`/api/nfl-teams/${encodeURIComponent(abbr)}`);
}

// League history endpoint (for "This Week in League History" widget)
export async function getLeagueHistory(): Promise<any> {
  return fetchAPI('/api/matchups/history-this-week');
}

// Achievements endpoint
export async function getMemberAchievements(id: number): Promise<any> {
  return fetchAPI(`/api/members/${id}/achievements`);
}

export async function getAllAchievements(): Promise<any> {
  return fetchAPI('/api/members/achievements');
}

