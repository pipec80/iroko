# Revisión de Next.js, seguridad Supabase y arquitectura de datos — 2026-10-05

**Historical checkpoint notice — 2026-10-20:** T1 closed on October 8. Read the [current revalidation](2026-10-19-freeze-code-and-documentation-revalidation.md) and [central disposition](../exec-plans/active/freeze-remediation-register.csv) before acting; instructions below to continue T1 or defer 014-T1 are superseded. This notice does not rewrite the recorded results.

- Plan: [Plan 016](../exec-plans/active/016-nextjs-supabase-code-review.md).
- Tipo: revisión técnica de solo lectura; no certificación de producción.
- Estado: **T0 cerrado; T1 cerrada como revisión estática; T2/T3 pendientes**.
- Candidato fijado: `03ef8730560c638328c7bad12e58d50376493080`.
- Rama: `main`, con upstream `origin/main`, ocho commits locales por delante al
  fijar el candidato.
- Fecha y zona: 2026-10-05, `America/Santiago`.
- Último checkpoint: 2026-10-08; ver [cierre de cobertura](2026-10-08-plan-016-t1-closure.md).

Este informe separa lectura, ejecución y evidencia operacional. Ningún hallazgo
histórico se considera reproducido por aparecer aquí y ningún check local prueba
por sí solo el estado de Cloud.

## T0 — Candidato y entorno

El árbol estaba limpio en el SHA candidato. Los únicos cambios posteriores son
los artefactos de esta revisión y no forman parte del contenido examinado. La
advertencia de Git sobre el archivo global de ignores de la cuenta local no
alteró la salida de `git ls-files --cached --others --exclude-standard`.

| Elemento                            | Valor observado                                                           |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Git                                 | `2.55.0.windows.3`                                                        |
| Node.js                             | `v24.18.0`                                                                |
| pnpm                                | `11.22.0`                                                                 |
| Next.js                             | `16.3.5`                                                                  |
| React                               | versión resuelta por el lockfile del candidato; contraste pendiente en T1 |
| Supabase CLI                        | `2.110.0`                                                                 |
| Sentry Next.js SDK                  | `10.67.0`                                                                 |
| PostgreSQL objetivo local declarado | `17`, pendiente de contraste contra runtime local                         |

No se actualizaron dependencias, no se limpió material ajeno y no se consultaron
valores de `.env.local`.

## Inventario y trazabilidad

El [manifiesto por archivo](2026-10-05-nextjs-supabase-code-review-manifest.csv)
contiene 947 rutas únicas del candidato. Cada fila registra categoría,
responsable, hash permitido, tamaño, líneas, criterios, evidencia, checks y
estado. El CSV del manifiesto se creó después de fijar el candidato y por diseño
no se incluye a sí mismo.

| Categoría                     | Archivos |
| ----------------------------- | -------: |
| Código Next/React             |      167 |
| Librerías de aplicación       |       62 |
| Aplicación general            |        5 |
| Edge Functions                |        3 |
| SQL                           |      170 |
| Tests                         |      171 |
| Configuración de producto     |        4 |
| Configuración de herramientas |       14 |
| Configuración Supabase        |       15 |
| Automatización                |       18 |
| Documentación vigente         |      230 |
| Documentación histórica       |       31 |
| Otros archivos mantenidos     |       18 |
| Assets                        |       37 |
| Generado                      |        1 |
| Lockfile generado             |        1 |
| **Total**                     |  **947** |

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

| Frente                    | Propiedad                                                              | Contraste obligatorio                                           |
| ------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| N — Next.js/React         | 394 entradas compartidas o propias del manifiesto                      | S para acceso/exposición; D para consultas y contratos de datos |
| S — seguridad Supabase    | 384 entradas compartidas o propias                                     | D para invariantes SQL; N para sesión, cookies y caché          |
| D — arquitectura de datos | 284 entradas compartidas o propias                                     | S para privilegios; N para consumo de consultas                 |
| C — coordinación          | 421 entradas compartidas o propias, más deduplicación y checks comunes | segundo frente para todo candidato P0/P1                        |

Las cantidades se solapan cuando una entrada tiene más de un responsable. No
son porcentajes de seguridad ni madurez.

## Antecedentes que T1 debe contrastar

La auditoría del 24 de septiembre y los planes vigentes se releen como
antecedentes, no como resultados actuales:

| Referencia          | Estado al abrir Plan 016                                                      |
| ------------------- | ----------------------------------------------------------------------------- |
| RS-01 / Plan 014 T1 | permiso real del ejemplo robot pendiente; prioridad P0 conocida               |
| RS-02 / Plan 014 T2 | validación de origen Storage reproducida históricamente; corrección pendiente |
| RS-03 / Plan 014 T3 | paginación/filtros del audit log de plataforma pendientes                     |
| RS-04 / Plan 012.5  | pricing/copy sin fuente única pendiente                                       |
| RS-06 / Plan 015    | requisitos de entorno por capacidad pendientes                                |
| RS-08 / Plan 011    | alcance práctico del freeze satisfecho; escenarios MP restantes diferidos     |
| RS-09 / Plan 012    | grants, SSRF/salida, rate limiting, CSP y secretos pendientes                 |
| RS-07/12 / Plan 015 | instalación, adaptación y actualización independientes pendientes             |

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

| Fase | Estado                              | Evidencia                                                                                      |
| ---- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| T0   | Cerrada                             | SHA, herramientas, inventario, responsables, matrices, antecedentes y rutas registrados        |
| T1   | En ejecución, dos lotes registrados | cobertura prioritaria y segundas lecturas completadas; inventario exhaustivo todavía pendiente |
| T2   | Pendiente                           | ningún check de esta fase se atribuye todavía al informe                                       |
| T3   | Pendiente                           | hallazgos, fortalezas y orden de remediación todavía no consolidados                           |

### Cobertura T1 acumulada al 2026-10-07

Los tres frentes trabajaron exclusivamente sobre el candidato mediante lectura
de Git. Los números siguientes son cobertura de lectura, no porcentajes de
seguridad ni aceptación:

| Frente            | Cobertura completa demostrada                                                                | Pendiente mínimo                             |
| ----------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| N — Next.js/React | 64/394 entradas propias o compartidas; 12.220/61.773 líneas físicas                          | 330 entradas                                 |
| S — seguridad     | 58/384 entradas únicas; el segundo lote cerró o revalidó 23 filas y 22 consumidores de apoyo | 326 entradas sin lectura completa registrada |
| D — datos         | 30/284 entradas propias; además se leyeron 10 consumidores/pruebas de apoyo                  | 254 entradas                                 |

Los conjuntos se solapan. No deben sumarse para obtener cobertura global. El
primer manifiesto contó líneas no vacías; el checkpoint corrigió `line_count`
contra los bytes del snapshot Git. Por ejemplo, `public.sql` pasó de 3.209 a
4.167 líneas físicas, `billing.sql` de 991 a 1.301 y la migración Vault quedó
registrada con 179 líneas. Los estados por archivo se completarán al continuar
T1; esta corrección no cambia el SHA revisado.

El lote N cerró todas las entradas de `application`, `tool-config` y
`product-config`. El lote D cerró los once espejos `supabase/schemas/*.sql`. Los
barridos sobre el resto no se cuentan como lectura integral.

## Hallazgos confirmados por segunda lectura

No se confirmó ningún P0. Estos candidatos P1 recibieron lectura de dos frentes
o contraste equivalente de código, consumidor y prueba:

| ID   | Resultado                                | Impacto y siguiente cierre                                                                                                                                                                                                                                                                              |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-01 | Caché de ajustes sin `accountId`         | Un `QueryClient` singleton puede mostrar temporalmente metadatos de API keys, webhooks, entregas y entitlements de la cuenta anterior. Las RPC vuelven a autorizar y contienen la mutación. Particionar todas las query keys por cuenta y probar A→B con caché caliente.                                |
| S-01 | SSRF por resolución DNS en webhooks      | La validación rechaza IP privadas literales, pero entrega hostnames directamente a `pg_net`; un dominio controlado puede resolver o cambiar hacia una red interna. Mover el envío a un egreso con resolución y política de red controladas, o demostrar un control equivalente. Pertenece a Plan 012.2. |
| S-02 | Campo incorrecto al cambiar contraseña   | La acción envía `currentPassword`; `@supabase/auth-js` espera `current_password`, y el test consolida el nombre erróneo. Corregir el contrato y probar contra GoTrue local con contraseña correcta e incorrecta.                                                                                        |
| S-03 | Build sin gate positivo de upload Sentry | Con `SENTRY_AUTH_TOKEN`, un build local puede subir source maps. Añadir un flag validado, cerrado por defecto, que aplique `sourcemaps.disable: true` fuera del job autorizado. El efecto externo concreto permanece `[NO VERIFICADO]`.                                                                 |
| D-01 | Recovery sin fencing de lease            | Un worker vencido puede completar o reprogramar el claim recuperado por otro worker porque complete sólo recibe `jobId`. Añadir token/generación de lease y una prueba con dos sesiones.                                                                                                                |
| N-04 | Autosave descartado al desmontar         | Navegar antes de 800 ms cancela el único timer y pierde la última edición. Guardar antes de navegar o bloquear/advertir mientras exista estado sucio.                                                                                                                                                   |
| N-05 | Guardados fuera de orden                 | Dos saves concurrentes pueden dejar persistida una versión anterior. Añadir revisión monotónica/CAS y pruebas con respuestas invertidas y dos sesiones.                                                                                                                                                 |

## Contraste de candidatos y validación restante

| ID   | Prioridad tentativa                               | Estado                                                                                                                                                                                        |
| ---- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-06 | P1 condicionada a transición integrada            | Rerender A→B reproducido con React/jsdom y SDK simulado: datos A permanecen con B pendiente/fallida. Conservación real en impersonación todavía `[NO VERIFICADO]`.                            |
| D-03 | P1 confirmado por código, contraste S/D en lote 3 | API keys y webhooks separan `count(*)` del `INSERT` sin serialización. Reproducción concurrente con dos sesiones `[NO VERIFICADO]`.                                                           |
| D-04 | P1 confirmado por código, contraste S/D en lote 3 | FKs y RLS independientes permiten documento A/proyecto B; la Server Action también combina cuenta activa con UUID de proyecto recibido. SQL/API `[NO VERIFICADO]`; no se afirma exfiltración. |
| N-09 | P1/P2                                             | Configuración y copy prometen `production-ready`, despliegue menor a 30 minutos y SLA sin evidencia aceptada; corresponde a verdad de producto de Plan 012.5.                                 |

## Hallazgos P2 o diferidos

El lote 3 añade S-05 (agregador E2E acepta cancelled) y S-06 (Security Audit
fuera de Build.needs), confirmados por configuración con contraste S/C.
El impacto en merge depende de branch protection `[NO VERIFICADO]`; ver
[condiciones y cierre](2026-10-07-plan-016-t1-batch-3.md).

- N-02: `next-sitemap` prioriza `NEXT_PUBLIC_APP_URL`, variable no validada y
  ausente del inventario, sobre `SITE_URL`.
- N-03: los patrones de exclusión no contemplan el prefijo locale y el sitemap
  versionado publica rutas de dashboard/auth; no es bypass de autorización.
- N-07: una promesa tardía de `setAuth()` puede suscribir un canal Realtime
  después del cleanup.
- N-08: `global-error.tsx` no ofrece el callback de recuperación documentado por
  la versión instalada de Next.
- N-10: varias traducciones administrativas de francés y portugués permanecen
  en inglés.
- S-04: comparación de origen Supabase mediante `startsWith`; ya pertenece a
  Plan 014 T2.
- D-02: Stripe carece de coordinación durable/idempotency key ante checkouts
  concurrentes. Se conserva en la familia 011 diferida mientras Stripe no forme
  parte del alcance ofrecido; no bloquea el freeze actual.
- La diferencia Supabase CLI 2.109.1 en CI frente a 2.110.0 local es deuda P2
  de reproducibilidad. No demuestra divergencia de esquema.

## Checkpoint del lote 3

El [registro del lote 3](2026-10-07-plan-016-t1-batch-3.md) añade 53 rutas de lectura manual y el método alternativo de robots. El manifiesto ahora conserva 205 lecturas completas, 672 pendientes y 70 exclusiones con método alternativo. Las 152 rutas heredadas del ledger se distinguen de la lectura nueva. T1 continúa parcial. Los totales por frente de la tabla anterior son el checkpoint histórico de los dos primeros lotes y no sustituyen esta cobertura global.

## Fortalezas observadas

- El Proxy valida claims, conserva cookies y headers al componer next-intl con
  Supabase y evita cachear respuestas con sesión.
- Las RPC privilegiadas revisadas usan `SECURITY DEFINER`, `search_path` vacío,
  nombres calificados y grants acotados.
- API keys y secretos de webhook se almacenan mediante hash/Vault y los RPC
  vuelven a comprobar rol y cuenta.
- Mercado Pago reserva la intención antes del POST remoto y su reconciliación
  usa lease owner, watermark, cursores durables y precondiciones contra cambios
  concurrentes.
- Los cuatro catálogos de traducción tienen paridad de claves y ninguna hoja
  vacía; los textos no traducidos se registran aparte.
- Los once espejos SQL incluyen las redefiniciones más recientes. Esto prueba
  contenido versionado, no paridad con una base ejecutada.

## Límites y continuación

Los checkpoints anteriores son históricos. La cobertura actual es874 lecturas
completas y73 alternativas aplicadas; ver el registro de cierre2026-10-08. Build, E2E, pgTAP, Edge Functions, estado de Cloud, paridad de
migraciones y comportamiento real de DNS/egreso permanecen `[NO VERIFICADO]`.
La siguiente sesión debe continuar T1 desde el
[handoff del 7 de octubre](2026-10-07-plan-016-t1-handoff.md); no debe comenzar
Plan 014 T1 hasta terminar la cobertura y consolidación exigidas para este punto
del roadmap.

## Registro detallado de candidatos

El handoff conserva las rutas principales, el estado de contraste, la corrección
mínima y la prueba de cierre propuesta, además del ledger exacto de archivos
leídos. Las fichas completas con condición de entrada y resultado
esperado/observado pertenecen a T3 y todavía no constituyen el dictamen final.
T3 debe revalidarlas sobre el candidato y asignar cada reparación sin duplicar
Planes 011, 012 o 014.

## Continuación lotes 4–7

425 lecturas completas,452 pendientes,70 alternativas sobre947 rutas.
Robot RS-01 revalidado; nuevos contratos auth/UI/admin en registros4–7.
D-07 revocación invitación y D-08 últimoowner tienen contraste estáticoS/D,
P1 por efecto; carreras reales no ejecutadas. S-07 expiración impersonaciónP2
contrastadaC/S. Matrices:4153 opciones (17omitidas añadidas),4 decisiones;
654 reglas,111 decisiones. T1 abierta, no correcciones ni validaciónT2.

## Cierre estático de T1 —2026-10-08

[Registro de cobertura y limites](2026-10-08-plan-016-t1-closure.md):947 rutas,
874lecturas completas,73alternativas,0pending. Matrices4153/654decisiones
estaticas; checks documentales aprobados. No correcciones ni T2/T3.
