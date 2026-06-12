import { describe, expect, it } from 'vitest';

import { createProjectSchema, PROJECT_TONES, TONE_TO_COLOR } from './projects';

describe('createProjectSchema', () => {
  const base = { name: 'Mi Proyecto', tone: 'iron', type: 'docs' };

  it('accepts valid full input', () => {
    expect(createProjectSchema.safeParse(base).success).toBe(true);
  });

  it('applies defaults for tone and type when omitted', () => {
    const result = createProjectSchema.safeParse({ name: 'Solo nombre' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tone).toBe('iron');
      expect(result.data.type).toBe('docs');
    }
  });

  it('rejects empty name', () => {
    expect(createProjectSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });

  it('rejects name longer than 80 chars', () => {
    expect(createProjectSchema.safeParse({ ...base, name: 'a'.repeat(81) }).success).toBe(false);
  });

  it('accepts description up to 300 chars and rejects 301', () => {
    expect(createProjectSchema.safeParse({ ...base, description: 'a'.repeat(300) }).success).toBe(
      true,
    );
    expect(createProjectSchema.safeParse({ ...base, description: 'a'.repeat(301) }).success).toBe(
      false,
    );
  });

  it('rejects unknown tone and type', () => {
    expect(createProjectSchema.safeParse({ ...base, tone: 'magenta' }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...base, type: 'spreadsheet' }).success).toBe(false);
  });
});

describe('TONE_TO_COLOR', () => {
  it('has a CSS variable for every declared tone', () => {
    for (const tone of PROJECT_TONES) {
      expect(TONE_TO_COLOR[tone]).toMatch(/^var\(--color-/);
    }
  });
});
