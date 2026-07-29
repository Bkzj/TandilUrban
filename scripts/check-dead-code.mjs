import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

const ROOT = process.cwd();
const normalize = (value) => path.resolve(value).replaceAll('\\', '/');
const relative = (value) => path.relative(ROOT, value).replaceAll('\\', '/');
const SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?)$/u;
const TEXT_EXTENSION = /\.(?:[cm]?[jt]sx?|css|md|json|prisma|ya?ml)$/u;

const REMOVED_PATHS = [
  'src/app/api/propiedades/route.ts',
  'src/app/api/propiedades/[id]/route.ts',
  'src/app/api/seed/route.ts',
  'src/app/(web)/perfil/seguridad/page.tsx',
  'src/components/Button.tsx',
  'src/components/HeroColumn.tsx',
  'src/components/PropertyCard.tsx',
  'src/components/SearchBox.tsx',
  'src/components/panel/MetricCard.tsx',
  'src/components/panel/PropiedadSeguimientoSection.tsx',
  'src/components/panel/useChartMounted.ts',
  'src/components/public/OportunidadesIntro.tsx',
  'src/components/public/destacados/DestacadoPropertyCard.tsx',
  'src/constants/mapData.ts',
  'src/lib/panel-propiedad-payload.ts',
  'src/types/api.ts',
  'src/types/index.ts',
];

const REMOVED_EXPORTS = new Set([
  'src/actions/contacto.ts#getSeguimientoPropiedad',
  'src/actions/contacto.ts#registrarVisitaFisica',
  'src/lib/auth.ts#requireInmobiliariaMain',
  'src/lib/mail.ts#buildAuthPasswordResetLink',
  'src/lib/mail.ts#sendPasswordResetEmail',
  'src/lib/money.ts#toMoneyDto',
  'src/lib/public-property-policy.ts#PublicPropertyNotFoundError',
  'src/lib/public-property-policy.ts#requirePublicPropertyRecord',
  'src/lib/validation/common.ts#optionalIdentifierSchema',
  'src/lib/validation/request.ts#parseFormData',
]);

const FORBIDDEN_TRACKED = [
  /(^|\/)\.env($|\.(?!example$))/u,
  /(^|\/)(?:node_modules|\.next|dist|out|build|coverage|assets-raw)\//u,
  /(^|\/)src\/generated\/prisma\//u,
  /\.tsbuildinfo$/u,
  /\.(?:dump|backup|bak|log|zip)$/iu,
];

function walk(directory, options = {}) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const rel = relative(absolute);
    if (
      entry.isDirectory() &&
      (['node_modules', '.next', '.git', 'dist', 'coverage'].includes(entry.name) ||
        rel === 'src/generated/prisma')
    ) {
      continue;
    }
    if (entry.isDirectory()) files.push(...walk(absolute, options));
    else if (entry.isFile() && (!options.filter || options.filter(absolute))) files.push(normalize(absolute));
  }
  return files;
}

function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\0')
      .filter(Boolean)
      .map((file) => file.replaceAll('\\', '/'));
  } catch {
    return walk(ROOT).map(relative);
  }
}

const failures = [];
const sourceFiles = [
  ...walk(path.join(ROOT, 'src'), { filter: (file) => SOURCE_EXTENSION.test(file) }),
  ...walk(path.join(ROOT, 'scripts'), { filter: (file) => SOURCE_EXTENSION.test(file) }),
  ...walk(path.join(ROOT, 'prisma'), { filter: (file) => SOURCE_EXTENSION.test(file) }),
  ...walk(path.join(ROOT, 'tests'), { filter: (file) => SOURCE_EXTENSION.test(file) }),
];
const sourceSet = new Set(sourceFiles);
const config = ts.readConfigFile(path.join(ROOT, 'tsconfig.json'), ts.sys.readFile);
const compilerOptions = ts.parseJsonConfigFileContent(config.config, ts.sys, ROOT).options;
const edges = new Map(sourceFiles.map((file) => [file, new Set()]));
const importedExports = new Map(sourceFiles.map((file) => [file, new Set()]));
const declaredExports = new Map(sourceFiles.map((file) => [file, new Set()]));

function resolveFirstParty(specifier, containingFile) {
  const resolved = ts.resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    ts.sys,
  ).resolvedModule;
  if (!resolved) return null;
  const absolute = normalize(resolved.resolvedFileName.replace(/\.d\.ts$/u, '.ts'));
  return sourceSet.has(absolute) ? absolute : null;
}

for (const file of sourceFiles) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  for (const statement of source.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
    const exported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    const defaultExport = modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    );
    if (exported) {
      if (defaultExport) declaredExports.get(file).add('default');
      else if ('name' in statement && statement.name && ts.isIdentifier(statement.name)) {
        declaredExports.get(file).add(statement.name.text);
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) declaredExports.get(file).add(declaration.name.text);
        }
      }
    }
    if (ts.isExportAssignment(statement)) declaredExports.get(file).add('default');
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        declaredExports.get(file).add(element.name.text);
      }
    }

    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const target = resolveFirstParty(statement.moduleSpecifier.text, file);
      if (target) {
        edges.get(file).add(target);
        const clause = statement.importClause;
        if (clause?.name) importedExports.get(target).add('default');
        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const element of clause.namedBindings.elements) {
            importedExports.get(target).add((element.propertyName ?? element.name).text);
          }
        }
        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          importedExports.get(target).add('*');
        }
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const target = resolveFirstParty(statement.moduleSpecifier.text, file);
      if (target) {
        edges.get(file).add(target);
        if (!statement.exportClause) importedExports.get(target).add('*');
        else if (ts.isNamedExports(statement.exportClause)) {
          for (const element of statement.exportClause.elements) {
            importedExports.get(target).add((element.propertyName ?? element.name).text);
          }
        }
      }
    }
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const target = resolveFirstParty(node.arguments[0].text, file);
      if (target) {
        edges.get(file).add(target);
        importedExports.get(target).add('*');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const nextEntry = /\/src\/app\/(?:.*\/)?(?:page|layout|route|loading|error|not-found|default|template|manifest|sitemap|robots|opengraph-image|twitter-image)\.(?:ts|tsx)$/u;
const roots = sourceFiles.filter(
  (file) =>
    nextEntry.test(file) ||
    /\/src\/(?:middleware|proxy|instrumentation)\.(?:ts|tsx)$/u.test(file) ||
    file.includes('/scripts/') ||
    file.includes('/tests/') ||
    /\/prisma\/(?:seed|seed-demo)\.ts$/u.test(file),
);
const reachable = new Set();
const pending = [...roots];
while (pending.length > 0) {
  const file = pending.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  for (const dependency of edges.get(file) ?? []) pending.push(dependency);
}
for (const file of sourceFiles) {
  if (file.includes('/src/') && !reachable.has(file)) {
    failures.push(`Archivo first-party inalcanzable: ${relative(file)}`);
  }
}

for (const key of REMOVED_EXPORTS) {
  const separator = key.lastIndexOf('#');
  const file = normalize(path.join(ROOT, key.slice(0, separator)));
  const exportedName = key.slice(separator + 1);
  if (declaredExports.get(file)?.has(exportedName)) {
    failures.push(`Export obsoleto reintroducido: ${key}`);
  }
}

const index = new Map();
const lowLink = new Map();
const stack = [];
const onStack = new Set();
const cycles = [];
let nextIndex = 0;
function visitStronglyConnected(file) {
  index.set(file, nextIndex);
  lowLink.set(file, nextIndex);
  nextIndex += 1;
  stack.push(file);
  onStack.add(file);
  for (const dependency of edges.get(file) ?? []) {
    if (!index.has(dependency)) {
      visitStronglyConnected(dependency);
      lowLink.set(file, Math.min(lowLink.get(file), lowLink.get(dependency)));
    } else if (onStack.has(dependency)) {
      lowLink.set(file, Math.min(lowLink.get(file), index.get(dependency)));
    }
  }
  if (lowLink.get(file) === index.get(file)) {
    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== file);
    if (component.length > 1 || edges.get(file)?.has(file)) cycles.push(component);
  }
}
for (const file of sourceFiles) {
  if (!index.has(file)) visitStronglyConnected(file);
}
for (const cycle of cycles) {
  failures.push(`Ciclo first-party: ${cycle.map(relative).join(' -> ')}`);
}

for (const removed of REMOVED_PATHS) {
  if (existsSync(path.join(ROOT, ...removed.split('/')))) {
    failures.push(`Ruta o módulo eliminado volvió a aparecer: ${removed}`);
  }
}
for (const tracked of trackedFiles()) {
  if (FORBIDDEN_TRACKED.some((pattern) => pattern.test(tracked))) {
    failures.push(`Artefacto generado/local versionado: ${tracked}`);
  }
}

const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  for (const match of command.matchAll(/\b(?:node|tsx)\s+((?!-)[^\s&]+)/gu)) {
    const scriptPath = match[1].replaceAll('"', '').replaceAll("'", '');
    if (!/[\\/]/u.test(scriptPath) || /[*{}]/u.test(scriptPath)) continue;
    if (!existsSync(path.resolve(ROOT, scriptPath))) {
      failures.push(`Script package.json "${name}" referencia un archivo ausente: ${scriptPath}`);
    }
  }
}

const referenceCorpus = walk(ROOT, {
  filter: (file) =>
    TEXT_EXTENSION.test(file) &&
    !relative(file).startsWith('public/') &&
    !relative(file).startsWith('src/generated/prisma/'),
})
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
for (const asset of walk(path.join(ROOT, 'public'))) {
  const publicPath = relative(asset).replace(/^public\//u, '');
  const slashReference = `/${publicPath}`;
  const basename = path.basename(asset);
  if (!referenceCorpus.includes(slashReference) && !referenceCorpus.includes(basename)) {
    failures.push(`Asset público sin referencia: public/${publicPath}`);
  }
}

if (failures.length > 0) {
  console.error('check:dead-code encontró problemas:');
  for (const failure of failures.sort()) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `check:dead-code OK (${sourceFiles.length} módulos; ${reachable.size} alcanzables; ` +
    `${declaredExports.size} módulos revisados para exports; ` +
    `${walk(path.join(ROOT, 'public')).length} assets; 0 ciclos).`,
);
console.log(`Exports obsoletos bloqueados: ${REMOVED_EXPORTS.size}.`);
