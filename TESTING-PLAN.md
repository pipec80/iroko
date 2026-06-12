# Plan de Testing — Iroko

> Documento de planificación: qué se testea, dónde, con qué prioridad y en qué orden.
> Última actualización: 2026-06-12 — **Fases 1, 2, 3 y 4 completadas** (310+ unit tests, 24 E2E).
> Marca los checkboxes a medida que avances. Cada fase tiene un prompt listo para Claude Code al final.

---

## 1. Estrategia: qué nivel cubre qué

| Nivel                     | Herramienta                 | Qué cubre                                                                                              | Qué NO cubre              |
| ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------- |
| **Unit — validación**     | Vitest                      | Schemas Zod: límites, formatos, casos borde                                                            | Nada de red ni DB         |
| **Unit — server actions** | Vitest + mocks              | Lógica de cada action: auth check, validación, manejo de errores RPC/Supabase, redirects, revalidación | El SQL real, la UI        |
| **Unit — lógica pura**    | Vitest                      | Parseo, transformaciones, helpers (`robot-config`, `safe-redirect`)                                    | —                         |
| **DB**                    | pgTAP (`supabase test db`)  | RLS, funciones SQL, constraints                                                                        | —                         |
| **E2E**                   | Playwright + Supabase local | Flujos completos de usuario en navegador real: hidratación incluida                                    | Casos borde (eso es unit) |
| **Smoke producción**      | Playwright nightly          | Que producción responda: renders y route guards. **Solo tests `@smoke`**                               | Nada que escriba datos    |

Regla de oro: **cada capa verifica resultados observables, no URLs ni "no explotó"**.
Un test que pasa cuando la funcionalidad está rota es peor que no tener test.

---

## 2. Mapa carpeta por carpeta

Leyenda: ✅ cubierto · 🟡 parcial · ❌ sin tests · P0/P1/P2 prioridad

### `src/lib/` — lógica compartida

| Archivo                             | Estado | Notas                                                                  |
| ----------------------------------- | ------ | ---------------------------------------------------------------------- |
| `auth/safe-redirect.ts`             | ✅     | Referencia de calidad: ataques + casos felices                         |
| `server-action.ts`                  | ✅     | —                                                                      |
| `logger.ts`                         | ✅     | —                                                                      |
| `validation/auth.ts`                | ✅     | —                                                                      |
| `validation/profile.ts`             | ✅     | —                                                                      |
| `validation/projects.ts`            | ✅     | Schema + integridad de `TONE_TO_COLOR`                                 |
| `validation/team.ts`                | ✅     | Transform de emails, límite 10, rol owner excluido                     |
| `validation/shared.ts`              | ✅     | Cubierto vía signup/updatePassword (strongPassword)                    |
| `robot-config.ts`                   | ✅     | Construye .xlsx reales en memoria — parseo genuino, guards OWASP, IDOR |
| `projects.ts`                       | ✅     | Fetchers con builder encadenable mockeado                              |
| `project-documents.ts`              | ✅     | Ídem                                                                   |
| `phone-countries.ts`                | ✅     | `parseE164`: longest-match, fallbacks, ISO únicos                      |
| `storage.ts`                        | ✅     | —                                                                      |
| `utils.ts`                          | ✅     | —                                                                      |
| `supabase/middleware.ts`            | ✅     | Matriz de protección de rutas, next=, tokens stale                     |
| `supabase/{client,server,admin}.ts` | —      | Wrappers triviales del SDK — excluidos del coverage a propósito        |

### `src/app/[locale]/` — vistas y server actions

| Vista / actions                                                                              | Unit (actions)                                | E2E                                                              | Pendiente                                           |
| -------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| `(auth)/login`                                                                               | ✅ signIn, verifyMfa, magicLink               | ✅ render @smoke, credenciales malas → error visible             | `oauthAction` (P2, requiere mock de URL externa)    |
| `(auth)/signup`                                                                              | ✅ (anti-enumeración incluida)                | ✅ weak password → error inline visible                          | —                                                   |
| `(auth)/forgot-password`                                                                     | ✅                                            | ✅ flujo OTP completo                                            | —                                                   |
| `(auth)/reset-password`                                                                      | ✅ updatePassword                             | ✅                                                               | —                                                   |
| `(auth)/confirmation`                                                                        | ✅ resend, verifyRecovery                     | ✅ parcial                                                       | —                                                   |
| `auth/*` route handlers                                                                      | —                                             | ✅ rechazos sin token @smoke                                     | Suficiente vía E2E                                  |
| `dashboard/account`                                                                          | ✅ 10/10 actions                              | ✅ guard @smoke, error inline, **camino feliz con persistencia** | —                                                   |
| `dashboard/team`                                                                             | ✅                                            | ✅ invitar/remover miembro                                       | —                                                   |
| `dashboard/projects`                                                                         | ✅ createProject (slug, duplicados, contexto) | ✅ crear proyecto desde UI → aparece en grid                     | —                                                   |
| `dashboard/projects/[slug]/doc`                                                              | ✅ createDocument, saveDocument               | ❌                                                               | [ ] E2E editor (P2)                                 |
| `dashboard/operations/robot`                                                                 | ✅ (lógica en lib)                            | ❌                                                               | [ ] E2E upload Excel (P2)                           |
| `dashboard` home, `billing`, `inventory`, `members`, `operations`, `org/settings`, `reports` | —                                             | ❌                                                               | [ ] 1 E2E `@smoke` de render por vista (P2, Fase 5) |
| `(public)` home, pricing, product, solutions, contact                                        | —                                             | ✅ `@smoke` render por página                                    | —                                                   |

### `src/components/`

| Carpeta                       | Decisión                                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ui/` (button, dialog, card…) | **No testear** (shadcn, sin lógica propia). Excluidos del coverage                                   |
| `providers/`, `layout/`       | No testear directamente; los cubre E2E                                                               |
| `auth/`, `dashboard/`         | Solo si un componente acumula lógica de cliente; preferir extraer la lógica a `lib/` y testearla ahí |

### `src/test/e2e/` — salud de la suite

- [x] **Test de sanidad de hidratación**: `hydration.spec.ts` falla si algún asset propio devuelve ≥ 400 o si el JS de cliente no hidrata (botón de enlace mágico nunca se habilita). Protege contra la regresión del standalone sin assets.
- [x] Tests seguros contra producción etiquetados `@smoke`; el nightly corre `--grep @smoke`.
- [x] Aserciones de "la URL no cambió" reemplazadas por aserciones de contenido visible (error inline, mensaje de éxito, persistencia tras reload).

---

## 3. Convenciones

- **Ubicación**: actions → `__tests__/actions.test.ts` junto a la ruta; lib → archivo hermano `*.test.ts` o `__tests__/`.
- **Patrón de mocks**: copiar el de `dashboard/account/__tests__/actions.test.ts` (`vi.hoisted` + mocks de `@/lib/supabase/server`, `@/env`, `next-intl/server`, `@sentry/nextjs`).
- **Mockear auth SIEMPRE en `beforeEach`** (no depender de que la validación corra antes del auth check).
- **Estructura por action**: 1 test de validación por campo crítico, 1 de no-autenticado, 1 de error de Supabase/RPC, 1 de camino feliz (incluyendo `revalidatePath`/redirect).
- **E2E**: asertar texto/estado visible para el usuario. `@smoke` en el título si es seguro contra producción (solo lecturas).
- **Queries encadenadas de Supabase**: usar el builder mockeado de `lib/__tests__/projects.test.ts` como plantilla.

---

## 4. Coverage: configuración vigente

`vitest.config.ts` mide **solo código con lógica**: `src/lib/**` + `src/app/**/actions.ts`.
La UI (shadcn, layouts, providers) se cubre vía E2E y está excluida a propósito.

Valores reales al calibrar (2026-06-12): **96.5 / 83.8 / 96 / 97**.
Thresholds vigentes (margen ~5 puntos): `statements: 90, branches: 78, functions: 90, lines: 90`.

Regla de trinquete: **nunca bajarlos**; subirlos cuando una fase agregue cobertura.

---

## 5. Orden de ejecución

| Fase       | Contenido                                                                                                       | Estado        |
| ---------- | --------------------------------------------------------------------------------------------------------------- | ------------- |
| **1 (P0)** | E2E con aserciones reales + test de hidratación + unit de MFA/recovery + `supabase/middleware` + `robot-config` | ✅ Completada |
| **2 (P1)** | Actions restantes (account, projects, auth) + validaciones projects/team + fetchers de lib                      | ✅ Completada |
| **3**      | Coverage config + thresholds 90/78/90/90                                                                        | ✅ Completada |
| **4 (P2)** | Smoke E2E por vista pública/dashboard + E2E de team/projects desde UI                                           | ✅ Completada |

---

## 6. Prompts para Claude Code

**Fase 4 (pendiente):**

> Lee TESTING-PLAN.md secciones 2 y 3. Agrega: (a) un spec `src/test/e2e/public.spec.ts` con un test `@smoke` de render por página pública (home, pricing, product, solutions, contact) que aserte el heading principal visible; (b) tests E2E autenticados para dashboard/team (invitar miembro con email válido → mensaje de éxito; remover miembro) y dashboard/projects (crear proyecto desde el dialog → aparece en el listado), usando el fixture de `src/test/e2e/fixtures/auth.ts`. Corre pnpm lint y pnpm typecheck al final. Un commit por punto, conventional commits. No toques src/proxy.ts ni crees middleware.ts.

**Mantenimiento continuo:**

> Al agregar una server action nueva, crea sus tests en el mismo PR siguiendo la sección 3 (validación + no-auth + error + camino feliz). Si el coverage cae bajo los thresholds, agrega tests — no bajes los thresholds.
