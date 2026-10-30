// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  url: '',
  key: '',
  enabled: process.env.IROKO_LOCAL_DB_TESTS === '1',
}));
vi.mock('@/env', () => ({
  env: { MERCADOPAGO_ACCESS_TOKEN: 'TEST-fixture', LOG_LEVEL: 'silent', NODE_ENV: 'test' },
}));
vi.mock('@/lib/supabase/admin', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    createAdminClient: () =>
      createClient(fixture.url, fixture.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
  };
});
vi.mock('../registry', async () => {
  const { mercadopagoProvider } = await import('../providers/mercadopago');
  return { getPaymentProvider: () => mercadopagoProvider };
});
import { reconcileNonTerminalSubscriptions } from '../reconciliation';
const container = 'supabase_db_saas-boilerplate';
function sql(input: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-X',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    { input, encoding: 'utf8', timeout: 15000 },
  ).trim();
}
function assertNoForeignCandidates(query: (input: string) => string, subscription: string) {
  if (
    query(
      `SELECT count(*) FROM billing.subscriptions WHERE id <> '${subscription}' AND status IN ('incomplete','trialing','active','past_due','paused') AND nullif(btrim(external_subscription_id),'') IS NOT NULL`,
    ) !== '0'
  ) {
    throw new Error(
      'discovery_foreign_candidates: no worker may run; leave foreign rows unchanged',
    );
  }
}
describe('discovery fixture candidate guard', () => {
  it('refuses foreign candidates without issuing any mutation', () => {
    const query = vi.fn((_input: string) => '1');
    expect(() => assertNoForeignCandidates(query, 'fixture')).toThrow(
      'discovery_foreign_candidates',
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toMatch(/^SELECT count/);
  });
  it('permits a run with only its own candidate', () => {
    expect(() => assertNoForeignCandidates(() => '0', 'fixture')).not.toThrow();
  });
});
describe.skipIf(!fixture.enabled)('local discovery persistence (simulated provider)', () => {
  it('keeps invoice and paid-through unchanged on disagreement, then applies concordant evidence once', async () => {
    expect(readFileSync('supabase/config.toml', 'utf8')).toMatch(
      /project_id\s*=\s*"saas-boilerplate"/,
    );
    if (process.env.DOCKER_HOST && !/^(?:npipe|unix):\/\//.test(process.env.DOCKER_HOST)) {
      throw new Error('Remote Docker hosts are not allowed');
    }
    const dockerEndpoint = execFileSync(
      'docker',
      ['context', 'inspect', '--format', '{{(index .Endpoints "docker").Host}}'],
      { encoding: 'utf8', timeout: 15000 },
    ).trim();
    if (!/^(?:npipe|unix):\/\//.test(dockerEndpoint))
      throw new Error('Docker context must use a local socket');
    const labels = JSON.parse(
      execFileSync('docker', ['inspect', container, '--format', '{{json .Config.Labels}}'], {
        encoding: 'utf8',
      }),
    ) as Record<string, string>;
    expect(labels['com.supabase.cli.project']).toBe('saas-boilerplate');
    expect(sql('SELECT current_database()')).toBe('postgres');
    const status = JSON.parse(
      execFileSync('supabase.exe', ['status', '-o', 'json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    ) as Record<string, string>;
    const apiUrl = status.API_URL;
    const secretKey = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
    if (!apiUrl || !secretKey) throw new Error('Local Supabase credentials unavailable');
    const target = new URL(apiUrl);
    expect(['127.0.0.1', 'localhost', '[::1]']).toContain(target.hostname);
    expect(target.protocol).toBe('http:');
    fixture.url = target.origin;
    fixture.key = secretKey;
    expect(fixture.key).toBeTruthy();
    const account = '00000000-0000-0000-0000-000000005510';
    const subscription = '00000000-0000-0000-0000-000000005530';
    const user = '00000000-0000-0000-0000-000000005501';
    expect(
      sql(
        `SELECT (SELECT count(*) FROM auth.users WHERE id='${user}') + (SELECT count(*) FROM public.accounts WHERE id IN ('${account}','${user}')) + (SELECT count(*) FROM billing.customers WHERE id='00000000-0000-0000-0000-000000005520') + (SELECT count(*) FROM billing.subscriptions WHERE id='${subscription}' OR (provider='mercadopago' AND external_subscription_id='pa-55')) + (SELECT count(*) FROM billing.invoices WHERE external_invoice_id='invoice55' AND provider='mercadopago')`,
      ),
    ).toBe('0');
    // Run exclusively without workers; include future candidates whose backoff may expire.
    const assertOwnCandidates = () => assertNoForeignCandidates(sql, subscription);
    assertOwnCandidates();
    const foreignState = () =>
      sql(
        `SELECT jsonb_build_object('subscriptions',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM billing.subscriptions s WHERE id <> '${subscription}'),'state',(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.subscription_id) FROM billing.reconciliation_state s WHERE subscription_id <> '${subscription}'))`,
      );
    const foreignBefore = foreignState();
    const cleanup = () =>
      sql(
        `BEGIN; ALTER TABLE billing.events DISABLE TRIGGER billing_events_immutable; DELETE FROM billing.reconciliation_state WHERE subscription_id='${subscription}'; DELETE FROM billing.events WHERE customer_id='00000000-0000-0000-0000-000000005520'; DELETE FROM billing.invoices WHERE subscription_id='${subscription}'; DELETE FROM billing.subscriptions WHERE id='${subscription}'; DELETE FROM billing.customers WHERE account_id='${account}'; DELETE FROM public.accounts WHERE id IN ('${account}','${user}'); DELETE FROM auth.users WHERE id='${user}'; ALTER TABLE billing.events ENABLE TRIGGER billing_events_immutable; COMMIT;`,
      );
    let paymentStatus = 'rejected';
    const originalFetch = globalThis.fetch;
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith('https://api.mercadopago.com/')) return originalFetch(input, init);
      const providerUrl = new URL(url);
      const allowed =
        providerUrl.pathname === '/preapproval/pa-55' ||
        providerUrl.pathname === '/v1/payments/payment55' ||
        (providerUrl.pathname === '/authorized_payments/search' &&
          providerUrl.searchParams.get('preapproval_id') === 'pa-55');
      if (!allowed) throw new Error('Unexpected simulated provider resource');
      const body =
        url.includes('/preapproval/') ?
          {
            id: 'pa-55',
            status: 'authorized',
            external_reference: account,
            last_modified: '2026-10-20T12:00:00Z',
          }
        : url.includes('/v1/payments/') ?
          {
            id: 'payment55',
            status: paymentStatus,
            transaction_amount: 19990,
            transaction_amount_refunded: 0,
            currency_id: 'CLP',
          }
        : {
            paging: { offset: 0, limit: 15, total: 1 },
            results: [
              {
                id: 'invoice55',
                preapproval_id: 'pa-55',
                external_reference: account,
                transaction_amount: 19990,
                currency_id: 'CLP',
                date_created: '2026-10-20T12:00:00Z',
                payment: { id: 'payment55', status: 'approved' },
              },
            ],
          };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    try {
      sql(
        `INSERT INTO auth.users(id,email,raw_user_meta_data,created_at,updated_at,confirmation_token,email_confirmed_at,recovery_token,aud,role) VALUES('${user}','discovery55@example.com','{}',now(),now(),'',now(),'','authenticated','authenticated'); INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES('${account}','team','Discovery55','discovery55','${user}'); INSERT INTO billing.customers(id,account_id,provider) VALUES('00000000-0000-0000-0000-000000005520','${account}','mercadopago'); INSERT INTO billing.subscriptions(id,customer_id,plan_id,status,provider,external_subscription_id,current_period_end) VALUES('${subscription}','00000000-0000-0000-0000-000000005520',(SELECT id FROM billing.plans WHERE slug='pro' AND "interval"='month'),'active','mercadopago','pa-55','2026-09-01');`,
      );
      const financial = () =>
        sql(
          `SELECT json_build_object('invoices',(SELECT count(*) FROM billing.invoices WHERE subscription_id='${subscription}'),'paidThrough',(SELECT current_period_end FROM billing.subscriptions WHERE id='${subscription}'),'invoiceEvents',(SELECT count(*) FROM billing.events WHERE customer_id='00000000-0000-0000-0000-000000005520' AND event_type='invoice_paid'))`,
        );
      const before = financial();
      assertOwnCandidates();
      expect(
        await reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
      ).toMatchObject({ scanned: 1, failed: 1 });
      expect(financial()).toBe(before);
      expect(
        sql(
          `SELECT failure_count||'|'||last_error_code||'|'||coalesce(scan_cursor,'null')||'|'||coalesce(invoice_watermark::text,'null') FROM billing.reconciliation_state WHERE subscription_id='${subscription}'`,
        ),
      ).toBe('1|provider_discovery_payment_status_divergence|null|null');
      paymentStatus = 'approved';
      sql(
        `UPDATE billing.reconciliation_state SET next_scan_at=now() WHERE subscription_id='${subscription}'`,
      );
      assertOwnCandidates();
      expect(
        await reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
      ).toMatchObject({ scanned: 1, failed: 0 });
      expect(
        sql(
          `SELECT count(*) FROM billing.invoices WHERE subscription_id='${subscription}' AND status='paid'`,
        ),
      ).toBe('1');
      sql(
        `UPDATE billing.reconciliation_state SET next_scan_at=now() WHERE subscription_id='${subscription}'`,
      );
      assertOwnCandidates();
      expect(
        await reconcileNonTerminalSubscriptions({ batchSize: 20, maxDurationMs: 45000 }),
      ).toMatchObject({ scanned: 1, failed: 0 });
      expect(
        sql(`SELECT count(*) FROM billing.invoices WHERE subscription_id='${subscription}'`),
      ).toBe('1');
    } finally {
      vi.unstubAllGlobals();
      cleanup();
      expect(
        sql(
          `SELECT (SELECT count(*) FROM auth.users WHERE id='${user}') + (SELECT count(*) FROM public.accounts WHERE id IN ('${account}','${user}')) + (SELECT count(*) FROM billing.customers WHERE id='00000000-0000-0000-0000-000000005520') + (SELECT count(*) FROM billing.subscriptions WHERE id='${subscription}') + (SELECT count(*) FROM billing.reconciliation_state WHERE subscription_id='${subscription}') + (SELECT count(*) FROM billing.invoices WHERE subscription_id='${subscription}') + (SELECT count(*) FROM billing.events WHERE customer_id='00000000-0000-0000-0000-000000005520')`,
        ),
      ).toBe('0');
      expect(foreignState()).toBe(foreignBefore);
    }
    expect(sql(`SELECT count(*) FROM auth.users WHERE id='${user}'`)).toBe('0');
  }, 90000);
});
