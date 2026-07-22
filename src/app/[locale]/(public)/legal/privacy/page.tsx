import { getTranslations, setRequestLocale } from 'next-intl/server';

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('LegalPrivacy');
  const sections = t.raw('sections') as LegalSection[];

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-16 pb-24 sm:px-6 lg:px-8">
      <div className="mb-12 md:mb-16">
        <span className="eyebrow text-muted-foreground mb-4 block">{t('eyebrow')}</span>
        <h1 className="text-foreground mb-4 max-w-2xl text-4xl font-extrabold tracking-tight md:text-5xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('last_updated')}</p>
      </div>

      <div className="max-w-3xl space-y-10">
        {sections.map((section) => (
          <div key={section.heading}>
            <h2 className="text-foreground mb-3 text-xl font-bold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-muted-foreground mb-3 text-base/relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
