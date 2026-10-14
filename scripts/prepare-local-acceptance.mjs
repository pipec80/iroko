import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve, relative, dirname, isAbsolute } from 'node:path';

// Copy current versioned sources (including dirty files), never local env files.
const source = process.cwd();
const destination = resolve(process.argv[2] ?? '');
if (
  !process.argv[2] ||
  existsSync(destination) ||
  destination === source ||
  destination.startsWith(`${source}\\`) ||
  destination.startsWith(`${source}/`)
) {
  throw new Error('Provide a new scratch directory outside the source checkout');
}
const paths = execFileSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
mkdirSync(destination, { recursive: true });
for (const path of paths) {
  if (
    /(^|[/\\])(?:\.env(?:\..*)?|\.git|\.agents|\.codex|\.superpowers|node_modules)(?:[/\\]|$)/.test(
      path,
    )
  )
    continue;
  const input = resolve(source, path);
  const output = resolve(destination, path);
  const subpath = relative(destination, output);
  if (subpath.startsWith('..') || isAbsolute(subpath))
    throw new Error('Source path escapes scratch directory');
  if (!existsSync(input)) continue;
  mkdirSync(dirname(output), { recursive: true });
  cpSync(input, output, { dereference: false });
}
const dependencies = resolve(source, 'node_modules');
if (!existsSync(dependencies))
  throw new Error('Existing repository dependencies are required; no install is performed');
symlinkSync(
  dependencies,
  resolve(destination, 'node_modules'),
  process.platform === 'win32' ? 'junction' : 'dir',
);
console.log(
  'Prepared isolated source copy without local env files; application credentials must be supplied explicitly.',
);
