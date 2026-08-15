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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { routing } from '@/i18n/routing-config';
import { storageUrl } from '@/lib/storage';
import { PhoneCountryInput } from './phone-country-input';

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
};
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
          <form
            action={avatarAction}
            data-testid="avatar-form"
            className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="bg-muted relative size-20 overflow-hidden rounded-full ring-2 ring-white">
              {avatarPreview ?
                <Image
                  src={avatarPreview}
                  alt={profile.display_name ?? 'avatar'}
                  fill
                  unoptimized
                  className="object-cover"
                />
              : <div className="flex size-full items-center justify-center">
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
              <div className="flex flex-col gap-3 sm:flex-row">
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
                <div
                  role="status"
                  className="bg-primary/10 text-primary mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
                  <CheckCircle size={18} strokeWidth={1.75} />
                  {t('profile.success.avatar_updated')}
                </div>
              )}
              {avatarError && (
                <p role="alert" className="text-error mt-2 text-xs">
                  {avatarError}
                </p>
              )}
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
          <form action={profileAction} noValidate className="grid gap-5 md:grid-cols-2">
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
              <Select name="locale" defaultValue={profile.locale ?? 'es'}>
                <SelectTrigger id="locale" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {routing.locales.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {LOCALE_LABELS[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">{t('profile.timezone')}</Label>
              <Select name="timezone" defaultValue={profile.timezone ?? 'America/Santiago'}>
                <SelectTrigger id="timezone" className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>América del Sur</SelectLabel>
                    <SelectItem value="America/Santiago">Santiago (Chile)</SelectItem>
                    <SelectItem value="America/Argentina/Buenos_Aires">
                      Buenos Aires (Argentina)
                    </SelectItem>
                    <SelectItem value="America/Sao_Paulo">São Paulo (Brasil)</SelectItem>
                    <SelectItem value="America/Lima">Lima (Perú)</SelectItem>
                    <SelectItem value="America/Bogota">Bogotá (Colombia)</SelectItem>
                    <SelectItem value="America/Caracas">Caracas (Venezuela)</SelectItem>
                    <SelectItem value="America/La_Paz">La Paz (Bolivia)</SelectItem>
                    <SelectItem value="America/Asuncion">Asunción (Paraguay)</SelectItem>
                    <SelectItem value="America/Montevideo">Montevideo (Uruguay)</SelectItem>
                    <SelectItem value="America/Guayaquil">Quito / Guayaquil (Ecuador)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>América Central y Caribe</SelectLabel>
                    <SelectItem value="America/Mexico_City">Ciudad de México (México)</SelectItem>
                    <SelectItem value="America/Monterrey">Monterrey (México)</SelectItem>
                    <SelectItem value="America/Costa_Rica">San José (Costa Rica)</SelectItem>
                    <SelectItem value="America/Guatemala">Guatemala</SelectItem>
                    <SelectItem value="America/Panama">Panamá</SelectItem>
                    <SelectItem value="America/Havana">La Habana (Cuba)</SelectItem>
                    <SelectItem value="America/Santo_Domingo">
                      Santo Domingo (R. Dominicana)
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>América del Norte</SelectLabel>
                    <SelectItem value="America/New_York">Nueva York (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Chicago (CT)</SelectItem>
                    <SelectItem value="America/Denver">Denver (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Los Ángeles (PT)</SelectItem>
                    <SelectItem value="America/Phoenix">Phoenix (MST sin DST)</SelectItem>
                    <SelectItem value="America/Anchorage">Anchorage (Alaska)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Honolulu (Hawaii)</SelectItem>
                    <SelectItem value="America/Toronto">Toronto (Canadá ET)</SelectItem>
                    <SelectItem value="America/Vancouver">Vancouver (Canadá PT)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Europa</SelectLabel>
                    <SelectItem value="Europe/London">Londres (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Madrid">Madrid (CET)</SelectItem>
                    <SelectItem value="Europe/Paris">París (CET)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlín (CET)</SelectItem>
                    <SelectItem value="Europe/Rome">Roma (CET)</SelectItem>
                    <SelectItem value="Europe/Amsterdam">Ámsterdam (CET)</SelectItem>
                    <SelectItem value="Europe/Lisbon">Lisboa (WET)</SelectItem>
                    <SelectItem value="Europe/Zurich">Zúrich (CET)</SelectItem>
                    <SelectItem value="Europe/Kiev">Kiev (EET)</SelectItem>
                    <SelectItem value="Europe/Moscow">Moscú (MSK)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Asia y Pacífico</SelectLabel>
                    <SelectItem value="Asia/Dubai">Dubái (GST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">Nueva Delhi (IST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapur (SGT)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokio (JST)</SelectItem>
                    <SelectItem value="Asia/Seoul">Seúl (KST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sídney (AEDT)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Auckland (NZDT)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>África</SelectLabel>
                    <SelectItem value="Africa/Cairo">El Cairo (EET)</SelectItem>
                    <SelectItem value="Africa/Lagos">Lagos (WAT)</SelectItem>
                    <SelectItem value="Africa/Nairobi">Nairobi (EAT)</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Johannesburgo (SAST)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>UTC</SelectLabel>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
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
              {profileState.success === 'profile_updated' && !profilePending && (
                <div
                  role="status"
                  className="bg-primary/10 text-primary mb-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
                  <CheckCircle size={18} strokeWidth={1.75} />
                  {t('profile.success.profile_updated')}
                </div>
              )}
              <Button type="submit" disabled={profilePending}>
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
            <div
              role="status"
              className="bg-primary/10 text-primary mt-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium">
              <CheckCircle size={18} strokeWidth={1.75} />
              {t('profile.success.email_change_requested')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
