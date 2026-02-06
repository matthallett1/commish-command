import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Managers',
  description: 'League manager profiles — career stats, championships, draft tendencies, and head-to-head records.',
};

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
