import { routing } from '@/i18n/routing-config';

/** Single source of truth for locale types — derived from routing.ts. */
export type AppLocale = (typeof routing.locales)[number];

/**
 * Central application configuration.
 * Change values here to re-skin the entire app without touching individual components.
 */
export type AppConfig = {
  /** Public product name shown in UI and metadata. */
  name: string;
  /** Short brand wordmark (used in navbar, sidebar, emails). */
  brand: string;
  /** One-line product description for metadata and OG tags. */
  description: string;
  /** URLs referenced across the app. */
  urls: {
    /** Canonical public URL of the deployed site. */
    site: string;
    /** Support contact URL or mailto link. */
    support: string;
    /** Documentation site URL. */
    docs: string;
    /** GitHub repository URL. */
    github: string;
    /** Twitter/X profile URL. */
    twitter: string;
  };
  /** Primary support email address. */
  supportEmail: string;
  /** Default i18n locale. */
  defaultLocale: AppLocale;
  /** All available locales. */
  locales: typeof routing.locales;
  /**
   * Feature toggles — set to false to hide a module or vertical.
   * These are build-time constants; never read process.env here.
   */
  features: {
    /** Show the Billing module (plan + invoices page). */
    billing: boolean;
    /** Show the Projects module. */
    projects: boolean;
    /** Show the Members module. */
    members: boolean;
    /** Show the Activity module (audit log viewer, owner/admin only). */
    activityLog: boolean;
    /** Show the cookie consent banner (GDPR/ePrivacy). Set false to hide it entirely. */
    cookieConsent: boolean;
    /** Show the post-signup onboarding wizard. false = onboarding_completed se asume completo. */
    onboarding: boolean;
    /** Per-vertical toggles. */
    verticals: {
      /** Demo vertical — robot configuration uploader. Set false to hide from nav. */
      robot: boolean;
    };
  };
  /** References to design system tokens (CSS variable names). */
  theme: {
    /** Primary brand color CSS var. */
    primaryColor: string;
    /** Accent color CSS var. */
    accentColor: string;
  };
};

/** Singleton app configuration. Import this anywhere; never import process.env directly. */
export const appConfig: AppConfig = {
  name: 'Iroko',
  brand: 'Iroko',
  description:
    'The SaaS boilerplate that maximises Supabase and runs on the free tier. Auth, billing, teams and deploy — ready on day one.',
  urls: {
    site: 'https://project-a89lv.vercel.app',
    support: 'mailto:support@iroko.vercel.app',
    docs: 'https://project-a89lv.vercel.app/docs',
    github: 'https://github.com/pipec80/iroko',
    twitter: 'https://twitter.com/iroko_saas',
  },
  supportEmail: 'support@iroko.vercel.app',
  defaultLocale: routing.defaultLocale,
  locales: routing.locales,
  features: {
    billing: true,
    projects: true,
    members: true,
    activityLog: true,
    cookieConsent: true,
    onboarding: true,
    verticals: {
      robot: true,
    },
  },
  theme: {
    primaryColor: 'var(--color-poppy)',
    accentColor: 'var(--color-cobalt)',
  },
};
