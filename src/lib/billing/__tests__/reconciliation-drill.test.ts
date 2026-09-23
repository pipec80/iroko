import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NormalizedBillingEvent } from '../events';
import type { InvoiceDiscoveryInput } from '../types';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  snapshot: vi.fn(),
  discover: vi.fn(),
  getProvider: vi.fn(),
  reduce: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => ({ rpc: mocks.rpc })) }));
vi.mock('../registry', () => ({ getPaymentProvider: mocks.getProvider }));
vi.mock('../reducer', () => ({ reduceBillingEvent: mocks.reduce }));

import { reconcileNonTerminalSubscriptions } from '../reconciliation';

type DrillState = {
  subscriptionId: string;
  accountId: string;
  externalSubscriptionId: string;
  invoiceWatermark: string | null;
  scanCursor: string | null;
  scanWatermark: string | null;
  nextScanAt: number;
  leaseOwner: string | null;
  leaseExpiresAt: number | null;
  failureCount: number;
  lastErrorCode: string | null;
};

type DrillAliasKind = 'event' | 'invoice' | 'payment';

function subscriptionNumber(externalSubscriptionId: string): number {
  const match = /:(\d{2})$/.exec(externalSubscriptionId);
  if (!match) throw new Error('drill_subscription_alias_invalid');
  return Number(match[1]);
}

function invoiceEvent(number: number, page: 'page-1' | 'page-2'): NormalizedBillingEvent {
  const suffix = String(number).padStart(2, '0');
  return {
    accountId: `drill-011d:account:${suffix}`,
    amountPaid: 19_990,
    currency: 'CLP',
    externalEventId: `drill-011d:event:${page}:${suffix}`,
    externalInvoiceId: `drill-011d:invoice:${page}:${suffix}`,
    externalPaymentId: `drill-011d:payment:${page}:${suffix}`,
    externalSubscriptionId: `drill-011d:subscription:${suffix}`,
    paidAt: '2026-09-16T12:00:00.000Z',
    provider: 'mercadopago',
    raw: {},
    type: 'invoice_paid',
  };
}

describe('reconciliation local interruption drill', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('reclaims a cursor-bearing lease and compares all deterministic invoice event and payment aliases', async () => {
    const now = Date.now();
    const states: DrillState[] = Array.from({ length: 25 }, (_, index) => {
      const suffix = String(index + 1).padStart(2, '0');
      return {
        accountId: `drill-011d:account:${suffix}`,
        externalSubscriptionId: `drill-011d:subscription:${suffix}`,
        failureCount: 0,
        invoiceWatermark: null,
        lastErrorCode: null,
        leaseExpiresAt: null,
        leaseOwner: null,
        nextScanAt: now - 1,
        scanCursor: null,
        scanWatermark: null,
        subscriptionId: `drill-011d:subscription-id:${suffix}`,
      };
    });
    const aliases = new Map<DrillAliasKind, Map<string, number>>([
      ['event', new Map()],
      ['invoice', new Map()],
      ['payment', new Map()],
    ]);
    const discoveryInputs: InvoiceDiscoveryInput[] = [];
    const toClaimedCandidate = (state: DrillState) => ({
      account_id: state.accountId,
      external_subscription_id: state.externalSubscriptionId,
      invoice_watermark: state.invoiceWatermark,
      provider: 'mercadopago',
      scan_cursor: state.scanCursor,
      scan_watermark: state.scanWatermark,
      subscription_id: state.subscriptionId,
      subscription_updated_at: '2026-09-16T10:00:00.000Z',
    });

    mocks.rpc.mockImplementation((name: string, args: Record<string, unknown>) => {
      if (name === 'claim_billing_reconciliation_candidates') {
        const workerId = String(args.p_worker_id);
        const limit = Number(args.p_batch_size);
        const claimed = states
          .filter(
            (state) =>
              state.nextScanAt <= Date.now() &&
              (state.leaseExpiresAt === null || state.leaseExpiresAt <= Date.now()),
          )
          .slice(0, limit);
        for (const state of claimed) {
          state.leaseOwner = workerId;
          state.leaseExpiresAt = Date.now() + 90_000;
        }
        return { data: claimed.map(toClaimedCandidate), error: null };
      }
      if (name === 'complete_billing_reconciliation_candidate') {
        const state = states.find((item) => item.subscriptionId === args.p_subscription_id);
        if (!state || state.leaseOwner !== args.p_worker_id) {
          return { data: null, error: { code: 'lease_not_owned' } };
        }
        const outcome = args.p_outcome;
        state.leaseOwner = null;
        state.leaseExpiresAt = null;
        state.nextScanAt = Date.now() + 60_000;
        if (outcome === 'failed') {
          state.failureCount += 1;
          state.lastErrorCode = String(args.p_error_code);
        }
        if (outcome === 'deferred') {
          state.scanCursor = (args.p_next_cursor as string | null) ?? null;
          state.scanWatermark = (args.p_provider_watermark as string | null) ?? null;
        }
        if (outcome === 'completed') {
          state.invoiceWatermark = (args.p_provider_watermark as string | null) ?? null;
          state.scanCursor = null;
          state.scanWatermark = null;
        }
        return { data: outcome, error: null };
      }
      return { data: null, error: { code: 'unexpected_rpc' } };
    });

    mocks.getProvider.mockReturnValue({
      discoverSubscriptionInvoices: async (input: InvoiceDiscoveryInput) => {
        discoveryInputs.push(input);
        const number = subscriptionNumber(input.externalSubscriptionId);
        if (number === 7) throw new Error('provider unavailable');
        const page =
          input.cursor ? 'page-2'
          : number >= 21 ? 'page-2'
          : 'page-1';
        return {
          events: [invoiceEvent(number, page)],
          nextCursor:
            number === 1 && input.cursor === undefined ? 'drill-011d:cursor:page-2' : null,
          providerWatermark: '2026-09-16T12:00:00.000Z',
        };
      },
      getSubscriptionSnapshot: async (externalSubscriptionId: string) => ({
        cancelAtPeriodEnd: false,
        externalSubscriptionId,
        providerVersion: 'drill-v1',
        status: 'active',
      }),
    });
    mocks.reduce.mockImplementation(async (event: NormalizedBillingEvent) => {
      if (event.type === 'invoice_paid' && event.externalEventId.startsWith('drill-011d:')) {
        const found = [
          ['event', event.externalEventId],
          ['invoice', event.externalInvoiceId],
          ['payment', event.externalPaymentId],
        ] as const;
        for (const [kind, alias] of found) {
          if (!alias) continue;
          const current = aliases.get(kind)?.get(alias) ?? 0;
          aliases.get(kind)?.set(alias, current + 1);
        }
      }
      return { status: 'applied' };
    });

    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ deferred: 1, failed: 1, scanned: 20 }));

    const cursorState = states[0];
    if (!cursorState) throw new Error('drill_cursor_state_missing');
    expect(cursorState.scanCursor).toBe('drill-011d:cursor:page-2');

    const aliasesBeforeReplay = new Map(
      [...aliases.entries()].map(([kind, values]) => [kind, new Set(values.keys())]),
    );
    cursorState.leaseOwner = 'drill-011d:interrupted-worker';
    cursorState.leaseExpiresAt = Date.now() - 1;
    cursorState.nextScanAt = Date.now() - 1;

    await expect(
      reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45_000 }),
    ).resolves.toEqual(expect.objectContaining({ deferred: 0, failed: 0, scanned: 6 }));

    expect(discoveryInputs).toContainEqual(
      expect.objectContaining({
        cursor: 'drill-011d:cursor:page-2',
        externalSubscriptionId: 'drill-011d:subscription:01',
      }),
    );
    expect(states).toHaveLength(25);
    expect(
      states.every(
        (state) =>
          state.nextScanAt > Date.now() &&
          state.leaseOwner === null &&
          state.leaseExpiresAt === null,
      ),
    ).toBe(true);
    expect(states[6]).toMatchObject({ failureCount: 1, lastErrorCode: 'provider_fetch_failed' });

    expect([...aliases.values()].map((values) => values.size)).toEqual([25, 25, 25]);
    for (const [kind, before] of aliasesBeforeReplay) {
      const after = aliases.get(kind);
      expect([...before].every((alias) => after?.has(alias))).toBe(true);
      expect(
        [...(after?.keys() ?? [])]
          .filter((alias) => !before.has(alias))
          .every((alias) => alias.startsWith(`drill-011d:${kind}:page-2:`)),
      ).toBe(true);
      expect([...(after?.values() ?? [])].every((occurrences) => occurrences === 1)).toBe(true);
    }
  });
});
