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

import { getSafeNavigationHref } from '@/lib/validation/navigation-link';

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
  /** Retained for caller compatibility; absent links do not create a fallback CTA. */
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
}: NotificationEmailProps): React.ReactElement {
  const accent = TYPE_COLOR[type];

  const href = getSafeNavigationHref(link);
  let actionUrl: string | null = null;
  if (href) {
    if (href.startsWith('https://')) actionUrl = href;
    else {
      try {
        const base = new URL(siteUrl);
        // HTTP is permitted for the official local environment, never remote email destinations.
        const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
        if (
          !base.username &&
          !base.password &&
          (base.protocol === 'https:' || (loopback && base.protocol === 'http:'))
        ) {
          actionUrl = new URL(href, base.origin).href;
        }
      } catch {
        // A broken base URL must not turn a valid relative link into an unsafe CTA.
      }
    }
  }

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
            {actionUrl && (
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

export default NotificationEmail;
