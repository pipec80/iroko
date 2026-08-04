# Codex Master Prompt — Iroko Stabilization Orchestrator

Copy the prompt below into Codex from the repository root. Start in planning/ask mode. The first run must inspect and plan only; it must not write code or modify production.

---

Actúa como Principal Software Engineer, Senior PostgreSQL/Supabase DBA, Security Engineer, SRE y QA Lead para el repositorio `pipec80/iroko`.

## Objetivo

Estabilizar Iroko y cerrar de forma verificable los hallazgos documentados antes de integrar PostHog.

No intentes resolver todo en una sola ejecución. Trabaja por fases y por un único plan activo cada vez. En esta primera ejecución realiza únicamente reconocimiento, clasificación y plan; no modifiques archivos todavía.

## Lee primero

En este orden:

1. `AGENTS.md` (local, no versionado — si no existe en tu checkout, sáltalo)
2. `README.md`
3. `ROADMAP.md` (fuente de verdad detallada de arquitectura y fases; no existe `ARCHITECTURE.md`)
4. `SECURITY.md`
5. `docs/index.md`
6. `docs/audits/2026-08-02-full-platform-audit.md`
7. todos los archivos de `docs/exec-plans/active/`
8. `docs/quality/definition-of-done.md`
9. `docs/quality/testing-strategy.md`
10. `package.json`
11. `pnpm-workspace.yaml`
12. `pnpm-lock.yaml`
13. `next.config.ts`
14. `src/proxy.ts`
15. `src/lib/supabase/middleware.ts`
16. `.github/workflows/`
17. `supabase/config.toml`
18. `supabase/migrations/`
19. `supabase/functions/`
20. pruebas Vitest, Playwright y pgTAP relacionadas.

La rama actual, el lockfile, las migraciones y la configuración ejecutable son la fuente de verdad. La auditoría es evidencia histórica y debe revalidarse.

## Reglas críticas

- No hagas push directo a `main`.
- No mezcles varios planes en una misma rama o PR.
- No modifiques Supabase Cloud, Vercel Production, Sentry ni proveedores externos sin autorización humana explícita.
- No ejecutes migraciones destructivas.
- No inventes SQL de migraciones faltantes.
- No ejecutes `supabase db push --linked` mientras exista drift.
- No imprimas ni guardes secretos, tokens, URLs firmadas, datos personales o credenciales.
- No debilites RLS, MFA, CSP, rate limiting, auditoría ni aislamiento multi-tenant.
- No ocultes errores ni relajes tests para obtener CI verde.
- No elimines índices solo porque un advisor diga `unused`.
- No agregues PostHog hasta cerrar todos los P0.
- No agregues Clerk, Pinecone o Upstash sin necesidad documentada y medible.
- No marques como pasada una validación que no ejecutaste.
- Detente al terminar una fase; no comiences automáticamente la siguiente.

## Fase 0 — reconocimiento obligatorio

Sin modificar archivos:

1. Ejecuta y reporta:
   - `git status --short --branch`
   - commit actual;
   - remotos y rama upstream;
   - versiones de Node, pnpm, Supabase CLI y Git.
2. Inspecciona los archivos indicados.
3. Verifica versiones declaradas y resueltas de Next.js/React/pnpm/Node.
4. Inspecciona workflows y distingue checks requeridos de checks no bloqueantes.
5. Revisa tests omitidos y su riesgo.
6. Compara migraciones locales con el estado linked solo mediante comandos de lectura.
7. Inspecciona el worker de email, cron y configuración por entorno.
8. Inspecciona PR #91 o la rama local correspondiente si está disponible.
9. Clasifica cada hallazgo del audit como:
   - confirmado;
   - corregido previamente;
   - parcialmente corregido;
   - no reproducible;
   - requiere acceso externo;
   - nuevo hallazgo.
10. Detecta cualquier cambio ocurrido después del commit base de la auditoría.
11. Produce una tabla de dependencias y riesgos.
12. Recomienda cuál plan ejecutar primero.
13. Detente y solicita aprobación antes de escribir código.

## Orden de ejecución autorizado tras aprobación

### Plan 001 — Supabase migration drift

- recuperar SQL exacto, nunca aproximado;
- conservar versiones Cloud;
- no alterar production ni tracking manualmente;
- probar reset limpio, pgTAP y tipos;
- demostrar que local/linked quedan alineados.

### Plan 002 — email worker Cloud

- probar worker y seguridad de invocación;
- preparar despliegue reproducible;
- separar URLs local/Cloud;
- validar estado HTTP real de pg_net;
- probar entrega y fallo controlado;
- no desplegar sin aprobación.

### Plan 003 — Sentry

- revisar/rebasar PR #91;
- confirmar exclusión de `/sentry-tunnel`;
- confirmar inicialización cliente única;
- validar browser/server event y App Router span en preview;
- documentar privacidad y cuotas.

### Plan 004 — Next.js

- elegir una versión única y compatible;
- alinear package, overrides y lockfile;
- ejecutar instalación congelada y suite completa;
- comprobar versión usada en preview.

### Plan 005 — quality hardening

Dividir en PRs pequeños: documentación, caché, CI inmutable, artefactos, impersonación E2E, WebKit/Axe/contract tests y consistencia de configuración.

### Plan 006 — PostHog

Solo después de P0/P1 aplicable. Diseñar primero taxonomía, consentimiento, identidad/grupos, PII, impersonación, CSP/proxy y pruebas. Empezar sin Session Replay y con autocapture restringido/deshabilitado.

## Forma de trabajo por plan

Antes de implementar un plan aprobado:

1. actualiza `main` y crea una rama específica;
2. revalida el hallazgo;
3. presenta archivos previstos, riesgos, pruebas y aprobaciones;
4. realiza cambios mínimos y coherentes;
5. agrega tests de regresión/seguridad;
6. ejecuta checks;
7. revisa el diff completo y busca secretos;
8. actualiza plan, audit y runbook;
9. prepara PR sin fusionarlo;
10. detente.

## Validación

Descubre los scripts actuales desde `package.json`. Como mínimo para cambios de aplicación intenta ejecutar:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

Para base de datos agrega los comandos vigentes de Supabase local, pgTAP, generación de tipos y comparación de migraciones. Para flujos críticos agrega Playwright.

Reporta cada comando con:

- comando exacto;
- resultado/exit code;
- resumen relevante;
- si no se ejecutó, motivo y riesgo residual.

## Salida requerida de esta primera ejecución

Sin escribir código, entrega:

1. rama y commit inspeccionados;
2. estado del working tree;
3. stack/versiones efectivas;
4. tabla completa de hallazgos revalidados;
5. diferencias respecto de la auditoría;
6. dependencias entre planes;
7. recomendación del primer plan;
8. comandos/pruebas previstos;
9. acciones externas que requieren aprobación;
10. pregunta final solicitando autorización para comenzar exclusivamente ese primer plan.

No implementes nada en esta primera ejecución.
