import 'server-only';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

/** Supplies the same bounded public description to every locale's metadata. */
export async function getPublicMetadata(locale: string): Promise<Pick<Metadata, 'description'>> {
  const t = await getTranslations({ locale, namespace: 'HomePage' });
  return { description: t('description') };
}
