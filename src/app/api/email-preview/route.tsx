import React from 'react';
import { type NextRequest, NextResponse } from 'next/server';

import { env } from '@/env';
import { InvitationEmail } from '@/lib/email/templates/invitation';
import { NotificationEmail } from '@/lib/email/templates/notification';
import { WelcomeEmail } from '@/lib/email/templates/welcome';

export async function GET(request: NextRequest) {
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Dynamic import bypasses Turbopack's static react-dom/server ban
  const { renderToStaticMarkup } = (await import('react-dom/server')) as {
    renderToStaticMarkup: (element: React.ReactElement) => string;
  };

  const t = request.nextUrl.searchParams.get('t') ?? 'welcome';

  let element: React.ReactElement;

  switch (t) {
    case 'invitation':
      element = (
        <InvitationEmail
          inviterEmail="admin@empresa.com"
          teamRole="member"
          inviteUrl="http://localhost:3000/es/auth/accept-invitation?token=demo-token"
        />
      );
      break;
    case 'notification-info':
      element = (
        <NotificationEmail
          type="info"
          title="Tienes un nuevo mensaje"
          body="El usuario Juan te ha enviado una solicitud de colaboracion."
          link="/es/dashboard"
        />
      );
      break;
    case 'notification-success':
      element = (
        <NotificationEmail
          type="success"
          title="Pago procesado correctamente"
          body="Tu suscripcion Pro ha sido activada y esta lista para usar."
        />
      );
      break;
    case 'notification-warning':
      element = (
        <NotificationEmail
          type="warning"
          title="Tu periodo de prueba termina pronto"
          body="Quedan 3 dias en tu periodo de prueba. Actualiza para no perder el acceso."
          link="/es/dashboard/billing"
        />
      );
      break;
    case 'notification-error':
      element = (
        <NotificationEmail
          type="error"
          title="Error al procesar el pago"
          body="Hubo un problema con tu metodo de pago. Por favor actualiza tu informacion de facturacion."
          link="/es/dashboard/billing"
        />
      );
      break;
    default:
      element = <WelcomeEmail firstName="Ana" />;
  }

  const html = '<!DOCTYPE html>\n' + renderToStaticMarkup(element);
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
