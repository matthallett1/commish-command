import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Player Search',
  description: 'Search any player to see their full history in the Top Pot League — every draft pick, transaction, and timeline event.',
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
