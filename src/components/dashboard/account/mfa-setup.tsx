'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Factor } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { generateRecoveryCodesAction } from '@/app/[locale]/dashboard/account/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function MfaSetup() {
  const t = useTranslations('Settings.security');
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  // Tracks whether the current enrollment was completed successfully so
  // onOpenChange knows not to unenroll an already-verified factor on close.
  const enrolledSuccessfully = useRef(false);

  const { data: factorsData, isLoading } = useQuery({
    queryKey: ['mfa-factors'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  const factors: Factor[] = factorsData?.all ?? [];

  const refetchFactors = () => void queryClient.invalidateQueries({ queryKey: ['mfa-factors'] });

  const resetEnrollState = () => {
    setQrCode('');
    setFactorId('');
    setVerifyCode('');
    setIsEnrolling(false);
    enrolledSuccessfully.current = false;
  };

  const cancelEnrollment = (currentFactorId: string) => {
    if (currentFactorId) {
      void supabase.auth.mfa.unenroll({ factorId: currentFactorId });
    }
    resetEnrollState();
  };

  const onEnroll = async () => {
    setIsLoadingQr(true);
    setIsEnrolling(true);
    setQrCode('');
    try {
      // Fetch fresh factor list directly from API (bypasses stale query cache).
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const allFactors = existing?.all ?? [];

      // If a verified TOTP factor already exists the user must disable it first.
      const hasVerified = allFactors.some(
        (f) => f.factor_type === 'totp' && f.status === 'verified',
      );
      if (hasVerified) {
        toast.error(t('error.mfa_already_enabled'));
        setIsEnrolling(false);
        refetchFactors();
        return;
      }

      // Remove stale unverified TOTP factors so re-enrollment doesn't fail.
      const stale = allFactors.filter((f) => f.factor_type === 'totp' && f.status === 'unverified');
      await Promise.all(stale.map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })));

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });

      if (error) {
        toast.error(error.message);
        setIsEnrolling(false);
        return;
      }

      if (!data.totp.qr_code) {
        toast.error(t('error.mfa_no_qr'));
        setIsEnrolling(false);
        return;
      }

      setFactorId(data.id);
      // qr_code from Supabase is already a valid data URL (data:image/svg+xml;...)
      setQrCode(data.totp.qr_code);
    } catch {
      toast.error(t('error.mfa_enroll_failed'));
      setIsEnrolling(false);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const onVerify = async () => {
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        toast.error(challenge.error.message);
        return;
      }

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });

      if (verify.error) {
        toast.error(verify.error.message);
        return;
      }

      // Mark as successfully enrolled so onOpenChange doesn't unenroll the
      // now-verified factor when the dialog closes.
      enrolledSuccessfully.current = true;
      toast.success(t('success.mfa_enabled'));
      resetEnrollState();
      refetchFactors();
    } catch {
      toast.error(t('error.mfa_verify_failed'));
    }
  };

  const onUnenroll = async (id: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t('success.mfa_disabled'));
      refetchFactors();
    } catch {
      toast.error(t('error.mfa_unenroll_failed'));
    }
  };

  const [recoveryState, recoveryAction, recoveryPending] = useActionState(
    generateRecoveryCodesAction,
    {},
  );
  // Tracks which codes batch the user has already dismissed (by reference equality).
  const [dismissedCodes, setDismissedCodes] = useState<string[] | null>(null);

  const { data: unusedCount = 0, refetch: refetchCount } = useQuery({
    queryKey: ['recovery-codes-count'],
    queryFn: async () => {
      const { data } = await supabase.rpc('count_unused_recovery_codes');
      return (data as number | null) ?? 0;
    },
  });

  // Refetch count when new codes are generated (no setState, pure side effect).
  useEffect(() => {
    if (recoveryState.codes && recoveryState.codes.length > 0) {
      void refetchCount();
    }
    if (recoveryState.error) {
      toast.error(t(`error.${recoveryState.error}` as 'error.mfa_already_enabled'));
    }
  }, [recoveryState.codes, recoveryState.error, refetchCount, t]);

  // Dialog is open when fresh codes exist and the user has not yet dismissed them.
  const isShowingRecovery =
    (recoveryState.codes?.length ?? 0) > 0 && recoveryState.codes !== dismissedCodes;

  const recoveryCodes = recoveryState.codes ?? [];

  const copyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success(t('success.recovery_codes_copied'));
  };

  const downloadRecoveryCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'recovery-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isMfaEnabled = factors.some((f) => f.status === 'verified');

  if (isLoading) {
    return (
      <Card className="border-outline-variant/10 animate-pulse rounded-3xl">
        <div className="bg-surface-container-low h-[200px] rounded-3xl" />
      </Card>
    );
  }

  return (
    <Card className="border-outline-variant/10 rounded-3xl">
      <CardHeader>
        <CardTitle>{t('mfa_heading')}</CardTitle>
        <CardDescription>{t('mfa_description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authenticator App Item */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="bg-surface-container-highest flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <span className="material-symbols-outlined text-primary text-[24px]">
                phone_android
              </span>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold">{t('authenticator_app_title')}</h4>
              <p className="text-muted-foreground max-w-md text-xs">
                {t('authenticator_app_desc')}
              </p>
              {isMfaEnabled && (
                <div className="bg-primary/10 text-primary mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                  <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
                  {t('status_enabled')}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isMfaEnabled ?
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const id = factors.find((f) => f.status === 'verified')?.id;
                  if (id) void onUnenroll(id);
                }}
                className="border-error/20 text-error hover:bg-error/5 rounded-xl">
                {t('disable')}
              </Button>
            : <Dialog
                open={isEnrolling}
                onOpenChange={(open) => {
                  if (!open && !enrolledSuccessfully.current) {
                    // User cancelled — clean up the pending unverified factor.
                    cancelEnrollment(factorId);
                  }
                }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => void onEnroll()} className="rounded-xl">
                    {t('enable')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-outline-variant/10 rounded-3xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('mfa_modal_title')}</DialogTitle>
                    <DialogDescription>{t('mfa_modal_step1')}</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-6 py-6">
                    <div className="border-outline-variant/5 flex h-[186px] w-[186px] items-center justify-center rounded-2xl border bg-white p-5 shadow-sm">
                      {isLoadingQr && (
                        <span className="material-symbols-outlined text-on-surface-variant animate-spin text-4xl opacity-40">
                          progress_activity
                        </span>
                      )}
                      {!isLoadingQr && qrCode && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrCode}
                          alt="QR Code"
                          width={176}
                          height={176}
                          className="h-44 w-44"
                        />
                      )}
                    </div>
                    <div className="w-full space-y-2.5">
                      <Label
                        htmlFor="mfa-code"
                        className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                        {t('mfa_modal_step2')}
                      </Label>
                      <Input
                        id="mfa-code"
                        placeholder="000 000"
                        value={verifyCode}
                        onChange={(e) =>
                          setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        className="bg-surface-container-low border-outline-variant/10 focus:ring-primary/20 h-14 rounded-xl text-center font-mono text-2xl tracking-[0.2em]"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => cancelEnrollment(factorId)}
                      className="rounded-xl">
                      {t('mfa_modal_cancel')}
                    </Button>
                    <Button
                      onClick={onVerify}
                      disabled={verifyCode.length !== 6}
                      className="shadow-primary/20 rounded-xl px-8 shadow-lg">
                      {t('mfa_modal_verify')}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            }
          </div>
        </div>

        {/* Recovery Codes Item */}
        <div className="border-outline-variant/5 border-t pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="bg-surface-container-highest flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <span className="material-symbols-outlined text-primary text-[24px]">key</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">{t('recovery_codes_title')}</h4>
                <p className="text-muted-foreground max-w-md text-xs">{t('recovery_codes_desc')}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <Dialog
                open={isShowingRecovery}
                onOpenChange={(open) => {
                  if (!open) setDismissedCodes(recoveryState.codes ?? null);
                }}>
                <DialogTrigger asChild>
                  <form action={recoveryAction}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      disabled={!isMfaEnabled || recoveryPending}
                      className="rounded-xl">
                      {unusedCount > 0 ? t('regenerate') : t('generate')}
                    </Button>
                  </form>
                </DialogTrigger>
                <DialogContent className="border-outline-variant/10 rounded-3xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('recovery_modal_title')}</DialogTitle>
                    <DialogDescription>{t('recovery_codes_warning')}</DialogDescription>
                  </DialogHeader>
                  <div className="bg-warning/10 border-warning/20 rounded-xl border px-4 py-3">
                    <p className="text-warning text-xs font-semibold">
                      <span className="material-symbols-outlined mr-1 align-middle text-[16px]">
                        warning
                      </span>
                      {t('recovery_codes_warning')}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 py-2">
                    {recoveryCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="bg-surface-container-low border-outline-variant/5 rounded-xl border p-3 text-center font-mono text-sm">
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setDismissedCodes(recoveryState.codes ?? null)}
                      className="rounded-xl">
                      {t('mfa_modal_cancel')}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => void copyRecoveryCodes()}
                        className="flex items-center gap-2 rounded-xl">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                        {t('recovery_copy')}
                      </Button>
                      <Button
                        onClick={downloadRecoveryCodes}
                        className="flex items-center gap-2 rounded-xl">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        {t('recovery_download')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {unusedCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {t('recovery_remaining_count', { count: unusedCount })}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
