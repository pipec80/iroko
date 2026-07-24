import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AnnouncementForm } from './announcement-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('announcements_title'), description: t('announcements_subtitle') };
}

export default async function AdminAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Admin');

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="display" style={{ fontSize: 36 }}>
          {t('announcements_title')}
        </h1>
        <p style={{ marginTop: 6, fontSize: 15, color: 'var(--text-secondary)' }}>
          {t('announcements_subtitle')}
        </p>
      </header>

      <AnnouncementForm />
    </div>
  );
}
