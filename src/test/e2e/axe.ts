import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Forces CSS transitions/animations to their end state so axe evaluates the
 * page's steady-state styles instead of an in-flight transition frame. Pages
 * using an `animate-in fade-in` entrance transition (e.g. billing) briefly
 * render text at a blended, under-contrast opacity right after navigation —
 * a transition artifact, not a persistent WCAG violation — which axe would
 * otherwise flag if the scan lands mid-fade.
 */
async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
}

/**
 * Runs an automated WCAG 2.0/2.1 A/AA scan on the current page and asserts
 * zero violations. Call after the page/flow under test has already reached
 * its final state — this is an extra assertion inside an existing spec,
 * not a separate navigation.
 */
export async function runAxeCheck(page: Page): Promise<void> {
  await disableAnimations(page);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)\n  ${v.helpUrl}`)
    .join('\n');

  expect(results.violations, summary).toEqual([]);
}
