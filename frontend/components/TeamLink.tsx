import Link from 'next/link';

interface TeamLinkProps {
  abbr: string;
  className?: string;
}

/**
 * Reusable component that renders an NFL team abbreviation as a link to its team page.
 * Used throughout the app to make NFL team names clickable.
 */
export default function TeamLink({ abbr, className = '' }: TeamLinkProps) {
  if (!abbr) return null;
  return (
    <Link
      href={`/teams/${encodeURIComponent(abbr)}`}
      className={`text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors ${className}`}
    >
      {abbr}
    </Link>
  );
}
