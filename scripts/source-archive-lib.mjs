import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const REQUIRED = [
  '.env.example',
  '.github/workflows/ci.yml',
  'database/schema.prisma',
  'database/migrations/migration_lock.toml',
  'database/migrations/20260722090000_cloudinary_asset_registry/migration.sql',
  'database/migrations/20260722090000_cloudinary_asset_registry/rollback.sql',
  'database/preflight/phase4-legacy-candidates.sql',
  'docs/security-audit-remediation.md',
  'scripts/check-dead-code.mjs',
  'package.json',
  'package-lock.json',
  'prisma.config.ts',
];

const EXCLUDED = [
  /(^|\/)\.git\//,
  /(^|\/)\.env(?:\.|$)(?!example$)/,
  /(^|\/)node_modules\//,
  /(^|\/)src\/generated\/prisma\//,
  /(^|\/)\.next\//,
  /(^|\/)dist\//,
  /(^|\/)assets-raw\//,
  /(^|\/)(?:out|build|coverage)\//,
  /\.tsbuildinfo$/,
  /(^|\/)next-env\.d\.ts$/,
  /\.(?:zip|tar|tgz|gz|dump|backup|bak|pem|key|p12|pfx|jks)$/i,
  /(^|\/).*(?:credential|secret).*\.json$/i,
];

function normalizedFiles(root) {
  try {
    const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output.split('\0').filter(Boolean).map((file) => file.replaceAll('\\', '/')).sort();
  } catch {
    const files = [];
    const visit = (directory, prefix = '') => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (EXCLUDED.some((pattern) => pattern.test(entry.isDirectory() ? `${relative}/` : relative))) continue;
        if (entry.isDirectory()) visit(resolve(directory, entry.name), relative);
        else if (entry.isFile()) files.push(relative);
      }
    };
    visit(root);
    return files.sort();
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function header(size, signature) {
  const value = Buffer.alloc(size);
  value.writeUInt32LE(signature, 0);
  return value;
}

export function sourceArchiveFiles(root = process.cwd()) {
  const candidates = normalizedFiles(root);
  const files = candidates.filter((file) =>
    existsSync(resolve(root, ...file.split('/'))) && !EXCLUDED.some((pattern) => pattern.test(file)),
  );
  const set = new Set(files);
  const missing = REQUIRED.filter((file) => !set.has(file));
  const migrations = files.filter((file) => /^database\/migrations\/[^/]+\/migration\.sql$/.test(file));
  if (migrations.length === 0) missing.push('database/migrations/**/migration.sql');
  if (missing.length > 0) throw new Error(`Faltan archivos requeridos: ${missing.join(', ')}`);

  let status = [];
  try {
    status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '-z'], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).split('\0').filter(Boolean);
  } catch {
    // Source archives intentionally do not contain .git; required-file checks still apply.
  }
  for (const entry of status) {
    const state = entry.slice(0, 2);
    const file = entry.slice(3).replaceAll('\\', '/');
    if (state.includes('D')) continue;
    if (!set.has(file) && !EXCLUDED.some((pattern) => pattern.test(file))) {
      throw new Error(`El cambio de Phase 0 no está representado en el archivo: ${file}`);
    }
  }
  return files;
}

export function createSourceZip(outputPath, root = process.cwd()) {
  const files = sourceArchiveFiles(root);
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file, 'utf8');
    const data = readFileSync(resolve(root, ...file.split('/')));
    const crc = crc32(data);
    const local = header(30, 0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);

    const central = header(46, 0x02014b50);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralBuffer = Buffer.concat(centralParts);
  const end = header(22, 0x06054b50);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.concat([...localParts, centralBuffer, end]));
  return files;
}

export function extractStoredZip(zipPath, destination) {
  const data = readFileSync(zipPath);
  const extracted = [];
  let offset = 0;
  while (data.readUInt32LE(offset) === 0x04034b50) {
    const method = data.readUInt16LE(offset + 8);
    const size = data.readUInt32LE(offset + 18);
    const nameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);
    if (method !== 0) throw new Error('Método ZIP no soportado.');
    const name = data.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    if (name.split('/').includes('..') || name.startsWith('/') || name.includes('\\')) {
      throw new Error('Ruta ZIP insegura.');
    }
    const contentStart = offset + 30 + nameLength + extraLength;
    const target = resolve(destination, ...name.split('/'));
    const base = `${resolve(destination)}${sep}`;
    if (!target.startsWith(base)) throw new Error('Ruta ZIP fuera del destino.');
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data.subarray(contentStart, contentStart + size));
    extracted.push(name);
    offset = contentStart + size;
  }
  return extracted;
}

export { REQUIRED };
