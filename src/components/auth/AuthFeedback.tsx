'use client';

import { useEffect, useRef } from 'react';

type AuthFeedbackProps = {
  message: string | null;
  tone: 'error' | 'success' | 'neutral';
  className?: string;
  focusOnMount?: boolean;
};

const TONE_CLASS = {
  error: 'font-medium text-naranja-dark',
  success: 'font-medium text-verde',
  neutral: 'text-text-secondary',
} as const;

export function AuthFeedback({
  message,
  tone,
  className = 'mt-3',
  focusOnMount = false,
}: AuthFeedbackProps) {
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message && focusOnMount) feedbackRef.current?.focus();
  }, [focusOnMount, message]);
  if (!message) return null;
  return (
    <p
      ref={feedbackRef}
      className={`${className} text-sm ${TONE_CLASS[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      tabIndex={-1}
    >
      {message}
    </p>
  );
}
