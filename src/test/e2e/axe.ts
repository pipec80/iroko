import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Runs an automated WCAG 2.0/2.1 A/AA scan on the current page and asserts
 * zero violations. Call after the page/flow under test has already reached
 * its final state — this is an extra assertion inside an existing spec,
 * not a separate navigation.
 */
export async function runAxeCheck(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

  const summary = results.violations
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)\n  ${v.helpUrl}`)
    .join('\n');

  expect(results.violations, summary).toEqual([]);
}
