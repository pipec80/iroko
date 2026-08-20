import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANONICAL_ROOT = join('docs', 'design-system', 'Axiom Ledger Design System');

const REQUIRED_TOKENS = [
  '--color-poppy',
  '--color-crimson',
  '--color-cobalt',
  '--color-cobalt-soft',
  '--color-cobalt-deep',
  '--color-ink',
  '--color-paper',
];

const CANONICAL_GUIDANCE = [
  join(CANONICAL_ROOT, 'README.md'),
  join(CANONICAL_ROOT, 'SKILL.md'),
  join(CANONICAL_ROOT, 'ui_kits', 'iroko-dashboard', 'README.md'),
  join(CANONICAL_ROOT, 'ui_kits', 'iroko-marketing', 'README.md'),
];

const RETIRED_VISUAL_PATTERNS = [
  { label: 'retired display font', pattern: /Cormorant Garamond/giu },
  { label: 'retired UI font', pattern: /Inter Tight/giu },
  { label: 'retired Tierra color', pattern: /#b8513a/giu },
  { label: 'retired Tierra and Hierro palette', pattern: /Tierra\s*\+\s*Hierro/giu },
];

export function parseCssCustomProperties(css) {
  const withoutComments = css.replaceAll(/\/\*[\s\S]*?\*\//gu, '');
  const properties = new Map();
  const propertyPattern = /(--[\w-]+)\s*:\s*([^;{}]+);/gu;
  let match;

  while ((match = propertyPattern.exec(withoutComments)) !== null) {
    properties.set(match[1], match[2].trim());
  }

  return properties;
}

function normalizedCssValue(value) {
  return value.toLowerCase().replaceAll(/\s+/gu, '');
}

export function checkTokenParity({ requiredTokens, specification, runtime }) {
  const issues = [];

  for (const token of requiredTokens) {
    const specificationValue = specification.get(token);
    const runtimeValue = runtime.get(token);

    if (specificationValue === undefined) {
      issues.push({
        code: 'missing-specification-token',
        token,
        message: 'Required token is missing from the canonical specification.',
      });
      continue;
    }

    if (runtimeValue === undefined) {
      issues.push({
        code: 'missing-runtime-token',
        token,
        message: 'Required token is missing from the runtime stylesheet.',
      });
      continue;
    }

    if (normalizedCssValue(specificationValue) !== normalizedCssValue(runtimeValue)) {
      issues.push({
        code: 'token-mismatch',
        token,
        message: `Runtime value ${runtimeValue} does not match specification value ${specificationValue}.`,
      });
    }
  }

  return issues;
}

export function checkCanonicalDocs({ files }) {
  const issues = [];

  for (const file of files) {
    const lines = file.contents.split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      for (const { label, pattern } of RETIRED_VISUAL_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          issues.push({
            code: 'retired-visual-language',
            file: file.path.replaceAll('\\', '/'),
            line: index + 1,
            message: `Canonical guidance contains ${label}.`,
          });
        }
      }
    }
  }

  return issues;
}

function run() {
  const root = process.cwd();
  const specificationPath = join(CANONICAL_ROOT, 'colors_and_type.css');
  const runtimePath = join('src', 'app', 'globals.css');
  const layoutPath = join('src', 'app', 'layout.tsx');

  const specification = parseCssCustomProperties(
    readFileSync(resolve(root, specificationPath), 'utf8'),
  );
  const runtime = parseCssCustomProperties(readFileSync(resolve(root, runtimePath), 'utf8'));
  const canonicalFiles = CANONICAL_GUIDANCE.map((path) => ({
    path,
    contents: readFileSync(resolve(root, path), 'utf8'),
  }));

  const issues = [
    ...checkTokenParity({
      requiredTokens: REQUIRED_TOKENS,
      specification,
      runtime,
    }),
    ...checkCanonicalDocs({ files: canonicalFiles }),
  ];

  const layout = readFileSync(resolve(root, layoutPath), 'utf8');
  if (!layout.includes('Geist') || !layout.includes('Geist_Mono')) {
    issues.push({
      code: 'runtime-font-mismatch',
      file: layoutPath,
      message: 'Runtime layout must load Geist and Geist_Mono.',
    });
  }

  if (issues.length === 0) {
    console.log(
      `Design-system check passed: ${REQUIRED_TOKENS.length} tokens, ${CANONICAL_GUIDANCE.length} guidance files, and runtime fonts.`,
    );
    return;
  }

  for (const issue of issues) {
    const location =
      issue.file ?
        `${relative(root, resolve(root, issue.file))}${issue.line ? `:${issue.line}` : ''}`
      : issue.token;
    console.error(`${location} [${issue.code}] ${issue.message}`);
  }
  console.error(`Design-system check failed with ${issues.length} issue(s).`);
  process.exitCode = 1;
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === fileURLToPath(import.meta.url)) run();
