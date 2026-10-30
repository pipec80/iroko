import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendPlatformAlert: vi.fn(),
  publishAnnouncement: vi.fn(),
}));
vi.mock('@/app/[locale]/dashboard/admin/alerts/actions', () => ({
  sendPlatformAlert: mocks.sendPlatformAlert,
}));
vi.mock('@/app/[locale]/dashboard/admin/announcements/actions', () => ({
  publishAnnouncement: mocks.publishAnnouncement,
}));

import { AlertForm } from '@/app/[locale]/dashboard/admin/alerts/alert-form';
import { AnnouncementForm } from '@/app/[locale]/dashboard/admin/announcements/announcement-form';
import es from '../../../../../messages/es.json';

function show(component: React.ReactElement) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      {component}
    </NextIntlClientProvider>,
  );
}

describe('admin form error feedback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports unknown alert failures without claiming permission denial', async () => {
    mocks.sendPlatformAlert.mockResolvedValue({ data: null, error: 'service_unavailable' });
    show(<AlertForm />);
    fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: 'Aviso' } });
    fireEvent.change(screen.getByLabelText('Mensaje'), { target: { value: 'Contenido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar alerta' }));
    expect((await screen.findByRole('alert')).textContent).toBe(es.Admin.error_generic);
    expect(screen.getByRole('alert').textContent).not.toBe(es.Admin.error_not_platform_admin);
  });

  it('reports unknown announcement failures without claiming permission denial', async () => {
    mocks.publishAnnouncement.mockResolvedValue({ data: null, error: 'service_unavailable' });
    show(<AnnouncementForm />);
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Aviso' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar anuncio' }));
    expect((await screen.findByRole('alert')).textContent).toBe(es.Admin.error_generic);
    expect(screen.getByRole('alert').textContent).not.toBe(es.Admin.error_not_platform_admin);
  });
});
