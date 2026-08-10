import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';
import { captureServer } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';
import { notify } from '@/lib/notifications';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${env.SITE_URL}/${locale}/login?error=invalid_invitation`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no está autenticado, redirigir al login preservando la URL de aceptación.
  if (!user) {
    const next = encodeURIComponent(`/${locale}/auth/accept-invitation?token=${token}`);
    return NextResponse.redirect(`${env.SITE_URL}/${locale}/login?next=${next}`);
  }

  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token }).single();

  if (error) {
    logger.warn({ userId: user.id, action: 'accept_invitation', code: error.code }, error.message);
    return NextResponse.redirect(`${env.SITE_URL}/${locale}/login?error=invitation_invalid`);
  }

  logger.info({ userId: user.id, action: 'accept_invitation' }, 'Invitation accepted');
  await captureServer({ event: 'invitation_accepted', properties: {}, distinctId: user.id });

  if (data.invited_by) {
    await notify(data.invited_by, {
      type: 'success',
      title: `${user.email} aceptó tu invitación`,
      link: `/${locale}/dashboard/team`,
    }).catch((err: unknown) => {
      logger.error(
        { action: 'accept_invitation.notify', inviterId: data.invited_by },
        err instanceof Error ? err.message : 'Unknown error',
      );
    });
  }

  return NextResponse.redirect(`${env.SITE_URL}/${locale}/dashboard`);
}
