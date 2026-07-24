'use client';

import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { confirmOrgName } from '@/app/[locale]/dashboard/onboarding/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_ORG_NAME_LENGTH = 2;
const MAX_ORG_NAME_LENGTH = 100;

export function StepOrg({
  initialName,
  onNext,
}: {
  initialName: string | null;
  onNext: () => void;
}) {
  const t = useTranslations('Onboarding');
  const inputId = useId();
  const [name, setName] = useState(initialName ?? '');
  const [state, submit, isPending] = useActionState(
    async (_prev: { error?: string }, formData: FormData) => {
      const result = await confirmOrgName(String(formData.get('name') ?? ''));
      if (result.success) onNext();
      return result;
    },
    {},
  );

  return (
    <form action={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={inputId}>{t('org_name_label')}</Label>
        <Input
          id={inputId}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={MIN_ORG_NAME_LENGTH}
          maxLength={MAX_ORG_NAME_LENGTH}
          required
        />
      </div>
      {state.error && <p className="text-destructive text-sm">{t(`error_${state.error}`)}</p>}
      <Button type="submit" disabled={isPending}>
        {t('next')}
      </Button>
    </form>
  );
}
