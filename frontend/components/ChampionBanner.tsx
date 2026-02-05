import Link from 'next/link';

interface Champion {
  year: number;
  team_name: string;
  manager: string;
  record?: string;
}

interface ChampionBannerProps {
  champions: Champion[];
}

export default function ChampionBanner({ champions }: ChampionBannerProps) {
  return (
    <div className="card">
      <h2 className="card-header flex items-center">
        <svg className="w-6 h-6 text-yellow-500 dark:text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
          <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
        </svg>
        Trophy Case
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {champions.map((champion, index) => (
          <Link
            key={champion.year}
            href={`/standings?year=${champion.year}`}
            className={`relative p-4 rounded-lg text-center transition-all hover:scale-105 cursor-pointer ${
              index === 0 
                ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 ring-2 ring-yellow-400 hover:ring-yellow-500'
                : 'bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            <div className={`text-3xl mb-2 ${index === 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400'}`}>
              🏆
            </div>
            <div className="font-bold text-lg text-gray-900 dark:text-white">
              {champion.year}
            </div>
            <div className="text-sm font-medium text-primary-600 dark:text-primary-400 truncate">
              {champion.manager}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {champion.team_name}
            </div>
            {champion.record && (
              <div className="text-xs text-gray-400 mt-1">
                {champion.record}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
