import { expect, test } from '@playwright/test';

/**
 * Sanidad de assets e hidratación.
 *
 * Protege contra la regresión del servidor standalone sin `public/` ni
 * `.next/static/`: en ese estado la app "funciona" (los forms hacen submit
 * por progressive enhancement) pero React nunca hidrata y todo lo que
 * depende de JavaScript de cliente está silenciosamente roto.
 *
 * Etiquetado @smoke: solo lecturas, seguro contra producción.
 */

test.describe('Asset & hydration sanity', () => {
  test('login page loads every script and asset without 4xx/5xx @smoke', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', (response) => {
      const url = new URL(response.url());
      // /_vercel/*: scripts de Analytics/SpeedInsights que solo existen en
      // infraestructura de Vercel — en CI y self-hosting su 404 es esperado.
      if (url.pathname.startsWith('/_vercel/')) return;
      const isOwnAsset =
        url.pathname.startsWith('/_next/') ||
        /\.(js|css|svg|png|ico|webmanifest|woff2?)$/.test(url.pathname);
      if (isOwnAsset && response.status() >= 400) {
        failedRequests.push(`${response.status()} ${url.pathname}`);
      }
    });

    await page.goto('/es/login', { waitUntil: 'domcontentloaded' });

    expect(failedRequests, 'Assets que fallaron al cargar').toEqual([]);
  });

  test('client JavaScript actually hydrates the page @smoke', async ({ page }) => {
    await page.goto('/es/login');

    // El botón de enlace mágico está disabled hasta que el estado React `email`
    // se llena vía onChange. Sin hidratación, escribir en el input no lo
    // habilita jamás — la señal más directa de que el JS de cliente corre.
    const magicButton = page.getByRole('button', { name: /enlace mágico/i });
    await expect(magicButton).toBeDisabled();

    await page.locator('input[name="email"][type="email"]').fill('hydration-check@example.com');

    await expect(magicButton).toBeEnabled({ timeout: 10_000 });
  });

  test('no hydration mismatch on first render @smoke', async ({ page }) => {
    // Regresión: un componente cliente que lee document.cookie/localStorage en
    // el inicializador de useState produce un mismatch real entre SSR e
    // hidratación en TODA carga de página (React error #418/#423/#425).
    // React se recupera regenerando el subárbol del lado del cliente — la
    // página sigue "funcionando" (por eso el test de arriba no lo detecta),
    // pero puede dejar nodos duplicados transitorios en cualquier parte de la
    // app que comparta un ancestro cliente con el componente que causa el
    // mismatch (ver docs/modules/legal-cookies.md §8 — CookieConsentBanner).
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/es');
    await page.waitForLoadState('networkidle');

    const hydrationErrors = pageErrors.filter((msg) => /error #4(18|23|25|27)/.test(msg));
    expect(hydrationErrors, 'Errores de hydration mismatch de React').toEqual([]);
  });
});
