'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import DarkModeToggle from './DarkModeToggle';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/standings', label: 'Standings' },
  { href: '/members', label: 'Members' },
  { href: '/drafts', label: 'Drafts' },
  { href: '/players', label: 'Players' },
  { href: '/records', label: 'Records' },
  { href: '/matchups', label: 'Matchups' },
];

// Donut SVG component - Pink glazed chocolate donut
function DonutLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer donut - chocolate */}
      <circle cx="50" cy="50" r="45" fill="#4A3728"/>
      {/* Inner hole */}
      <circle cx="50" cy="50" r="18" fill="#1F2937"/>
      {/* Pink frosting */}
      <path d="M50 8C25.7 8 6 26.3 6 48.5c0 3.5.5 6.9 1.3 10.1C12.5 35 29.2 18 50 18s37.5 17 42.7 40.6c.8-3.2 1.3-6.6 1.3-10.1C94 26.3 74.3 8 50 8z" fill="#F472B6"/>
      {/* Frosting drips */}
      <ellipse cx="25" cy="58" rx="4" ry="8" fill="#F472B6"/>
      <ellipse cx="38" cy="62" rx="3" ry="6" fill="#F472B6"/>
      <ellipse cx="75" cy="56" rx="4" ry="9" fill="#F472B6"/>
      <ellipse cx="62" cy="60" rx="3" ry="7" fill="#F472B6"/>
      <ellipse cx="50" cy="63" rx="3" ry="5" fill="#F472B6"/>
      {/* Sprinkles */}
      <rect x="30" y="25" width="6" height="2" rx="1" fill="#FBBF24" transform="rotate(-30 30 25)"/>
      <rect x="45" y="18" width="6" height="2" rx="1" fill="#34D399" transform="rotate(15 45 18)"/>
      <rect x="60" y="22" width="6" height="2" rx="1" fill="#F87171" transform="rotate(-45 60 22)"/>
      <rect x="70" y="32" width="6" height="2" rx="1" fill="#60A5FA" transform="rotate(20 70 32)"/>
      <rect x="22" y="38" width="6" height="2" rx="1" fill="#A78BFA" transform="rotate(-10 22 38)"/>
      <rect x="55" y="30" width="6" height="2" rx="1" fill="#FBBF24" transform="rotate(40 55 30)"/>
      <rect x="35" y="35" width="6" height="2" rx="1" fill="#F87171" transform="rotate(-25 35 35)"/>
      <rect x="78" y="45" width="6" height="2" rx="1" fill="#34D399" transform="rotate(5 78 45)"/>
      {/* Highlight */}
      <ellipse cx="35" cy="30" rx="8" ry="4" fill="white" opacity="0.3" transform="rotate(-30 35 30)"/>
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <DonutLogo className="w-10 h-10" />
              <div className="hidden sm:flex flex-col leading-tight">
                <span className="font-bold text-lg text-pink-600 dark:text-pink-400">
                  Top Pot
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Commish Command
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${
                  (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) ? 'nav-link-active' : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
            <DarkModeToggle />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href))
                    ? 'bg-primary-100 text-primary-700 dark:bg-slate-700 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
