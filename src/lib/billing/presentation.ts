import type { PublicPlan } from './public-catalog';

/** Formats provider amounts according to the currency's minor-unit exponent. */
export function formatPlanAmount(amount: number, currency: string, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  return formatter.format(amount / 10 ** exponent);
}

export const catalogFields = [
  { key: 'seats_max', kind: 'limits' },
  { key: 'teams_max', kind: 'limits' },
  { key: 'api_keys_max', kind: 'limits' },
  { key: 'webhook_endpoints_max', kind: 'limits' },
  { key: 'webhooks_enabled', kind: 'features' },
] as const;

type CatalogTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Unknown or absent capabilities are omitted instead of inventing a commercial promise. */
export function getPlanItems(
  plan: Pick<PublicPlan, 'features' | 'limits'>,
  translate: CatalogTranslator,
  locale: string,
): string[] {
  return catalogFields.flatMap(({ key, kind }) => {
    const value = plan[kind][key];
    if (value === undefined || value === false) return [];
    const label = translate(key);
    return [
      typeof value === 'number' ?
        translate('limit', { label, value: new Intl.NumberFormat(locale).format(value) })
      : label,
    ];
  });
}
