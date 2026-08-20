# Iroko — Marketing UI Kit

Recreation of the public marketing surface for **Iroko** — the multi-tenant SaaS template.

## Components

| File               | Purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `Navbar.jsx`       | Sticky transparent → frosted Paper on scroll, brand mark + nav + sign-in CTA |
| `Hero.jsx`         | Geist display headline, Poppy accent, lex strip of feature beats             |
| `FeatureGrid.jsx`  | 6-card bento (auth / orgs / billing / i18n / dark mode / Supabase schema)    |
| `PricingTiers.jsx` | Personal · **Studio** (night, featured) · Custom                             |
| `Quote.jsx`        | Pull quote with restrained Cobalt ornament                                   |
| `CtaBlock.jsx`     | Ink card with code chip + dual CTAs                                          |
| `Footer.jsx`       | Four-column footer + ceremonial bottom strip                                 |
| `index.html`       | Loads React + Babel + Lucide and composes the landing                        |

## Visual rules

- Background: Paper (`#ffffff`) with neutral surface sections
- Section padding: 96px vertical, container max 1240px
- Display and UI face: **Geist 500–800**
- Mono face: **Geist Mono** for code, numerals, eyebrows
- Icons: **Lucide**, stroke-width 1.5; use `lucide-react` in production
- Primary action: solid Poppy `#d92121`; Cobalt `#0047ab` is secondary; featured tiers may invert to Ink `#0e1117`
