'use client';

import { useState } from 'react';

interface AIBlockInsightProps {
  narrative: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRegenerate?: () => void;
  compact?: boolean;
  title?: string;
}

/**
 * A reusable component for embedding AI insights into any content block.
 * Can be placed above or below data visualizations.
 */
export default function AIBlockInsight({ 
  narrative, 
  isLoading = false, 
  error = null,
  onRegenerate,
  compact = false,
  title = 'Commish Analysis'
}: AIBlockInsightProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!narrative && !isLoading && !error) {
    return null;
  }

  return (
    <div className={`
      bg-gradient-to-r from-pink-50 to-rose-50 
      dark:from-pink-900/20 dark:to-rose-900/20 
      rounded-lg border border-pink-200 dark:border-pink-800
      ${compact ? 'p-3' : 'p-4'}
      ${compact ? 'mt-3' : 'mt-4'}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-pink-400 to-pink-600 rounded-md">
            <span className="text-sm">🍩</span>
          </div>
          <span className={`font-medium text-pink-700 dark:text-pink-300 ${compact ? 'text-xs' : 'text-sm'}`}>
            {title}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {onRegenerate && !isLoading && (
            <button
              onClick={onRegenerate}
              className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300 transition-colors"
              title="Generate new insight"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className={`${compact ? 'text-xs' : 'text-sm'} text-pink-900 dark:text-pink-100`}>
          {isLoading ? (
            <LoadingDots />
          ) : error ? (
            <p className="text-red-500 dark:text-red-400">{error}</p>
          ) : (
            <div className="space-y-2 leading-relaxed">
              {narrative?.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="text-pink-600 dark:text-pink-400">The Commish is thinking</span>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
