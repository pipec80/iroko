import { NextResponse, type NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error({ action: 'auth.signOut', code: error.code }, 'Sign-out failed');
  }

  return NextResponse.redirect(`${origin}/${locale}/login`, { status: 303 });
}
