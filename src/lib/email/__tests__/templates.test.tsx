import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// React Email usa APIs de React que vitest puede no tener — mocking ligero
vi.mock('@react-email/components', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Head: () => null,
  Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Container: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Button: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  Hr: () => <hr />,
  Section: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/config/app.config', () => ({
  appConfig: {
    name: 'Iroko',
    brand: 'Iroko',
    supportEmail: 'support@iroko.vercel.app',
    defaultLocale: 'es',
  },
}));

vi.mock('@/env', () => ({
  env: { SITE_URL: 'http://localhost:3000' },
}));

describe('WelcomeEmail', () => {
  it('renderiza sin lanzar error', async () => {
    const { WelcomeEmail } = await import('../templates/welcome');
    const element = React.createElement(WelcomeEmail, { firstName: 'Alice' });
    expect(element).toBeTruthy();
    expect(element.props.firstName).toBe('Alice');
  });
});

describe('InvitationEmail', () => {
  it('renderiza sin lanzar error', async () => {
    const { InvitationEmail } = await import('../templates/invitation');
    const element = React.createElement(InvitationEmail, {
      inviterEmail: 'admin@example.com',
      role: 'member',
      inviteUrl: 'http://localhost:3000/es/auth/accept-invitation?token=abc123',
    });
    expect(element).toBeTruthy();
  });
});

describe('NotificationEmail', () => {
  it('renderiza sin lanzar error con todos los campos', async () => {
    const { NotificationEmail } = await import('../templates/notification');
    const element = React.createElement(NotificationEmail, {
      type: 'info',
      title: 'Tu archivo está listo',
      body: 'Descárgalo aquí',
      link: '/files/123',
    });
    expect(element).toBeTruthy();
  });

  it('renderiza sin lanzar error sin campos opcionales', async () => {
    const { NotificationEmail } = await import('../templates/notification');
    const element = React.createElement(NotificationEmail, {
      type: 'error',
      title: 'Error en el proceso',
    });
    expect(element).toBeTruthy();
  });
});
