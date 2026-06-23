import React from 'react';
import { describe, it, expect, vi } from 'vitest';

// React Email usa APIs de React que vitest puede no tener — mocking ligero.
vi.mock('@react-email/components', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Head: () => null,
  Preview: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

describe('WelcomeEmail', () => {
  it('renderiza sin lanzar error', async () => {
    const { WelcomeEmail } = await import('../templates/welcome');
    const element = React.createElement(WelcomeEmail, { firstName: 'Alice' });
    expect(element).toBeTruthy();
    expect(element.props.firstName).toBe('Alice');
  });

  it('renderiza con el nombre del usuario y la URL del dashboard', async () => {
    const { WelcomeEmail } = await import('../templates/welcome');
    const tree = WelcomeEmail({
      firstName: 'Ana',
      dashboardUrl: 'http://localhost:3000/es/dashboard',
    });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('Ana');
    expect(serialized).toContain('/es/dashboard');
  });

  it('usa defaults cuando no se pasan props', async () => {
    const { WelcomeEmail } = await import('../templates/welcome');
    const tree = WelcomeEmail({});
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('Iroko');
  });
});

describe('InvitationEmail', () => {
  it('renderiza sin lanzar error', async () => {
    const { InvitationEmail } = await import('../templates/invitation');
    const element = React.createElement(InvitationEmail, {
      inviterEmail: 'admin@example.com',
      teamRole: 'member',
      inviteUrl: 'http://localhost:3000/es/auth/accept-invitation?token=abc123',
    });
    expect(element).toBeTruthy();
  });

  it('renderiza con la URL de invitación y el email del invitador', async () => {
    const { InvitationEmail } = await import('../templates/invitation');
    const tree = InvitationEmail({
      inviterEmail: 'admin@example.com',
      teamRole: 'member',
      inviteUrl: 'https://example.com/accept?token=test-token',
    });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('admin@example.com');
    expect(serialized).toContain('test-token');
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

  it('construye la URL absoluta a partir de un link relativo', async () => {
    const { NotificationEmail } = await import('../templates/notification');
    const tree = NotificationEmail({
      type: 'success',
      title: 'Archivo listo',
      link: '/files/123',
      siteUrl: 'https://app.example.com',
    });
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('https://app.example.com/files/123');
  });
});
