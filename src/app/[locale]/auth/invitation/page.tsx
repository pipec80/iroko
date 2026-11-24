import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { invitationReturn } from '@/lib/auth/invitation-return';

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ entry?: string; next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const next = invitationReturn(query.next, locale);
  const auth = await getTranslations('Auth');
  const menu = await getTranslations('UserMenu');

  if (query.entry === '1' && next) {
    const continuation = encodeURIComponent(next);
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="text-xl font-semibold">{auth('click_btn_invite')}</h1>
        <Button asChild>
          <Link href={`/login?next=${continuation}`} prefetch={false}>
            {auth('sign_in')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/signup?next=${continuation}`} prefetch={false}>
            {auth('create_account')}
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-xl font-semibold">{auth('click_btn_invite')}</h1>
      <p role="alert">{auth('invitation_retry')}</p>
      {next && (
        <form method="post" action={`/${locale}/auth/logout?next=${encodeURIComponent(next)}`}>
          <Button type="submit">{menu('logout')}</Button>
        </form>
      )}
      <Link href="/dashboard">{auth('invitation_dashboard')}</Link>
    </main>
  );
}
