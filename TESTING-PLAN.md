# Plan de Testing — Iroko

> Documento de planificación: qué se testea, dónde, con qué prioridad y en qué orden.
> Estado auditado el 2026-06-12 (119 unit tests pasando, 16 E2E).
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

| Archivo                  | Estado | Prioridad | Qué testear                                                                                                                                      |
| ------------------------ | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth/safe-redirect.ts`  | ✅     | —         | (referencia de calidad: ataques + casos felices)                                                                                                 |
| `server-action.ts`       | ✅     | —         | —                                                                                                                                                |
| `logger.ts`              | ✅     | —         | —                                                                                                                                                |
| `validation/auth.ts`     | ✅     | —         | —                                                                                                                                                |
| `validation/profile.ts`  | ✅     | —         | —                                                                                                                                                |
| `validation/projects.ts` | ❌     | **P1**    | `createProjectSchema`: nombre vacío/81 chars, description 301, tone/type inválidos, defaults                                                     |
| `validation/team.ts`     | ❌     | **P1**    | schema de invitaciones: >10 emails, roles inválidos, emails malformados                                                                          |
| `validation/shared.ts`   | ❌     | P2        | helpers compartidos                                                                                                                              |
| `robot-config.ts`        | ❌     | **P0**    | Parseo Excel (lógica pura, 177 líneas): archivo válido, columnas faltantes, celdas vacías, tipos incorrectos, archivo vacío, filas duplicadas    |
| `projects.ts`            | ❌     | P1        | fetchers con cliente Supabase mockeado: éxito, error, datos vacíos                                                                               |
| `client-documents.ts`    | ❌     | P1        | ídem                                                                                                                                             |
| `client-countries.ts`    | ❌     | P2        | ídem                                                                                                                                             |
| `storage.ts`             | ❌     | P2        | construcción de URLs/paths                                                                                                                       |
| `supabase/middleware.ts` | ❌     | **P0**    | `updateSession`: usuario sin sesión → redirect a login con `next=`, con sesión → pasa, rutas públicas no redirigen. Mockear `createServerClient` |

### `src/app/[locale]/` — vistas y server actions

| Vista / actions                                                                                | Unit (actions)                                                                                                                                  | E2E                      | Prioridad | Qué falta                                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `(auth)/login`                                                                                 | 🟡 `signInAction` ✅, `verifyMfaAction` ❌, `magicLinkAction` ❌, `oauthAction` ❌                                                              | 🟡 render + flujo OTP    | **P0**    | Unit: MFA con código inválido/factor ajeno/éxito; magic link. E2E: login con contraseña incorrecta → **asertar mensaje de error visible** |
| `(auth)/signup`                                                                                | ✅ (anti-enumeración incluida)                                                                                                                  | 🟡                       | **P0**    | E2E weak password: asertar error visible (hoy solo URL)                                                                                   |
| `(auth)/forgot-password`                                                                       | ❌ `forgotPasswordAction`                                                                                                                       | ✅ flujo completo        | P1        | Unit: email inválido, error Supabase, éxito siempre-genérico (anti-enumeración)                                                           |
| `(auth)/reset-password`                                                                        | ❌ `updatePasswordAction`                                                                                                                       | ✅                       | P1        | Unit: passwords no coinciden, débil, sin sesión, éxito + redirect                                                                         |
| `(auth)/confirmation`                                                                          | ❌ `resendConfirmationAction`, `verifyRecoveryAction`                                                                                           | ✅ parcial               | **P0**    | Unit recovery: código inválido, ya usado, éxito                                                                                           |
| `auth/callback`, `auth/confirm`, `auth/click`, `auth/logout`                                   | ❌ (route handlers)                                                                                                                             | ✅ rechazos sin token    | P2        | Cubierto razonablemente por E2E                                                                                                           |
| `dashboard/account`                                                                            | 🟡 6/10 actions ✅; faltan `updatePasswordFromSettingsAction`, `uploadAvatarAction`, `requestPasswordResetFromSettingsAction`, `listMySessions` | 🟡 renders + route guard | **P0**    | Unit de las 4 actions. E2E: guardar perfil → **asertar mensaje de éxito**; error inline → **asertar mensaje visible**                     |
| `dashboard/team`                                                                               | ✅                                                                                                                                              | ❌                       | P1        | E2E: invitar miembro (form → success), remover miembro                                                                                    |
| `dashboard/projects`                                                                           | ❌ `createProject`                                                                                                                              | ❌                       | **P1**    | Unit: validación, sin cuenta, error RPC, éxito+revalidate. E2E: crear proyecto desde UI                                                   |
| `dashboard/projects/[slug]/doc`                                                                | ❌ `createDocument`, `saveDocument`                                                                                                             | ❌                       | P1        | Unit con el patrón de mocks existente                                                                                                     |
| `dashboard/operations/robot`                                                                   | ❌                                                                                                                                              | ❌                       | P1        | La lógica vive en `lib/robot-config.ts` (P0 arriba); E2E del upload es P2                                                                 |
| `dashboard` (home), `billing`, `inventory`, `members`, `operations`, `org/settings`, `reports` | ❌                                                                                                                                              | ❌                       | P2        | Cuando tengan lógica propia. Hoy: 1 E2E de render por vista basta (smoke)                                                                 |
| `(public)` home, pricing, product, solutions, contact                                          | —                                                                                                                                               | ❌                       | P2        | 1 E2E `@smoke` de render por página (sirven además para el nightly)                                                                       |

### `src/components/`

| Carpeta                       | Decisión                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `ui/` (button, dialog, card…) | **No testear** (shadcn, sin lógica propia). Excluir del coverage                                                              |
| `providers/`, `layout/`       | No testear directamente; los cubre E2E                                                                                        |
| `auth/`, `dashboard/`         | Solo si un componente acumula lógica de cliente (ej: `excel-upload.tsx`); preferir extraer la lógica a `lib/` y testearla ahí |

### `src/test/e2e/` — salud de la suite

- [ ] **Test de sanidad de hidratación (P0)**: en `/es/login`, escuchar `page.on('response')` y fallar si algún request a `/_next/static/` o asset de `public/` devuelve ≥ 400. Protege contra la regresión del standalone sin assets.
- [ ] Etiquetar con `@smoke` los tests seguros contra producción (renders, route guards) y cambiar el nightly a `--grep @smoke` (hoy el nightly corre TODO contra producción y está roto).
- [ ] Reemplazar aserciones de "la URL no cambió" por aserciones de contenido visible.

---

## 3. Convenciones

- **Ubicación**: actions → `__tests__/actions.test.ts` junto a la ruta; lib → archivo hermano `*.test.ts` o `__tests__/`.
- **Patrón de mocks**: copiar el de `dashboard/account/__tests__/actions.test.ts` (`vi.hoisted` + mocks de `@/lib/supabase/server`, `@/env`, `next-intl/server`, `@sentry/nextjs`).
- **Mockear auth SIEMPRE en `beforeEach`** (no depender de que la validación corra antes del auth check).
- **Estructura por action**: 1 test de validación por campo crítico, 1 de no-autenticado, 1 de error de Supabase/RPC, 1 de camino feliz (incluyendo `revalidatePath`/redirect).
- **E2E**: asertar texto/estado visible para el usuario. `@smoke` en el título si es seguro contra producción.

---

## 4. Coverage: configuración objetivo

En `vitest.config.ts`:

```ts
coverage: {
  include: [
    'src/lib/**/*.ts',
    'src/app/**/actions.ts',      // ← las actions SÍ se miden
  ],
  exclude: [
    'src/lib/supabase/client.ts', // wrappers triviales
    'src/components/ui/**',       // shadcn sin lógica
    // ...exclusiones actuales
  ],
  thresholds: { statements: 70, branches: 60, functions: 70, lines: 70 },
}
```

Subir thresholds **después** de completar Fase 1-2 (si los subes antes, CI queda rojo). El threshold es un trinquete: nunca bajarlo, subirlo cada vez que una fase termine.

---

## 5. Orden de ejecución

| Fase       | Contenido                                                                                                       | Resultado                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **1 (P0)** | E2E con aserciones reales + test de hidratación + unit de MFA/recovery + `supabase/middleware` + `robot-config` | Lo crítico de seguridad y la regresión conocida quedan protegidos |
| **2 (P1)** | Actions restantes (account 4, projects 3, auth 3) + validaciones projects/team + fetchers de lib                | Toda action del repo tiene tests                                  |
| **3**      | Coverage config + thresholds 70/60/70/70                                                                        | La métrica se vuelve alarma real                                  |
| **4 (P2)** | Smoke E2E por vista pública/dashboard + arreglo del nightly con `@smoke`                                        | Monitoreo nocturno útil                                           |

---

## 6. Prompts para Claude Code (uno por fase)

**Fase 1:**

> Lee TESTING-PLAN.md. Ejecuta la Fase 1: (a) corrige las aserciones débiles de los E2E listados en la sección 2 (asertar mensajes visibles, no URLs); (b) agrega el test de sanidad de hidratación descrito; (c) escribe unit tests para verifyMfaAction y verifyRecoveryAction siguiendo las convenciones de la sección 3; (d) tests para src/lib/supabase/middleware.ts y src/lib/robot-config.ts con los casos listados. Corre pnpm test y pnpm lint al final. Un commit por punto, conventional commits. No toques src/proxy.ts ni crees middleware.ts.

**Fase 2:**

> Lee TESTING-PLAN.md sección 2. Escribe los unit tests marcados P1: las 4 actions de account sin cobertura, createProject/createDocument/saveDocument, updatePasswordAction/forgotPasswordAction/magicLinkAction, y los schemas validation/projects.ts y validation/team.ts. Sigue las convenciones de la sección 3 y el patrón de mocks de dashboard/account/**tests**/actions.test.ts. pnpm test y pnpm lint al final.

**Fase 3:**

> Lee TESTING-PLAN.md sección 4. Aplica esa configuración de coverage en vitest.config.ts, corre pnpm test:coverage, y ajusta los thresholds al máximo nivel que pase con margen de 5 puntos. Actualiza la sección 4 del documento con los valores finales.

**Fase 4:**

> Lee TESTING-PLAN.md secciones 2 y 5. Agrega tests E2E @smoke de render para las vistas públicas y de dashboard listadas como P2, etiqueta los E2E existentes que sean seguros contra producción, y corrige .github/workflows/nightly.yml para correr solo --grep @smoke (el filtro actual "email is delivered" no matchea ningún test).
