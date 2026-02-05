import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Standings',
  description: 'Season-by-season standings, win-loss records, and points for the Top Pot Fantasy Football League.',
};

export default function StandingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
