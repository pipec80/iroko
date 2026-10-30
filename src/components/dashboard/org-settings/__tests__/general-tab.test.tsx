import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrgLogo: vi.fn(),
  getOrgInfo: vi.fn(),
  updateOrgLogo: vi.fn(),
  removeOrgLogo: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-logo', () => ({
  getOrgLogo: mocks.getOrgLogo,
  updateOrgLogo: mocks.updateOrgLogo,
  removeOrgLogo: mocks.removeOrgLogo,
}));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-info', () => ({
  getOrgInfo: mocks.getOrgInfo,
  updateOrgInfo: vi.fn(),
}));

import { GeneralTab } from '../general-tab';
import es from '../../../../../messages/es.json';

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('GeneralTab logo section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgInfo.mockResolvedValue({ data: null });
  });

  it('should render the logo heading and upload button', async () => {
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
    renderWithIntl(<GeneralTab />);
    await waitFor(() => expect(screen.getByText('Logo de la organización')).toBeDefined());
    expect(screen.getByText('Subir logo')).toBeDefined();
  });

  it('keeps the new saved preview after a rejected selection and clears it after removal', async () => {
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
    mocks.updateOrgLogo.mockResolvedValue({ success: 'logo_updated' });
    mocks.removeOrgLogo.mockResolvedValue({ success: 'logo_removed' });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:updated-logo',
    });
    renderWithIntl(<GeneralTab />);
    await act(async () => {});
    const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'new.png', { type: 'image/png' })] },
    });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByText('Logo actualizado.')).toBeDefined());
    expect(screen.getByAltText('logo')).toBeDefined();
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    expect((screen.getByAltText('logo') as HTMLImageElement).src).toContain('blob:updated-logo');
    fireEvent.click(screen.getByText('Quitar logo'));
    await waitFor(() => expect(screen.queryByAltText('logo')).toBeNull());
    expect(screen.queryByText('Logo actualizado.')).toBeNull();
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    expect(screen.queryByAltText('logo')).toBeNull();
  });

  it('keeps the logo and reports a transport error when removal rejects', async () => {
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: 'org-assets/account/logo.png' } });
    mocks.removeOrgLogo.mockRejectedValue(new Error('private transport detail'));
    renderWithIntl(<GeneralTab />);
    const remove = await screen.findByText('Quitar logo');
    fireEvent.click(remove);
    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(screen.getByAltText('logo')).toBeDefined();
    expect(screen.queryByText('private transport detail')).toBeNull();
    expect(remove.closest('button')?.disabled).toBe(false);
  });

  it('does not replace a newly selected preview when the initial logo fetch finishes late', async () => {
    const initial = deferred<{ data: { logoUrl: string } }>();
    mocks.getOrgLogo.mockReturnValue(initial.promise);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:selected-logo',
    });
    renderWithIntl(<GeneralTab />);
    const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'selected.png', { type: 'image/png' })] },
    });
    await act(async () => initial.resolve({ data: { logoUrl: 'org-assets/old/logo.png' } }));
    expect((screen.getByAltText('logo') as HTMLImageElement).src).toContain('blob:selected-logo');
  });

  it('ignores an initial logo response that arrives after a confirmed upload', async () => {
    const initial = deferred<{ data: { logoUrl: string } }>();
    mocks.getOrgLogo.mockReturnValue(initial.promise);
    mocks.updateOrgLogo.mockResolvedValue({ success: 'logo_updated' });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:new-logo',
    });
    renderWithIntl(<GeneralTab />);
    const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'new.png', { type: 'image/png' })] },
    });
    fireEvent.submit(input.closest('form')!);
    await screen.findByText('Logo actualizado.');
    await act(async () => initial.resolve({ data: { logoUrl: 'org-assets/old/logo.png' } }));
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    expect((screen.getByAltText('logo') as HTMLImageElement).src).toContain('blob:new-logo');
  });

  it('shows a successful pending upload after an invalid replacement and blocks removal meanwhile', async () => {
    const upload = deferred<{ success: 'logo_updated' }>();
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: 'org-assets/old/logo.png' } });
    mocks.updateOrgLogo.mockReturnValue(upload.promise);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: () => 'blob:pending-logo',
    });
    renderWithIntl(<GeneralTab />);
    await screen.findByText('Quitar logo');
    const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'pending.png', { type: 'image/png' })] },
    });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(mocks.updateOrgLogo).toHaveBeenCalledOnce());
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    await waitFor(() =>
      expect(screen.getByText('Quitar logo').closest('button')?.disabled).toBe(true),
    );
    await act(async () => upload.resolve({ success: 'logo_updated' }));
    await waitFor(() =>
      expect((screen.getByAltText('logo') as HTMLImageElement).src).toContain('blob:pending-logo'),
    );
    expect(screen.getByText('Quitar logo').closest('button')?.disabled).toBe(false);
  });

  it('does not show a previous success while a second upload is pending', async () => {
    const second = deferred<{ success: 'logo_updated' }>();
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
    mocks.updateOrgLogo
      .mockResolvedValueOnce({ success: 'logo_updated' })
      .mockReturnValueOnce(second.promise);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (file: File) => `blob:${file.name}`,
    });
    renderWithIntl(<GeneralTab />);
    const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
    const form = input.closest('form')!;
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'first.png', { type: 'image/png' })] },
    });
    fireEvent.submit(form);
    await screen.findByText('Logo actualizado.');
    fireEvent.change(input, {
      target: { files: [new File(['b'], 'second.png', { type: 'image/png' })] },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.updateOrgLogo).toHaveBeenCalledTimes(2));
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'invalid.txt', { type: 'text/plain' })] },
    });
    expect(screen.queryByText('Logo actualizado.')).toBeNull();
    await act(async () => second.resolve({ success: 'logo_updated' }));
    await waitFor(() =>
      expect((screen.getByAltText('logo') as HTMLImageElement).src).toContain('blob:second.png'),
    );
  });
});

describe('GeneralTab info section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrgLogo.mockResolvedValue({ data: { logoUrl: null } });
  });

  it('should render the info form pre-filled once loaded', async () => {
    mocks.getOrgInfo.mockResolvedValue({
      data: { name: 'Acme', slug: 'acme', website: 'https://acme.com', country: 'Chile' },
    });
    renderWithIntl(<GeneralTab />);
    const nameInput = await screen.findByLabelText('Nombre');
    expect((nameInput as HTMLInputElement).value).toBe('Acme');
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('acme');
  });
});
