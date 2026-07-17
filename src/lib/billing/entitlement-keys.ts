/** Keys de feature/límite de `billing.plans.features` / `.limits`, centralizadas
 * para no repetir los literales en cada tab de org/settings (3H-1.5). */
export const FEATURE_KEYS = {
  webhooksEnabled: 'webhooks_enabled',
} as const;

export const LIMIT_KEYS = {
  apiKeysMax: 'api_keys_max',
  webhookEndpointsMax: 'webhook_endpoints_max',
  seatsMax: 'seats_max',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
export type LimitKey = (typeof LIMIT_KEYS)[keyof typeof LIMIT_KEYS];
