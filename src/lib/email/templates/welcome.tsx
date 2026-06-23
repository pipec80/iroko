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

import { EmailLogo, EmailOrnament, S } from './_shared';

export type WelcomeEmailProps = {
  firstName?: string;
  /** App name shown in subject and body. Default shown in preview server. */
  appName?: string;
  /** Full dashboard URL. Default shown in preview server. */
  dashboardUrl?: string;
  /** Support email address. Default shown in preview server. */
  supportEmail?: string;
};

/** Email de bienvenida enviado tras el primer login confirmado. */
export function WelcomeEmail({
  firstName = 'allí',
  appName = 'Iroko',
  dashboardUrl = 'http://localhost:3000/es/dashboard',
  supportEmail = 'support@iroko.vercel.app',
}: WelcomeEmailProps): React.ReactElement {
  return (
    <Html lang="es">
      <Head />
      <Preview>¡Tu cuenta en {appName} está lista para explorar!</Preview>
      <Body style={S.body}>
        <Container style={S.container}>
          <div style={S.header}>
            <EmailLogo brand={appName} />
          </div>
          <div style={S.content}>
            <Text style={S.h1}>¡Hola, {firstName}! 👋</Text>
            <Text style={S.p}>
              Tu cuenta en <strong>{appName}</strong> está lista. Explorá tu dashboard y empezá a
              usar todas las funcionalidades.
            </Text>
            <Section style={S.section}>
              <Button href={dashboardUrl} style={S.button}>
                Ir al Dashboard
              </Button>
            </Section>
          </div>
          <EmailOrnament />
          <div style={S.footerWrap}>
            <Text style={S.footerText}>
              ¿Tenés alguna duda? Escribinos a{' '}
              <a href={`mailto:${supportEmail}`} style={S.link}>
                {supportEmail}
              </a>
            </Text>
          </div>
        </Container>
        <p style={S.tagline}>Saas · Template · Engine</p>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
