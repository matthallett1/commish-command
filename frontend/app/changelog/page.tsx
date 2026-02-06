'use client';

import Link from 'next/link';

interface ChangelogEntry {
  date: string;
  version: string;
  title: string;
  description: string;
  items: { type: 'feature' | 'fix' | 'improvement' | 'data'; text: string }[];
}

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  feature: { bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'New' },
  fix: { bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Fix' },
  improvement: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', label: 'Upgrade' },
  data: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', label: 'Data' },
};

const CHANGELOG: ChangelogEntry[] = [
  {
    date: 'February 6, 2026',
    version: '1.7',
    title: 'The "I Know What That Means Now" Update',
    description:
      'The Commish got tired of managers pretending they understood the stats. Now there are tooltips everywhere explaining what things like "Avg Draft Grade" and "Power Score" actually mean. No more nodding along in the group chat like you passed the fantasy SATs.',
    items: [
      { type: 'feature', text: 'Tooltip explanations added throughout the app — hover over any (i) icon to learn what a metric means' },
      { type: 'feature', text: 'Changelog page launched (you\'re reading it now, so clearly you\'re the type who reads patch notes instead of setting your lineup)' },
      { type: 'improvement', text: 'Tooltips cover Draft Grades, Power Score, Luck Factor, Steals & Busts, ADP, and more' },
    ],
  },
  {
    date: 'February 6, 2026',
    version: '1.6',
    title: 'The "NFL Fandom Exposed" Update',
    description:
      'We built an entire NFL Teams section so everyone can see which real-life franchises you keep drafting from. Got a homer problem? Now there\'s a leaderboard for it. Your irrational love for the Lions is now public record, and the Commish has receipts.',
    items: [
      { type: 'feature', text: 'NFL Teams page — browse all 32 teams organized by AFC/NFC divisions' },
      { type: 'feature', text: 'Team detail pages with Homer Leaderboards, best/worst picks, and grade breakdowns' },
      { type: 'feature', text: 'NFL team logos pulled in from ESPN\'s CDN because we\'re not animals' },
      { type: 'improvement', text: '"Members" renamed to "Managers" — because you manage a team, even if your management is questionable' },
      { type: 'fix', text: 'Fixed team pages returning "Team Not Found" due to a sneaky API redirect issue' },
    ],
  },
  {
    date: 'February 6, 2026',
    version: '1.5',
    title: 'The "Stop Lying About Your Draft" Update',
    description:
      'Draft grades were recalibrated because somehow everyone was getting A\'s, which — let\'s be honest — is statistically impossible given some of the picks in this league. If you drafted a kicker in the 3rd round, you don\'t deserve an A. Fixed.',
    items: [
      { type: 'fix', text: 'Draft grades now use overall scoring rank instead of position rank — no more participation trophies' },
      { type: 'feature', text: 'Player search and history — look up any player to see their full draft/transaction timeline in our league' },
      { type: 'data', text: 'NFL team affiliations added to all draft picks so the AI stops calling DeSean Jackson a Seahawk' },
      { type: 'improvement', text: 'AI Commish now knows about ALL draft rounds, not just the first few — total recall activated' },
    ],
  },
  {
    date: 'February 5, 2026',
    version: '1.4',
    title: 'The "Dark Mode & Draft Day" Update',
    description:
      'Drafts and transactions are now fully tracked. We also fixed dark mode because half the league was complaining it looked like a website from 2003. The AI Commish now has draft pick knowledge, so don\'t try to gaslight it about who picked whom.',
    items: [
      { type: 'feature', text: 'Draft Central — full draft board, report cards with letter grades, steals & busts, and transaction history' },
      { type: 'feature', text: 'Draft Steals & Busts analysis — find out who actually won (and lost) each draft' },
      { type: 'feature', text: 'Ask the Commish now knows about draft picks and transactions' },
      { type: 'improvement', text: 'Dark mode completely overhauled — every page, every component, every corner' },
      { type: 'improvement', text: 'Open Graph images and social sharing cards — your league preview looks sharp in iMessage now' },
      { type: 'data', text: 'Yahoo data sync pulls in drafts and transactions for all 12 seasons' },
      { type: 'fix', text: 'Fixed various TypeScript build errors that were blocking deployment' },
    ],
  },
  {
    date: 'February 3, 2026',
    version: '1.3',
    title: 'The "AI Has Entered the Chat" Update',
    description:
      'The Commissioner is now powered by AI. Ask it anything about the league and watch it roast your fantasy career with cold, hard data. It knows your record. It knows your draft busts. It remembers that time you started a player on bye week. There is no hiding.',
    items: [
      { type: 'feature', text: 'Ask the Commish — AI-powered chatbot that answers questions about league history, rivalries, and records' },
      { type: 'feature', text: 'AI Block Insights — automated season recaps, draft digests, and record summaries on every major page' },
      { type: 'improvement', text: 'AI uses your actual league data as context — no hallucinated stats, just verified trash talk ammunition' },
    ],
  },
  {
    date: 'February 2, 2026',
    version: '1.2',
    title: 'The "Going Live" Update',
    description:
      'Commish Command went from a local side project to a fully deployed, publicly accessible dashboard. PostgreSQL backend on Railway, Next.js frontend on Vercel. Like upgrading from a card table in the garage to a proper war room. Your league deserves production-grade infrastructure for its mediocre rosters.',
    items: [
      { type: 'feature', text: 'Deployed to production — Railway (backend) + Vercel (frontend)' },
      { type: 'improvement', text: 'Migrated from SQLite to PostgreSQL for production reliability' },
      { type: 'improvement', text: 'Security hardening — proper CORS, environment configs, no exposed debug endpoints' },
      { type: 'data', text: 'Full Yahoo Fantasy API integration syncs all historical league data' },
      { type: 'fix', text: 'Fixed Docker configuration for Railway deployment' },
    ],
  },
  {
    date: 'February 2, 2026',
    version: '1.1',
    title: 'The "Actually Looks Good Now" Update',
    description:
      'Rebranded from a generic dashboard to Commish Command — Your League. Your Rules. Your Regime. Added the "Currently Viewing" label so nobody confuses their fantasy league with a real sports organization. Cleaned up a bunch of leftover code from features that didn\'t make the cut, like a roster on waiver day.',
    items: [
      { type: 'improvement', text: 'Rebranded to "Commish Command" with new tagline and identity' },
      { type: 'improvement', text: 'Added "Currently Viewing" label on home page to clarify league context' },
      { type: 'fix', text: 'Cleaned up unused code and debug artifacts' },
    ],
  },
  {
    date: 'February 2, 2026',
    version: '1.0',
    title: 'The "12 Years in the Making" Launch',
    description:
      'The original release. 12 seasons of Top Pot League history — standings, records, head-to-head matchups, power rankings, luck analysis, and manager profiles — all in one place. Every win, every loss, every embarrassing last-place finish, preserved forever. You\'re welcome (and also, I\'m sorry).',
    items: [
      { type: 'feature', text: 'Season standings from 2014 to 2025 with full records' },
      { type: 'feature', text: 'All-Time Records — highest score, lowest score, biggest blowout, closest game' },
      { type: 'feature', text: 'Head-to-Head matrix — see your all-time record against every rival' },
      { type: 'feature', text: 'Power Rankings — composite score combining wins, titles, playoffs, scoring, and longevity' },
      { type: 'feature', text: 'Luck Analysis — finally, mathematical proof that your schedule was unfair' },
      { type: 'feature', text: 'Manager profiles with career stats, season-by-season breakdowns, and rival histories' },
      { type: 'feature', text: 'Championship banner and leaders board' },
      { type: 'feature', text: 'League History widget — "This Week in League History" flashbacks' },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
          Changelog
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          What the Commish has been cooking. New features, fixes, and regime upgrades.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

        <div className="space-y-10">
          {CHANGELOG.map((entry, idx) => (
            <div key={idx} className="relative pl-12">
              {/* Dot on timeline */}
              <div className={`absolute left-2.5 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                idx === 0 ? 'bg-pink-500' : 'bg-gray-400 dark:bg-slate-500'
              }`} />

              {/* Date & version badge */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {entry.date}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
                  v{entry.version}
                </span>
              </div>

              {/* Card */}
              <div className="card">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {entry.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {entry.description}
                </p>
                <ul className="space-y-2">
                  {entry.items.map((item, i) => {
                    const style = TYPE_STYLES[item.type];
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${style.bg}`}>
                          {style.label}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
          That&apos;s where it all started. Every feature above was built to make sure your
          fantasy football legacy is properly documented — for better or worse.
        </p>
        <Link
          href="/"
          className="mt-3 inline-block text-pink-600 dark:text-pink-400 hover:underline text-sm font-medium"
        >
          &larr; Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
