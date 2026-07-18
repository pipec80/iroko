'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { CheckCircle, FolderOpen } from 'lucide-react';

import {
  getOrgLogo,
  removeOrgLogo,
  updateOrgLogo,
  type OrgLogoActionState,
} from '@/app/[locale]/dashboard/org/settings/actions-logo';
import { storageUrl } from '@/lib/storage';

/** Tab general de org/settings: logo de la organización + campos básicos (F3-3H-2). */
export function GeneralTab() {
  const t = useTranslations('OrgSettings');
  const [logoState, logoAction, logoPending] = useActionState<OrgLogoActionState, FormData>(
    updateOrgLogo,
    {},
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [removePending, setRemovePending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getOrgLogo().then((result) => {
      if (!cancelled && result.data) setLogoPreview(storageUrl(result.data.logoUrl));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [prevLogoSuccess, setPrevLogoSuccess] = useState(logoState.success);
  if (logoState.success !== prevLogoSuccess) {
    setPrevLogoSuccess(logoState.success);
    if (logoState.success === 'logo_updated') setHasFile(false);
  }

  const handleRemove = async () => {
    setRemovePending(true);
    await removeOrgLogo();
    setLogoPreview(null);
    setRemovePending(false);
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6">
        <h2 className="text-foreground text-[14px] font-semibold">{t('general_logo_heading')}</h2>
        <p className="text-muted-foreground text-[12px]">{t('general_logo_hint')}</p>
        <form action={logoAction} className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="bg-muted relative size-16 overflow-hidden rounded-lg ring-2 ring-white">
            {logoPreview ?
              <Image src={logoPreview} alt="logo" fill unoptimized className="object-cover" />
            : <div className="flex size-full items-center justify-center">
                <span className="text-muted-foreground text-xs">—</span>
              </div>
            }
          </div>
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setHasFile(Boolean(f));
                if (f) setLogoPreview(URL.createObjectURL(f));
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="border-border text-foreground flex items-center gap-2 rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80">
                <FolderOpen size={16} strokeWidth={1.75} />
                {t('general_logo_upload_btn')}
              </button>
              <button
                type="submit"
                disabled={logoPending || !hasFile}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-cobalt)' }}>
                {logoPending ? t('general_logo_saving') : t('general_save_btn')}
              </button>
              {logoPreview && !hasFile && (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={removePending}
                  className="rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
                  {t('general_logo_remove_btn')}
                </button>
              )}
            </div>
            {logoState.success === 'logo_updated' && !hasFile && (
              <div
                className="mt-3 flex items-center gap-2 text-[12px]"
                style={{ color: 'var(--color-cobalt)' }}>
                <CheckCircle size={16} strokeWidth={1.75} />
                {t('general_logo_success')}
              </div>
            )}
          </div>
        </form>
      </div>

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
