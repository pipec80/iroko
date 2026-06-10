'use client';
import { useRef, useState } from 'react';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

import { env } from '@/env';

interface Props {
  /** Increment to force a token reset after a form submission. */
  resetKey?: number;
  /** Called when the widget becomes ready (token available) or unready (expired/error). */
  onReadyChange?: (ready: boolean) => void;
}

export function CaptchaField({ resetKey, onReadyChange }: Props) {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<TurnstileInstance>(null);
  const [token, setToken] = useState('');

  if (!siteKey) return null;

  function handleSuccess(t: string) {
    setToken(t);
    onReadyChange?.(true);
  }

  function handleExpire() {
    setToken('');
    onReadyChange?.(false);
    ref.current?.reset();
  }

  function handleError() {
    setToken('');
    onReadyChange?.(false);
  }

  return (
    <>
      {/* Remount on resetKey change so Turnstile issues a fresh token. */}
      <Turnstile
        key={resetKey}
        ref={ref}
        siteKey={siteKey}
        options={{ appearance: 'interaction-only', action: 'auth' }}
        onSuccess={handleSuccess}
        onExpire={handleExpire}
        onError={handleError}
      />
      <input type="hidden" name="captchaToken" value={token} />
    </>
  );
}
