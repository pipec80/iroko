import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeRedirectPath(searchParams.get('next'), locale);

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.warn({ action: 'auth.callback', code: error.code }, 'Code exchange failed');
    return NextResponse.redirect(`${origin}/${locale}/login?error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
