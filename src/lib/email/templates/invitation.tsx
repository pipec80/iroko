import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

import { BRAND, EmailLogo, EmailOrnament, S } from './_shared';

export type InvitationEmailProps = {
  inviterEmail: string;
  teamRole: string;
  inviteUrl: string;
  /** App name shown in subject and body. Default shown in preview server. */
  appName?: string;
  /** Support email address. Default shown in preview server. */
  supportEmail?: string;
};

const roleBadge = {
  display: 'inline-block',
  backgroundColor: '#f1f5f9',
  color: '#334155',
  padding: '2px 10px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 700,
} as const;

/** Email de invitación a unirse a un equipo. */
export function InvitationEmail({
  inviterEmail,
  teamRole,
  inviteUrl,
  appName = 'Iroko',
  supportEmail = 'support@iroko.vercel.app',
}: InvitationEmailProps): React.ReactElement {
  return (
    <Html lang="es">
      <Head />
      <Preview>Te invitaron a unirte a {appName}</Preview>
      <Body style={S.body}>
        <Container style={S.container}>
          <div style={S.header}>
            <EmailLogo brand={appName} />
          </div>
          <div style={S.content}>
            <Text style={S.h1}>Te han invitado a {appName}</Text>
            <Text style={S.p}>
              <strong>{inviterEmail}</strong> te invitó a unirte como{' '}
              <span style={roleBadge}>{teamRole}</span>.
            </Text>
            <Text style={{ ...S.p, marginBottom: '32px' }}>
              Hacé clic en el botón para aceptar la invitación. El enlace expira en 7 días.
            </Text>
            <Section style={S.section}>
              <Button href={inviteUrl} style={S.button}>
                Aceptar invitación
              </Button>
            </Section>
          </div>
          <EmailOrnament />
          <div style={S.footerWrap}>
            <Text style={S.footerText}>
              Si no esperabas esta invitación, ignorá este email.{' '}
              <a href={`mailto:${supportEmail}`} style={{ color: BRAND.cobalt }}>
                ¿Preguntas?
              </a>
            </Text>
          </div>
        </Container>
        <p style={S.tagline}>Saas · Template · Engine</p>
      </Body>
    </Html>
  );
}

export default InvitationEmail;
