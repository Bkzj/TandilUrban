'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';

import { AuthFeedback } from '@/components/auth/AuthFeedback';
import { PasswordField } from '@/components/auth/PasswordField';

type Status = { enabled: boolean; recoveryCodesRemaining: number };
type Setup = { manualKey: string; qrDataUrl: string; expiresAt: string };

export function TwoFactorSecurityPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factor, setFactor] = useState<'totp' | 'recovery'>('totp');
  const [action, setAction] = useState<'regenerate' | 'disable' | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/auth/two-factor/status', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<Status> : Promise.reject())
      .then(setStatus)
      .catch(() => setError('No pudimos consultar el estado de seguridad.'));
  }, []);

  async function post(path: string, body: object) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; recoveryCodes?: string[]; manualKey?: string; qrDataUrl?: string; expiresAt?: string };
    if (!response.ok) throw new Error(payload.error ?? 'No pudimos completar la operación.');
    return payload;
  }

  async function beginSetup(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = await post('/api/auth/two-factor/setup/start', { password });
      if (!payload.manualKey || !payload.qrDataUrl || !payload.expiresAt) throw new Error('No pudimos iniciar la configuración.');
      setSetup({ manualKey: payload.manualKey, qrDataUrl: payload.qrDataUrl, expiresAt: payload.expiresAt });
      setPassword(''); setCode('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No pudimos iniciar la configuración.'); }
    finally { setLoading(false); }
  }

  async function confirmSetup(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = await post('/api/auth/two-factor/setup/confirm', { code });
      if (!payload.recoveryCodes) throw new Error('No pudimos activar la verificación.');
      setSetup(null); setRecoveryCodes(payload.recoveryCodes); setCode(''); setStatus({ enabled: true, recoveryCodesRemaining: payload.recoveryCodes.length });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No pudimos activar la verificación.'); }
    finally { setLoading(false); }
  }

  async function submitManagement(event: FormEvent) {
    event.preventDefault(); if (!action) return; setLoading(true); setError(null);
    try {
      const path = action === 'regenerate' ? '/api/auth/two-factor/recovery-codes/regenerate' : '/api/auth/two-factor/disable';
      const payload = await post(path, action === 'regenerate' ? { password, code } : { password, code, factor });
      setPassword(''); setCode('');
      if (action === 'regenerate') {
        if (!payload.recoveryCodes) throw new Error('No pudimos regenerar los códigos.');
        setRecoveryCodes(payload.recoveryCodes); setAcknowledged(false);
      } else {
        await signOut({ callbackUrl: '/login' });
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No pudimos completar la operación.'); }
    finally { setLoading(false); }
  }

  async function copyCodes() {
    if (recoveryCodes) await navigator.clipboard.writeText(recoveryCodes.join('\n'));
  }

  function downloadCodes() {
    if (!recoveryCodes) return;
    const contents = ['Códigos de recuperación de Propea Group', 'Cada código puede utilizarse una sola vez.', '', ...recoveryCodes].join('\n');
    const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'codigos-recuperacion-propea.txt'; link.click(); URL.revokeObjectURL(url);
  }

  if (!status) return <p className="mt-6 text-sm text-gray-500" role="status">Cargando seguridad…</p>;

  if (recoveryCodes) return (
    <div className="mt-6 rounded-xl border border-naranja/30 bg-naranja/5 p-5">
      <h3 className="text-lg font-bold text-gray-900">Guardá tus códigos de recuperación</h3>
      <p className="mt-2 text-sm text-gray-600">Cada código puede utilizarse una sola vez. No vas a poder volver a verlos.</p>
      <pre className="mt-4 select-all overflow-x-auto rounded-xl bg-white p-4 font-mono text-sm leading-7 text-gray-900">{recoveryCodes.join('\n')}</pre>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => void copyCodes()} className="rounded-xl border border-verde px-4 py-3 font-semibold text-verde focus:outline-none focus:ring-2 focus:ring-verde-light">Copiar todos</button>
        <button type="button" onClick={downloadCodes} className="rounded-xl border border-naranja px-4 py-3 font-semibold text-naranja focus:outline-none focus:ring-2 focus:ring-naranja-light">Descargar</button>
      </div>
      <label className="mt-5 flex items-start gap-3 text-sm text-gray-700"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-5 w-5" />Guardé mis códigos de recuperación.</label>
      <button type="button" disabled={!acknowledged} onClick={() => void signOut({ callbackUrl: '/login' })} className="mt-4 w-full rounded-xl bg-verde px-4 py-3 font-semibold text-white disabled:opacity-50 sm:w-auto">Finalizar y volver a iniciar sesión</button>
    </div>
  );

  if (setup) return (
    <form className="mt-6 space-y-5" onSubmit={confirmSetup}>
      <h3 className="font-bold text-gray-900">Activar verificación en dos pasos</h3>
      <p className="text-sm text-gray-600">1. Escaneá este código con Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden u otra app compatible.</p>
      {/* La imagen se genera localmente y sólo vive en esta respuesta autenticada. */}
      <Image unoptimized src={setup.qrDataUrl} alt="Código QR para configurar la aplicación autenticadora" width={240} height={240} className="mx-auto rounded-xl border border-gray-200 bg-white p-2" />
      <div><p className="text-sm font-semibold text-gray-700">¿No podés escanearlo? Clave manual sensible:</p><code className="mt-2 block select-all break-all rounded-xl bg-gray-100 p-3 font-mono text-sm text-gray-900">{setup.manualKey}</code><button type="button" onClick={() => void navigator.clipboard.writeText(setup.manualKey.replaceAll(' ', ''))} className="mt-2 text-sm font-semibold text-verde">Copiar clave</button></div>
      <p className="text-sm text-gray-600">2. Ingresá el código de 6 dígitos para confirmar.</p>
      <label className="block text-sm font-medium text-gray-700" htmlFor="totpSetupCode">Código del autenticador</label>
      <input id="totpSetupCode" required autoComplete="one-time-code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} maxLength={16} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-lg tracking-widest outline-none focus:border-verde focus:ring-2 focus:ring-verde/20" />
      <AuthFeedback message={error} tone="error" className="" focusOnMount />
      <button type="submit" disabled={loading} className="rounded-xl bg-verde px-5 py-3 font-semibold text-white disabled:opacity-70">{loading ? 'Activando…' : 'Activar'}</button>
    </form>
  );

  if (!status.enabled) return (
    <form className="mt-6 space-y-5" onSubmit={beginSetup}>
      <p className="text-sm font-semibold text-gray-700">Estado: <span className="text-gray-600">Desactivada</span></p>
      <p className="text-sm text-gray-600">Confirmá tu contraseña para comenzar. Si perdés tu autenticador, necesitarás un código de recuperación.</p>
      <PasswordField id="twoFactorSetupPassword" label="Contraseña actual" value={password} onChange={setPassword} autoComplete="current-password" accent="verde" maxLength={128} />
      <AuthFeedback message={error} tone="error" className="" focusOnMount />
      <button type="submit" disabled={loading} className="rounded-xl bg-verde px-5 py-3 font-semibold text-white disabled:opacity-70">{loading ? 'Preparando…' : 'Activar'}</button>
    </form>
  );

  return (
    <div className="mt-6 space-y-5">
      <p className="text-sm font-semibold text-gray-700">Estado: <span className="text-verde">Activada</span></p>
      <p className="text-sm text-gray-600">Tu cuenta solicitará un código adicional al iniciar sesión. Códigos disponibles: {status.recoveryCodesRemaining}.</p>
      {!action ? <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setFactor('totp'); setAction('regenerate'); }} className="rounded-xl border border-verde px-4 py-3 font-semibold text-verde focus:outline-none focus:ring-2 focus:ring-verde-light">Regenerar códigos</button><button type="button" onClick={() => { setFactor('totp'); setAction('disable'); }} className="rounded-xl border border-red-300 px-4 py-3 font-semibold text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">Desactivar verificación en dos pasos</button></div> : (
        <form className="space-y-4 rounded-xl border border-gray-200 p-5" onSubmit={submitManagement}>
          <h3 className="font-bold text-gray-900">{action === 'regenerate' ? 'Regenerar códigos' : 'Desactivar verificación en dos pasos'}</h3>
          <PasswordField id="twoFactorManagementPassword" label="Contraseña actual" value={password} onChange={setPassword} autoComplete="current-password" accent="verde" maxLength={128} />
          {action === 'disable' ? <button type="button" onClick={() => { setFactor(factor === 'totp' ? 'recovery' : 'totp'); setCode(''); }} className="text-sm font-semibold text-naranja">{factor === 'totp' ? 'Usar código de recuperación' : 'Usar código del autenticador'}</button> : null}
          <label className="block text-sm font-medium text-gray-700" htmlFor="twoFactorManagementCode">{factor === 'recovery' && action === 'disable' ? 'Código de recuperación' : 'Código del autenticador'}</label>
          <input id="twoFactorManagementCode" required autoComplete="one-time-code" inputMode={factor === 'totp' ? 'numeric' : 'text'} value={code} onChange={(event) => setCode(event.target.value)} maxLength={64} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono outline-none focus:border-verde focus:ring-2 focus:ring-verde/20" />
          <AuthFeedback message={error} tone="error" className="" focusOnMount />
          <div className="flex gap-3"><button type="submit" disabled={loading} className="rounded-xl bg-verde px-5 py-3 font-semibold text-white disabled:opacity-70">{loading ? 'Confirmando…' : 'Confirmar'}</button><button type="button" onClick={() => { setAction(null); setPassword(''); setCode(''); setError(null); }} className="rounded-xl px-4 py-3 text-gray-600">Cancelar</button></div>
        </form>
      )}
    </div>
  );
}
