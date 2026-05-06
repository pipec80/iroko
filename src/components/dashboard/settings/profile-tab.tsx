'use client';

import Image from 'next/image';
import React, { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  updateEmailAction,
  updateProfileAction,
  uploadAvatarAction,
  type SettingsActionState,
} from '@/app/[locale]/dashboard/settings/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProfileSnapshot } from './settings-tabs';

const initialState: SettingsActionState = {};

type Props = {
  profile: ProfileSnapshot;
  email: string;
  role: string;
};

function translateError(
  t: ReturnType<typeof useTranslations<'Settings'>>,
  code: string | undefined,
) {
  if (!code) return null;
  return t(`errors.${code}` as 'errors.generic', { default: t('errors.generic') });
}

export function ProfileTab({ profile, email, role }: Props) {
  const t = useTranslations('Settings');
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initialState,
  );
  const [emailState, emailAction, emailPending] = useActionState(updateEmailAction, initialState);
  const [avatarState, avatarAction, avatarPending] = useActionState(
    uploadAvatarAction,
    initialState,
  );

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [hasFile, setHasFile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const profileError = translateError(t, profileState.error);
  const emailError = translateError(t, emailState.error);
  const avatarError = translateError(t, avatarState.error);

  return (
    <div className="flex flex-col gap-8">
      {/* Avatar */}
      <Card className="border-outline-variant/10 rounded-3xl">
        <CardHeader>
          <CardTitle>{t('profile.avatar_heading')}</CardTitle>
          <CardDescription>{t('profile.avatar_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={avatarAction} className="flex items-center gap-6">
            <div className="bg-surface-container relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-white">
              {avatarPreview ?
                <Image
                  src={avatarPreview}
                  alt={profile.display_name ?? 'avatar'}
                  fill
                  unoptimized
                  className="object-cover"
                />
              : <div className="flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                    person
                  </span>
                </div>
              }
            </div>
            <div className="flex-1">
              <input
                ref={avatarInputRef}
                type="file"
                name="avatar"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setHasFile(Boolean(f));
                  if (f) setAvatarPreview(URL.createObjectURL(f));
                }}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}>
                  <span className="material-symbols-outlined mr-2 text-[18px]">folder</span>
                  {t('profile.upload_avatar')}
                </Button>
                <Button type="submit" disabled={avatarPending || !hasFile}>
                  {avatarPending ? t('profile.saving') : t('profile.save_changes')}
                </Button>
              </div>
              {avatarError && <p className="text-error mt-2 text-xs">{avatarError}</p>}
              {avatarState.success === 'avatar_updated' && (
                <p className="text-primary mt-2 text-xs">{t('profile.success.avatar_updated')}</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Profile fields */}
      <Card className="border-outline-variant/10 rounded-3xl">
        <CardHeader>
          <CardTitle>{t('profile.heading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="given_name">{t('profile.given_name')}</Label>
              <Input
                id="given_name"
                name="given_name"
                defaultValue={profile.given_name ?? ''}
                required
              />
              {profileState.fieldErrors?.given_name && (
                <p className="text-error text-xs">{profileState.fieldErrors.given_name[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="family_name">{t('profile.family_name')}</Label>
              <Input
                id="family_name"
                name="family_name"
                defaultValue={profile.family_name ?? ''}
                required
              />
              {profileState.fieldErrors?.family_name && (
                <p className="text-error text-xs">{profileState.fieldErrors.family_name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="locale">{t('profile.locale')}</Label>
              <select
                id="locale"
                name="locale"
                defaultValue={profile.locale ?? 'es'}
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm">
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">{t('profile.timezone')}</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={profile.timezone ?? 'America/Santiago'}
                placeholder="America/Santiago"
                required
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="phone_number">{t('profile.phone_number')}</Label>
              <Input
                id="phone_number"
                name="phone_number"
                defaultValue={profile.phone_number ?? ''}
                placeholder="+56912345678"
                type="tel"
              />
              <p className="text-on-surface-variant text-xs">{t('profile.phone_hint')}</p>
              {profileState.fieldErrors?.phone_number && (
                <p className="text-error text-xs">{t('errors.invalid_phone')}</p>
              )}
            </div>

            <div className="md:col-span-2">
              {profileError && (
                <p role="alert" className="text-error mb-3 text-sm">
                  {profileError}
                </p>
              )}
              {profileState.success === 'profile_updated' && (
                <p className="text-primary mb-3 text-sm">{t('profile.success.profile_updated')}</p>
              )}
              <Button type="submit" disabled={profilePending}>
                {profilePending ? t('profile.saving') : t('profile.save_changes')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email change */}
      <Card className="border-outline-variant/10 rounded-3xl">
        <CardHeader>
          <CardTitle>{t('profile.email_heading')}</CardTitle>
          <CardDescription>{t('profile.email_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm">
            <span className="text-on-surface-variant">{t('profile.email_heading')}: </span>
            <strong>{email}</strong>
            {role && <span className="text-on-surface-variant ml-3 text-xs">({role})</span>}
          </div>
          <form action={emailAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new_email">{t('profile.new_email')}</Label>
              <Input id="new_email" name="email" type="email" required defaultValue="" />
              {emailState.fieldErrors?.email && (
                <p className="text-error text-xs">{emailState.fieldErrors.email[0]}</p>
              )}
            </div>
            <Button type="submit" disabled={emailPending}>
              {t('profile.change_email')}
            </Button>
          </form>
          {emailError && (
            <p role="alert" className="text-error mt-3 text-sm">
              {emailError}
            </p>
          )}
          {emailState.success === 'email_change_requested' && (
            <p className="text-primary mt-3 text-sm">
              {t('profile.success.email_change_requested')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
