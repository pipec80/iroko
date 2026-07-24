'use client';

import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [logoState, logoAction, logoPending] = useActionState<OrgLogoActionState, FormData>(
    updateOrgLogo,
    {},
  );

  useEffect(() => {
    let cancelled = false;
    void getOrgLogo().then((result) => {
      if (!cancelled && result.data) setLogoUrl(storageUrl(result.data.logoUrl));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async () => {
    await removeOrgLogo();
    setLogoUrl(null);
  };

  const handleFinish = async () => {
    await completeOnboarding();
  };

  return (
    <div className="space-y-4">
      <form action={logoAction} className="space-y-2">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => setHasFile(Boolean(e.target.files?.[0]))}
        />
        <Button type="submit" disabled={logoPending || !hasFile}>
          {t('upload_logo')}
        </Button>
      </form>
      {logoUrl != null && (
        <Button type="button" variant="outline" onClick={() => void handleRemove()}>
          {t('remove_logo')}
        </Button>
      )}
      {logoState.error && <p className="text-destructive text-sm">{logoState.error}</p>}
      <Button type="button" onClick={() => void handleFinish()}>
        {t('finish')}
      </Button>
    </div>
  );
}
