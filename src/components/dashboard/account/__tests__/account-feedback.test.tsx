import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  updatePassword: vi.fn(),
  updateEmail: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  resetPassword: vi.fn(),
  deleteAccount: vi.fn(),
  exportData: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <span data-testid="avatar-preview" data-src={src} />,
}));
vi.mock('../mfa-setup', () => ({ MfaSetup: () => null }));
vi.mock('../phone-country-input', () => ({ PhoneCountryInput: () => null }));
vi.mock('@/app/[locale]/dashboard/account/actions', () => ({
  updatePasswordFromSettingsAction: actions.updatePassword,
  updateEmailAction: actions.updateEmail,
  updateProfileAction: actions.updateProfile,
  uploadAvatarAction: actions.uploadAvatar,
  requestPasswordResetFromSettingsAction: actions.resetPassword,
  deleteAccountAction: actions.deleteAccount,
  exportMyDataAction: actions.exportData,
}));

import { SecurityTab } from '../security-tab';
import { ProfileTab } from '../profile-tab';

const profile = {
  id: 'user-1',
  given_name: 'A',
  family_name: 'B',
  display_name: 'A B',
  avatar_url: null,
  locale: 'es',
  timezone: 'America/Santiago',
  phone_number: null,
  birth_date: null,
  bio: null,
  website_url: null,
  company: null,
};

function passwordForm() {
  const input = screen.getByLabelText('security.current_password');
  const form = input.closest('form');
  if (!form) throw new Error('Password form missing');
  return form;
}

describe('account submission feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (file: File) => `blob:${file.name}`,
    });
  });

  it('shows confirmed password success and preserves edits made while the request is pending', async () => {
    let finish: ((value: { success: string }) => void) | undefined;
    actions.updatePassword.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<SecurityTab />);
    const form = passwordForm();
    fireEvent.change(screen.getByLabelText('security.current_password'), {
      target: { value: 'OldPass123!' },
    });
    fireEvent.change(screen.getByLabelText('security.new_password'), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.change(screen.getByLabelText('security.confirm_password'), {
      target: { value: 'NewPass123!' },
    });
    await act(async () => {
      fireEvent.submit(form);
    });
    fireEvent.change(screen.getByLabelText('security.new_password'), {
      target: { value: 'LaterPass456!' },
    });
    await act(async () => {
      finish?.({ success: 'password_updated' });
    });
    expect((screen.getByLabelText('security.new_password') as HTMLInputElement).value).toBe(
      'LaterPass456!',
    );
    expect(screen.queryByText('security.success.password_updated')).toBeNull();
  });

  it('clears confirmed password fields and shows success', async () => {
    actions.updatePassword.mockResolvedValue({ success: 'password_updated' });
    render(<SecurityTab />);
    fireEvent.change(screen.getByLabelText('security.current_password'), {
      target: { value: 'OldPass123!' },
    });
    fireEvent.change(screen.getByLabelText('security.new_password'), {
      target: { value: 'NewPass123!' },
    });
    fireEvent.change(screen.getByLabelText('security.confirm_password'), {
      target: { value: 'NewPass123!' },
    });
    await act(async () => {
      fireEvent.submit(passwordForm());
    });
    expect(screen.getByText('security.success.password_updated')).toBeTruthy();
    expect((screen.getByLabelText('security.current_password') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('security.new_password') as HTMLInputElement).value).toBe('');
  });

  it('shows email success for a confirmed submission', async () => {
    actions.updateEmail.mockResolvedValue({ success: 'email_change_requested' });
    render(<ProfileTab profile={profile} email="old@example.test" {...{ role: 'owner' }} />);
    const input = screen.getByLabelText('profile.new_email');
    fireEvent.change(input, { target: { value: 'new@example.test' } });
    const form = input.closest('form');
    if (!form) throw new Error('Email form missing');
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() =>
      expect(screen.getByText('profile.success.email_change_requested')).toBeTruthy(),
    );
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('keeps a newer email edit when an earlier request succeeds', async () => {
    let finish: ((value: { success: string }) => void) | undefined;
    actions.updateEmail.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<ProfileTab profile={profile} email="old@example.test" {...{ role: 'owner' }} />);
    const input = screen.getByLabelText('profile.new_email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'first@example.test' } });
    const form = input.closest('form');
    if (!form) throw new Error('Email form missing');
    await act(async () => {
      fireEvent.submit(form);
    });
    fireEvent.change(input, { target: { value: 'later@example.test' } });
    await act(async () => {
      finish?.({ success: 'email_change_requested' });
    });
    expect(input.value).toBe('later@example.test');
    expect(screen.queryByText('profile.success.email_change_requested')).toBeNull();
  });

  it('clears each confirmed avatar selection even when success codes repeat', async () => {
    actions.uploadAvatar.mockImplementation(async () => ({ success: 'avatar_updated' }));
    render(<ProfileTab profile={profile} email="old@example.test" {...{ role: 'owner' }} />);
    const form = screen.getByTestId('avatar-form');
    const input = form.querySelector('input[type="file"]') as HTMLInputElement;
    const save = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    for (const name of ['first.png', 'second.png']) {
      fireEvent.change(input, {
        target: { files: [new File(['image'], name, { type: 'image/png' })] },
      });
      expect(save.disabled).toBe(false);
      await act(async () => {
        fireEvent.submit(form);
      });
      await waitFor(() => expect(save.disabled).toBe(true));
      expect(input.value).toBe('');
    }
    expect(actions.uploadAvatar).toHaveBeenCalledTimes(2);
  });

  it('keeps a newer avatar selection when the previous upload succeeds', async () => {
    let finish: ((value: { success: string }) => void) | undefined;
    actions.uploadAvatar.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<ProfileTab profile={profile} email="old@example.test" {...{ role: 'owner' }} />);
    const form = screen.getByTestId('avatar-form');
    const input = form.querySelector('input[type="file"]') as HTMLInputElement;
    const save = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'first.png', { type: 'image/png' })] },
    });
    await act(async () => {
      fireEvent.submit(form);
    });
    fireEvent.change(input, {
      target: { files: [new File(['b'], 'second.png', { type: 'image/png' })] },
    });
    await act(async () => {
      finish?.({ success: 'avatar_updated' });
    });
    expect(input.files?.[0]?.name).toBe('second.png');
    expect(save.disabled).toBe(false);
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByTestId('avatar-preview').getAttribute('data-src')).toBe('blob:first.png');
  });

  it('keeps the last confirmed avatar preview when a later selection is invalid', async () => {
    actions.uploadAvatar.mockResolvedValue({ success: 'avatar_updated' });
    render(<ProfileTab profile={profile} email="old@example.test" role="owner" />);
    const form = screen.getByTestId('avatar-form');
    const input = form.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['image'], 'confirmed.png', { type: 'image/png' })] },
    });
    await act(async () => fireEvent.submit(form));
    await waitFor(() =>
      expect((form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(
        true,
      ),
    );
    fireEvent.change(input, {
      target: { files: [new File(['invalid'], 'invalid.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByTestId('avatar-preview').getAttribute('data-src')).toBe(
      'blob:confirmed.png',
    );
    expect((form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows a pending upload after a newer invalid selection', async () => {
    let finish: ((value: { success: string }) => void) | undefined;
    actions.uploadAvatar.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<ProfileTab profile={profile} email="old@example.test" role="owner" />);
    const form = screen.getByTestId('avatar-form');
    const input = form.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['image'], 'pending.png', { type: 'image/png' })] },
    });
    await act(async () => fireEvent.submit(form));
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    await act(async () => finish?.({ success: 'avatar_updated' }));
    expect(screen.getByTestId('avatar-preview').getAttribute('data-src')).toBe('blob:pending.png');
    expect(screen.getByText('profile.success.avatar_updated')).toBeDefined();
  });
});
