import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let tracked;
try {
  tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
  }).split('\0').filter(Boolean);
} catch {
  const { sourceArchiveFiles } = await import('./source-archive-lib.mjs');
  tracked = sourceArchiveFiles();
}

const forbiddenPaths = [
  /(^|\/)\.env($|\.(?!example$))/,
  /(^|\/).*(credential|secret).*\.json$/i,
  /\.(pem|key|p12|pfx|jks|dump|backup|bak)$/i,
];

const credentialPatterns = [
  /\b(?:postgres(?:ql)?):\/\/[^\s:'"<>]+:[^\s@'"<>]+@/i,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bre_[0-9A-Za-z_-]{20,}\b/,
  /\b(?:CLOUDINARY_API_SECRET|NEXTAUTH_SECRET|GEMINI_API_KEY|RESEND_API_KEY)\s*[:=]\s*["']?(?!REPLACE_|process\.env|<)[0-9A-Za-z_./+=-]{16,}/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

const findings = [];
for (const file of tracked) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    findings.push(`${file}: ruta sensible versionada`);
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (content.includes('\0')) continue;
  const candidateLines = content
    .split(/\r?\n/)
    .filter((line) => !/(?:REPLACE_|placeholder|USER:PASSWORD|example\.(?:com|test))/i.test(line));
  if (credentialPatterns.some((pattern) => candidateLines.some((line) => pattern.test(line)))) {
    findings.push(`${file}: posible credencial`);
  }
}

if (findings.length > 0) {
  console.error('Se detectaron posibles secretos en archivos versionados:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`check:secrets OK (${tracked.length} archivos versionados revisados; valores no impresos).`);
