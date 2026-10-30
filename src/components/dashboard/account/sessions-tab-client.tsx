'use client';

import React, { useState, useTransition } from 'react';
import { LogOut } from 'lucide-react';

import {
  listMySessions,
  revokeAllOtherSessionsAction,
  revokeSessionAction,
  type SessionRow,
} from '@/app/[locale]/dashboard/account/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Labels = {
  heading: string;
  description: string;
  device: string;
  ip: string;
  last_active: string;
  aal: string;
  actions: string;
  revoke: string;
  revoke_all_others: string;
  current_badge: string;
  none: string;
  session_revoked: string;
  other_sessions_revoked: string;
  error: string;
  device_unknown: string;
  device_iphone: string;
  device_android: string;
  device_windows: string;
  device_macos: string;
  device_linux: string;
  device_browser: string;
};

function summarizeUserAgent(ua: string | null, labels: Labels): string {
  if (!ua) return labels.device_unknown;
  if (/iPhone/i.test(ua)) return labels.device_iphone;
  if (/Android/i.test(ua)) return labels.device_android;
  if (/Windows NT/i.test(ua)) return labels.device_windows;
  if (/Macintosh/i.test(ua)) return labels.device_macos;
  if (/Linux/i.test(ua)) return labels.device_linux;
  return ua.split(' ')[0] || labels.device_browser;
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

type Props = {
  sessions: SessionRow[];
  currentSessionId: string | null;
  locale: string;
  labels: Labels;
};

export function SessionsTabClient({ sessions, currentSessionId, locale, labels }: Props) {
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [local, setLocal] = useState({ source: sessions, rows: sessions });
  const localSessions = local.source === sessions ? local.rows : sessions;

  async function refreshSessions(success: string) {
    try {
      const rows = await listMySessions();
      setLocal({ source: sessions, rows });
      setError(null);
      setFlash(success);
    } catch {
      setError(labels.error);
      setFlash(null);
    }
  }

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      try {
        const result = await revokeSessionAction(id);
        if (!result.error) {
          await refreshSessions(labels.session_revoked);
          return;
        }
      } catch {
        // Transport and unexpected action failures show the same safe feedback.
      }
      setError(labels.error);
      setFlash(null);
    });
  };

  const handleRevokeAllOthers = () => {
    startTransition(async () => {
      try {
        const result = await revokeAllOtherSessionsAction();
        if (!result.error) {
          await refreshSessions(labels.other_sessions_revoked);
          return;
        }
      } catch {
        // Transport and unexpected action failures show the same safe feedback.
      }
      setError(labels.error);
      setFlash(null);
    });
  };

  return (
    <Card className="border-outline-variant/10 rounded-3xl">
      <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <CardTitle>{labels.heading}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeAllOthers}
          disabled={isPending || localSessions.length <= 1}>
          <LogOut className="size-[14px]" strokeWidth={1.5} />
          {labels.revoke_all_others}
        </Button>
      </CardHeader>
      <CardContent>
        {flash && <p className="text-primary mb-4 text-sm">{flash}</p>}
        {error && (
          <p role="alert" className="text-error mb-4 text-sm">
            {error}
          </p>
        )}
        {localSessions.length === 0 ?
          <p className="text-on-surface-variant text-sm">{labels.none}</p>
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-outline-variant/10 text-on-surface-variant border-b text-left text-xs uppercase">
                  <th className="py-2 pr-4">{labels.device}</th>
                  <th className="py-2 pr-4">{labels.ip}</th>
                  <th className="py-2 pr-4">{labels.last_active}</th>
                  <th className="py-2 pr-4">{labels.aal}</th>
                  <th className="py-2 pr-4 text-right">{labels.actions}</th>
                </tr>
              </thead>
              <tbody>
                {localSessions.map((s) => (
                  <tr
                    key={s.id}
                    data-testid="session-item"
                    className="border-outline-variant/5 border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{summarizeUserAgent(s.user_agent, labels)}</div>
                      {s.id === currentSessionId && (
                        <span className="bg-primary/10 text-primary mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {labels.current_badge}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{s.ip ?? '—'}</td>
                    <td className="py-3 pr-4 text-xs">
                      {formatDate(s.updated_at ?? s.created_at, locale)}
                    </td>
                    <td className="py-3 pr-4 text-xs">{s.aal ?? '—'}</td>
                    <td className="py-3 pr-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevoke(s.id)}
                        disabled={isPending || !currentSessionId || s.id === currentSessionId}
                        className="text-error">
                        {labels.revoke}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </CardContent>
    </Card>
  );
}
