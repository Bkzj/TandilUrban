'use client';

import {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Linear-style onboarding para crear propiedades.
 * - Paleta invertida: NARANJA primario (acción/selección), VERDE secundario.
 * - Animación zig-zag: pares anclan a la izquierda, impares a la derecha.
 * - Inputs sin caja: `border-b-[3px]` sobre el gradiente dark del backoffice.
 */

// =============================================================================
// Tipos
// =============================================================================

type Operacion = 'VENTA' | 'ALQUILER';
type TipoInmueble = 'Casa' | 'Departamento' | 'Lote' | 'Local' | 'Oficina';
type Moneda = 'USD' | 'ARS';

type PropertyFormData = {
  operacion: Operacion | '';
  tipo: TipoInmueble | '';
  direccion: string;
  barrio: string;
  m2Total: string;
  m2Cubiertos: string;
  ambientes: string;
  moneda: Moneda;
  precio: string;
  expensas: string;
  caracteristicas: string[];
  imagenes: string[];
  titulo: string;
  descripcion: string;
};

const INITIAL_DATA: PropertyFormData = {
  operacion: '',
  tipo: '',
  direccion: '',
  barrio: '',
  m2Total: '',
  m2Cubiertos: '',
  ambientes: '',
  moneda: 'USD',
  precio: '',
  expensas: '',
  caracteristicas: [],
  imagenes: [],
  titulo: '',
  descripcion: '',
};

// =============================================================================
// Catálogos
// =============================================================================

const TIPOS_INMUEBLE: TipoInmueble[] = ['Casa', 'Departamento', 'Lote', 'Local', 'Oficina'];

const CARACTERISTICAS: string[] = [
  'Piscina',
  'Quincho',
  'Parrilla',
  'Cochera',
  'Jardín',
  'Balcón',
  'Terraza',
  'Suite',
  'Vestidor',
  'Lavadero',
  'Aire acondicionado',
  'Calefacción central',
  'Losa radiante',
  'Ascensor',
  'Seguridad 24hs',
  'Pet friendly',
  'Amueblado',
  'Vista panorámica',
];

const STEPS = [
  'operacion',
  'tipo',
  'ubicacion',
  'dimensiones',
  'precio',
  'caracteristicas',
  'imagenes',
  'textos',
] as const;

type StepKey = (typeof STEPS)[number];
const TOTAL_STEPS = STEPS.length;

// =============================================================================
// Componente principal
// =============================================================================

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

  const canContinue = useMemo(
    () => isStepValid(STEPS[currentStep], formData),
    [currentStep, formData]
  );

  // Atajo: Esc para volver
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
                <OperacionStep
                  value={formData.operacion}
                  onChange={(v) => {
                    update('operacion', v);
                    window.setTimeout(goNext, 220);
                  }}
                />
              )}
              {STEPS[currentStep] === 'tipo' && (
                <TipoStep
                  value={formData.tipo}
                  onChange={(v) => {
                    update('tipo', v);
                    window.setTimeout(goNext, 220);
                  }}
                />
              )}
              {STEPS[currentStep] === 'ubicacion' && (
                <UbicacionStep
                  direccion={formData.direccion}
                  barrio={formData.barrio}
                  onDireccion={(v) => update('direccion', v)}
                  onBarrio={(v) => update('barrio', v)}
                  onSubmit={() => canContinue && goNext()}
                />
              )}
              {STEPS[currentStep] === 'dimensiones' && (
                <DimensionesStep
                  tipo={formData.tipo}
                  m2Total={formData.m2Total}
                  m2Cubiertos={formData.m2Cubiertos}
                  ambientes={formData.ambientes}
                  onM2Total={(v) => update('m2Total', v)}
                  onM2Cubiertos={(v) => update('m2Cubiertos', v)}
                  onAmbientes={(v) => update('ambientes', v)}
                  onSubmit={() => canContinue && goNext()}
                />
              )}
              {STEPS[currentStep] === 'precio' && (
                <PrecioStep
                  moneda={formData.moneda}
                  precio={formData.precio}
                  expensas={formData.expensas}
                  onMoneda={(v) => update('moneda', v)}
                  onPrecio={(v) => update('precio', v)}
                  onExpensas={(v) => update('expensas', v)}
                  onSubmit={() => canContinue && goNext()}
                />
              )}
              {STEPS[currentStep] === 'caracteristicas' && (
                <CaracteristicasStep
                  selected={formData.caracteristicas}
                  onToggle={(item) =>
                    update(
                      'caracteristicas',
                      formData.caracteristicas.includes(item)
                        ? formData.caracteristicas.filter((c) => c !== item)
                        : [...formData.caracteristicas, item]
                    )
                  }
                />
              )}
              {STEPS[currentStep] === 'imagenes' && (
                <ImagenesStep onPickPC={() => undefined} onPickDrive={() => undefined} />
              )}
              {STEPS[currentStep] === 'textos' && (
                <TextosStep
                  titulo={formData.titulo}
                  descripcion={formData.descripcion}
                  onTitulo={(v) => update('titulo', v)}
                  onDescripcion={(v) => update('descripcion', v)}
                  onAI={() => undefined}
                />
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

// =============================================================================
// Header / Footer
// =============================================================================

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

// =============================================================================
// Step Shell — zig-zag
// =============================================================================

function StepShell({ stepIndex, children }: { stepIndex: number; children: ReactNode }) {
  const isEven = stepIndex % 2 === 0;
  const sideClasses = isEven ? 'mr-auto md:pr-12' : 'ml-auto md:pl-12';
  const initialX = isEven ? -80 : 80;
  const exitX = isEven ? 80 : -80;
  return (
    <motion.div
      initial={{ y: 32, x: initialX, opacity: 0 }}
      animate={{ y: 0, x: 0, opacity: 1 }}
      exit={{ y: -24, x: exitX, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full max-w-3xl space-y-10 ${sideClasses}`}
    >
      {children}
    </motion.div>
  );
}

// =============================================================================
// Steps individuales
// =============================================================================

function StepHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="max-w-2xl text-3xl font-medium leading-[1.15] tracking-wide text-white md:text-5xl">
      {children}
    </h2>
  );
}

function HintEnter({ children = 'Presioná Enter para continuar' }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs text-surface/65">
      {children}
      <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-surface/30 px-1.5 font-mono text-[0.65rem] text-surface/80">
        ↵
      </kbd>
    </p>
  );
}

// --- Paso 0: Operación ---------------------------------------------------------

function OperacionStep({
  value,
  onChange,
}: {
  value: PropertyFormData['operacion'];
  onChange: (v: Operacion) => void;
}) {
  const opts: { id: Operacion; label: string; sub: string }[] = [
    { id: 'VENTA', label: 'Venta', sub: 'Quiero vender una propiedad' },
    { id: 'ALQUILER', label: 'Alquiler', sub: 'Quiero alquilar una propiedad' },
  ];
  return (
    <>
      <StepHeading>¿Qué tipo de operación querés publicar?</StepHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        {opts.map((opt) => (
          <BigChoice
            key={opt.id}
            active={value === opt.id}
            label={opt.label}
            sub={opt.sub}
            onClick={() => onChange(opt.id)}
          />
        ))}
      </div>
    </>
  );
}

// --- Paso 1: Tipo --------------------------------------------------------------

function TipoStep({
  value,
  onChange,
}: {
  value: PropertyFormData['tipo'];
  onChange: (v: TipoInmueble) => void;
}) {
  return (
    <>
      <StepHeading>¿Qué tipo de inmueble es?</StepHeading>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIPOS_INMUEBLE.map((tipo) => (
          <BigChoice
            key={tipo}
            active={value === tipo}
            label={tipo}
            onClick={() => onChange(tipo)}
            compact
          />
        ))}
      </div>
    </>
  );
}

function BigChoice({
  active,
  label,
  sub,
  onClick,
  compact,
}: {
  active: boolean;
  label: string;
  sub?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border text-left transition-all ${
        active
          ? 'border-naranja bg-naranja/15 shadow-lg shadow-naranja/20'
          : 'border-surface/15 bg-surface/5 hover:border-surface/35 hover:bg-surface/10'
      } ${compact ? 'px-5 py-5' : 'px-6 py-7'}`}
    >
      <div className={`font-semibold text-surface ${compact ? 'text-lg' : 'text-2xl'}`}>{label}</div>
      {sub && <div className="mt-1 text-sm text-surface/60">{sub}</div>}
      <span
        aria-hidden
        className={`absolute right-5 top-1/2 -translate-y-1/2 text-xl transition-opacity ${
          active ? 'text-naranja opacity-100' : 'opacity-0'
        }`}
      >
        ✓
      </span>
    </button>
  );
}

// --- Paso 2: Ubicación ---------------------------------------------------------

function UbicacionStep({
  direccion,
  barrio,
  onDireccion,
  onBarrio,
  onSubmit,
}: {
  direccion: string;
  barrio: string;
  onDireccion: (v: string) => void;
  onBarrio: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <StepHeading>¿Dónde está ubicada?</StepHeading>
      <div className="grid gap-6 sm:grid-cols-2">
        <SubtleInput
          label="Dirección"
          placeholder="Av. Avellaneda 1234"
          value={direccion}
          onChange={onDireccion}
          onEnter={onSubmit}
          autoFocus
        />
        <SubtleInput
          label="Barrio"
          placeholder="Centro, Movediza, Sierra del Tigre…"
          value={barrio}
          onChange={onBarrio}
          onEnter={onSubmit}
        />
      </div>
      <HintEnter />
    </>
  );
}

// --- Paso 3: Dimensiones -------------------------------------------------------

function DimensionesStep({
  tipo,
  m2Total,
  m2Cubiertos,
  ambientes,
  onM2Total,
  onM2Cubiertos,
  onAmbientes,
  onSubmit,
}: {
  tipo: PropertyFormData['tipo'];
  m2Total: string;
  m2Cubiertos: string;
  ambientes: string;
  onM2Total: (v: string) => void;
  onM2Cubiertos: (v: string) => void;
  onAmbientes: (v: string) => void;
  onSubmit: () => void;
}) {
  const esLote = tipo === 'Lote';
  return (
    <>
      <StepHeading>
        {esLote ? '¿Cuántos m² tiene el lote?' : '¿Cuáles son las dimensiones?'}
      </StepHeading>
      <div className={`grid gap-6 ${esLote ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
        <SubtleInput
          label="Superficie total (m²)"
          type="number"
          inputMode="numeric"
          placeholder="120"
          value={m2Total}
          onChange={onM2Total}
          onEnter={onSubmit}
          autoFocus
        />
        {!esLote && (
          <>
            <SubtleInput
              label="Superficie cubierta (m²)"
              type="number"
              inputMode="numeric"
              placeholder="85"
              value={m2Cubiertos}
              onChange={onM2Cubiertos}
              onEnter={onSubmit}
            />
            <SubtleInput
              label="Ambientes"
              type="number"
              inputMode="numeric"
              placeholder="3"
              value={ambientes}
              onChange={onAmbientes}
              onEnter={onSubmit}
            />
          </>
        )}
      </div>
      <HintEnter />
    </>
  );
}

// --- Paso 4: Precio ------------------------------------------------------------

function PrecioStep({
  moneda,
  precio,
  expensas,
  onMoneda,
  onPrecio,
  onExpensas,
  onSubmit,
}: {
  moneda: PropertyFormData['moneda'];
  precio: string;
  expensas: string;
  onMoneda: (v: Moneda) => void;
  onPrecio: (v: string) => void;
  onExpensas: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <StepHeading>¿Cuál es el precio de publicación?</StepHeading>
      <div className="space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-surface/20 bg-surface/5">
            {(['USD', 'ARS'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMoneda(m)}
                className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                  moneda === m ? 'bg-naranja text-surface' : 'text-surface/70 hover:bg-surface/5'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <SubtleInput
              label="Precio"
              type="number"
              inputMode="decimal"
              placeholder="180000"
              value={precio}
              onChange={onPrecio}
              onEnter={onSubmit}
              autoFocus
            />
          </div>
        </div>
        <div className="max-w-sm">
          <SubtleInput
            label="Expensas (opcional)"
            type="number"
            inputMode="decimal"
            placeholder="25000"
            value={expensas}
            onChange={onExpensas}
            onEnter={onSubmit}
          />
        </div>
      </div>
      <HintEnter />
    </>
  );
}

// --- Paso 5: Características ---------------------------------------------------

function CaracteristicasStep({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <>
      <StepHeading>Marcá las características que destacan a la propiedad</StepHeading>
      <div className="flex flex-wrap gap-2">
        {CARACTERISTICAS.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? 'border-naranja bg-naranja text-surface shadow shadow-naranja/30'
                  : 'border-surface/20 bg-transparent text-surface/80 hover:border-surface/40 hover:bg-surface/5'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-surface/45">
        {selected.length} seleccionadas · podés saltar este paso si querés.
      </p>
    </>
  );
}

// --- Paso 6: Imágenes ----------------------------------------------------------

function ImagenesStep({
  onPickPC,
  onPickDrive,
}: {
  onPickPC: () => void;
  onPickDrive: () => void;
}) {
  return (
    <>
      <StepHeading>Sumá fotos de la propiedad</StepHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <UploadCard onClick={onPickPC} label="Subir desde PC" hint="JPG / PNG · hasta 10 MB c/u" icon="↑" />
        <UploadCard
          onClick={onPickDrive}
          label="Importar de Google Drive"
          hint="Conectá tu cuenta y elegí una carpeta"
          icon="◐"
        />
      </div>
      <p className="text-xs text-surface/45">Vas a poder ordenar y elegir la portada después de cargar.</p>
    </>
  );
}

function UploadCard({
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
      className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-surface/25 bg-surface/5 px-6 py-6 text-left transition hover:border-naranja/70 hover:bg-naranja/10"
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

// --- Paso 7: Textos ------------------------------------------------------------

function TextosStep({
  titulo,
  descripcion,
  onTitulo,
  onDescripcion,
  onAI,
}: {
  titulo: string;
  descripcion: string;
  onTitulo: (v: string) => void;
  onDescripcion: (v: string) => void;
  onAI: () => void;
}) {
  return (
    <>
      <StepHeading>Contale al comprador qué hace única a esta propiedad</StepHeading>
      <div className="space-y-6">
        <SubtleInput
          label="Título"
          placeholder="Casa luminosa con parque y vista a las sierras"
          value={titulo}
          onChange={onTitulo}
          autoFocus
        />
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-surface/65">
            Descripción
          </span>
          <textarea
            value={descripcion}
            onChange={(e) => onDescripcion(e.target.value)}
            rows={5}
            placeholder="3 dormitorios, 2 baños, parque con asador, ubicado a 5 minutos del centro…"
            className="w-full resize-none border-0 border-b-[3px] border-surface/40 bg-transparent px-0 pb-3 pt-2 text-lg font-medium text-white caret-naranja outline-none transition-colors placeholder:font-light placeholder:text-surface/35 focus:border-naranja focus:placeholder:text-surface/55"
          />
          <button
            type="button"
            onClick={onAI}
            className="self-start rounded-full border border-surface/25 bg-surface/5 px-4 py-1.5 text-xs font-medium text-surface/85 transition hover:border-naranja hover:bg-naranja/15 hover:text-surface"
          >
            ✨ Redactar con IA
          </button>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Inputs — línea gruesa (border-b-[3px]) sobre fondo dark
// =============================================================================

function SubtleInput({
  label,
  value,
  onChange,
  onEnter,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  type?: 'text' | 'number';
  inputMode?: 'numeric' | 'decimal';
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

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
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="border-0 border-b-[3px] border-surface/40 bg-transparent px-0 pb-3 pt-2 text-2xl font-medium text-white caret-naranja outline-none transition-colors placeholder:font-light placeholder:text-surface/35 focus:border-naranja focus:placeholder:text-surface/55"
      />
    </label>
  );
}

// =============================================================================
// Validación / publish stub
// =============================================================================

function isStepValid(step: StepKey, data: PropertyFormData): boolean {
  switch (step) {
    case 'operacion':
      return Boolean(data.operacion);
    case 'tipo':
      return Boolean(data.tipo);
    case 'ubicacion':
      return data.direccion.trim().length > 2;
    case 'dimensiones': {
      if (data.tipo === 'Lote') return Number(data.m2Total) > 0;
      return (
        Number(data.m2Total) > 0 &&
        Number(data.m2Cubiertos) > 0 &&
        Number(data.ambientes) > 0
      );
    }
    case 'precio':
      return Number(data.precio) > 0;
    case 'caracteristicas':
      return true;
    case 'imagenes':
      return true;
    case 'textos':
      return data.titulo.trim().length > 3 && data.descripcion.trim().length > 10;
    default:
      return true;
  }
}

function publish(_data: PropertyFormData): void {
  // TODO: POST /api/propiedades — pendiente cablear con la inmobiliaria
  // del usuario logueado. No acoplo el onboarding al endpoint actual.
  // eslint-disable-next-line no-console
  console.info('publish() pendiente — datos listos:', _data);
}
