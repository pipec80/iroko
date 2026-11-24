import { NextResponse, type NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { invitationReturn } from '@/lib/auth/invitation-return';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { origin } = new URL(request.url);

  // CSRF: reject cross-origin logout requests (SECURITY_AUDIT F-07)
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== origin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error({ action: 'auth.signOut', code: error.code }, 'Sign-out failed');
  }

  const next = invitationReturn(request.nextUrl.searchParams.get('next'), locale);
  const destination = new URL(`/${locale}/login`, origin);
  if (next) destination.searchParams.set('next', next);
  return NextResponse.redirect(destination, { status: 303 });
}
