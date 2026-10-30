'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { CheckCircle, FolderOpen } from 'lucide-react';

import {
  getOrgInfo,
  updateOrgInfo,
  type OrgInfo,
  type OrgInfoActionState,
} from '@/app/[locale]/dashboard/org/settings/actions-info';
import {
  getOrgLogo,
  removeOrgLogo,
  updateOrgLogo,
  type OrgLogoActionState,
} from '@/app/[locale]/dashboard/org/settings/actions-logo';
import { storageUrl } from '@/lib/storage';
import { validateOrgLogoFile } from '@/lib/validation/profile';

const INFO_ERROR_KEYS: Record<string, string> = {
  name_required: 'general_error_name_required',
  name_too_long: 'general_error_name_too_long',
  invalid_name: 'general_error_name_required',
  slug_required: 'general_error_slug_required',
  slug_too_long: 'general_error_slug_too_long',
  slug_invalid_format: 'general_error_slug_invalid_format',
  slug_taken: 'general_error_slug_taken',
  website_too_long: 'general_error_website_too_long',
  website_invalid: 'general_error_website_invalid',
  country_too_long: 'general_error_country_too_long',
};

/** Tab general de org/settings: logo de la organización + campos básicos (F3-3H-2). */
export function GeneralTab() {
  const t = useTranslations('OrgSettings');
  const tSettings = useTranslations('Settings');
  const [logoState, logoAction, logoPending] = useActionState<OrgLogoActionState, FormData>(
    async (previous, formData) => {
      try {
        const result = await updateOrgLogo(previous, formData);
        if (result.success === 'logo_updated') {
          hasLogoMutationCompleted.current = true;
          savedLogoPreview.current = submittedLogoPreviewRef.current;
          setConfirmedLogoRevision(submittedLogoRevisionRef.current);
          if (submittedLogoRevisionRef.current === logoRevisionRef.current && logoInputRef.current)
            logoInputRef.current.value = '';
        }
        return result;
      } finally {
        setSubmissionInFlight(false);
      }
    },
    {},
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const savedLogoPreview = useRef<string | null>(null);
  const hasLogoMutationCompleted = useRef(false);
  const hasValidLogoSelection = useRef(false);
  const logoRevisionRef = useRef(0);
  const submittedLogoRevisionRef = useRef<number | null>(null);
  const submittedLogoPreviewRef = useRef<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [logoRevision, setLogoRevision] = useState(0);
  const [submittedLogoRevision, setSubmittedLogoRevision] = useState<number | null>(null);
  const [confirmedLogoRevision, setConfirmedLogoRevision] = useState<number | null>(null);
  const [submittedLogoPreview, setSubmittedLogoPreview] = useState<string | null>(null);
  const [submissionInFlight, setSubmissionInFlight] = useState(false);
  const [localLogoError, setLocalLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [removePending, setRemovePending] = useState(false);
  const hasUnsavedFile =
    hasFile &&
    (submissionInFlight ||
      !(confirmedLogoRevision === submittedLogoRevision && submittedLogoRevision === logoRevision));
  const showConfirmedLogo =
    logoState.success === 'logo_updated' &&
    confirmedLogoRevision === submittedLogoRevision &&
    submittedLogoPreview !== null &&
    !submissionInFlight &&
    !hasUnsavedFile;
  const displayedLogoPreview = showConfirmedLogo ? submittedLogoPreview : logoPreview;

  const [infoState, infoAction, infoPending] = useActionState<OrgInfoActionState, FormData>(
    updateOrgInfo,
    {},
  );
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOrgLogo().then((result) => {
      if (!cancelled && result.data && !hasLogoMutationCompleted.current) {
        savedLogoPreview.current = storageUrl(result.data.logoUrl);
        if (!hasValidLogoSelection.current) setLogoPreview(savedLogoPreview.current);
      }
    });
    void getOrgInfo().then((result) => {
      if (!cancelled && result.data) setOrgInfo(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async () => {
    setRemovePending(true);
    setLocalLogoError(null);
    try {
      const result = await removeOrgLogo();
      if (result.error) {
        setLocalLogoError(result.error);
        return;
      }
      // A confirmed removal must supersede the initial read and earlier uploads.
      // eslint-disable-next-line react-hooks/immutability
      savedLogoPreview.current = null;
      // The initial read may resolve after this confirmed mutation.
      // eslint-disable-next-line react-hooks/immutability
      hasLogoMutationCompleted.current = true;
      setConfirmedLogoRevision(null);
      setSubmittedLogoPreview(null);
      setLogoPreview(null);
    } catch {
      setLocalLogoError('upload_failed');
    } finally {
      setRemovePending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6">
        <h2 className="text-foreground text-[14px] font-semibold">{t('general_logo_heading')}</h2>
        <p className="text-muted-foreground text-[12px]">{t('general_logo_hint')}</p>
        <form
          action={logoAction}
          onSubmit={() => {
            submittedLogoRevisionRef.current = logoRevision;
            submittedLogoPreviewRef.current = logoPreview;
            setSubmissionInFlight(true);
            setSubmittedLogoRevision(logoRevision);
            setSubmittedLogoPreview(logoPreview);
          }}
          className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="bg-muted relative size-16 overflow-hidden rounded-lg ring-2 ring-white">
            {displayedLogoPreview ?
              <Image
                src={displayedLogoPreview}
                alt="logo"
                fill
                unoptimized
                className="object-cover"
              />
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
                logoRevisionRef.current += 1;
                setLogoRevision(logoRevisionRef.current);
                const result = f ? validateOrgLogoFile(f) : null;
                hasValidLogoSelection.current = Boolean(result?.ok);
                if (!f || !result?.ok) {
                  e.target.value = '';
                  setHasFile(false);
                  setLogoPreview(savedLogoPreview.current);
                  setLocalLogoError(result && !result.ok ? result.error : null);
                  return;
                }
                setLocalLogoError(null);
                setHasFile(true);
                setLogoPreview(URL.createObjectURL(f));
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
                disabled={logoPending || !hasUnsavedFile}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-cobalt)' }}>
                {logoPending ? t('general_logo_saving') : t('general_save_btn')}
              </button>
              {displayedLogoPreview && !hasUnsavedFile && (
                <button
                  type="button"
                  onClick={() => void handleRemove()}
                  disabled={removePending || logoPending || submissionInFlight}
                  className="rounded-lg border px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-poppy)', color: 'var(--color-poppy)' }}>
                  {t('general_logo_remove_btn')}
                </button>
              )}
            </div>
            {showConfirmedLogo && (
              <div
                role="status"
                className="mt-3 flex items-center gap-2 text-[12px]"
                style={{ color: 'var(--color-cobalt)' }}>
                <CheckCircle size={16} strokeWidth={1.75} />
                {t('general_logo_success')}
              </div>
            )}
            {(localLogoError || logoState.error) && (
              <p role="alert" className="text-destructive mt-3 text-[12px]">
                {(localLogoError || logoState.error) === 'file_too_large' ?
                  t('general_logo_hint')
                : tSettings(`errors.${localLogoError || logoState.error}` as 'errors.generic', {
                    default: tSettings('errors.generic'),
                  })
                }
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="card space-y-5 p-6">
        <h2 className="text-foreground text-[14px] font-semibold">{t('general_section_title')}</h2>
        {orgInfo && (
          <form action={infoAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field
                name="name"
                label={t('general_field_name')}
                placeholder={t('general_field_name_placeholder')}
                defaultValue={orgInfo.name}
              />
              <Field
                name="slug"
                label={t('general_field_slug')}
                placeholder={t('general_field_slug_placeholder')}
                hint={t('general_field_slug_hint')}
                defaultValue={orgInfo.slug}
              />
              <Field
                name="website"
                label={t('general_field_website')}
                placeholder={t('general_field_website_placeholder')}
                defaultValue={orgInfo.website}
              />
              <Field
                name="country"
                label={t('general_field_country')}
                placeholder={t('general_field_country_placeholder')}
                defaultValue={orgInfo.country}
              />
            </div>

            {infoState.success === 'info_updated' && (
              <div
                role="status"
                className="flex items-center gap-2 text-[12px]"
                style={{ color: 'var(--color-cobalt)' }}>
                <CheckCircle size={16} strokeWidth={1.75} />
                {t('general_info_success')}
              </div>
            )}
            {infoState.error && (
              <p role="alert" className="text-destructive text-[12px]">
                {t((INFO_ERROR_KEYS[infoState.error] ?? 'general_error_generic') as never)}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={infoPending}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--color-cobalt)' }}>
                {infoPending ? t('general_info_saving') : t('general_save_btn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`org-${name}`}
        className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </label>
      <input
        id={`org-${name}`}
        name={name}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="border-border bg-background text-foreground placeholder:text-muted-foreground rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-1"
        style={{ '--tw-ring-color': 'var(--color-cobalt)' } as React.CSSProperties}
      />
      {hint && <span className="text-muted-foreground text-[11px]">{hint}</span>}
    </div>
  );
}
