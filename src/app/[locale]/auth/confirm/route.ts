import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';
import { safeRedirectPath } from '@/lib/auth/safe-redirect';
import { sendWelcomeEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/database';

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
  const { searchParams } = new URL(request.url);

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeRedirectPath(searchParams.get('next'), locale);

  if (!tokenHash || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.redirect(`${env.SITE_URL}/${locale}/login?error=confirmation_failed`);
  }

  const response = NextResponse.redirect(`${env.SITE_URL}${next}`);

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    logger.warn(
      { action: 'auth.confirm', type, code: error.code, message: error.message },
      'OTP verify failed',
    );
    return NextResponse.redirect(`${env.SITE_URL}/${locale}/login?error=confirmation_failed`);
  }

  // Enviar email de bienvenida al completar el registro — fire and forget.
  if (type === 'signup') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const firstName = (user.user_metadata?.given_name as string | undefined) ?? '';
      sendWelcomeEmail(user.email, firstName).catch((err: unknown) => {
        logger.error(
          { userId: user.id, action: 'welcome_email' },
          err instanceof Error ? err.message : 'Unknown error',
        );
      });
    }
  }

  return response;
}
