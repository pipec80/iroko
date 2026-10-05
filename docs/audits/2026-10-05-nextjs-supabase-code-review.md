# Revisión de Next.js, seguridad Supabase y arquitectura de datos — 2026-10-05

- Plan: [Plan 016](../exec-plans/active/016-nextjs-supabase-code-review.md).
- Tipo: revisión técnica de solo lectura; no certificación de producción.
- Estado: **T0 cerrado; T1 en ejecución; T2/T3 pendientes**.
- Candidato fijado: `03ef8730560c638328c7bad12e58d50376493080`.
- Rama: `main`, con upstream `origin/main`, ocho commits locales por delante al
  fijar el candidato.
- Fecha y zona: 2026-10-05, `America/Santiago`.

Este informe separa lectura, ejecución y evidencia operacional. Ningún hallazgo
histórico se considera reproducido por aparecer aquí y ningún check local prueba
por sí solo el estado de Cloud.

## T0 — Candidato y entorno

El árbol estaba limpio en el SHA candidato. Los únicos cambios posteriores son
los artefactos de esta revisión y no forman parte del contenido examinado. La
advertencia de Git sobre el archivo global de ignores de la cuenta local no
alteró la salida de `git ls-files --cached --others --exclude-standard`.

| Elemento | Valor observado |
| --- | --- |
| Git | `2.55.0.windows.3` |
| Node.js | `v24.18.0` |
| pnpm | `11.22.0` |
| Next.js | `16.3.5` |
| React | versión resuelta por el lockfile del candidato; contraste pendiente en T1 |
| Supabase CLI | `2.110.0` |
| Sentry Next.js SDK | `10.67.0` |
| PostgreSQL objetivo local declarado | `17`, pendiente de contraste contra runtime local |

No se actualizaron dependencias, no se limpió material ajeno y no se consultaron
valores de `.env.local`.

## Inventario y trazabilidad

El [manifiesto por archivo](2026-10-05-nextjs-supabase-code-review-manifest.csv)
contiene 947 rutas únicas del candidato. Cada fila registra categoría,
responsable, hash permitido, tamaño, líneas, criterios, evidencia, checks y
estado. El CSV del manifiesto se creó después de fijar el candidato y por diseño
no se incluye a sí mismo.

| Categoría | Archivos |
| --- | ---: |
| Código Next/React | 167 |
| Librerías de aplicación | 62 |
| Aplicación general | 5 |
| Edge Functions | 3 |
| SQL | 170 |
| Tests | 171 |
| Configuración de producto | 4 |
| Configuración de herramientas | 14 |
| Configuración Supabase | 15 |
| Automatización | 18 |
| Documentación vigente | 230 |
| Documentación histórica | 31 |
| Otros archivos mantenidos | 18 |
| Assets | 37 |
| Generado | 1 |
| Lockfile generado | 1 |
| **Total** | **947** |

Setenta entradas están excluidas de lectura manual línea por línea: assets,
material histórico, lockfile y tipos generados. Todas registran motivo y método
alternativo. El único hash omitido corresponde a
`supabase/migrations/20260721000000_webhook_secrets_vault.sql`; la omisión aplica
la regla preventiva de no versionar hashes de archivos identificados como
secretos o credenciales. Su contenido SQL sí permanece dentro de la lectura D/S.

La [matriz de configuración](2026-10-05-nextjs-supabase-code-review-config-matrix.csv)
registra 4.136 declaraciones no vacías de 62 archivos de configuración,
automatización y reglas de exclusión. La extracción conserva origen y línea;
omite los valores de ejemplo de `.env.example`. Consumidor, efecto, referencia,
precedencia y decisión están pendientes de la lectura responsable en T1.

La [matriz de reglas](2026-10-05-nextjs-supabase-code-review-rules-matrix.csv)
registra 654 declaraciones normativas candidatas de 17 fuentes vigentes. La
extracción amplia evita omisiones silenciosas; T1 debe distinguir regla real,
contexto, ejemplo y afirmación histórica antes de asignar una decisión.

## Responsables de lectura

| Frente | Propiedad | Contraste obligatorio |
| --- | --- | --- |
| N — Next.js/React | 394 entradas compartidas o propias del manifiesto | S para acceso/exposición; D para consultas y contratos de datos |
| S — seguridad Supabase | 384 entradas compartidas o propias | D para invariantes SQL; N para sesión, cookies y caché |
| D — arquitectura de datos | 284 entradas compartidas o propias | S para privilegios; N para consumo de consultas |
| C — coordinación | 421 entradas compartidas o propias, más deduplicación y checks comunes | segundo frente para todo candidato P0/P1 |

Las cantidades se solapan cuando una entrada tiene más de un responsable. No
son porcentajes de seguridad ni madurez.

## Antecedentes que T1 debe contrastar

La auditoría del 24 de septiembre y los planes vigentes se releen como
antecedentes, no como resultados actuales:

| Referencia | Estado al abrir Plan 016 |
| --- | --- |
| RS-01 / Plan 014 T1 | permiso real del ejemplo robot pendiente; prioridad P0 conocida |
| RS-02 / Plan 014 T2 | validación de origen Storage reproducida históricamente; corrección pendiente |
| RS-03 / Plan 014 T3 | paginación/filtros del audit log de plataforma pendientes |
| RS-04 / Plan 012.5 | pricing/copy sin fuente única pendiente |
| RS-06 / Plan 015 | requisitos de entorno por capacidad pendientes |
| RS-08 / Plan 011 | alcance práctico del freeze satisfecho; escenarios MP restantes diferidos |
| RS-09 / Plan 012 | grants, SSRF/salida, rate limiting, CSP y secretos pendientes |
| RS-07/12 / Plan 015 | instalación, adaptación y actualización independientes pendientes |

La revisión puede confirmar, acotar o descartar esos candidatos. No puede
marcarlos corregidos sin una implementación y su evidencia de cierre.

## Entorno y rutas de pruebas acordadas

T2 usará estas rutas, siempre sobre el mismo SHA o registrando el cambio:

1. Checks estáticos y unitarios sin escritura Cloud: `pnpm typecheck`,
   `pnpm lint`, `pnpm test` y `node scripts/check-docs.mjs`.
2. Edge Functions: `pnpm test:functions` solo después de confirmar que Deno y
   sus dependencias ya están disponibles y que los dobles no envían correo ni
   llaman proveedores.
3. Base de datos: primero `pnpm supa:status` y comprobación del proyecto y
   contenedores locales. `pnpm supa:lint` y `pnpm supa:test` solo contra una
   instancia local identificada como desechable. No se ejecutarán reset,
   migraciones, generación sobre el archivo versionado ni comandos `--linked`.
4. Build/E2E: bloqueados en el candidato actual hasta aplicar el mecanismo de
   Sentry descrito abajo y confirmar que Playwright no toma
   `PLAYWRIGHT_BASE_URL` remoto ni credenciales Cloud desde `.env.local`.

Los resultados históricos de 99 archivos y 1.032 tests unitarios verdes tras
la reorganización documental son contexto, no la ejecución T2 del candidato.

## Precondición de Sentry para build y E2E

`next.config.ts` entrega `authToken: process.env.SENTRY_AUTH_TOKEN` a
`withSentryConfig` y no expone un interruptor local de revisión. Playwright
carga `.env.local` por su cuenta y su servidor local ejecuta primero
`pnpm build`; por ello borrar una variable heredada no demuestra que el build no
la recargue.

En `@sentry/nextjs` 10.67.0, tanto el tipo instalado como la implementación de
Webpack indican que `sourcemaps.disable: true` impide habilitar y subir source
maps. Ese es el mecanismo aceptado para esta revisión. El candidato no permite
activarlo sin editar `next.config.ts`; Plan 016 prohíbe cambiar código o tests.
En consecuencia, build, analyze y E2E permanecen **[NO VERIFICADO]** hasta que
un plan de corrección añada un switch seguro y acotado o se prepare una copia
aislada del candidato cuya única diferencia esté registrada y revisada. No se
usará un token inválido como prueba de ausencia de efectos externos.

## Progreso

| Fase | Estado | Evidencia |
| --- | --- | --- |
| T0 | Cerrada | SHA, herramientas, inventario, responsables, matrices, antecedentes y rutas registrados |
| T1 | En ejecución | lectura integral y contraste por N/S/D pendientes |
| T2 | Pendiente | ningún check de esta fase se atribuye todavía al informe |
| T3 | Pendiente | hallazgos, fortalezas y orden de remediación todavía no consolidados |

## Hallazgos

Pendientes de T1. Esta sección no replica automáticamente los hallazgos de la
auditoría anterior.

## Fortalezas observadas

Pendientes de T1. La existencia de código, pruebas o políticas no se contará
como evidencia operacional sin su contraste correspondiente.
