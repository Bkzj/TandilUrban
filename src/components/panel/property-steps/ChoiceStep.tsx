'use client';

import { useId } from 'react';

import { StepHeading } from './step-ui';

export type ChoiceOption<T extends string> = {
  id: T;
  label: string;
  description?: string;
};

type ChoiceStepProps<T extends string> = {
  title: string;
  options: readonly ChoiceOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  onSelectionComplete?: () => void;
  columnsClassName: string;
  compact?: boolean;
};

export function ChoiceStep<T extends string>({
  title,
  options,
  value,
  onChange,
  onSelectionComplete,
  columnsClassName,
  compact = false,
}: ChoiceStepProps<T>) {
  const headingId = useId();
  const groupName = useId();

  function select(option: T) {
    onChange(option);
    if (onSelectionComplete) window.setTimeout(onSelectionComplete, 220);
  }

  return (
    <>
      <StepHeading id={headingId}>{title}</StepHeading>
      <fieldset aria-labelledby={headingId} className={`grid ${columnsClassName}`}>
        <legend className="sr-only">{title}</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left transition-all ${
              value === option.id
                ? 'border-naranja bg-naranja/15 shadow-lg shadow-naranja/20'
                : 'border-white/10 bg-white/5 shadow-lg shadow-black/20 backdrop-blur-md hover:border-white/20 hover:bg-white/10'
            } ${compact ? 'px-5 py-5' : 'px-6 py-7'}`}
          >
            <input
              type="radio"
              name={groupName}
              value={option.id}
              checked={value === option.id}
              onChange={() => select(option.id)}
              className="peer sr-only"
            />
            <span
              className={`block font-semibold text-surface peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-naranja ${
                compact ? 'text-lg' : 'text-2xl'
              }`}
            >
              {option.label}
            </span>
            {option.description ? (
              <span className="mt-1 block text-sm text-surface/60">{option.description}</span>
            ) : null}
            <span
              aria-hidden
              className={`absolute right-5 top-1/2 -translate-y-1/2 text-xl transition-opacity ${
                value === option.id ? 'text-naranja opacity-100' : 'opacity-0'
              }`}
            >
              ✓
            </span>
          </label>
        ))}
      </fieldset>
    </>
  );
}
