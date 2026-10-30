import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ siteKey: undefined as string | undefined, next: '' }));
const actions = vi.hoisted(() => ({ signIn: vi.fn(), magic: vi.fn() }));
vi.mock('@/env', () => ({
  env: {
    get NEXT_PUBLIC_TURNSTILE_SITE_KEY() {
      return config.siteKey;
    },
  },
}));
vi.mock('@/components/providers/csp-nonce-provider', () => ({ useCspNonce: () => undefined }));
vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { rich: (key: string) => key }),
  useLocale: () => 'es',
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams({ next: config.next }),
}));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/i18n/routing', () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/es/forgot-password">{children}</a>
  ),
  routing: { locales: ['es', 'en', 'pt', 'fr'] },
}));
vi.mock('@/app/[locale]/(auth)/actions', () => ({
  signInAction: actions.signIn,
  verifyMfaAction: vi.fn(),
  verifyRecoveryAction: vi.fn(),
  magicLinkAction: actions.magic,
  oauthAction: vi.fn(),
}));
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button type="button" data-testid="turnstile" onClick={() => onSuccess('fresh-token')} />
  ),
}));

import { CaptchaField } from '../captcha-field';
import LoginPage from '@/app/[locale]/(auth)/login/page';

describe('CAPTCHA-free form retry', () => {
  it('remains ready after a submitted form resets its CAPTCHA key', () => {
    config.siteKey = undefined;
    config.next = '';
    const onReadyChange = vi.fn();
    const { rerender } = render(<CaptchaField resetKey={0} onReadyChange={onReadyChange} />);
    expect(onReadyChange).toHaveBeenLastCalledWith(true);

    rerender(<CaptchaField resetKey={1} onReadyChange={onReadyChange} />);
    expect(onReadyChange).toHaveBeenCalledTimes(2);
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('allows two login submissions after a server error without a site key', async () => {
    config.siteKey = undefined;
    config.next = '';
    actions.signIn.mockReset().mockResolvedValue({ error: 'invalid_credentials' });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'user@example.test' } });
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'wrong-pass' } });
    const button = screen.getByRole('button', { name: 'sign_in' });
    const form = button.closest('form');
    if (!form) throw new Error('Login form missing');
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(button).not.toHaveProperty('disabled', true);
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(actions.signIn).toHaveBeenCalledTimes(2);
  });
});

describe('CAPTCHA token ownership', () => {
  it('does not let a password token stand in for the magic-link form token', () => {
    config.siteKey = 'test-site-key';
    config.next = '';
    render(
      <div>
        <form data-testid="password">
          <CaptchaField />
        </form>
        <form data-testid="magic">
          <CaptchaField />
        </form>
      </div>,
    );
    const widgets = screen.getAllByTestId('turnstile');
    fireEvent.click(widgets[0]!);
    const password = screen.getByTestId('password') as HTMLFormElement;
    const magic = screen.getByTestId('magic') as HTMLFormElement;
    expect(new FormData(password).get('captchaToken')).toBe('fresh-token');
    expect(new FormData(magic).get('captchaToken')).toBe('');
    fireEvent.click(widgets[1]!);
    expect(new FormData(magic).get('captchaToken')).toBe('fresh-token');
  });

  it('requires a fresh token in the magic-link form when a site key is configured', () => {
    config.siteKey = 'test-site-key';
    config.next = '';
    render(<LoginPage />);
    const magicButton = screen.getByRole('button', { name: 'magic_link' });
    const magicForm = magicButton.closest('form');
    if (!magicForm) throw new Error('Magic form missing');
    expect(magicForm.querySelector('input[name="captchaToken"]')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'user@example.test' } });
    expect(magicButton).toHaveProperty('disabled', true);
    const widgets = screen.getAllByTestId('turnstile');
    fireEvent.click(widgets[0]!);
    expect(magicButton).toHaveProperty('disabled', true);
    fireEvent.click(widgets[1]!);
    expect(magicButton).toHaveProperty('disabled', false);
    expect(new FormData(magicForm).get('captchaToken')).toBe('fresh-token');
  });

  it('passes a safe invitation next to password login and replaces an external target', () => {
    config.siteKey = undefined;
    config.next = '/es/auth/accept-invitation?token=fixture-token';
    const rendered = render(<LoginPage />);
    const passwordForm = screen.getByLabelText('password').closest('form');
    expect(passwordForm?.querySelector('input[name="next"]')?.getAttribute('value')).toBe(
      config.next,
    );
    rendered.unmount();
    config.next = 'https://evil.example';
    render(<LoginPage />);
    const unsafeForm = screen.getByLabelText('password').closest('form');
    expect(unsafeForm?.querySelector('input[name="next"]')?.getAttribute('value')).toBe(
      '/es/dashboard',
    );
  });
});
