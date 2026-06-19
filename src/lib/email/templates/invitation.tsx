import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

import { appConfig } from '@/config/app.config';

type InvitationEmailProps = {
  inviterEmail: string;
  role: string;
  inviteUrl: string;
};

const STYLES = {
  body: { backgroundColor: '#f4f4f5', fontFamily: 'sans-serif', margin: 0, padding: 0 },
  container: {
    maxWidth: '600px',
    margin: '40px auto',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '40px',
  },
  heading: { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' },
  body_text: { fontSize: '15px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' },
  role_badge: {
    display: 'inline-block',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#e84545',
    color: '#ffffff',
    padding: '12px 28px',
    borderRadius: '6px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: { fontSize: '12px', color: '#a1a1aa', margin: '24px 0 0' },
  hr: { borderColor: '#e4e4e7', margin: '24px 0' },
} as const;

/** Email de invitación a unirse a un equipo. */
export function InvitationEmail({
  inviterEmail,
  role,
  inviteUrl,
}: InvitationEmailProps): React.ReactElement {
  return (
    <Html lang="es">
      <Head />
      <Body style={STYLES.body}>
        <Container style={STYLES.container}>
          <Text style={STYLES.heading}>Te han invitado a {appConfig.name}</Text>
          <Text style={STYLES.body_text}>
            <strong>{inviterEmail}</strong> te ha invitado a unirte como{' '}
            <span style={STYLES.role_badge}>{role}</span>.
          </Text>
          <Text style={STYLES.body_text}>
            Haz clic en el botón para aceptar la invitación. El enlace expira en 7 días.
          </Text>
          <Section>
            <Button href={inviteUrl} style={STYLES.button}>
              Aceptar invitación
            </Button>
          </Section>
          <Hr style={STYLES.hr} />
          <Text style={STYLES.footer}>
            Si no esperabas esta invitación, ignora este email. ¿Preguntas?{' '}
            <Link href={`mailto:${appConfig.supportEmail}`}>{appConfig.supportEmail}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
