import { Body, Button, Container, Head, Hr, Html, Section, Text } from '@react-email/components';
import React from 'react';

import { appConfig } from '@/config/app.config';
import { env } from '@/env';

type NotificationEmailProps = {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body?: string;
  link?: string;
};

const TYPE_COLOR: Record<NotificationEmailProps['type'], string> = {
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
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
  heading: { fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' },
  body_text: { fontSize: '15px', color: '#52525b', lineHeight: '1.6', margin: '0 0 24px' },
  footer: { fontSize: '12px', color: '#a1a1aa', margin: '24px 0 0' },
  hr: { borderColor: '#e4e4e7', margin: '24px 0' },
} as const;

/** Email de notificación — complemento del canal in-app. */
export function NotificationEmail({
  type,
  title,
  body,
  link,
}: NotificationEmailProps): React.ReactElement {
  const accentColor = TYPE_COLOR[type];
  const buttonStyle = {
    backgroundColor: accentColor,
    color: '#ffffff',
    padding: '10px 24px',
    borderRadius: '6px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
  };

  const actionUrl =
    link ?
      link.startsWith('http') ?
        link
      : `${env.SITE_URL}${link}`
    : `${env.SITE_URL}/${appConfig.defaultLocale}/dashboard`;

  return (
    <Html lang="es">
      <Head />
      <Body style={STYLES.body}>
        <Container style={STYLES.container}>
          <Text
            style={{
              ...STYLES.heading,
              borderLeft: `4px solid ${accentColor}`,
              paddingLeft: '12px',
            }}>
            {title}
          </Text>
          {body && <Text style={STYLES.body_text}>{body}</Text>}
          {link && (
            <Section>
              <Button href={actionUrl} style={buttonStyle}>
                Ver detalles
              </Button>
            </Section>
          )}
          <Hr style={STYLES.hr} />
          <Text style={STYLES.footer}>
            Esta notificación fue enviada desde {appConfig.name}. También puedes verla en tu
            dashboard.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
