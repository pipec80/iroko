import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';
import { captureServer } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';
import { notify } from '@/lib/notifications';
import type { Database } from '@/types/database';

/**
 * Redirige a `url` conservando las cookies que el cliente Supabase haya escrito
 * sobre `carrier`.
 *
 * getUser() refresca el access token por su cuenta cuando está vencido, y con
 * enable_refresh_token_rotation (supabase/config.toml) ese refresh invalida el
 * token anterior en el servidor. Devolver un NextResponse nuevo descartaría las
 * cookies nuevas y dejaría al navegador con un refresh token ya muerto: la
 * sesión se rompería en las demás pestañas, sin ninguna pista de que la causa
 * fue abrir un link de invitación vencido. El caso no es raro — las
 * invitaciones se abren días después, con el access token siempre expirado.
 */
function redirectPreservingSession(carrier: NextResponse, url: string): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of carrier.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

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

  // La respuesta se crea antes del cliente para que refreshSession() escriba
  // las cookies de sesión nuevas directamente sobre ella — mismo patrón que
  // auth/confirm/route.ts. Con el cliente de @/lib/supabase/server las cookies
  // se escriben vía next/headers y no viajarían en este redirect.
  const response = NextResponse.redirect(`${env.SITE_URL}/${locale}/dashboard`);

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Si no está autenticado, redirigir al login preservando la URL de aceptación.
  if (!user) {
    const next = encodeURIComponent(`/${locale}/auth/accept-invitation?token=${token}`);
    return redirectPreservingSession(response, `${env.SITE_URL}/${locale}/login?next=${next}`);
  }

  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token }).single();

  if (error) {
    logger.warn({ userId: user.id, action: 'accept_invitation', code: error.code }, error.message);
    return redirectPreservingSession(
      response,
      `${env.SITE_URL}/${locale}/login?error=invitation_invalid`,
    );
  }

  // El RPC dejó el team como cuenta activa en profiles, pero el JWT actual
  // todavía trae la anterior: sin este refresh el usuario aterriza en el
  // dashboard de su cuenta previa y tendría que recargar para ver el team.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    // No es bloqueante: la membresía ya existe y el proxy refresca la sesión
    // en la siguiente navegación. Solo se retrasa el cambio de contexto.
    logger.warn(
      { userId: user.id, action: 'accept_invitation.refresh', code: refreshError.code },
      refreshError.message,
    );
  }

  logger.info({ userId: user.id, action: 'accept_invitation' }, 'Invitation accepted');
  await captureServer({ event: 'invitation_accepted', properties: {}, distinctId: user.id });

  if (data.invited_by) {
    await notify(data.invited_by, {
      type: 'success',
      title: `${user.email} aceptó tu invitación`,
      link: `/${locale}/dashboard/members`,
    }).catch((err: unknown) => {
      logger.error(
        { action: 'accept_invitation.notify', inviterId: data.invited_by },
        err instanceof Error ? err.message : 'Unknown error',
      );
    });
  }

  return response;
}
