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

export type NotificationEmailProps = {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body?: string;
  link?: string;
  /** App name shown in footer. Default shown in preview server. */
  appName?: string;
  /** Base site URL for relative links. Default shown in preview server. */
  siteUrl?: string;
  /** Default locale used to build the dashboard fallback URL. */
  defaultLocale?: string;
};

const TYPE_COLOR: Record<NotificationEmailProps['type'], string> = {
  info: BRAND.cobalt,
  success: '#22c55e',
  warning: '#f59e0b',
  error: BRAND.poppy,
};

/** Email de notificación — complemento del canal in-app. */
export function NotificationEmail({
  type,
  title,
  body,
  link,
  appName = 'Iroko',
  siteUrl = 'http://localhost:3000',
  defaultLocale = 'es',
}: NotificationEmailProps): React.ReactElement {
  const accent = TYPE_COLOR[type];

  const actionUrl =
    link ?
      link.startsWith('http') ?
        link
      : `${siteUrl}${link}`
    : `${siteUrl}/${defaultLocale}/dashboard`;

  return (
    <Html lang="es">
      <Head />
      <Preview>
        {title} — {appName}
      </Preview>
      <Body style={S.body}>
        <Container style={S.container}>
          <div style={S.header}>
            <EmailLogo brand={appName} />
          </div>
          <div style={S.content}>
            <Text
              style={{
                ...S.h1,
                fontSize: '20px',
                borderLeft: `4px solid ${accent}`,
                paddingLeft: '12px',
              }}>
              {title}
            </Text>
            {body && <Text style={S.p}>{body}</Text>}
            {link && (
              <Section style={S.section}>
                <Button href={actionUrl} style={{ ...S.button, backgroundColor: accent }}>
                  Ver detalles
                </Button>
              </Section>
            )}
          </div>
          <EmailOrnament />
          <div style={S.footerWrap}>
            <Text style={S.footerText}>
              Esta notificación fue enviada desde <strong>{appName}</strong>. También podés verla en
              tu dashboard.
            </Text>
          </div>
        </Container>
        <p style={S.tagline}>Saas · Template · Engine</p>
      </Body>
    </Html>
  );
}
