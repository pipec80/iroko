# Prompts para Claude Code — Iroko design refresh

Copia un bloque a la vez. Espera a confirmar que la fase quedó OK antes de pasar a la siguiente.

---

## PROMPT 0 · Setup (una sola vez)

```
Acabo de pegar un design refresh en `.design/design_handoff_iroko/`. Lee `.design/design_handoff_iroko/README.md` entero antes de tocar nada.

Es un REFRESH VISUAL del repo existente, no un proyecto nuevo. Reglas:
- NO crees archivos en rutas nuevas si ya existen — edita en su lugar.
- NO toques server actions, Supabase queries, route handlers, ni `useActionState`. Solo capa visual + copy.
- NO toques `src/lib/`, `src/i18n/request.ts`, `(auth)/actions.ts`.
- Un commit por fase con mensaje `iroko: phase N — …`.
- Si no está claro qué archivo editar, pregúntame antes de crear uno nuevo.

Confírmame que leíste el README y dime cuántas fases vas a ejecutar.
```

---

## PROMPT 1 · Fase 1 (tokens + fuentes + lucide + favicons)

```
Ejecuta la FASE 1 del handoff:

1. Reescribe `src/app/globals.css` reemplazando el bloque M3 (--color-primary teal, --color-surface fdf9f2, etc) con los tokens Iroko del archivo `.design/design_handoff_iroko/iroko/colors_and_type.css`. Mapea los aliases shadcn (--primary, --background, --card, --border, --ring) como dice el README.
2. En `src/app/layout.tsx` swap Plus_Jakarta_Sans + IBM_Plex_Mono por Geist + Geist_Mono desde next/font/google.
3. Quita el <link> de Material Symbols Outlined del <head>.
4. `pnpm add lucide-react` y reemplaza TODOS los <span className="material-symbols-outlined"> por iconos Lucide. Usa el mapping table del README (Phase 1, paso 5).
5. Copia `.design/design_handoff_iroko/iroko/assets/favicon*.{svg,png}`, `apple-touch-icon.png`, `icon-*.png`, `site.webmanifest` a `public/`. Wirea el <head> de `layout.tsx` con los <link rel="icon">.

Commit: `iroko: phase 1 — tokens + fonts + icons + favicons`.

Cuando termines: muéstrame `git diff --stat` y un screenshot conceptual de qué cambió.
```

---

## PROMPT 2 · Fase 5 (re-skin shadcn primitives)

```
Ejecuta la FASE 5 del handoff (re-skin shadcn).

Re-skin SIN romper la API de `src/components/ui/`:
- `button.tsx` — variants: default (poppy bg + white text), secondary (ink bg + white), outline, ghost, destructive (poppy-wash + poppy), link. Size default = h-9 px-4 text-13 radius-md.
- `card.tsx` — surface-elevated bg, 1px border, radius-lg, sin shadow por default.
- `input.tsx` — h-9, paper bg, border-strong, radius-md, focus-visible ring poppy/20.
- `badge.tsx` — pill radius, variants default/secondary/success/outline con los wash tokens.

NO cambies las props de los componentes — solo las clases internas vía `cn()`. NO toques `dialog.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `table.tsx`, `tabs.tsx` aún.

Commit: `iroko: phase 5 — shadcn re-skin`.

Después corre `pnpm typecheck && pnpm lint` y muéstrame si hay errores.
```

Sigue en `prompts-pt2.md`.
