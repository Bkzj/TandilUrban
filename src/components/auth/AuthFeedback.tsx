type AuthFeedbackProps = {
  message: string | null;
  tone: 'error' | 'success' | 'neutral';
  className?: string;
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
}: AuthFeedbackProps) {
  if (!message) return null;
  return (
    <p
      className={`${className} text-sm ${TONE_CLASS[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {message}
    </p>
  );
}
