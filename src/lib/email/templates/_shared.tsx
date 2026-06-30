import React from 'react';

/**
 * Brand color palette for email templates.
 * Mirrors globals.css tokens as hex values — CSS variables don't work in email inline styles.
 */
export const BRAND = {
  poppy: '#d92121',
  cobalt: '#0047ab',
  dark: '#0e1117',
  bg: '#f5ecda',
  white: '#ffffff',
  border: '#e8e9ec',
  textBody: '#52525b',
  textMuted: '#a8a9ad',
  textWarm: '#8b6645',
} as const;

/** Shared inline styles matching the Supabase auth template design system. */
export const S = {
  body: {
    backgroundColor: BRAND.bg,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: '560px',
    margin: '48px auto',
    backgroundColor: BRAND.white,
    borderRadius: '16px',
    border: `1px solid ${BRAND.border}`,
  },
  header: {
    padding: '36px 40px 28px',
    borderBottom: `1px solid ${BRAND.border}`,
    textAlign: 'center' as const,
  },
  content: {
    padding: '40px 40px 8px',
  },
  h1: {
    margin: '0 0 14px',
    fontSize: '22px',
    fontWeight: 700,
    color: BRAND.dark,
    lineHeight: '1.3',
  },
  p: {
    margin: '0 0 24px',
    fontSize: '15px',
    color: BRAND.textBody,
    lineHeight: '1.65',
  },
  button: {
    backgroundColor: BRAND.poppy,
    color: BRAND.white,
    padding: '14px 32px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '15px',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '0.02em',
  },
  section: { marginBottom: '32px' },
  footerWrap: {
    padding: '16px 40px 36px',
    textAlign: 'center' as const,
  },
  footerText: {
    margin: 0,
    fontSize: '12px',
    color: BRAND.textMuted,
    lineHeight: '1.6',
  },
  tagline: {
    margin: '20px auto 0',
    fontSize: '11px',
    color: BRAND.textWarm,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
  link: { color: BRAND.cobalt },
} as const;

/**
 * Brand logo — SVG mark + wordmark.
 * @param brand - Wordmark text, uppercase. Defaults to 'IROKO'.
 */
export function EmailLogo({ brand = 'IROKO' }: { brand?: string }): React.ReactElement {
  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        width="44"
        height="44"
        style={{ display: 'block', margin: '0 auto 14px' }}>
        <rect width="64" height="64" rx="8" fill={BRAND.dark} />
        <circle cx="32" cy="32" r="20" fill="none" stroke={BRAND.poppy} strokeWidth="3.5" />
        <circle cx="32" cy="32" r="7" fill={BRAND.cobalt} />
        <line
          x1="32"
          y1="8"
          x2="32"
          y2="14"
          stroke={BRAND.poppy}
          strokeWidth="2"
          strokeLinecap="square"
        />
        <line
          x1="32"
          y1="50"
          x2="32"
          y2="56"
          stroke={BRAND.poppy}
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '4px',
          lineHeight: '1',
          color: BRAND.dark,
        }}>
        {brand.toUpperCase()}
      </div>
    </div>
  );
}

/** Decorative three-dot separator — matches the ornament in Supabase auth templates. */
export function EmailOrnament(): React.ReactElement {
  return (
    <div style={{ textAlign: 'center', padding: '0 40px 4px' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 24" width="120" height="24">
        <line x1="0" y1="12" x2="42" y2="12" stroke="#d3d3d3" strokeWidth="1" />
        <line x1="78" y1="12" x2="120" y2="12" stroke="#d3d3d3" strokeWidth="1" />
        <circle cx="52" cy="12" r="3" fill={BRAND.poppy} />
        <circle cx="60" cy="12" r="1.6" fill={BRAND.dark} />
        <circle cx="68" cy="12" r="3" fill={BRAND.cobalt} />
      </svg>
    </div>
  );
}
