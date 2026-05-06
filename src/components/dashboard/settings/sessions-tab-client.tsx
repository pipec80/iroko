'use client';

import React, { useState, useTransition } from 'react';

import {
  revokeAllOtherSessionsAction,
  revokeSessionAction,
  type SessionRow,
} from '@/app/[locale]/dashboard/settings/actions';
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
};

function summarizeUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return ua.split(' ')[0] || 'Browser';
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
  locale: string;
  labels: Labels;
};

export function SessionsTabClient({ sessions, locale, labels }: Props) {
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localSessions, setLocalSessions] = useState<SessionRow[]>(sessions);

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeSessionAction(id);
      if (!result.error) {
        setLocalSessions((s) => s.filter((row) => row.id !== id));
        setFlash(labels.session_revoked);
      }
    });
  };

  const handleRevokeAllOthers = () => {
    startTransition(async () => {
      const result = await revokeAllOtherSessionsAction();
      if (!result.error) {
        setFlash(labels.other_sessions_revoked);
      }
    });
  };

  return (
    <Card className="border-outline-variant/10 rounded-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{labels.heading}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevokeAllOthers}
          disabled={isPending || localSessions.length <= 1}>
          <span className="material-symbols-outlined mr-2 text-[16px]">logout</span>
          {labels.revoke_all_others}
        </Button>
      </CardHeader>
      <CardContent>
        {flash && <p className="text-primary mb-4 text-sm">{flash}</p>}
        {localSessions.length === 0 ?
          <p className="text-on-surface-variant text-sm">{labels.none}</p>
        : <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                {localSessions.map((s, i) => (
                  <tr key={s.id} className="border-outline-variant/5 border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{summarizeUserAgent(s.user_agent)}</div>
                      {i === 0 && (
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
                        disabled={isPending || i === 0}
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
