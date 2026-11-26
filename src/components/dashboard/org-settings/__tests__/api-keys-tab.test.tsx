import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { expect, it, vi } from 'vitest';

import es from '../../../../../messages/es.json';
import { ApiKeysTab } from '../api-keys-tab';

const { listApiKeys, revokeApiKey } = vi.hoisted(() => ({
  listApiKeys: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.mock('@/app/[locale]/dashboard/org/settings/actions-api-keys', () => ({
  createApiKey: vi.fn(),
  listApiKeys,
  revokeApiKey,
}));
vi.mock('@/components/providers/query-provider', () => ({
  useIdentityQueryKey: () => ({ scope: 'test-account', queryKey: ['api-keys', 'test-account'] }),
}));
vi.mock('@/hooks/use-org-entitlements', () => ({ useOrgEntitlements: () => ({}) }));
vi.mock('@/i18n/routing', () => ({ Link: 'a' }));

it('revokes the key only after confirmation and refreshes its status', async () => {
  const key = {
    id: 'key-1',
    name: 'Integración de prueba',
    keyPrefix: 'iroko_test',
    revokedAt: null,
  };
  listApiKeys.mockResolvedValue({ data: [key] });
  revokeApiKey.mockImplementation(async () => {
    listApiKeys.mockResolvedValue({ data: [{ ...key, revokedAt: '2026-11-24T15:00:00Z' }] });
    return { data: true };
  });

  render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="es" messages={es}>
        <ApiKeysTab />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );

  const trigger = await screen.findByRole('button', { name: 'Revocar' });
  fireEvent.click(trigger);
  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }));
  expect(revokeApiKey).not.toHaveBeenCalled();

  fireEvent.click(trigger);
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revocar' }),
  );
  expect(await screen.findByText('Revocada')).toBeTruthy();
  expect(revokeApiKey).toHaveBeenCalledExactlyOnceWith({ id: key.id });
});
