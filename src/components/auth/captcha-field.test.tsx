import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env', () => ({ env: { NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'local-test-key' } }));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ scriptOptions }: { scriptOptions?: { nonce?: string } }) => (
    <div data-testid="captcha" data-nonce={scriptOptions?.nonce} />
  ),
}));
vi.mock('@/components/providers/csp-nonce-provider', () => ({
  useCspNonce: () => 'document-nonce',
}));
import { CaptchaField } from './captcha-field';

describe('CAPTCHA script nonce', () => {
  it('passes the document nonce to dynamically inserted Turnstile scripts', () => {
    render(<CaptchaField />);
    expect(screen.getByTestId('captcha').getAttribute('data-nonce')).toBe('document-nonce');
  });
});
