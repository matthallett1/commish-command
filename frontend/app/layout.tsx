import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import AskTheCommish from '@/components/AskTheCommish';

const siteTitle = 'Commish Command';
const siteDescription =
  'Your league. Your rules. Your regime. 12 seasons of fantasy football history — drafts, records, head-to-head rivalries, and AI-powered analysis.';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')
  ),
  title: {
    default: `${siteTitle} — Fantasy Football Dashboard`,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  applicationName: siteTitle,
  keywords: [
    'fantasy football',
    'commissioner',
    'league history',
    'draft board',
    'head to head',
    'power rankings',
    'stats',
    'analytics',
  ],
  openGraph: {
    type: 'website',
    siteName: siteTitle,
    title: `${siteTitle} — Fantasy Football Dashboard`,
    description: siteDescription,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteTitle} — Fantasy Football Dashboard`,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to apply saved theme before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('theme');
              if (t === 'dark') document.documentElement.classList.add('dark');
              else if (t === 'light') document.documentElement.classList.remove('dark');
              else if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="antialiased">
        <div className="min-h-screen">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 dark:border-slate-700 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Commish Command — Your League. Your Rules. Your Regime.</span>
                <span className="hidden sm:inline">·</span>
                <a href="/changelog" className="text-pink-600 dark:text-pink-400 hover:underline font-medium">
                  What&apos;s New
                </a>
              </div>
            </div>
          </footer>
          <AskTheCommish />
        </div>
      </body>
    </html>
  );
}
