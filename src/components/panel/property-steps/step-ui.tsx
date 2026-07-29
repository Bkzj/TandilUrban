'use client';

import { KeyboardEvent, ReactNode, useEffect, useRef } from 'react';

export function StepHeading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="max-w-2xl text-3xl font-medium leading-[1.15] tracking-wide text-white md:text-5xl">
      {children}
    </h2>
  );
}

export function HintEnter({ children = 'Presioná Enter para continuar' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs text-surface/65">
      {children}
      <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-xl border border-white/10 px-1.5 font-mono text-[0.65rem] text-surface/80">
        ↵
      </kbd>
    </p>
  );
}

export function SubtleInput({
  label,
  value,
  onChange,
  onEnter,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  type?: 'text' | 'number';
  inputMode?: 'numeric' | 'decimal';
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (autoFocus && !disabled) ref.current?.focus();
  }, [autoFocus, disabled]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      onEnter?.();
    }
  }

  return (
    <label className="flex flex-col gap-2.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/65">
        {label}
      </span>
      <input
        ref={ref}
        type={type}
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="border-0 border-b-[3px] border-white/20 bg-transparent px-0 pb-3 pt-2 text-2xl font-medium text-white caret-naranja outline-none transition-colors placeholder:font-light placeholder:text-surface/35 focus:border-naranja focus:placeholder:text-surface/55 disabled:opacity-50"
      />
    </label>
  );
}

export function UploadCard({
  onClick,
  label,
  hint,
  icon,
}: {
  onClick: () => void;
  label: string;
  hint: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-6 text-left transition hover:border-naranja/70 hover:bg-naranja/10"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface/10 text-xl text-surface/80 transition group-hover:bg-naranja/20 group-hover:text-naranja">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-semibold text-surface">{label}</span>
        <span className="text-xs text-surface/55">{hint}</span>
      </span>
    </button>
  );
}
