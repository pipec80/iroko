import { render } from '@react-email/components';
import React from 'react';
import { Resend } from 'resend';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';
import { logger } from '@/lib/logger';

import { InvitationEmail } from './templates/invitation';
import { NotificationEmail } from './templates/notification';
import { WelcomeEmail } from './templates/welcome';

/** Opciones para el email de invitación de equipo. */
export type InvitationEmailOpts = {
  /** Email de quien invita. */
  inviterEmail: string;
  /** Rol asignado al invitado en el equipo. */
  teamRole: string;
  /** URL de aceptación con el token. */
  inviteUrl: string;
};

/** Opciones para el email de notificación. */
export type NotificationEmailOpts = {
  /** Categoría visual de la notificación. */
  type: 'info' | 'success' | 'warning' | 'error';
  /** Título breve. */
  title: string;
  /** Detalle adicional opcional. */
  body?: string;
  /** URL de acción opcional. */
  link?: string;
};

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Entrega el email al catcher local (Mailpit) en vez de a Resend.
 *
 * Mailpit acepta ingesta por HTTP además de SMTP, así que el transporte local
 * usa el mismo `fetch` + JSON que Resend — sin cliente SMTP ni dependencias
 * extra. Sin esto no hay forma de ver ni testear un email de la app en local:
 * Resend es una API HTTP y Mailpit solo intercepta el SMTP de Supabase Auth,
 * por eso los emails de la app nunca aparecían en la bandeja.
 *
 * @throws si Mailpit rechaza el mensaje
 */
async function sendViaMailpit(
  to: string,
  subject: string,
  react: React.ReactElement,
): Promise<void> {
  const html = await render(react);

  const response = await fetch(`${env.MAILPIT_URL}/api/v1/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      From: { Email: env.FROM_EMAIL },
      To: [{ Email: to }],
      Subject: subject,
      HTML: html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error({ to, action: 'send_email', subject, status: response.status }, detail);
    throw new Error(`Mailpit rejected the message (HTTP ${response.status})`);
  }
}

/**
 * Envía un email transaccional: a Mailpit si hay catcher local configurado,
 * a Resend en cualquier otro caso.
 *
 * @param to - Dirección de email del destinatario
 * @param subject - Asunto del email
 * @param react - Template React Email
 * @throws si el proveedor devuelve un error — quien llama debe reportarlo, no
 *   tragárselo: un fallo de entrega invisible es indistinguible del éxito
 */
export async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactElement,
): Promise<void> {
  if (env.MAILPIT_URL) {
    await sendViaMailpit(to, subject, react);
    return;
  }

  const { error } = await getResend().emails.send({
    from: env.FROM_EMAIL,
    to,
    subject,
    react,
  });

  if (error) {
    logger.error({ to, action: 'send_email', subject }, error.message);
    throw new Error(error.message);
  }
}

/**
 * Envía el email de bienvenida tras el primer login del usuario.
 *
 * @param to - Email del nuevo usuario
 * @param firstName - Nombre de pila para personalizar el saludo
 */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  await sendEmail(
    to,
    `¡Bienvenido a ${appConfig.name}!`,
    React.createElement(WelcomeEmail, {
      firstName,
      appName: appConfig.name,
      dashboardUrl: `${env.SITE_URL}/${appConfig.defaultLocale}/dashboard`,
      supportEmail: appConfig.supportEmail,
    }),
  );
}

/**
 * Envía el email de invitación a un equipo.
 *
 * @param to - Email del invitado
 * @param opts - Datos de la invitación
 */
export async function sendInvitationEmail(to: string, opts: InvitationEmailOpts): Promise<void> {
  await sendEmail(
    to,
    `Te han invitado a unirte a ${appConfig.name}`,
    React.createElement(InvitationEmail, {
      ...opts,
      appName: appConfig.name,
      supportEmail: appConfig.supportEmail,
    }),
  );
}

/**
 * Envía la notificación como email además del canal in-app.
 *
 * @param to - Email del destinatario
 * @param opts - Contenido de la notificación
 */
export async function sendNotificationEmail(
  to: string,
  opts: NotificationEmailOpts,
): Promise<void> {
  await sendEmail(
    to,
    opts.title,
    React.createElement(NotificationEmail, {
      ...opts,
      appName: appConfig.name,
      siteUrl: env.SITE_URL,
      defaultLocale: appConfig.defaultLocale,
    }),
  );
}
