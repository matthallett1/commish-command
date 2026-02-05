import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Matchups',
  description: 'Close games, blowouts, highest scores, and lowest scores from every week of fantasy football history.',
};

export default function MatchupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
