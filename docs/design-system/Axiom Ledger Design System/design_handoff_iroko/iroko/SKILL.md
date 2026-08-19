---
name: iroko-design
description: Use this skill to generate well-branded interfaces and assets for Iroko, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping. Iroko is a Spanish-first multi-tenant SaaS template (Next.js + Supabase) by pipec, with an afrofuturist "Tierra + Hierro" palette (iron #b8513a, gold #d9a441, night #13110d, bone #f5ecda), Cormorant Garamond italic display, Inter Tight UI, and Geist Mono numerals.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Key files:

- `README.md` — brand context, content fundamentals (voice, tone, casing, canonical copy), visual foundations (palette, type, spacing, animation, hover/press, borders, shadows, blur, layout), iconography rules.
- `colors_and_type.css` — drop-in CSS custom properties. Import it and you have the full token system (semantic colors, type scale, radii, shadows, brand utilities like `.display-italic`, `.eyebrow`, `.mono`, `.iroko-grid`).
- `assets/` — wordmark (light + dark), mark (light + dark), lockup, ornament, OAuth provider marks.
- `preview/` — small specimen cards used in the Design System review tab; not for direct reuse, but the cleanest visual reference.
- `ui_kits/iroko-marketing/` — public marketing site (navbar, hero, features, pricing, quote, CTA, footer).
- `ui_kits/iroko-dashboard/` — authenticated multi-tenant dashboard (sidebar with org switcher, topbar, overview/projects/members/billing/settings screens, login).
- `brand/` — historical record of the naming + palette exploration that led to Iroko. Useful if a future iteration wants to see *why*.

## Usage — visual artifacts (slides, mocks, throwaway prototypes)

1. Copy `colors_and_type.css` and any needed assets out of this skill folder into your project.
2. Link `colors_and_type.css` from your HTML. It defines `:root` tokens and basic element styles.
3. Load Cormorant Garamond + Inter Tight + Geist Mono from Google Fonts (the CSS does this for you).
4. Either lift JSX components from `ui_kits/iroko-*/` and adapt them, or write fresh markup using the CSS custom properties (`var(--color-iron)`, `var(--font-display)`, `var(--radius-lg)`, etc.).
5. For icons load Lucide via CDN and use `<i data-lucide="name">` with `stroke-width: 1.25`.
6. *Never* invent new colors — pick from `colors_and_type.css`. *Never* use white as a background — use `bone` `#f5ecda`.

## Usage — production code (the real Next.js + Tailwind codebase)

1. Read the README's "Content fundamentals", "Visual foundations", and "Iconography" sections to internalize voice and visual rules.
2. The repo uses Tailwind + shadcn — map `colors_and_type.css` tokens onto your `globals.css` `@theme inline { … }` block so Tailwind utilities like `bg-surface-elevated`, `text-iron`, `rounded-lg` work out of the box.
3. Use Lucide via `lucide-react` package, not the CDN.
4. Default to Spanish copy. Add `en` strings to `next-intl` messages; never invert default.
5. Numerals always in `font-mono` with `tracking-tighter` (`Inter Tight + Geist Mono` is the pair).

## Rules of thumb (the iron law)

- Background is **bone `#f5ecda`**, not white.
- Primary action is **iron `#b8513a`** — always solid, sentence-case.
- Featured / dramatic surfaces are **night `#13110d`** with optional grid overlay and gold ribbons.
- Display headlines are **Cormorant Garamond italic** — this single decision carries 80% of the brand emotion. Don't override it with another display font.
- Eyebrow micro-labels (Geist Mono, 11px, weight 600, 0.22em tracking, uppercase) live ABOVE every page H1. They're the system's signature.
- Cards have small radii (`radius-lg` = 8px) and `1px var(--border)` instead of shadows. Shadows are reserved for elevation-dependent surfaces (popovers, modals, the featured pricing card).
- Spanish first. English microcopy fine when it carries technical weight (`PROD`, `BUILD`, `OWNER`).
- Zero emoji. Zero exclamation marks. Use the Akan proverb sparingly — it's the brand's soul, not its garnish.

## If the user invokes this skill without other guidance

Ask them:
1. *What's the surface?* — marketing landing, dashboard screen, slide, email, or one-off mockup.
2. *What's the action?* — onboarding, status update, pricing, etc. — so we know what the H1 promises.
3. *Light or dark mode?* — Iroko defaults to light (bone) but the night variant is fully developed.
4. *Do you need a new asset/illustration?* — if so we'll lift the geometric tree language from `mark-iroko.svg`.

Then either write production code or output a self-contained HTML artifact depending on what they need.
