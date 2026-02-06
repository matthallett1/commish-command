'use client';

import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

/**
 * A small (i) icon that shows an explanatory tooltip on hover/tap.
 * Used next to metrics to explain what they mean.
 */
export default function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      // If tooltip would go above viewport, show below instead
      if (rect.top < 80) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [show]);

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShow(!show); }}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-400 text-[10px] font-bold cursor-help hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors">
        i
      </span>
      {show && (
        <div
          ref={ref}
          className={`absolute z-50 w-56 px-3 py-2 text-xs leading-relaxed text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg ${
            position === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
        >
          {text}
        </div>
      )}
    </span>
  );
}
