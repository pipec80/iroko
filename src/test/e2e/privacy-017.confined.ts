import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { requireUserUuid } from '../local-auth-cleanup';
import { localE2eBudget } from '../local-e2e-target';
import { interceptIngest } from './analytics-ingest';
import {
  createConfirmedUser,
  execSqlAsPostgres,
  querySqlAsPostgres,
  loginViaUi,
  uniqueEmail,
} from './helpers';

// Selected explicitly by the confined harness. Ordinary Playwright discovery excludes this file.
test.beforeEach(() => {
  expect(process.env.LOCAL_VALIDATION).toBe('true');
  expect(process.env.E2E_SUPABASE_PROJECT_ID).toBe('saas-boilerplate');
  test.setTimeout(localE2eBudget(120_000));
});

function events(payloads: string[]) {
  type Capture = {
    event?: string;
    properties?: { distinct_id?: string; $groups?: { account?: string }; $current_url?: string };
  };
  const events: Capture[] = [];
  for (const body of payloads) {
    const decoded = JSON.parse(body);
    const batch = Array.isArray(decoded) ? decoded : (decoded.batch ?? [decoded]);
    for (const event of batch) if (typeof event?.event === 'string') events.push(event);
  }
  return events;
}

function removeFixture(id: string) {
  execSqlAsPostgres(
    `DELETE FROM public.accounts WHERE id='${id}' OR created_by='${id}'; DELETE FROM auth.users WHERE id='${id}';`,
  );
}

test('N-25 same user attributes pageviews to the newly selected account', async ({
  page,
  request,
}) => {
  const ingest = await interceptIngest(page);
  const email = uniqueEmail('e2e+privacy017');
  const password = 'TestPass123!';
  const id = requireUserUuid(
    await createConfirmedUser(request, email, password, process.env.SUPABASE_SECRET_KEY ?? ''),
  );
  try {
    const team = randomUUID();
    const name = `Privacy ${Date.now()}`;
    execSqlAsPostgres(`BEGIN;
      UPDATE public.profiles SET onboarding_completed=true, active_account_id='${id}' WHERE id='${id}';
      INSERT INTO public.accounts(id,type,name,slug,created_by) VALUES ('${team}','team','${name}','privacy-${team}','${id}');
      INSERT INTO public.accounts_memberships(account_id,user_id,role) VALUES ('${team}','${id}','owner');
      COMMIT;`);
    expect(
      querySqlAsPostgres(`SELECT (public.custom_access_token_hook(
      jsonb_build_object('user_id','${id}','claims','{}'::jsonb)
    ) #>> '{claims,app_metadata,account_id}') = '${id}';`).trim(),
    ).toBe('t');
    await loginViaUi(page, email, password);
    const switcher = page.getByRole('button', { name: /cambiar de organización/i });
    await expect(switcher).toBeVisible();
    await page.getByTestId('cookie-consent-accept-all').click();
    await expect.poll(() => ingest.payloads.length, { timeout: 15000 }).toBeGreaterThan(0);
    const pageviews = () => events(ingest.payloads).filter((e) => e.event === '$pageview');
    const attribution = () =>
      pageviews().map((e) => [e.properties?.distinct_id, e.properties?.$groups?.account]);
    await expect.poll(attribution, { timeout: 15000 }).toContainEqual([id, id]);
    const identifiedUsers = () =>
      events(ingest.payloads)
        .filter((e) => e.event === '$identify')
        .map((e) => e.properties?.distinct_id);
    await expect.poll(identifiedUsers, { timeout: 15000 }).toEqual([id]);
    const boundary = pageviews().length;
    await switcher.click();
    await page.getByRole('option', { name: new RegExp(name) }).click();
    await expect(switcher).toContainText(name);
    await page.locator('a[href="/es/dashboard/org/settings"]').first().click();
    await expect
      .poll(
        () =>
          pageviews()
            .slice(boundary)
            .map((e) => e.properties?.$current_url),
        { timeout: 15000 },
      )
      .toContain('/es/dashboard/org/settings');
    for (const event of pageviews().slice(boundary)) {
      expect(event.properties?.distinct_id).toBe(id);
      expect(event.properties?.$groups?.account).toBe(team);
    }
    expect(identifiedUsers()).toEqual([id]);
  } finally {
    removeFixture(id);
  }
});
