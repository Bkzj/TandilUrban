import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(input: Buffer): string {
  let bits = 0; let value = 0; let output = '';
  for (const byte of input) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return bits > 0 ? `${output}${BASE32[(value << (5 - bits)) & 31]}` : output;
}

function base32Decode(input: string): Buffer {
  const value = input.replace(/[\s-]/gu, '').toUpperCase();
  if (!/^[A-Z2-7]+$/u.test(value)) throw new Error('TOTP secret inválido.');
  let bits = 0; let current = 0; const output: number[] = [];
  for (const character of value) {
    current = (current << 5) | BASE32.indexOf(character); bits += 5;
    if (bits >= 8) { output.push((current >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

export function createOpaqueToken(): string { return randomBytes(32).toString('base64url'); }
export function hashAuthSecret(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function matchesAuthSecretHash(value: string, expectedHash: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(expectedHash)) return false;
  return timingSafeEqual(Buffer.from(hashAuthSecret(value), 'hex'), Buffer.from(expectedHash, 'hex'));
}
export function createTotpSecret(): string { return base32Encode(randomBytes(20)); }

function parseEncryptionKey(base64Key: string): Buffer {
  if (!/^[A-Za-z0-9+/]{43}=$/u.test(base64Key)) throw new Error('AUTH_ENCRYPTION_KEY inválida.');
  const key = Buffer.from(base64Key, 'base64');
  if (key.byteLength !== 32 || key.toString('base64') !== base64Key) throw new Error('AUTH_ENCRYPTION_KEY inválida.');
  return key;
}

export function encryptTotpSecret(secret: string, base64Key: string): string {
  const key = parseEncryptionKey(base64Key);
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptTotpSecret(value: string, base64Key: string): string {
  const [version, ivRaw, tagRaw, ciphertextRaw] = value.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error('Secreto TOTP cifrado inválido.');
  const key = parseEncryptionKey(base64Key);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextRaw, 'base64url')), decipher.final()]).toString('utf8');
}

export function totpAt(secret: string, timeStep: bigint, digits = 6): string {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(timeStep);
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary = ((digest[offset]! & 127) << 24) | (digest[offset + 1]! << 16) | (digest[offset + 2]! << 8) | digest[offset + 3]!;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function verifyTotp(secret: string, code: string, now = Date.now(), window = 1): bigint | null {
  const normalized = code.replace(/\s/gu, '');
  if (!/^\d{6}$/u.test(normalized)) return null;
  const current = BigInt(Math.floor(now / 30_000));
  for (let offset = -window; offset <= window; offset += 1) {
    const step = current + BigInt(offset); const expected = Buffer.from(totpAt(secret, step)); const given = Buffer.from(normalized);
    if (expected.byteLength === given.byteLength && timingSafeEqual(expected, given)) return step;
  }
  return null;
}

export function isTotpTimeStepFresh(step: bigint, lastAcceptedTimeStep: bigint | null): boolean {
  return lastAcceptedTimeStep === null || step > lastAcceptedTimeStep;
}

export function normalizeRecoveryCode(code: string): string {
  return code.normalize('NFKC').replace(/[\s-]/gu, '').toUpperCase();
}

export function hashRecoveryCode(code: string): string { return hashAuthSecret(normalizeRecoveryCode(code)); }

export function createRecoveryCodes(count: number): string[] {
  return Array.from({ length: count }, () => `${randomBytes(5).toString('hex').toUpperCase().slice(0, 5)}-${randomBytes(5).toString('hex').toUpperCase().slice(0, 5)}`);
}
