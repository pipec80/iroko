'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { FolderOpen, X } from 'lucide-react';

import {
  getOrgLogo,
  removeOrgLogo,
  updateOrgLogo,
  type OrgLogoActionState,
} from '@/app/[locale]/dashboard/org/settings/actions-logo';
import { completeOnboarding } from '@/app/[locale]/dashboard/onboarding/actions';
import { Button } from '@/components/ui/button';
import { storageUrl } from '@/lib/storage';

export function StepBranding() {
  const t = useTranslations('Onboarding');
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [finishPending, setFinishPending] = useState(false);
  const [logoState, logoAction, logoPending] = useActionState<OrgLogoActionState, FormData>(
    updateOrgLogo,
    {},
  );

  useEffect(() => {
    let cancelled = false;
    void getOrgLogo().then((result) => {
      if (!cancelled && result.data) setLogoPreview(storageUrl(result.data.logoUrl));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async () => {
    await removeOrgLogo();
    setLogoPreview(null);
  };

  const handleFinish = async () => {
    setFinishPending(true);
    await completeOnboarding();
  };

  return (
    <div className="space-y-6">
      <form action={logoAction} className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg ring-2 ring-white">
          {logoPreview ?
            <Image src={logoPreview} alt="" fill unoptimized className="object-cover" />
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
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
              <FolderOpen className="size-4" strokeWidth={1.75} />
              {t('upload_logo')}
            </Button>
            {hasFile && (
              <Button type="submit" disabled={logoPending}>
                {logoPending ? t('uploading') : t('save_logo')}
              </Button>
            )}
            {logoPreview != null && !hasFile && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleRemove()}>
                <X className="size-4" strokeWidth={1.75} />
                {t('remove_logo')}
              </Button>
            )}
          </div>
          {logoState.error && <p className="text-destructive mt-2 text-sm">{logoState.error}</p>}
        </div>
      </form>

      <Button type="button" onClick={() => void handleFinish()} disabled={finishPending}>
        {finishPending ? t('finishing') : t('finish')}
      </Button>
    </div>
  );
}
