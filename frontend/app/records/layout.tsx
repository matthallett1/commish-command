import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Records & Rankings',
  description: 'All-time records, power rankings, head-to-head matrix, and luck analysis across 12 seasons of fantasy football.',
};

export default function RecordsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
