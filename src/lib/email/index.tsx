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
  /** Rol asignado al invitado. */
  role: string;
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

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Envía un email transaccional vía Resend.
 *
 * @param to - Dirección de email del destinatario
 * @param subject - Asunto del email
 * @param react - Template React Email
 * @throws si Resend devuelve un error
 */
export async function sendEmail(
  to: string,
  subject: string,
  react: React.ReactElement,
): Promise<void> {
  const { error } = await resend.emails.send({
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
    React.createElement(WelcomeEmail, { firstName }),
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
    React.createElement(InvitationEmail, { ...opts }),
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
  await sendEmail(to, opts.title, React.createElement(NotificationEmail, { ...opts }));
}
