export type PhoneCountry = {
  iso: string;
  name: string;
  dialCode: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'AR', name: 'Argentina', dialCode: '+54' },
  { iso: 'AU', name: 'Australia', dialCode: '+61' },
  { iso: 'AT', name: 'Austria', dialCode: '+43' },
  { iso: 'BE', name: 'Belgium', dialCode: '+32' },
  { iso: 'BO', name: 'Bolivia', dialCode: '+591' },
  { iso: 'BR', name: 'Brazil', dialCode: '+55' },
  { iso: 'CA', name: 'Canada', dialCode: '+1' },
  { iso: 'CL', name: 'Chile', dialCode: '+56' },
  { iso: 'CN', name: 'China', dialCode: '+86' },
  { iso: 'CO', name: 'Colombia', dialCode: '+57' },
  { iso: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { iso: 'CZ', name: 'Czech Republic', dialCode: '+420' },
  { iso: 'DK', name: 'Denmark', dialCode: '+45' },
  { iso: 'DO', name: 'Dominican Republic', dialCode: '+1' },
  { iso: 'EC', name: 'Ecuador', dialCode: '+593' },
  { iso: 'EG', name: 'Egypt', dialCode: '+20' },
  { iso: 'SV', name: 'El Salvador', dialCode: '+503' },
  { iso: 'FI', name: 'Finland', dialCode: '+358' },
  { iso: 'FR', name: 'France', dialCode: '+33' },
  { iso: 'DE', name: 'Germany', dialCode: '+49' },
  { iso: 'GT', name: 'Guatemala', dialCode: '+502' },
  { iso: 'HN', name: 'Honduras', dialCode: '+504' },
  { iso: 'HK', name: 'Hong Kong', dialCode: '+852' },
  { iso: 'HU', name: 'Hungary', dialCode: '+36' },
  { iso: 'IN', name: 'India', dialCode: '+91' },
  { iso: 'ID', name: 'Indonesia', dialCode: '+62' },
  { iso: 'IE', name: 'Ireland', dialCode: '+353' },
  { iso: 'IL', name: 'Israel', dialCode: '+972' },
  { iso: 'IT', name: 'Italy', dialCode: '+39' },
  { iso: 'JP', name: 'Japan', dialCode: '+81' },
  { iso: 'KR', name: 'South Korea', dialCode: '+82' },
  { iso: 'MX', name: 'Mexico', dialCode: '+52' },
  { iso: 'NL', name: 'Netherlands', dialCode: '+31' },
  { iso: 'NZ', name: 'New Zealand', dialCode: '+64' },
  { iso: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { iso: 'NO', name: 'Norway', dialCode: '+47' },
  { iso: 'PA', name: 'Panama', dialCode: '+507' },
  { iso: 'PY', name: 'Paraguay', dialCode: '+595' },
  { iso: 'PE', name: 'Peru', dialCode: '+51' },
  { iso: 'PH', name: 'Philippines', dialCode: '+63' },
  { iso: 'PL', name: 'Poland', dialCode: '+48' },
  { iso: 'PT', name: 'Portugal', dialCode: '+351' },
  { iso: 'RO', name: 'Romania', dialCode: '+40' },
  { iso: 'RU', name: 'Russia', dialCode: '+7' },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { iso: 'ZA', name: 'South Africa', dialCode: '+27' },
  { iso: 'ES', name: 'Spain', dialCode: '+34' },
  { iso: 'SE', name: 'Sweden', dialCode: '+46' },
  { iso: 'CH', name: 'Switzerland', dialCode: '+41' },
  { iso: 'TW', name: 'Taiwan', dialCode: '+886' },
  { iso: 'TH', name: 'Thailand', dialCode: '+66' },
  { iso: 'TR', name: 'Turkey', dialCode: '+90' },
  { iso: 'UA', name: 'Ukraine', dialCode: '+380' },
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { iso: 'US', name: 'United States', dialCode: '+1' },
  { iso: 'UY', name: 'Uruguay', dialCode: '+598' },
  { iso: 'VE', name: 'Venezuela', dialCode: '+58' },
  { iso: 'VN', name: 'Vietnam', dialCode: '+84' },
];

const DEFAULT_DIAL_CODE = '+56';

// Sorted longest-first so "+1" doesn't greedily match "+593", "+595", etc.
const SORTED_BY_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);

export function parseE164(e164: string): { dialCode: string; localNumber: string } {
  if (!e164.startsWith('+')) return { dialCode: DEFAULT_DIAL_CODE, localNumber: '' };
  for (const country of SORTED_BY_LENGTH) {
    if (e164.startsWith(country.dialCode)) {
      return { dialCode: country.dialCode, localNumber: e164.slice(country.dialCode.length) };
    }
  }
  return { dialCode: DEFAULT_DIAL_CODE, localNumber: e164.slice(1) };
}
