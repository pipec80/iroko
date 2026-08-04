'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Shield, Plug, KeyRound, Webhook, AlertTriangle } from 'lucide-react';

import { ApiKeysTab } from '@/components/dashboard/org-settings/api-keys-tab';
import { GeneralTab } from '@/components/dashboard/org-settings/general-tab';
import { WebhooksTab } from '@/components/dashboard/org-settings/webhooks-tab';
import { cn } from '@/lib/utils';

type TabId = 'general' | 'security' | 'integrations' | 'api_keys' | 'webhooks' | 'danger';

export default function OrgSettingsPage() {
  const t = useTranslations('OrgSettings');
  const [active, setActive] = useState<TabId>('general');

  const tabs: { id: TabId; label: string; Icon: React.ElementType }[] = [
    { id: 'general', label: t('tab_general'), Icon: Settings },
    { id: 'security', label: t('tab_security'), Icon: Shield },
    { id: 'integrations', label: t('tab_integrations'), Icon: Plug },
    { id: 'api_keys', label: t('tab_api_keys'), Icon: KeyRound },
    { id: 'webhooks', label: t('tab_webhooks'), Icon: Webhook },
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
        {active === 'api_keys' && <ApiKeysTab />}
        {active === 'webhooks' && <WebhooksTab />}
        {active === 'danger' && <DangerTab />}
      </div>
    </div>
  );
}

function SecurityTab() {
  const t = useTranslations('OrgSettings');
  const comingSoon = t('integrations_coming_soon');
  return (
    <div className="card space-y-5 p-6">
      <h2 className="text-foreground text-[14px] font-semibold">{t('security_section_title')}</h2>
      <div className="space-y-4">
        <ToggleRow
          title={t('security_toggle_mfa_title')}
          desc={t('security_toggle_mfa_desc')}
          comingSoonLabel={comingSoon}
        />
        <ToggleRow
          title={t('security_toggle_sessions_title')}
          desc={t('security_toggle_sessions_desc')}
          comingSoonLabel={comingSoon}
        />
        <ToggleRow
          title={t('security_toggle_audit_title')}
          desc={t('security_toggle_audit_desc')}
          comingSoonLabel={comingSoon}
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
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase opacity-60">
            {t('integrations_coming_soon')}
          </span>
          <button
            type="button"
            disabled
            title={t('integrations_coming_soon')}
            className="cursor-not-allowed rounded-lg border px-4 py-2 text-[13px] font-semibold opacity-40"
            style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
            {t('danger_delete_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  comingSoonLabel,
}: {
  title: string;
  desc: string;
  comingSoonLabel: string;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b pb-4 last:border-0 last:pb-0">
      <div className="space-y-0.5">
        <p className="text-foreground text-[13px] font-medium">{title}</p>
        <p className="text-muted-foreground text-[11px]">{desc}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-muted-foreground font-mono text-[9px] tracking-widest uppercase opacity-60">
          {comingSoonLabel}
        </span>
        <button
          type="button"
          disabled
          title={comingSoonLabel}
          className="bg-surface-3 relative h-5 w-9 cursor-not-allowed rounded-full opacity-50"
          role="switch"
          aria-checked={false}>
          <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow" />
        </button>
      </div>
    </div>
  );
}
