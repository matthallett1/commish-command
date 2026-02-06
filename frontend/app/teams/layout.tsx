import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NFL Teams',
  description: 'See which NFL franchises dominate Top Pot League drafts — homer leaderboards, grade breakdowns, and pick history by team.',
};

export default function TeamsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
