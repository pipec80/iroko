import { createTranslator, type AbstractIntlMessages } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import pt from '../../../messages/pt.json';
import fr from '../../../messages/fr.json';
import { appConfig } from '@/config/app.config';

const dictionaries = { en, es, pt, fr };
vi.mock('next-intl/server', () => ({
  getTranslations: async ({
    locale,
    namespace,
  }: {
    locale: keyof typeof dictionaries;
    namespace: string;
  }) =>
    createTranslator({
      locale,
      messages: { HomePage: dictionaries[locale].HomePage } as AbstractIntlMessages,
      namespace,
    }),
}));

import { getPublicMetadata } from '../public-metadata';

function publicTexts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(publicTexts);
  return [];
}

describe('bounded public promises and metadata', () => {
  const descriptions = {
    es: 'Base SaaS en desarrollo con autenticación, cuentas, permisos e integraciones configurables.',
    en: 'SaaS foundation in development with authentication, accounts, permissions and configurable integrations.',
    pt: 'Base SaaS em desenvolvimento com autenticação, contas, permissões e integrações configuráveis.',
    fr: 'Base SaaS en développement avec authentification, comptes, permissions et intégrations configurables.',
  };

  it.each(['es', 'en', 'pt', 'fr'] as const)(
    'uses the agreed scope in %s metadata and public copy',
    async (locale) => {
      expect(await getPublicMetadata(locale)).toEqual({ description: descriptions[locale] });
      const messages = dictionaries[locale];
      expect(messages.HomePage.description).toBe(descriptions[locale]);
      expect(messages.PublicHome.feature_billing_desc).toContain('Mercado Pago');
      const publicCopy = publicTexts([
        messages.PublicHome,
        messages.PublicPricing,
        messages.PublicProduct,
        messages.PublicSolutions,
        messages.PublicContact,
        messages.PublicFooter,
        messages.Marketing,
      ]).join(' ');
      expect(publicCopy).not.toMatch(
        /\b(?:SLA|SAML|Stripe)\b|production.ready|ready on day one|24 h|24 horas|24 hours|24 heures|30 min|tarde|afternoon|après-midi|Discord|tier_personal_price|tier_studio_price|tier_custom_price/i,
      );
    },
  );

  it('uses a bounded fallback description in the app configuration', () => {
    expect(appConfig.description).toBe(descriptions.en);
  });
});
