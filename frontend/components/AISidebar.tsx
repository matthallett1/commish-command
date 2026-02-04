'use client';

import { useState, useEffect, useRef } from 'react';
import { getAISummary, checkAIStatus } from '@/lib/api';

interface AISidebarProps {
  pageType: 'member_profile' | 'standings' | 'records' | 'matchups';
  context: Record<string, unknown>;
  title?: string;
}

export default function AISidebar({ pageType, context, title = 'Commish Insights' }: AISidebarProps) {
  const [narrative, setNarrative] = useState<string>('');
  const [modelName, setModelName] = useState<string>('Claude AI');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Track if we've already fetched to prevent double-fetching
  const hasFetchedRef = useRef(false);
  const lastContextKeyRef = useRef<string>('');

  const fetchSummary = async (force = false) => {
    // Create a stable key from context
    const contextKey = `${pageType}-${JSON.stringify(context)}`;
    
    // Skip if already fetched with same context (unless forced)
    if (!force && hasFetchedRef.current && lastContextKeyRef.current === contextKey) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if AI is available
      const status = await checkAIStatus();
      if (!status.available) {
        setIsAvailable(false);
        setIsLoading(false);
        return;
      }

      const response = await getAISummary(pageType, context);
      setNarrative(response.narrative);
      if (response.model) {
        setModelName(response.model);
      }
      
      // Mark as fetched
      hasFetchedRef.current = true;
      lastContextKeyRef.current = contextKey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if we have context data
    if (Object.keys(context).length > 0) {
      fetchSummary();
    }
  }, [pageType, JSON.stringify(context)]);

  // Don't render if AI is not available
  if (!isAvailable) {
    return null;
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-colors"
        aria-label={isCollapsed ? 'Show AI Insights' : 'Hide AI Insights'}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isCollapsed ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 right-0 h-screen lg:h-auto lg:top-24
          w-80 max-w-[90vw] lg:w-72 lg:flex-shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isCollapsed ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
          z-40 lg:z-0
        `}
      >
        <div className="h-full lg:h-auto overflow-y-auto bg-white dark:bg-slate-800 lg:bg-transparent lg:dark:bg-transparent p-4 lg:p-0">
          <div className="card lg:sticky lg:top-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-pink-400 to-pink-600 rounded-lg">
                  <span className="text-lg">🍩</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {title}
                </h3>
              </div>
              
              {/* Close button on mobile */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="lg:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="min-h-[100px]">
              {isLoading ? (
                <LoadingSkeleton />
              ) : error ? (
                <div className="text-red-500 dark:text-red-400 text-sm">
                  <p>{error}</p>
                  <button
                    onClick={() => fetchSummary(true)}
                    className="mt-2 text-primary-600 dark:text-primary-400 hover:underline text-sm"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed space-y-3">
                  {narrative.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Regenerate button */}
            {!isLoading && !error && narrative && (
              <button
                onClick={() => fetchSummary(true)}
                disabled={isLoading}
                className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Tell me another story
              </button>
            )}

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Powered by {modelName}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-11/12" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-9/12" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10/12" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8/12" />
    </div>
  );
}
