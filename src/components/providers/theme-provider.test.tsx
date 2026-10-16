import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-themes', () => ({
  ThemeProvider: ({ nonce, children }: { nonce?: string; children: ReactNode }) => (
    <div data-testid="theme" data-nonce={nonce}>
      {children}
    </div>
  ),
}));
import { ThemeProvider } from './theme-provider';

describe('theme nonce', () => {
  it('retains the document nonce when subsequent server props change', () => {
    const view = render(<ThemeProvider nonce="document-nonce">content</ThemeProvider>);
    view.rerender(<ThemeProvider nonce="rsc-nonce">content</ThemeProvider>);
    expect(screen.getByTestId('theme').getAttribute('data-nonce')).toBe('document-nonce');
  });
});
