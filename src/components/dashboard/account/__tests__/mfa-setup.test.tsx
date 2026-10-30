import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  rpc: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/components/providers/query-provider', () => ({
  useIdentityQueryKey: (resource: string) => ({
    scope: { userId: 'local-user', accountId: 'local-account', impersonatedBy: null },
    queryKey: ['identity', 'local-user', 'local-account', '', resource],
  }),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      mfa: {
        listFactors: mocks.listFactors,
        enroll: mocks.enroll,
        unenroll: mocks.unenroll,
        challenge: mocks.challenge,
        verify: mocks.verify,
      },
    },
    rpc: mocks.rpc,
  }),
}));
vi.mock('@/app/[locale]/dashboard/account/actions', () => ({
  generateRecoveryCodesAction: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));

import { MfaSetup } from '../mfa-setup';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MfaSetup />
    </QueryClientProvider>,
  );
}

const unverified = (id: string) => ({ id, factor_type: 'totp', status: 'unverified' });

describe('MFA enrollment attempt cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    mocks.unenroll.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: 0, error: null });
  });

  it('closes before enroll resolves, hides QR and compensates its unverified factor once', async () => {
    const late = deferred<{ data: { id: string; totp: { qr_code: string } }; error: null }>();
    mocks.enroll.mockReturnValue(late.promise);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_cancel' }));
    mocks.listFactors.mockResolvedValue({
      data: { all: [unverified('late-factor')] },
      error: null,
    });
    await act(async () =>
      late.resolve({
        data: { id: 'late-factor', totp: { qr_code: 'data:image/svg+xml,late' } },
        error: null,
      }),
    );
    await waitFor(() => expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: 'late-factor' }));
    expect(mocks.unenroll).toHaveBeenCalledTimes(1);
    expect(screen.queryByAltText('QR Code')).toBeNull();
  });

  it('compensates a late factor after unmount without displaying an error toast', async () => {
    const late = deferred<{ data: { id: string; totp: { qr_code: string } }; error: null }>();
    mocks.enroll.mockReturnValue(late.promise);
    const view = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(1));
    view.unmount();
    mocks.listFactors.mockResolvedValue({
      data: { all: [unverified('unmounted-factor')] },
      error: null,
    });
    await act(async () =>
      late.resolve({
        data: { id: 'unmounted-factor', totp: { qr_code: 'data:image/svg+xml,unmounted' } },
        error: null,
      }),
    );
    await waitFor(() =>
      expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: 'unmounted-factor' }),
    );
    expect(mocks.unenroll).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('does not let an old late response replace the reopened attempt', async () => {
    const old = deferred<{ data: { id: string; totp: { qr_code: string } }; error: null }>();
    const fresh = deferred<{ data: { id: string; totp: { qr_code: string } }; error: null }>();
    mocks.enroll.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(2));
    await act(async () =>
      fresh.resolve({
        data: { id: 'new-factor', totp: { qr_code: 'data:image/svg+xml,new' } },
        error: null,
      }),
    );
    mocks.listFactors.mockResolvedValue({ data: { all: [unverified('old-factor')] }, error: null });
    await act(async () =>
      old.resolve({
        data: { id: 'old-factor', totp: { qr_code: 'data:image/svg+xml,old' } },
        error: null,
      }),
    );
    await waitFor(() => expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: 'old-factor' }));
    expect(screen.getByAltText('QR Code').getAttribute('src')).toBe('data:image/svg+xml,new');
    expect(mocks.unenroll).not.toHaveBeenCalledWith({ factorId: 'new-factor' });
  });

  it('does not delete a verified factor on close', async () => {
    mocks.enroll.mockResolvedValue({
      data: { id: 'verified-factor', totp: { qr_code: 'data:image/svg+xml,verified' } },
      error: null,
    });
    mocks.challenge.mockResolvedValue({ data: { id: 'challenge' }, error: null });
    mocks.verify.mockResolvedValue({ data: {}, error: null });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await screen.findByAltText('QR Code');
    fireEvent.change(screen.getByPlaceholderText('000 000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_verify' }));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByAltText('QR Code')).toBeNull());
    expect(mocks.unenroll).not.toHaveBeenCalled();
  });

  it('allows enrollment again after verifying and disabling MFA in the same mount', async () => {
    mocks.enroll.mockResolvedValue({
      data: { id: 'verified-factor', totp: { qr_code: 'data:image/svg+xml,verified' } },
      error: null,
    });
    mocks.challenge.mockResolvedValue({ data: { id: 'challenge' }, error: null });
    mocks.verify.mockResolvedValue({ data: {}, error: null });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await screen.findByAltText('QR Code');
    mocks.listFactors.mockResolvedValue({
      data: { all: [{ ...unverified('verified-factor'), status: 'verified' }] },
      error: null,
    });
    fireEvent.change(screen.getByPlaceholderText('000 000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_verify' }));
    const disable = await screen.findByRole('button', { name: 'disable' });
    mocks.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    fireEvent.click(disable);
    await waitFor(() =>
      expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: 'verified-factor' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(2));
    expect((await screen.findByAltText('QR Code')).getAttribute('src')).toBe(
      'data:image/svg+xml,verified',
    );
  });

  it('keeps a reopened enrollment when a cancelled verification succeeds late', async () => {
    const verification = deferred<{ data: object; error: null }>();
    mocks.enroll
      .mockResolvedValueOnce({
        data: { id: 'old-factor', totp: { qr_code: 'data:image/svg+xml,old' } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'new-factor', totp: { qr_code: 'data:image/svg+xml,new' } },
        error: null,
      });
    mocks.challenge.mockResolvedValue({ data: { id: 'challenge' }, error: null });
    mocks.verify.mockReturnValue(verification.promise);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await screen.findByAltText('QR Code');
    fireEvent.change(screen.getByPlaceholderText('000 000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_verify' }));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'enable' }));
    await waitFor(() =>
      expect(screen.getByAltText('QR Code').getAttribute('src')).toBe('data:image/svg+xml,new'),
    );
    mocks.listFactors.mockResolvedValue({
      data: {
        all: [{ ...unverified('old-factor'), status: 'verified' }, unverified('new-factor')],
      },
      error: null,
    });
    await act(async () => verification.resolve({ data: {}, error: null }));
    await waitFor(() => expect(screen.queryByText('status_enabled')).not.toBeNull());
    expect(screen.getByAltText('QR Code').getAttribute('src')).toBe('data:image/svg+xml,new');
    expect(mocks.unenroll).not.toHaveBeenCalledWith({ factorId: 'old-factor' });
  });

  it('shows a safe error and refreshes factors when compensation fails', async () => {
    mocks.enroll.mockResolvedValue({
      data: { id: 'failed-factor', totp: { qr_code: 'data:image/svg+xml,failed' } },
      error: null,
    });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await screen.findByAltText('QR Code');
    mocks.listFactors.mockResolvedValue({
      data: { all: [unverified('failed-factor')] },
      error: null,
    });
    mocks.unenroll.mockResolvedValue({ error: new Error('sensitive provider details') });
    fireEvent.click(screen.getByRole('button', { name: 'mfa_modal_cancel' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('error.mfa_unenroll_failed'));
    await waitFor(() => expect(mocks.listFactors.mock.calls.length).toBeGreaterThan(2));
    expect(JSON.stringify(mocks.toastError.mock.calls)).not.toContain('sensitive provider details');
  });

  it('compensates a factor returned with an enrollment error', async () => {
    const late = deferred<{
      data: { id: string; totp: { qr_code: string } };
      error: Error;
    }>();
    mocks.enroll.mockReturnValue(late.promise);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(1));
    mocks.listFactors.mockResolvedValue({
      data: { all: [unverified('error-factor')] },
      error: null,
    });
    await act(async () =>
      late.resolve({
        data: { id: 'error-factor', totp: { qr_code: '' } },
        error: new Error('provider details'),
      }),
    );
    await waitFor(() => expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: 'error-factor' }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('error.mfa_enroll_failed'));
    expect(JSON.stringify(mocks.toastError.mock.calls)).not.toContain('provider details');
  });

  it.each(['error', 'exception', 'missing QR'] as const)(
    'allows a fresh enrollment in the same mount after %s',
    async (failure) => {
      if (failure === 'exception') {
        mocks.enroll.mockRejectedValueOnce(new Error('private enrollment details'));
      } else {
        mocks.enroll.mockResolvedValueOnce({
          data:
            failure === 'missing QR' ? { id: 'incomplete-factor', totp: { qr_code: '' } } : null,
          error: failure === 'error' ? new Error('private enrollment details') : null,
        });
      }
      mocks.enroll.mockResolvedValueOnce({
        data: { id: 'retry-factor', totp: { qr_code: 'data:image/svg+xml,retry' } },
        error: null,
      });
      mount();
      fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
      await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
      fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
      await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(2));
      expect((await screen.findByAltText('QR Code')).getAttribute('src')).toBe(
        'data:image/svg+xml,retry',
      );
      expect(JSON.stringify(mocks.toastError.mock.calls)).not.toContain(
        'private enrollment details',
      );
    },
  );

  it('compensates only the incomplete enrollment when its QR is absent', async () => {
    const incomplete = deferred<{ data: { id: string; totp: { qr_code: string } }; error: null }>();
    mocks.enroll.mockReturnValue(incomplete.promise);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'enable' }));
    await waitFor(() => expect(mocks.enroll).toHaveBeenCalledTimes(1));
    mocks.listFactors.mockResolvedValue({
      data: {
        all: [
          unverified('incomplete-factor'),
          { ...unverified('verified-factor'), status: 'verified' },
        ],
      },
      error: null,
    });
    await act(async () =>
      incomplete.resolve({
        data: { id: 'incomplete-factor', totp: { qr_code: '' } },
        error: null,
      }),
    );
    await waitFor(() =>
      expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: 'incomplete-factor' }),
    );
    expect(mocks.unenroll).toHaveBeenCalledTimes(1);
  });
});
