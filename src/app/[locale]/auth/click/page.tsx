import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { appConfig } from '@/config/app.config';

const VALID_TYPES = new Set<string>([
  'signup',
  'magiclink',
  'email',
  'recovery',
  'invite',
  'email_change',
]);

const TYPE_KEYS = {
  signup: { desc: 'click_desc_signup', btn: 'click_btn_signup' },
  magiclink: { desc: 'click_desc_magiclink', btn: 'click_btn_magiclink' },
  email: { desc: 'click_desc_signup', btn: 'click_btn_signup' },
  recovery: { desc: 'click_desc_recovery', btn: 'click_btn_recovery' },
  invite: { desc: 'click_desc_invite', btn: 'click_btn_invite' },
  email_change: { desc: 'click_desc_email_change', btn: 'click_btn_email_change' },
} satisfies Record<string, { desc: string; btn: string }>;

export default async function AuthClickPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const tokenHash = sp.token_hash;
  const type = sp.type;
  const next = sp.next;

  const t = await getTranslations('Auth');

  if (!tokenHash || !type || !VALID_TYPES.has(type)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-destructive text-sm">{t('errors.confirmation_failed')}</p>
          <Link href="/login" className="text-primary mt-4 block text-sm font-semibold">
            {t('back_to_login')}
          </Link>
        </div>
      </div>
    );
  }

  const keys = TYPE_KEYS[type as keyof typeof TYPE_KEYS] ?? TYPE_KEYS.signup;

  const confirmParams = new URLSearchParams({ token_hash: tokenHash, type });
  if (next) confirmParams.set('next', next);
  const confirmHref = `/${locale}/auth/confirm?${confirmParams.toString()}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
          <rect width="32" height="32" rx="6" fill="var(--color-ink)" />
          <circle
            cx="16"
            cy="16"
            r="10"
            fill="none"
            stroke="var(--color-poppy)"
            strokeWidth="2.2"
          />
          <circle cx="16" cy="16" r="3.5" fill="var(--color-cobalt)" />
        </svg>
        <span className="wordmark text-foreground text-[22px]">{appConfig.brand}</span>
      </Link>

      <div className="border-border bg-card animate-in fade-in slide-in-from-bottom-4 w-full max-w-sm rounded-2xl border p-8 duration-500">
        <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          {t('click_title')}
        </h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          {t(keys.desc as Parameters<typeof t>[0])}
        </p>

        <a href={confirmHref}>
          <Button className="h-11 w-full">{t(keys.btn as Parameters<typeof t>[0])}</Button>
        </a>
      </div>
    </div>
  );
}
