'use client';

import { useState } from 'react';

import { PHONE_COUNTRIES, parseE164 } from '@/lib/phone-countries';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  defaultValue?: string | null;
  'aria-invalid'?: boolean;
};

export function PhoneCountryInput({ name, defaultValue, 'aria-invalid': ariaInvalid }: Props) {
  const parsed = defaultValue ? parseE164(defaultValue) : { dialCode: '+56', localNumber: '' };
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);

  const e164Value = localNumber.trim() ? `${dialCode}${localNumber.trim()}` : '';

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={e164Value} />
      <select
        value={dialCode}
        onChange={(e) => setDialCode(e.target.value)}
        aria-label="Country dial code"
        className={cn(
          'border-border-strong focus-visible:border-primary focus-visible:ring-primary/20 h-9 shrink-0 rounded-md border bg-transparent px-2 text-sm transition-all outline-none focus-visible:ring-3',
          ariaInvalid && 'border-destructive ring-destructive/20 ring-3',
        )}>
        {PHONE_COUNTRIES.map((c) => (
          <option key={`${c.iso}-${c.dialCode}`} value={c.dialCode}>
            {c.dialCode} — {c.name}
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={localNumber}
        onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ''))}
        placeholder="992787316"
        inputMode="numeric"
        aria-invalid={ariaInvalid}
        className={cn(
          'border-border-strong placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-sm transition-all outline-none focus-visible:ring-3 aria-invalid:ring-3',
        )}
      />
    </div>
  );
}
