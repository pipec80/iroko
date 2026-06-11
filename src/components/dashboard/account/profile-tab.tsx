'use client';

import Image from 'next/image';
import React, { useActionState, useRef, useState } from 'react';
import { CheckCircle, FolderOpen, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  updateEmailAction,
  updateProfileAction,
  uploadAvatarAction,
  type SettingsActionState,
} from '@/app/[locale]/dashboard/account/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { storageUrl } from '@/lib/storage';
import { PhoneCountryInput } from './phone-country-input';
import type { ProfileSnapshot } from './account-tabs';

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

function FieldError({ message }: { message: string }) {
  return (
    <p className="bg-error/10 text-error mt-1.5 rounded-lg px-3 py-2 text-xs font-medium">
      {message}
    </p>
  );
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

  const [avatarPreview, setAvatarPreview] = useState<string | null>(storageUrl(profile.avatar_url));
  const [hasFile, setHasFile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [isEmailDirty, setIsEmailDirty] = useState(false);

  const profileError = translateError(t, profileState.error);
  const emailError = translateError(t, emailState.error);
  const avatarError = translateError(t, avatarState.error);

  const [prevAvatarSuccess, setPrevAvatarSuccess] = useState(avatarState.success);
  if (avatarState.success !== prevAvatarSuccess) {
    setPrevAvatarSuccess(avatarState.success);
    if (avatarState.success === 'avatar_updated') {
      setHasFile(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Avatar */}
      <Card className="border-border rounded-3xl">
        <CardHeader>
          <CardTitle>{t('profile.avatar_heading')}</CardTitle>
          <CardDescription>{t('profile.avatar_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={avatarAction} className="flex items-center gap-6">
            <div className="bg-muted relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-white">
              {avatarPreview ?
                <Image
                  src={avatarPreview}
                  alt={profile.display_name ?? 'avatar'}
                  fill
                  unoptimized
                  className="object-cover"
                />
              : <div className="flex h-full w-full items-center justify-center">
                  <User size={36} className="text-muted-foreground" strokeWidth={1.25} />
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
                  <FolderOpen size={16} strokeWidth={1.75} className="mr-2" />
                  {t('profile.upload_avatar')}
                </Button>
                <Button type="submit" disabled={avatarPending || !hasFile}>
                  {avatarPending ? t('profile.saving') : t('profile.save_changes')}
                </Button>
              </div>
              {avatarState.success === 'avatar_updated' && !hasFile && (
                <div className="bg-primary/10 text-primary mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
                  <CheckCircle size={18} strokeWidth={1.75} />
                  {t('profile.success.avatar_updated')}
                </div>
              )}
              {avatarError && <p className="text-error mt-2 text-xs">{avatarError}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Profile fields */}
      <Card className="border-border rounded-3xl">
        <CardHeader>
          <CardTitle>{t('profile.heading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={profileAction}
            noValidate
            className="grid gap-5 md:grid-cols-2"
            onChange={() => setIsProfileDirty(true)}>
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="given_name">{t('profile.given_name')}</Label>
              <Input
                id="given_name"
                name="given_name"
                defaultValue={profile.given_name ?? ''}
                placeholder="John"
                required
                aria-invalid={!!profileState.fieldErrors?.given_name}
              />
              {profileState.fieldErrors?.given_name && (
                <FieldError
                  message={t(
                    `errors.${profileState.fieldErrors.given_name[0] ?? ''}` as 'errors.generic',
                    { default: profileState.fieldErrors.given_name[0] ?? '' },
                  )}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="family_name">{t('profile.family_name')}</Label>
              <Input
                id="family_name"
                name="family_name"
                defaultValue={profile.family_name ?? ''}
                placeholder="Doe"
                required
                aria-invalid={!!profileState.fieldErrors?.family_name}
              />
              {profileState.fieldErrors?.family_name && (
                <FieldError
                  message={t(
                    `errors.${profileState.fieldErrors.family_name[0] ?? ''}` as 'errors.generic',
                    { default: profileState.fieldErrors.family_name[0] ?? '' },
                  )}
                />
              )}
            </div>

            {/* Locale + Timezone */}
            <div className="space-y-1.5">
              <Label htmlFor="locale">{t('profile.locale')}</Label>
              <select
                id="locale"
                name="locale"
                defaultValue={profile.locale ?? 'es'}
                className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 h-8 w-full rounded-lg border px-3 py-1 text-sm transition-all outline-none focus-visible:ring-4">
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">{t('profile.timezone')}</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={profile.timezone ?? 'America/Santiago'}
                className="border-input bg-background focus-visible:border-primary focus-visible:ring-primary/20 h-8 w-full rounded-lg border px-3 py-1 text-sm transition-all outline-none focus-visible:ring-4">
                <optgroup label="América del Sur">
                  <option value="America/Santiago">Santiago (Chile)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires (Argentina)</option>
                  <option value="America/Sao_Paulo">São Paulo (Brasil)</option>
                  <option value="America/Lima">Lima (Perú)</option>
                  <option value="America/Bogota">Bogotá (Colombia)</option>
                  <option value="America/Caracas">Caracas (Venezuela)</option>
                  <option value="America/La_Paz">La Paz (Bolivia)</option>
                  <option value="America/Asuncion">Asunción (Paraguay)</option>
                  <option value="America/Montevideo">Montevideo (Uruguay)</option>
                  <option value="America/Guayaquil">Quito / Guayaquil (Ecuador)</option>
                </optgroup>
                <optgroup label="América Central y Caribe">
                  <option value="America/Mexico_City">Ciudad de México (México)</option>
                  <option value="America/Monterrey">Monterrey (México)</option>
                  <option value="America/Costa_Rica">San José (Costa Rica)</option>
                  <option value="America/Guatemala">Guatemala</option>
                  <option value="America/Panama">Panamá</option>
                  <option value="America/Havana">La Habana (Cuba)</option>
                  <option value="America/Santo_Domingo">Santo Domingo (R. Dominicana)</option>
                </optgroup>
                <optgroup label="América del Norte">
                  <option value="America/New_York">Nueva York (ET)</option>
                  <option value="America/Chicago">Chicago (CT)</option>
                  <option value="America/Denver">Denver (MT)</option>
                  <option value="America/Los_Angeles">Los Ángeles (PT)</option>
                  <option value="America/Phoenix">Phoenix (MST sin DST)</option>
                  <option value="America/Anchorage">Anchorage (Alaska)</option>
                  <option value="Pacific/Honolulu">Honolulu (Hawaii)</option>
                  <option value="America/Toronto">Toronto (Canadá ET)</option>
                  <option value="America/Vancouver">Vancouver (Canadá PT)</option>
                </optgroup>
                <optgroup label="Europa">
                  <option value="Europe/London">Londres (GMT/BST)</option>
                  <option value="Europe/Madrid">Madrid (CET)</option>
                  <option value="Europe/Paris">París (CET)</option>
                  <option value="Europe/Berlin">Berlín (CET)</option>
                  <option value="Europe/Rome">Roma (CET)</option>
                  <option value="Europe/Amsterdam">Ámsterdam (CET)</option>
                  <option value="Europe/Lisbon">Lisboa (WET)</option>
                  <option value="Europe/Zurich">Zúrich (CET)</option>
                  <option value="Europe/Kiev">Kiev (EET)</option>
                  <option value="Europe/Moscow">Moscú (MSK)</option>
                </optgroup>
                <optgroup label="Asia y Pacífico">
                  <option value="Asia/Dubai">Dubái (GST)</option>
                  <option value="Asia/Kolkata">Nueva Delhi (IST)</option>
                  <option value="Asia/Singapore">Singapur (SGT)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                  <option value="Asia/Tokyo">Tokio (JST)</option>
                  <option value="Asia/Seoul">Seúl (KST)</option>
                  <option value="Australia/Sydney">Sídney (AEDT)</option>
                  <option value="Pacific/Auckland">Auckland (NZDT)</option>
                </optgroup>
                <optgroup label="África">
                  <option value="Africa/Cairo">El Cairo (EET)</option>
                  <option value="Africa/Lagos">Lagos (WAT)</option>
                  <option value="Africa/Nairobi">Nairobi (EAT)</option>
                  <option value="Africa/Johannesburg">Johannesburgo (SAST)</option>
                </optgroup>
                <optgroup label="UTC">
                  <option value="UTC">UTC</option>
                </optgroup>
              </select>
            </div>

            {/* Phone */}
            <div className="space-y-1.5 md:col-span-2">
              <Label>{t('profile.phone_number')}</Label>
              <PhoneCountryInput
                name="phone_number"
                defaultValue={profile.phone_number}
                aria-invalid={!!profileState.fieldErrors?.phone_number}
              />
              {profileState.fieldErrors?.phone_number ?
                <FieldError message={t('errors.invalid_phone')} />
              : <p className="text-muted-foreground text-xs">{t('profile.phone_hint')}</p>}
            </div>

            {/* Date of birth + Company */}
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">{t('profile.birth_date')}</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                defaultValue={profile.birth_date ?? ''}
                aria-invalid={!!profileState.fieldErrors?.birth_date}
              />
              {profileState.fieldErrors?.birth_date && (
                <FieldError
                  message={t(
                    `errors.${profileState.fieldErrors.birth_date[0] ?? ''}` as 'errors.generic',
                    { default: profileState.fieldErrors.birth_date[0] ?? '' },
                  )}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="company">{t('profile.company')}</Label>
              <Input
                id="company"
                name="company"
                defaultValue={profile.company ?? ''}
                placeholder={t('profile.company_placeholder')}
                maxLength={100}
                aria-invalid={!!profileState.fieldErrors?.company}
              />
              {profileState.fieldErrors?.company && (
                <FieldError
                  message={t(
                    `errors.${profileState.fieldErrors.company[0] ?? ''}` as 'errors.generic',
                    {
                      default: profileState.fieldErrors.company[0] ?? '',
                    },
                  )}
                />
              )}
            </div>

            {/* Website */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="website_url">{t('profile.website_url')}</Label>
              <Input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={profile.website_url ?? ''}
                placeholder={t('profile.website_placeholder')}
                maxLength={255}
                aria-invalid={!!profileState.fieldErrors?.website_url}
              />
              {profileState.fieldErrors?.website_url && (
                <FieldError message={t('errors.invalid_url')} />
              )}
            </div>

            {/* Bio */}
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="bio">{t('profile.bio')}</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio ?? ''}
                placeholder={t('profile.bio_hint')}
                rows={3}
                maxLength={500}
                aria-invalid={!!profileState.fieldErrors?.bio}
              />
              {profileState.fieldErrors?.bio ?
                <FieldError
                  message={t(
                    `errors.${profileState.fieldErrors.bio[0] ?? ''}` as 'errors.generic',
                    {
                      default: profileState.fieldErrors.bio[0] ?? '',
                    },
                  )}
                />
              : <p className="text-muted-foreground text-xs">{t('profile.bio_hint')}</p>}
            </div>

            {/* Submit */}
            <div className="md:col-span-2">
              {profileError && (
                <p role="alert" className="text-error mb-3 text-sm">
                  {profileError}
                </p>
              )}
              {profileState.success === 'profile_updated' && !isProfileDirty && (
                <div className="bg-primary/10 text-primary mb-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
                  <CheckCircle size={18} strokeWidth={1.75} />
                  {t('profile.success.profile_updated')}
                </div>
              )}
              <Button type="submit" disabled={profilePending || !isProfileDirty}>
                {profilePending ? t('profile.saving') : t('profile.save_changes')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Email change */}
      <Card className="border-border rounded-3xl">
        <CardHeader>
          <CardTitle>{t('profile.email_heading')}</CardTitle>
          <CardDescription>{t('profile.email_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-sm">
            <span className="text-muted-foreground">{t('profile.email_heading')}: </span>
            <strong>{email}</strong>
            {role && <span className="text-muted-foreground ml-3 text-xs">({role})</span>}
          </div>
          <form
            action={emailAction}
            noValidate
            onChange={() => setIsEmailDirty(true)}
            className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new_email">{t('profile.new_email')}</Label>
              <Input
                id="new_email"
                name="email"
                type="email"
                placeholder="name@company.com"
                required
                defaultValue=""
                aria-invalid={!!emailState.fieldErrors?.email}
              />
              {emailState.fieldErrors?.email && (
                <FieldError
                  message={t(
                    `errors.${emailState.fieldErrors.email[0] ?? ''}` as 'errors.generic',
                    {
                      default: emailState.fieldErrors.email[0] ?? '',
                    },
                  )}
                />
              )}
            </div>
            <Button type="submit" disabled={emailPending || !isEmailDirty}>
              {t('profile.change_email')}
            </Button>
          </form>
          {emailError && (
            <p role="alert" className="text-error mt-3 text-sm">
              {emailError}
            </p>
          )}
          {emailState.success === 'email_change_requested' && !isEmailDirty && (
            <div className="bg-primary/10 text-primary mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
              <CheckCircle size={18} strokeWidth={1.75} />
              {t('profile.success.email_change_requested')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
