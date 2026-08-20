import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STALE_PATTERNS = [
  { label: 'placeholder URL', pattern: /about:blank/giu },
  { label: 'unresolved pull request placeholder', pattern: /\bPR\s+TBD\b/giu },
  { label: 'retired assistant rules path', pattern: /\.claude[\\/]rules/giu },
];

function markdownTargets(line) {
  const targets = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)\n]+)\)/gu;
  let match;

  while ((match = linkPattern.exec(line)) !== null) {
    let value = match[1].trim();
    if (value.startsWith('<')) {
      const closingBracket = value.indexOf('>');
      if (closingBracket !== -1) value = value.slice(1, closingBracket);
    } else {
      value = value.match(/^\S+/u)?.[0] ?? value;
    }
    targets.push(value);
  }

  return targets;
}

function isExternalOrRuntimeTarget(target) {
  return (
    target === '' ||
    target.startsWith('#') ||
    target.startsWith('/') ||
    target.startsWith('\\') ||
    /^[a-z][a-z\d+.-]*:/iu.test(target)
  );
}

function localPathFromTarget(target) {
  const withoutFragment = target.split('#', 1)[0];
  const withoutQuery = withoutFragment.split('?', 1)[0];
  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

export function checkMarkdownFiles({ root, files }) {
  const absoluteRoot = resolve(root);
  const issues = [];

  for (const file of files) {
    const normalizedFile = file.replaceAll('\\', '/');
    const absoluteFile = isAbsolute(file) ? file : join(absoluteRoot, file);
    const lines = readFileSync(absoluteFile, 'utf8').split(/\r?\n/u);

    for (const [index, line] of lines.entries()) {
      const lineNumber = index + 1;

      for (const { label, pattern } of STALE_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          issues.push({
            code: 'stale-reference',
            file: normalizedFile,
            line: lineNumber,
            message: `Forbidden stale reference: ${label}`,
          });
        }
      }

      for (const target of markdownTargets(line)) {
        if (isExternalOrRuntimeTarget(target)) continue;
        const localPath = localPathFromTarget(target);
        if (localPath === '') continue;

        const resolvedTarget = resolve(dirname(absoluteFile), localPath);
        if (!existsSync(resolvedTarget)) {
          issues.push({
            code: 'broken-link',
            file: normalizedFile,
            line: lineNumber,
            message: `Relative target does not exist: ${target}`,
          });
        }
      }
    }
  }

  return issues;
}

function repositoryMarkdownFiles(root) {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'],
    { cwd: root, encoding: 'utf8' },
  );
  return output
    .split(/\r?\n/u)
    .map((file) => file.trim())
    .filter(Boolean);
}

function run() {
  const root = process.cwd();
  const files = repositoryMarkdownFiles(root);
  const issues = checkMarkdownFiles({ root, files });

  if (issues.length === 0) {
    console.log(`Documentation check passed: ${files.length} Markdown files.`);
    return;
  }

  for (const issue of issues) {
    console.error(`${issue.file}:${issue.line} [${issue.code}] ${issue.message}`);
  }
  console.error(`Documentation check failed with ${issues.length} issue(s).`);
  process.exitCode = 1;
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === fileURLToPath(import.meta.url)) run();
