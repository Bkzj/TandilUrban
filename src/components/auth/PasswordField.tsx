'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  autoComplete: 'current-password' | 'new-password';
  accent: 'verde' | 'naranja';
  minLength?: number;
  placeholder?: string;
};

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  accent,
  minLength,
  placeholder = '••••••••',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const focusClass = accent === 'verde'
    ? 'focus:border-verde focus:ring-verde-light'
    : 'focus:border-naranja focus:ring-naranja-light';
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-primary" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-xl border border-border-light bg-background px-4 py-3 pr-12 text-text-primary outline-none transition focus:ring-2 ${focusClass}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-text-secondary transition hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-verde-light"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
