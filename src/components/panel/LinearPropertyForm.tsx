'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import type { PropertyFormData } from '@/types/panel';

import { INITIAL_DATA, STEPS, TOTAL_STEPS } from './property-steps/constants';
import { publish } from './property-steps/publish';
import { StepCaracteristicas } from './property-steps/StepCaracteristicas';
import { StepDimensiones } from './property-steps/StepDimensiones';
import { StepImagenes } from './property-steps/StepImagenes';
import { StepOperacion } from './property-steps/StepOperacion';
import { StepPrecio } from './property-steps/StepPrecio';
import { StepShell } from './property-steps/StepShell';
import { StepTextos } from './property-steps/StepTextos';
import { StepTipo } from './property-steps/StepTipo';
import { StepUbicacion } from './property-steps/StepUbicacion';
import { isStepValid } from './property-steps/validation';

/**
 * Linear-style onboarding para crear propiedades.
 * - Paleta invertida: NARANJA primario (acción/selección), VERDE secundario.
 * - Animación zig-zag: pares anclan a la izquierda, impares a la derecha.
 * - Inputs sin caja: `border-b-[3px]` sobre el gradiente dark del backoffice.
 */

export default function LinearPropertyForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_DATA);

  const update = useCallback(
    <K extends keyof PropertyFormData>(key: K, value: PropertyFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const goPrev = useCallback(() => {
    setCurrentStep((step) => Math.max(0, step - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((step) => Math.min(TOTAL_STEPS - 1, step + 1));
  }, []);

  const advanceIfValid = useCallback(() => {
    if (isStepValid(STEPS[currentStep], formData)) goNext();
  }, [currentStep, formData, goNext]);

  const canContinue = useMemo(
    () => isStepValid(STEPS[currentStep], formData),
    [currentStep, formData]
  );

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && currentStep > 0) {
        event.preventDefault();
        goPrev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentStep, goPrev]);

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl flex-col px-6 py-10 text-surface md:px-8">
      <Header
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onBack={goPrev}
        canGoBack={currentStep > 0}
      />

      <div className="relative flex w-full flex-1 items-center overflow-x-hidden">
        <div className="w-full">
          <AnimatePresence mode="wait">
            <StepShell key={STEPS[currentStep]} stepIndex={currentStep}>
              {STEPS[currentStep] === 'operacion' && (
                <StepOperacion data={formData} update={update} onNext={goNext} />
              )}
              {STEPS[currentStep] === 'tipo' && (
                <StepTipo data={formData} update={update} onNext={goNext} />
              )}
              {STEPS[currentStep] === 'ubicacion' && (
                <StepUbicacion data={formData} update={update} onNext={advanceIfValid} />
              )}
              {STEPS[currentStep] === 'dimensiones' && (
                <StepDimensiones data={formData} update={update} onNext={advanceIfValid} />
              )}
              {STEPS[currentStep] === 'precio' && (
                <StepPrecio data={formData} update={update} onNext={advanceIfValid} />
              )}
              {STEPS[currentStep] === 'caracteristicas' && (
                <StepCaracteristicas data={formData} update={update} onNext={goNext} />
              )}
              {STEPS[currentStep] === 'imagenes' && (
                <StepImagenes data={formData} update={update} onNext={goNext} />
              )}
              {STEPS[currentStep] === 'textos' && (
                <StepTextos data={formData} update={update} onNext={goNext} />
              )}
            </StepShell>
          </AnimatePresence>
        </div>
      </div>

      <Footer
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        canContinue={canContinue}
        onContinue={goNext}
        isLast={currentStep === TOTAL_STEPS - 1}
        formData={formData}
      />
    </div>
  );
}

function Header({
  currentStep,
  totalSteps,
  onBack,
  canGoBack,
}: {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  canGoBack: boolean;
}) {
  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        className="group flex items-center gap-2 text-sm font-medium text-surface/70 transition-colors hover:text-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
        Volver
      </button>

      <Progress current={currentStep} total={totalSteps} />

      <span className="text-xs font-medium uppercase tracking-[0.18em] text-surface/50">
        {String(currentStep + 1).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}
      </span>
    </header>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="hidden items-center gap-1.5 md:flex">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <span
            key={i}
            aria-hidden
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active ? 'w-8 bg-naranja' : done ? 'w-3.5 bg-naranja/60' : 'w-3.5 bg-surface/15'
            }`}
          />
        );
      })}
    </div>
  );
}

function Footer({
  currentStep,
  totalSteps: _totalSteps,
  canContinue,
  onContinue,
  isLast,
  formData,
}: {
  currentStep: number;
  totalSteps: number;
  canContinue: boolean;
  onContinue: () => void;
  isLast: boolean;
  formData: PropertyFormData;
}) {
  const stepKey = STEPS[currentStep];
  const autoAdvance = stepKey === 'operacion' || stepKey === 'tipo';

  return (
    <footer className="mt-6 flex items-center justify-between gap-4">
      <p className="hidden text-xs text-surface/50 md:block">
        Esc para volver · Enter para continuar
      </p>
      <div className="ml-auto flex items-center gap-3">
        {!autoAdvance && (
          <PrimaryButton
            onClick={isLast ? () => publish(formData) : onContinue}
            disabled={!canContinue}
            label={isLast ? 'Publicar propiedad' : 'Continuar'}
          />
        )}
      </div>
    </footer>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group inline-flex items-center gap-2 rounded-xl bg-naranja px-5 py-3 text-sm font-semibold text-surface shadow-lg shadow-naranja/30 transition hover:bg-naranja-hover disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
    </button>
  );
}
