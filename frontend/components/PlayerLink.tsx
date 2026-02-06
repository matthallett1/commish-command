import Link from 'next/link';

interface PlayerLinkProps {
  name: string;
  className?: string;
}

/**
 * Reusable component that renders a player name as a link to their player page.
 * Used throughout the app to make player names clickable.
 */
export default function PlayerLink({ name, className = '' }: PlayerLinkProps) {
  return (
    <Link 
      href={`/players/${encodeURIComponent(name)}`}
      className={`text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 hover:underline transition-colors ${className}`}
    >
      {name}
    </Link>
  );
}
