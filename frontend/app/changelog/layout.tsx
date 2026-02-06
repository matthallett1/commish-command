import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'What the Commish has been cooking — new features, fixes, and upgrades to Commish Command.',
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
