import Link from 'next/link';

interface MemberLinkProps {
  memberId: number;
  name: string;
  className?: string;
}

/**
 * Reusable component that renders a member name as a link to their profile page.
 * Used throughout the app to make member names clickable.
 */
export default function MemberLink({ memberId, name, className = '' }: MemberLinkProps) {
  return (
    <Link 
      href={`/members/${memberId}`}
      className={`text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 hover:underline transition-colors ${className}`}
    >
      {name}
    </Link>
  );
}
