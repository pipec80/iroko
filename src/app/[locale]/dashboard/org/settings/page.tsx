'use client';

import React, { useState } from 'react';
import { Settings, Shield, Plug, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', label: 'General', Icon: Settings },
  { id: 'security', label: 'Seguridad', Icon: Shield },
  { id: 'integrations', label: 'Integraciones', Icon: Plug },
  { id: 'danger', label: 'Zona peligrosa', Icon: AlertTriangle },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function OrgSettingsPage() {
  const [active, setActive] = useState<TabId>('general');

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">
          Configuración de organización
        </h1>
        <p className="text-muted-foreground text-sm">
          Administra los ajustes generales, seguridad e integraciones de tu workspace.
        </p>
      </header>

      {/* Tab nav */}
      <nav className="border-border flex gap-1 border-b pb-0">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={cn(
              'flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-[13px] font-medium transition-colors',
              active === id ?
                'text-foreground border-border -mb-px border-b-2'
              : 'text-muted-foreground hover:text-foreground',
            )}
            style={
              active === id ? { borderBottomColor: 'var(--color-poppy)', color: 'inherit' } : {}
            }>
            <Icon
              size={14}
              strokeWidth={active === id ? 2.5 : 1.75}
              style={active === id ? { color: 'var(--color-poppy)' } : {}}
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div>
        {active === 'general' && <GeneralTab />}
        {active === 'security' && <SecurityTab />}
        {active === 'integrations' && <IntegrationsTab />}
        {active === 'danger' && <DangerTab />}
      </div>
    </div>
  );
}

function GeneralTab() {
  return (
    <div className="space-y-6">
      {/* Org info */}
      <div className="card space-y-5 p-6">
        <h2 className="text-foreground text-[14px] font-semibold">
          Información de la organización
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre" placeholder="Nombre de la organización" />
          <Field label="Slug" placeholder="mi-organización" />
          <Field label="Sitio web" placeholder="https://ejemplo.com" />
          <Field label="País" placeholder="Chile" />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-cobalt)' }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="card space-y-5 p-6">
      <h2 className="text-foreground text-[14px] font-semibold">Seguridad del workspace</h2>
      <div className="space-y-4">
        <ToggleRow
          title="Autenticación de dos factores obligatoria"
          desc="Todos los miembros deben activar 2FA para acceder al workspace."
        />
        <ToggleRow
          title="Sesiones únicas"
          desc="Cierra sesiones duplicadas cuando el mismo usuario inicia sesión desde otro dispositivo."
        />
        <ToggleRow
          title="Auditoría de acciones"
          desc="Registra todas las acciones críticas realizadas en la plataforma."
        />
      </div>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-foreground text-[14px] font-semibold">Integraciones disponibles</h2>
      <p className="text-muted-foreground text-[12px]">
        Conecta herramientas externas a tu workspace. Las integraciones se configuran aquí.
      </p>
      <div className="flex items-center justify-center rounded-xl border border-dashed py-16">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase opacity-40">
          Próximamente
        </span>
      </div>
    </div>
  );
}

function DangerTab() {
  return (
    <div className="space-y-4">
      <div className="card danger-zone flex items-center justify-between p-6">
        <div className="space-y-1">
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-poppy)' }}>
            Eliminar organización
          </h3>
          <p className="text-muted-foreground max-w-sm text-[12px]">
            Esta acción es permanente. Todos los datos, proyectos y miembros serán eliminados.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
          Eliminar organización
        </button>
      </div>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        className="border-border bg-background text-foreground placeholder:text-muted-foreground rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1"
        style={{ '--tw-ring-color': 'var(--color-cobalt)' } as React.CSSProperties}
      />
    </div>
  );
}

function ToggleRow({ title, desc }: { title: string; desc: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b pb-4 last:border-0 last:pb-0">
      <div className="space-y-0.5">
        <p className="text-foreground text-[13px] font-medium">{title}</p>
        <p className="text-muted-foreground text-[11px]">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          on ? 'bg-cobalt' : 'bg-surface-3',
        )}
        style={{ background: on ? 'var(--color-cobalt)' : undefined }}
        role="switch"
        aria-checked={on}>
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            on && 'translate-x-4',
          )}
        />
      </button>
    </div>
  );
}
