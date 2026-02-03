/**
 * API client for the Top Pot Dashboard backend
 */

// Remove trailing slash from API URL if present
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://commish-command-production.up.railway.app').replace(/\/$/, '');

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

// Chat endpoints
export async function getChatStats() {
  return fetchAPI<any>('/api/chat/stats');
}

export async function getChatLeaderboard() {
  return fetchAPI<any>('/api/chat/leaderboard');
}

export async function getWordCloud(memberId?: number, limit = 100) {
  const url = memberId 
    ? `/api/chat/word-cloud?member_id=${memberId}&limit=${limit}`
    : `/api/chat/word-cloud?limit=${limit}`;
  return fetchAPI<any>(url);
}

export async function getActivityTimeline(period: 'day' | 'week' | 'month' | 'year' = 'month') {
  return fetchAPI<any>(`/api/chat/activity-timeline?period=${period}`);
}

export async function getPersonas() {
  return fetchAPI<any>('/api/chat/personas');
}

export async function getChatHighlights(limit = 10) {
  return fetchAPI<any>(`/api/chat/highlights?limit=${limit}`);
}
