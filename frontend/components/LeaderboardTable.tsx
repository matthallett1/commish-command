import MemberLink from './MemberLink';

interface LeaderboardEntry {
  rank?: number;
  name: string;
  memberId?: number;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}

interface LeaderboardTableProps {
  title: string;
  entries: LeaderboardEntry[];
  valueLabel?: string;
  showRank?: boolean;
}

export default function LeaderboardTable({ 
  title, 
  entries, 
  valueLabel = 'Value',
  showRank = true 
}: LeaderboardTableProps) {
  return (
    <div className="card">
      <h3 className="card-header">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="table-header">
              {showRank && <th className="px-4 py-3 w-16">#</th>}
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {entries.map((entry, index) => (
              <tr 
                key={index}
                className={`${entry.highlight ? 'bg-primary-50 dark:bg-primary-900/20' : ''} hover:bg-gray-50 dark:hover:bg-slate-700`}
              >
                {showRank && (
                  <td className="table-cell font-medium">
                    {entry.rank || index + 1}
                    {(entry.rank || index + 1) === 1 && <span className="ml-1 trophy-gold">🥇</span>}
                    {(entry.rank || index + 1) === 2 && <span className="ml-1 trophy-silver">🥈</span>}
                    {(entry.rank || index + 1) === 3 && <span className="ml-1 trophy-bronze">🥉</span>}
                  </td>
                )}
                <td className="table-cell">
                  <div className="font-medium">
                    {entry.memberId ? (
                      <MemberLink memberId={entry.memberId} name={entry.name} />
                    ) : entry.name}
                  </div>
                  {entry.subValue && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{entry.subValue}</div>
                  )}
                </td>
                <td className="table-cell text-right font-semibold text-primary-600 dark:text-primary-400">
                  {entry.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
