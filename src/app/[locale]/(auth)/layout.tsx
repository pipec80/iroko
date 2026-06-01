import React from 'react';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="bg-background selection:bg-primary/20 selection:text-primary flex min-h-screen">
      {/* Left pane - Branding & Hero (Premium Corporate Design) */}
      <div className="bg-accent/10 relative hidden flex-1 items-center justify-center overflow-hidden p-16 lg:flex">
        {/* Decorative Background Elements */}
        <div className="from-primary absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] via-transparent to-transparent opacity-10" />
        <div className="bg-primary absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-20 mix-blend-multiply blur-3xl" />

        {/* Content Container */}
        <div className="relative z-10 max-w-lg space-y-12">
          {/* Floating Card Graphic (Bento-style) */}
          <div className="bg-card ambient-shadow flex h-64 w-full flex-col justify-between overflow-hidden rounded-2xl p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="text-muted-foreground mb-1 font-sans text-xs font-bold tracking-widest uppercase opacity-60">
                  Performance Analytics
                </div>
                <div className="text-foreground font-mono text-3xl font-bold">+$2.4M</div>
              </div>
              <div className="bg-primary shadow-primary/20 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg">
                <span className="material-symbols-outlined text-primary-foreground text-2xl">
                  trending_up
                </span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full w-3/4 rounded-full transition-all duration-1000" />
              </div>
              <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                <div className="bg-secondary h-full w-1/2 rounded-full transition-all duration-1000" />
              </div>
            </div>
          </div>

          {/* Quote Section with Glassmorphism */}
          <div className="glass ghost-border relative rounded-2xl p-10 backdrop-blur-xl">
            <span className="material-symbols-outlined text-primary absolute -top-5 -left-5 text-[48px] opacity-20">
              format_quote
            </span>
            <h2 className="font-headline text-foreground mb-6 text-2xl leading-tight font-bold">
              &quot;Turning fragmented retail data into precise, actionable intelligence.&quot;
            </h2>
            <div className="flex items-center gap-4">
              <div className="border-primary/20 relative h-12 w-12 overflow-hidden rounded-full border-2 shadow-inner">
                <Image
                  alt="Sarah Jenkins"
                  fill
                  className="object-cover"
                  unoptimized
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                />
              </div>
              <div>
                <p className="text-foreground text-sm font-bold">Sarah Jenkins</p>
                <p className="text-muted-foreground font-mono text-xs font-medium tracking-wide uppercase">
                  VP of Analytics, Global Retail
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right pane - Auth Forms */}
      <div className="bg-background flex flex-1 flex-col px-8 py-8 lg:px-24 lg:py-12">
        {/* Top Branding (Mobile & Desktop) */}
        <div className="flex-none">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground shadow-primary/20 flex h-9 w-9 items-center justify-center rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
              RA
            </div>
            <span className="font-headline text-primary text-2xl font-extrabold tracking-tight">
              Retail Analytics
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 w-full max-w-md duration-1000 ease-out">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
