import { localE2eBudget } from '../local-e2e-target';
import { randomUUID } from 'node:crypto';
import type { Page, Request } from '@playwright/test';
import { test, expect } from './fixtures/auth';
import { execSqlAsPostgres, querySqlAsPostgres } from './helpers';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('restoring an old SPA draft preserves its revision after another session saves', async ({
  authenticatedPage: page,
  browser,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  const fixture = await createDocuments(page);
  const otherContext = await browser.newContext();
  const projectPath = `/es/dashboard/projects/${fixture.slug}`;
  const documentPath = `${projectPath}/doc/${fixture.first}`;
  let stage = 'warmup';
  const navigation: {
    route: string;
    event: string;
    status?: number;
    rsc: boolean;
    document: boolean;
  }[] = [];
  const record = (request: Request, event: string, status?: number) => {
    const path = new URL(request.url()).pathname;
    const route =
      path === projectPath ? 'project'
      : path === documentPath ? 'document'
      : null;
    if (route) {
      navigation.push({
        route,
        event,
        ...(status === undefined ? {} : { status }),
        rsc: request.headers().rsc === '1',
        document: request.isNavigationRequest(),
      });
      if (navigation.length > 20) navigation.shift();
    }
  };
  page.on('request', (request) => record(request, 'request'));
  page.on('response', (response) => record(response.request(), 'response', response.status()));
  page.on('requestfailed', (request) => record(request, 'failed'));
  try {
    // Compile the real navigation paths before creating the in-memory draft.
    await page.goto('/es/dashboard/projects');
    await expect(page.getByRole('heading', { name: 'Tus proyectos', exact: true })).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    await page.locator(`a[href$="/dashboard/projects/${fixture.slug}"]`).click();
    await expect(page.getByRole('heading', { name: 'Editor P1', exact: true })).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    await page
      .locator(`a[href$="/dashboard/projects/${fixture.slug}/doc/${fixture.first}"]`)
      .click();
    const editor = page.getByRole('textbox', { name: 'Contenido', exact: true });
    await expect(editor).toHaveValue('initial', { timeout: localE2eBudget(20_000, 'navigation') });
    await expect(editor).toBeEditable();
    await page.evaluate(() => {
      (window as Window & { irokoR02Document?: boolean }).irokoR02Document = true;
    });
    await page.route('**/*', async (route) => {
      if (
        route.request().method() === 'POST' &&
        new URL(route.request().url()).pathname === fixture.url
      )
        return route.abort('failed');
      await route.continue();
    });
    await editor.click();
    await editor.fill('restorable session A');
    await expect(editor).toHaveValue('restorable session A');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Error al guardar' })).toBeVisible();
    await page.locator('aside a[href$="/dashboard/projects"]').first().click();
    await expect(page).toHaveURL(/\/es\/dashboard\/projects$/, {
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    await expect(page.getByRole('heading', { name: 'Tus proyectos', exact: true })).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });

    expect(
      await page.evaluate(
        () => (window as Window & { irokoR02Document?: boolean }).irokoR02Document,
      ),
    ).toBe(true);
    const other = await otherContext.newPage();
    await other.goto('/es/login');
    await other.locator('input[name="email"][type="email"]').fill(fixture.email);
    await other.locator('input[name="password"]').fill('TestPass123!');
    await other.getByRole('button', { name: /iniciar sesión/i }).click();
    await other.waitForURL(/\/es\/dashboard/);
    await other.goto(fixture.url);
    await other.getByRole('textbox', { name: 'Contenido', exact: true }).click();
    await other
      .getByRole('textbox', { name: 'Contenido', exact: true })
      .fill('persisted session B');
    await other.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect
      .poll(() =>
        querySqlAsPostgres(`SELECT revision FROM public.documents WHERE id='${fixture.first}'`),
      )
      .toBe('1');
    await page.unroute('**/*');
    stage = 'return-project';
    navigation.length = 0;
    // History may reuse A's cached revision; normal Links fetch the fresh payload.
    await page
      .locator(`a[href$="/dashboard/projects/${fixture.slug}"]`)
      .click({ timeout: localE2eBudget(20_000, 'navigation') });
    await expect
      .poll(() => new URL(page.url()).pathname === projectPath, {
        timeout: localE2eBudget(20_000, 'navigation'),
      })
      .toBe(true);
    await expect(page.getByRole('heading', { name: 'Editor P1', exact: true })).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    stage = 'return-document';
    await page
      .locator(`a[href$="/dashboard/projects/${fixture.slug}/doc/${fixture.first}"]`)
      .click({ timeout: localE2eBudget(20_000, 'navigation') });
    await expect(editor).toHaveValue('persisted session B', {
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    expect(
      await page.evaluate(
        () => (window as Window & { irokoR02Document?: boolean }).irokoR02Document,
      ),
    ).toBe(true);
    await expect(page.getByRole('button', { name: 'Restaurar', exact: true })).toBeVisible({
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    stage = 'restore';
    await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
    await expect(editor).toHaveValue('restorable session A');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'El documento cambió' })).toBeVisible();
    await expect(editor).toHaveValue('restorable session A');
    expect(
      querySqlAsPostgres(
        `SELECT content||'|'||revision FROM public.documents WHERE id='${fixture.first}'`,
      ),
    ).toBe('persisted session B|1');
  } catch (error) {
    const path = new URL(page.url()).pathname;
    const documentPreserved = await page
      .evaluate(() => Boolean((window as Window & { irokoR02Document?: boolean }).irokoR02Document))
      .catch(() => null);
    await test.info().attach('r02-navigation', {
      contentType: 'application/json',
      body: JSON.stringify({
        stage,
        atProject: path === projectPath,
        atDocument: path === documentPath,
        documentPreserved,
        navigation,
      }),
    });
    throw error;
  } finally {
    await otherContext.close();
  }
});

test('cancelled reload retains an unsaved draft and confirmed reload discards memory', async ({
  authenticatedPage: page,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  const fixture = await createDocuments(page);
  await page.goto(fixture.url);
  let abortedActions = 0;
  await page.route('**/*', async (route) => {
    if (
      route.request().method() === 'POST' &&
      new URL(route.request().url()).pathname === fixture.url
    ) {
      abortedActions++;
      return route.abort('failed');
    }
    await route.continue();
  });
  const editor = page.getByRole('textbox', { name: 'Contenido', exact: true });
  await editor.click();
  await editor.fill('memory only');
  await expect(page.locator('.markdown-preview')).toHaveText('memory only', {
    timeout: localE2eBudget(10_000, 'navigation'),
  });
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect
    .poll(() => abortedActions, { timeout: localE2eBudget(10_000, 'navigation') })
    .toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: 'Error al guardar' })).toBeVisible({
    timeout: localE2eBudget(10_000, 'navigation'),
  });
  const cancelledReload = page.waitForEvent('dialog');
  // Cancellation intentionally produces no new load event.
  await page.evaluate(() => {
    setTimeout(() => window.location.reload(), 0);
  });
  const dialog = await cancelledReload;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await expect(editor).toHaveValue('memory only');
  page.once('dialog', (dialog) => dialog.accept());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(editor).toHaveValue('initial', { timeout: localE2eBudget(20_000, 'navigation') });
  await expect(page.getByRole('button', { name: 'Restaurar', exact: true })).not.toBeVisible();
});

async function createDocuments(page: Page) {
  expect(process.env.LOCAL_VALIDATION).toBe('true');
  await page.goto('/es/dashboard/account?tab=profile');
  const email = (
    await page
      .locator('form')
      .filter({ has: page.locator('input[name="email"]') })
      .locator('..')
      .locator('strong')
      .innerText()
  ).trim();
  // Email comes from the isolated fixture, never from caller-supplied SQL.
  if (!/^e2e\+settings\+\d+@saasboilerplate\.local$/.test(email))
    throw new Error('Unexpected local fixture identity');
  const userId = querySqlAsPostgres(`SELECT id FROM auth.users WHERE email='${email}'`);
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error('Missing fixture user');
  const project = randomUUID();
  const first = randomUUID();
  const second = randomUUID();
  const slug = `editor-${project}`;
  execSqlAsPostgres(
    `INSERT INTO public.projects(id,account_id,name,slug,created_by) VALUES ('${project}','${userId}','Editor P1','${slug}','${userId}'); INSERT INTO public.documents(id,project_id,account_id,name,content,created_by) VALUES ('${first}','${project}','${userId}','First document','initial','${userId}'),('${second}','${project}','${userId}','Second document','second','${userId}');`,
  );
  return { email, first, second, slug, url: `/es/dashboard/projects/${slug}/doc/${first}` };
}

test('flushes before the project link, retains failed saves and restores SPA drafts', async ({
  authenticatedPage: page,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  const fixture = await createDocuments(page);
  await page.goto(fixture.url);
  const editor = page.getByRole('textbox', { name: 'Contenido', exact: true });
  await expect(editor).toBeEditable();
  await editor.click();
  await editor.fill('saved before debounce');
  await expect(page.locator('.markdown-preview')).toContainText('saved before debounce', {
    timeout: localE2eBudget(10_000, 'navigation'),
  });
  await page.getByRole('link', { name: 'Editor P1', exact: true }).click();
  await expect
    .poll(
      () => querySqlAsPostgres(`SELECT content FROM public.documents WHERE id='${fixture.first}'`),
      { timeout: localE2eBudget(10_000, 'navigation') },
    )
    .toBe('saved before debounce');
  await expect(page).toHaveURL(new RegExp(`/projects/${fixture.slug}$`), {
    timeout: localE2eBudget(20_000, 'navigation'),
  });
  await page.goBack();
  await expect(editor).toHaveValue('saved before debounce');
  // A real failed Server Action must leave navigation and the latest draft intact.
  let failedActions = 0;
  await page.route('**/*', async (route) => {
    if (
      route.request().method() === 'POST' &&
      new URL(route.request().url()).pathname === fixture.url
    ) {
      failedActions++;
      return route.abort('failed');
    }
    await route.continue();
  });
  await editor.fill('retained failed draft');
  await page.getByRole('link', { name: 'Editor P1', exact: true }).click();
  await expect
    .poll(() => failedActions, { timeout: localE2eBudget(10_000, 'navigation') })
    .toBeGreaterThan(0);
  await expect(page.getByRole('status').filter({ hasText: 'Error al guardar' })).toBeVisible({
    timeout: localE2eBudget(10_000, 'navigation'),
  });
  await expect(page).toHaveURL(new RegExp(`/doc/${fixture.first}$`));
  await expect(editor).toHaveValue('retained failed draft');
  await page.unroute('**/*');
  // Sidebar navigation unmounts the editor; browser back must offer explicit restoration.
  await page.locator('aside a[href$="/dashboard/projects"]').first().click();
  await expect(page).toHaveURL(/\/es\/dashboard\/projects$/, {
    timeout: localE2eBudget(20_000, 'navigation'),
  });
  await expect(page.getByRole('heading', { name: 'Tus proyectos', exact: true })).toBeVisible({
    timeout: localE2eBudget(20_000, 'navigation'),
  });
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Restaurar', exact: true })).toBeVisible({
    timeout: localE2eBudget(20_000, 'navigation'),
  });
  await page.getByRole('button', { name: 'Restaurar', exact: true }).click();
  await expect(editor).toHaveValue('retained failed draft');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect
    .poll(() =>
      querySqlAsPostgres(`SELECT content FROM public.documents WHERE id='${fixture.first}'`),
    )
    .toBe('retained failed draft');
});

test('two independent sessions reject a stale revision and preserve the losing draft', async ({
  authenticatedPage: page,
  browser,
}) => {
  test.setTimeout(localE2eBudget(120_000));
  const fixture = await createDocuments(page);
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await other.goto('/es/login');
    await other.locator('input[name="email"][type="email"]').fill(fixture.email);
    await other.locator('input[name="password"]').fill('TestPass123!');
    await other.getByRole('button', { name: /iniciar sesión/i }).click();
    await other.waitForURL(/\/es\/dashboard/);
    await Promise.all([page.goto(fixture.url), other.goto(fixture.url)]);
    const firstEditor = page.getByRole('textbox', { name: 'Contenido', exact: true });
    const secondEditor = other.getByRole('textbox', { name: 'Contenido', exact: true });
    await expect(firstEditor).toHaveValue('initial');
    await expect(secondEditor).toHaveValue('initial');
    await firstEditor.fill('winner session A');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect
      .poll(() =>
        querySqlAsPostgres(`SELECT revision FROM public.documents WHERE id='${fixture.first}'`),
      )
      .toBe('1');
    await secondEditor.fill('retained session B');
    await other.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(other.getByRole('alert').filter({ hasText: 'El documento cambió' })).toBeVisible();
    await expect(secondEditor).toHaveValue('retained session B');
    expect(
      querySqlAsPostgres(`SELECT content FROM public.documents WHERE id='${fixture.first}'`),
    ).toBe('winner session A');
    const freshDocument = other.waitForEvent('domcontentloaded');
    other.once('dialog', (dialog) => dialog.accept());
    await other.getByRole('button', { name: 'Recargar versión del servidor', exact: true }).click();
    await freshDocument;
    await expect(secondEditor).toHaveValue('winner session A', {
      timeout: localE2eBudget(20_000, 'navigation'),
    });
    expect(
      querySqlAsPostgres(`SELECT revision FROM public.documents WHERE id='${fixture.first}'`),
    ).toBe('1');
  } finally {
    await otherContext.close();
  }
});
