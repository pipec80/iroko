'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Shield, Plug, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TabId = 'general' | 'security' | 'integrations' | 'danger';

export default function OrgSettingsPage() {
  const t = useTranslations('OrgSettings');
  const [active, setActive] = useState<TabId>('general');

  const tabs: { id: TabId; label: string; Icon: React.ElementType }[] = [
    { id: 'general', label: t('tab_general'), Icon: Settings },
    { id: 'security', label: t('tab_security'), Icon: Shield },
    { id: 'integrations', label: t('tab_integrations'), Icon: Plug },
    { id: 'danger', label: t('tab_danger'), Icon: AlertTriangle },
  ];

  return (
    <div className="animate-in fade-in space-y-6 duration-700">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-foreground text-3xl font-extrabold tracking-tight">
          {t('page_title')}
        </h1>
        <p className="text-muted-foreground text-sm">{t('page_description')}</p>
      </header>

      {/* Tab nav */}
      <nav className="border-border flex gap-1 border-b pb-0">
        {tabs.map(({ id, label, Icon }) => (
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
  const t = useTranslations('OrgSettings');
  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6">
        <h2 className="text-foreground text-[14px] font-semibold">{t('general_section_title')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label={t('general_field_name')}
            placeholder={t('general_field_name_placeholder')}
          />
          <Field
            label={t('general_field_slug')}
            placeholder={t('general_field_slug_placeholder')}
          />
          <Field
            label={t('general_field_website')}
            placeholder={t('general_field_website_placeholder')}
          />
          <Field
            label={t('general_field_country')}
            placeholder={t('general_field_country_placeholder')}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-cobalt)' }}>
            {t('general_save_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  const t = useTranslations('OrgSettings');
  return (
    <div className="card space-y-5 p-6">
      <h2 className="text-foreground text-[14px] font-semibold">{t('security_section_title')}</h2>
      <div className="space-y-4">
        <ToggleRow title={t('security_toggle_mfa_title')} desc={t('security_toggle_mfa_desc')} />
        <ToggleRow
          title={t('security_toggle_sessions_title')}
          desc={t('security_toggle_sessions_desc')}
        />
        <ToggleRow
          title={t('security_toggle_audit_title')}
          desc={t('security_toggle_audit_desc')}
        />
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const t = useTranslations('OrgSettings');
  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-foreground text-[14px] font-semibold">{t('integrations_title')}</h2>
      <p className="text-muted-foreground text-[12px]">{t('integrations_lead')}</p>
      <div className="flex items-center justify-center rounded-xl border border-dashed py-16">
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase opacity-40">
          {t('integrations_coming_soon')}
        </span>
      </div>
    </div>
  );
}

function DangerTab() {
  const t = useTranslations('OrgSettings');
  return (
    <div className="space-y-4">
      <div className="card danger-zone flex items-center justify-between p-6">
        <div className="space-y-1">
          <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-poppy)' }}>
            {t('danger_delete_title')}
          </h3>
          <p className="text-muted-foreground max-w-sm text-[12px]">{t('danger_delete_desc')}</p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
          {t('danger_delete_btn')}
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
