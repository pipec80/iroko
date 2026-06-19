'use client';

import React, { useState } from 'react';

type Tab =
  | 'welcome'
  | 'invitation'
  | 'notification-info'
  | 'notification-success'
  | 'notification-warning'
  | 'notification-error';

const TABS: { id: Tab; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'invitation', label: 'Invitation' },
  { id: 'notification-info', label: 'Notif · info' },
  { id: 'notification-success', label: 'Notif · success' },
  { id: 'notification-warning', label: 'Notif · warning' },
  { id: 'notification-error', label: 'Notif · error' },
];

export default function EmailPreviewPage() {
  const [active, setActive] = useState<Tab>('welcome');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
      }}>
      <div
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>
        <span
          style={{
            color: '#94a3b8',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}>
          Email Preview
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'system-ui, sans-serif',
                background: active === tab.id ? '#e84545' : '#334155',
                color: active === tab.id ? '#fff' : '#94a3b8',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <iframe
        key={active}
        src={`/api/email-preview?t=${active}`}
        style={{ flex: 1, border: 'none', width: '100%', minHeight: 'calc(100vh - 57px)' }}
        title="Email preview"
      />
    </div>
  );
}
