import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Top Pot Fantasy Football Dashboard',
  description: 'Historical stats and analytics for the Top Pot Fantasy Football League',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-gray-200 dark:border-slate-700 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Top Pot Fantasy Football League Dashboard
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
