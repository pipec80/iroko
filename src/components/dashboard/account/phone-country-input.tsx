'use client';

import { useState } from 'react';
import CountryFlag from 'react-country-flag';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, ScrollArea } from 'radix-ui';

import type { PhoneCountry } from '@/lib/phone-countries';
import { PHONE_COUNTRIES, parseE164 } from '@/lib/phone-countries';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  defaultValue?: string | null;
  'aria-invalid'?: boolean;
};

export function PhoneCountryInput({ name, defaultValue, 'aria-invalid': ariaInvalid }: Props) {
  const parsed =
    defaultValue ? parseE164(defaultValue) : { iso: 'CL', dialCode: '+56', localNumber: '' };
  const [selectedIso, setSelectedIso] = useState(parsed.iso);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCountry: PhoneCountry = PHONE_COUNTRIES.find((c) => c.iso === selectedIso) ??
    PHONE_COUNTRIES.find((c) => c.iso === 'CL') ?? {
      iso: 'CL',
      name: 'Chile',
      dialCode: '+56',
      localDigits: 9,
    };

  const e164Value = localNumber.trim() ? `${selectedCountry.dialCode}${localNumber.trim()}` : '';

  const digitsOk =
    !selectedCountry.localDigits ||
    !localNumber ||
    localNumber.length === selectedCountry.localDigits;

  const inputInvalid = ariaInvalid ?? (!digitsOk && localNumber.length > 0);

  const filtered =
    search.trim() ?
      PHONE_COUNTRIES.filter(
        (c) =>
          c.iso.toLowerCase().includes(search.toLowerCase()) ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search),
      )
    : PHONE_COUNTRIES;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input type="hidden" name={name} value={e164Value} />

        {/* Country picker */}
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={cn(
                'border-border-strong focus-visible:border-primary focus-visible:ring-primary/20 flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm transition-all outline-none focus-visible:ring-3',
                inputInvalid && 'border-destructive ring-destructive/20 ring-3',
              )}>
              <CountryFlag
                countryCode={selectedIso}
                svg
                style={{ width: '1.25em', height: '0.9em', flexShrink: 0 }}
              />
              <span className="tabular-nums">{selectedCountry.dialCode}</span>
              <ChevronDown
                className={cn(
                  'text-muted-foreground size-3.5 transition-transform duration-200',
                  open && 'rotate-180',
                )}
                strokeWidth={2}
              />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              className="bg-popover text-popover-foreground border-border z-50 w-64 overflow-hidden rounded-lg border shadow-lg"
              align="start"
              sideOffset={4}>
              {/* Search */}
              <div className="border-border flex items-center gap-2 border-b px-3">
                <Search className="text-muted-foreground size-3.5 shrink-0" strokeWidth={1.5} />
                <input
                  className="placeholder:text-muted-foreground flex h-9 w-full bg-transparent text-sm outline-none"
                  placeholder="Buscar país..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Country list */}
              <ScrollArea.Root className="h-60">
                <ScrollArea.Viewport className="size-full">
                  <div className="py-1">
                    {filtered.map((c) => (
                      <button
                        key={c.iso}
                        type="button"
                        onClick={() => {
                          setSelectedIso(c.iso);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2.5 px-3 py-1.5 text-sm',
                          c.iso === selectedIso &&
                            'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                        )}>
                        <CountryFlag
                          countryCode={c.iso}
                          svg
                          style={{ width: '1.4em', height: '1em', flexShrink: 0 }}
                        />
                        <span className="font-mono text-xs tracking-wide">{c.iso}</span>
                        <span className="text-xs tabular-nums">{c.dialCode}</span>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                        Sin resultados
                      </p>
                    )}
                  </div>
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar
                  orientation="vertical"
                  className="border-border/50 flex w-2 touch-none border-l p-0.5 select-none">
                  <ScrollArea.Thumb className="bg-border relative flex-1 rounded-full" />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Local number input */}
        <input
          type="tel"
          value={localNumber}
          onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ''))}
          placeholder={
            selectedCountry.localDigits ? '0'.repeat(selectedCountry.localDigits) : '992787316'
          }
          inputMode="numeric"
          maxLength={selectedCountry.localDigits ?? 12}
          aria-invalid={inputInvalid || undefined}
          className={cn(
            'border-border-strong placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-sm transition-all outline-none focus-visible:ring-3 aria-invalid:ring-3',
          )}
        />
      </div>

      {/* Digit count hint */}
      {selectedCountry.localDigits && localNumber.length > 0 && !digitsOk && (
        <p className="text-muted-foreground text-xs">
          {localNumber.length}/{selectedCountry.localDigits} dígitos
        </p>
      )}
    </div>
  );
}
