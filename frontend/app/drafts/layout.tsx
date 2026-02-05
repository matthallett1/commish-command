import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drafts & Transactions',
  description: 'Draft boards, report cards, steals & busts, and transaction history across every season.',
};

export default function DraftsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
