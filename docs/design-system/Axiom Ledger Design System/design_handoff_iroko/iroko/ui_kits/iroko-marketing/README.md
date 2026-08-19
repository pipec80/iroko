# Iroko — Marketing UI Kit

Recreation of the public marketing surface for **Iroko** — the multi-tenant SaaS template.

## Components

| File | Purpose |
|---|---|
| `Navbar.jsx` | Sticky transparent → frosted bone on scroll, brand mark + nav + sign-in CTA |
| `Hero.jsx` | Cormorant italic display headline, iron accent, lex strip of feature beats |
| `FeatureGrid.jsx` | 6-card bento (auth / orgs / billing / i18n / dark mode / Supabase schema) |
| `PricingTiers.jsx` | Personal · **Studio** (night, featured) · Custom |
| `Quote.jsx` | Akan-proverb pull quote, gold-rule ornament |
| `CtaBlock.jsx` | Night card with code chip + dual CTAs |
| `Footer.jsx` | Four-column footer + ceremonial bottom strip |
| `index.html` | Loads React + Babel + Lucide and composes the landing |

## Visual rules

- Background: warm bone (`#f5ecda`)
- Section padding: 96px vertical, container max 1240px
- Display face: **Cormorant Garamond italic 500** for emotional headlines
- UI face: **Inter Tight 500–700** for everything else
- Mono face: **Geist Mono** for code, numerals, eyebrows
- Icons: **Lucide**, stroke-width 1.25 (lighter than default 2 — pairs with the editorial serif)
- Primary action: solid iron `#b8513a`; featured tier inverts to solid night `#13110d`
