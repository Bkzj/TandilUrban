'use client';

import { useState } from 'react';

type ExpandableTextProps = {
  text: string;
  className?: string;
};

export default function ExpandableText({ text, className = '' }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const trimmed = text.trim();

  if (!trimmed) {
    return <p className="text-sm text-gray-500">Sin descripción disponible.</p>;
  }

  return (
    <div className={className}>
      <div className="relative">
        <p
          className={`whitespace-pre-wrap text-base leading-relaxed text-gray-700 sm:text-lg ${
            isExpanded ? '' : 'line-clamp-4'
          }`}
        >
          {text}
        </p>
        {!isExpanded ? (
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-white to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        className="mt-3 text-sm font-semibold text-verde transition-colors hover:text-verde-dark"
        aria-expanded={isExpanded}
      >
        {isExpanded ? 'Mostrar menos' : 'Mostrar más'}
      </button>
    </div>
  );
}
