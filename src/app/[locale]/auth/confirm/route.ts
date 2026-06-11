import { NextResponse, type NextRequest } from 'next/server';

import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

import type { EmailOtpType } from '@supabase/supabase-js';

const VALID_TYPES: readonly EmailOtpType[] = [
  'signup',
  'magiclink',
  'email',
  'recovery',
  'invite',
  'email_change',
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);

  console.error('CONFIRM ROUTE REQUEST URL:', request.url);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get('next'), locale);

  if (!tokenHash || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=confirmation_failed`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    logger.warn(
      { action: 'auth.confirm', type, code: error.code, message: error.message },
      'OTP verify failed',
    );
    return NextResponse.redirect(`${origin}/${locale}/login?error=confirmation_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
