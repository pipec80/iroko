export type PhoneCountry = {
  iso: string;
  name: string;
  dialCode: string;
  /** Expected local number digit count (after the dial code). Used for validation. */
  localDigits?: number;
};

/** Converts ISO 3166-1 alpha-2 code to flag emoji. */
export function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'AR', name: 'Argentina', dialCode: '+54', localDigits: 10 },
  { iso: 'AU', name: 'Australia', dialCode: '+61', localDigits: 9 },
  { iso: 'AT', name: 'Austria', dialCode: '+43' },
  { iso: 'BE', name: 'Belgium', dialCode: '+32' },
  { iso: 'BO', name: 'Bolivia', dialCode: '+591' },
  { iso: 'BR', name: 'Brazil', dialCode: '+55' },
  { iso: 'CA', name: 'Canada', dialCode: '+1', localDigits: 10 },
  { iso: 'CL', name: 'Chile', dialCode: '+56', localDigits: 9 },
  { iso: 'CN', name: 'China', dialCode: '+86', localDigits: 11 },
  { iso: 'CO', name: 'Colombia', dialCode: '+57', localDigits: 10 },
  { iso: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { iso: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { iso: 'DK', name: 'Denmark', dialCode: '+45' },
  { iso: 'DO', name: 'Dominican Republic', dialCode: '+1', localDigits: 10 },
  { iso: 'EC', name: 'Ecuador', dialCode: '+593' },
  { iso: 'EG', name: 'Egypt', dialCode: '+20' },
  { iso: 'SV', name: 'El Salvador', dialCode: '+503' },
  { iso: 'FI', name: 'Finland', dialCode: '+358' },
  { iso: 'FR', name: 'France', dialCode: '+33', localDigits: 9 },
  { iso: 'DE', name: 'Germany', dialCode: '+49' },
  { iso: 'GT', name: 'Guatemala', dialCode: '+502' },
  { iso: 'HN', name: 'Honduras', dialCode: '+504' },
  { iso: 'HK', name: 'Hong Kong', dialCode: '+852' },
  { iso: 'HU', name: 'Hungary', dialCode: '+36' },
  { iso: 'IN', name: 'India', dialCode: '+91', localDigits: 10 },
  { iso: 'ID', name: 'Indonesia', dialCode: '+62' },
  { iso: 'IE', name: 'Ireland', dialCode: '+353' },
  { iso: 'IL', name: 'Israel', dialCode: '+972' },
  { iso: 'IT', name: 'Italy', dialCode: '+39' },
  { iso: 'JP', name: 'Japan', dialCode: '+81', localDigits: 10 },
  { iso: 'KR', name: 'South Korea', dialCode: '+82', localDigits: 10 },
  { iso: 'MX', name: 'Mexico', dialCode: '+52', localDigits: 10 },
  { iso: 'NL', name: 'Netherlands', dialCode: '+31', localDigits: 9 },
  { iso: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { iso: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { iso: 'NO', name: 'Norway', dialCode: '+47' },
  { iso: 'PA', name: 'Panama', dialCode: '+507' },
  { iso: 'PY', name: 'Paraguay', dialCode: '+595' },
  { iso: 'PE', name: 'Peru', dialCode: '+51', localDigits: 9 },
  { iso: 'PH', name: 'Philippines', dialCode: '+63', localDigits: 10 },
  { iso: 'PL', name: 'Poland', dialCode: '+48', localDigits: 9 },
  { iso: 'PT', name: 'Portugal', dialCode: '+351', localDigits: 9 },
  { iso: 'RO', name: 'Romania', dialCode: '+40' },
  { iso: 'RU', name: 'Russia', dialCode: '+7', localDigits: 10 },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { iso: 'ZA', name: 'South Africa', dialCode: '+27', localDigits: 9 },
  { iso: 'ES', name: 'Spain', dialCode: '+34', localDigits: 9 },
  { iso: 'SE', name: 'Sweden', dialCode: '+46' },
  { iso: 'CH', name: 'Switzerland', dialCode: '+41' },
  { iso: 'TW', name: 'Taiwan', dialCode: '+886' },
  { iso: 'TH', name: 'Thailand', dialCode: '+66' },
  { iso: 'TR', name: 'Turkey', dialCode: '+90', localDigits: 10 },
  { iso: 'UA', name: 'Ukraine', dialCode: '+380', localDigits: 9 },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44', localDigits: 10 },
  { iso: 'US', name: 'United States', dialCode: '+1', localDigits: 10 },
  { iso: 'UY', name: 'Uruguay', dialCode: '+598' },
  { iso: 'VE', name: 'Venezuela', dialCode: '+58' },
  { iso: 'VN', name: 'Vietnam', dialCode: '+84' },
];

const DEFAULT_DIAL_CODE = '+56';

// Sorted longest-first so "+1" doesn't greedily match "+593", "+595", etc.
const SORTED_BY_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

export function parseE164(e164: string): { iso: string; dialCode: string; localNumber: string } {
  if (!e164.startsWith('+')) return { iso: 'CL', dialCode: DEFAULT_DIAL_CODE, localNumber: '' };
  for (const country of SORTED_BY_LENGTH) {
    if (e164.startsWith(country.dialCode)) {
      return {
        iso: country.iso,
        dialCode: country.dialCode,
        localNumber: e164.slice(country.dialCode.length),
      };
    }
  }
  return { iso: 'CL', dialCode: DEFAULT_DIAL_CODE, localNumber: e164.slice(1) };
}
