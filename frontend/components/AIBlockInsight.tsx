'use client';

import { useState, useEffect } from 'react';
import { getAITones, type AITone } from '@/lib/api';

interface AIBlockInsightProps {
  narrative: string | null;
  isLoading?: boolean;
  error?: string | null;
  onRegenerate?: (tone: string) => void;
  compact?: boolean;
  title?: string;
  currentTone?: string;
  showTonePicker?: boolean;
}

const TONE_EMOJIS: Record<string, string> = {
  commissioner: '🍩',
  trash_talk: '🔥',
  hype_man: '💪',
  analyst: '📊',
  poet: '📜',
  movie_trailer: '🎬',
};

/**
 * A reusable component for embedding AI insights into any content block.
 * Now with tone picker for switching between different AI personalities.
 */
export default function AIBlockInsight({ 
  narrative, 
  isLoading = false, 
  error = null,
  onRegenerate,
  compact = false,
  title = 'Commish Analysis',
  currentTone = 'commissioner',
  showTonePicker = true,
}: AIBlockInsightProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tones, setTones] = useState<AITone[]>([]);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  // Fetch available tones once
  useEffect(() => {
    if (showTonePicker && onRegenerate) {
      getAITones()
        .then(data => setTones(data.tones))
        .catch(() => {});
    }
  }, [showTonePicker, onRegenerate]);

  // Animate when narrative changes
  useEffect(() => {
    if (narrative) {
      setFadeIn(false);
      const timer = setTimeout(() => setFadeIn(true), 50);
      return () => clearTimeout(timer);
    }
  }, [narrative]);

  if (!narrative && !isLoading && !error) {
    return null;
  }

  const handleToneSelect = (toneId: string) => {
    setToneMenuOpen(false);
    if (onRegenerate) {
      onRegenerate(toneId);
    }
  };

  const handleShuffle = () => {
    if (!onRegenerate || tones.length === 0) return;
    const otherTones = tones.filter(t => t.id !== currentTone);
    const random = otherTones[Math.floor(Math.random() * otherTones.length)];
    if (random) {
      onRegenerate(random.id);
    }
  };

  const currentToneLabel = tones.find(t => t.id === currentTone)?.label || 'The Commissioner';
  const currentEmoji = TONE_EMOJIS[currentTone] || '🍩';

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
            <span className="text-sm">{currentEmoji}</span>
          </div>
          <span className={`font-medium text-pink-700 dark:text-pink-300 ${compact ? 'text-xs' : 'text-sm'}`}>
            {title}
          </span>
          {/* Current tone badge */}
          {currentTone !== 'commissioner' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-300 font-medium">
              {currentToneLabel}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Shuffle button */}
          {onRegenerate && !isLoading && tones.length > 0 && (
            <button
              onClick={handleShuffle}
              className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300 transition-colors p-1 rounded hover:bg-pink-100 dark:hover:bg-pink-900/40"
              title="Shuffle — try a random tone"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          
          {/* Tone picker dropdown */}
          {onRegenerate && !isLoading && tones.length > 0 && showTonePicker && (
            <div className="relative">
              <button
                onClick={() => setToneMenuOpen(!toneMenuOpen)}
                className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300 transition-colors p-1 rounded hover:bg-pink-100 dark:hover:bg-pink-900/40"
                title="Change tone"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
              
              {toneMenuOpen && (
                <>
                  {/* Backdrop to close menu */}
                  <div className="fixed inset-0 z-40" onClick={() => setToneMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[160px]">
                    {tones.map(tone => (
                      <button
                        key={tone.id}
                        onClick={() => handleToneSelect(tone.id)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                          tone.id === currentTone
                            ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span>{TONE_EMOJIS[tone.id] || '🎤'}</span>
                        <span>{tone.label}</span>
                        {tone.id === currentTone && <span className="ml-auto text-pink-500">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Collapse/expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-pink-500 hover:text-pink-700 dark:hover:text-pink-300 transition-colors p-1"
          >
            <svg 
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
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
            <div className={`space-y-2 leading-relaxed transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
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
