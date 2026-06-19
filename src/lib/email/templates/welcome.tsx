import { Body, Button, Container, Head, Hr, Html, Section, Text } from '@react-email/components';
import React from 'react';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';

type WelcomeEmailProps = {
  firstName: string;
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

/** Email de bienvenida enviado tras el primer login confirmado. */
export function WelcomeEmail({ firstName }: WelcomeEmailProps): React.ReactElement {
  return (
    <Html lang="es">
      <Head />
      <Body style={STYLES.body}>
        <Container style={STYLES.container}>
          <Text style={STYLES.heading}>¡Hola, {firstName || 'allí'}! 👋</Text>
          <Text style={STYLES.body_text}>
            Tu cuenta en {appConfig.name} está lista. Explora tu dashboard y empieza a usar todas
            las funcionalidades.
          </Text>
          <Section>
            <Button href={`${env.SITE_URL}/es/dashboard`} style={STYLES.button}>
              Ir al Dashboard
            </Button>
          </Section>
          <Hr style={STYLES.hr} />
          <Text style={STYLES.footer}>
            ¿Tienes alguna duda? Escríbenos a{' '}
            <a href={`mailto:${appConfig.supportEmail}`}>{appConfig.supportEmail}</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
