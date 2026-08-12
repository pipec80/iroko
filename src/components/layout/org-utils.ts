const ORG_TONES = ['var(--color-poppy)', 'var(--color-cobalt)', 'var(--color-ink)'];

export function getOrgTone(index: number): string {
  return ORG_TONES[index % ORG_TONES.length] ?? 'var(--color-poppy)';
}

export function orgInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
