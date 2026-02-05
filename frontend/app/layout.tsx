import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';
import AskTheCommish from '@/components/AskTheCommish';

export const metadata: Metadata = {
  title: 'Commish Command - Fantasy Football Dashboard',
  description: 'Your league. Your rules. Your regime. Historical stats and analytics for fantasy football commissioners.',
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
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Commish Command — Your League. Your Rules. Your Regime.
              </p>
            </div>
          </footer>
          <AskTheCommish />
        </div>
      </body>
    </html>
  );
}
