# Consolidación Git y Dependabot — 2026-10-14

Estado: preparación y revisión del candidato; integración, CI del candidato y
merge **[NO VERIFICADO]**. Este registro no acredita un nuevo deployment ni
modificaciones de Supabase Cloud. La implementación de 012.4 sigue pendiente.

## Alcance y autorización

El usuario autorizó publicar y revisar la rama de consolidación, resolver los
PR de Dependabot, integrar mediante PR y dejar `main` sincronizado y limpio
antes de una sesión dedicada a 012.4. Los secretos, material ignorado y cambios
ajenos deben preservarse. Los archivos accidentales de `%SystemDrive%/` no
pertenecen a la integración; su ubicación final debe registrarse al cerrar.

El baseline de planificación de 012.4 es el commit `6f8fb99`, sobre la rama
`codex/014-t1-robot-permissions`. El diff completo incluye trabajo anterior de
Robot, grants, webhooks, rate limiting y documentación; no debe describirse
como una implementación de 012.4.

## Inventario de PR revisados

Inventario leído mediante `gh pr list`, `gh api .../pulls/<n>/files` y logs de
Actions. Los SHA identifican las revisiones originales inspeccionadas; no son
la revisión consolidada final ni garantizan checks actuales.

| PR                                               | Revisión original                          | Actualización propuesta                                           | Decisión del candidato                                                        |
| ------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [212](https://github.com/pipec80/iroko/pull/212) | `54a7957004e7324887cb58303c9e35ec5f861981` | Next 16.3.5 → 16.3.6                                              | Sustituir por el objetivo 16.3.8 de #220; no integrar un downgrade posterior. |
| [213](https://github.com/pipec80/iroko/pull/213) | `9d3ca132d64c819f5496677b793056263a8be812` | Supabase JS 2.117.1 → 2.117.2; manifiesto `^2.116.0` → `^2.117.2` | Incluir SDK, subclientes y resolución del peer SSR en el lock.                |
| [214](https://github.com/pipec80/iroko/pull/214) | `161e61d8c22459cf75b87f1fad09ebfbc0888e29` | Testing Library DOM 10.4.1 → 10.4.2                               | Incluir manifiesto y lock, con regresiones de componentes.                    |
| [215](https://github.com/pipec80/iroko/pull/215) | `c50ee0c3c399d74c23a82fd8998a9d2d46b44ca2` | Knip 6.29.0 → 6.38.0                                              | Incluir; ejecutar análisis porque cambia parser y dependencias transitivas.   |
| [216](https://github.com/pipec80/iroko/pull/216) | `6fff48339e78d63e92f0b5f1c4de6e8bf06fb6d4` | next-intl 4.14.1 → 4.14.7                                         | Incluir; revisar SWC/FormatJS y navegación de los cuatro locales.             |
| [217](https://github.com/pipec80/iroko/pull/217) | `fbfa0d82c6ec6e8f977be3af4ad90d3fe1e6f6b8` | actions/checkout 7.0.0 → 7.0.1                                    | Mantener pin por SHA en los workflows afectados.                              |
| [218](https://github.com/pipec80/iroko/pull/218) | `82b7e17d1914bc4d9527301c019bcadc6230f1cd` | pnpm/action-setup 6.0.10 → 6.1.0                                  | Mantener pin por SHA en los workflows afectados.                              |
| [219](https://github.com/pipec80/iroko/pull/219) | `e38c5234ecec4d046ab132ace20586ce7d3abc8f` | CodeQL init 4.37.9 → 4.38.2                                       | Corregir también `analyze`, ausente del PR original.                          |
| [220](https://github.com/pipec80/iroko/pull/220) | `292be82e96c4c76a89761478178a50842732c2fa` | Next 16.3.5 → 16.3.8                                              | Incluir manifiesto, override y lock; sustituye #212.                          |

Los nueve PR originales deben cerrarse con referencia al PR consolidado
únicamente cuando su selección equivalente haya sido integrada y verificada.
Su cierre efectivo permanece **[NO VERIFICADO]** en este borrador.

Los tags oficiales se resolvieron a estos commits:

- checkout 7.0.1: `3d3c42e5aac5ba805825da76410c181273ba90b1`.
- pnpm/action-setup 6.1.0: `ea17c68df8912ef543352723c149a84f56e3d413`.
- CodeQL 4.38.2: `2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2`.

## Fallos confirmados y correcciones seleccionadas

### Next y overrides

#212 y #220 modificaban solo `package.json`. El override de
`pnpm-workspace.yaml` fijaba Next 16.3.5 y prevalecía sobre esa actualización.
El lock conservaba esa versión en el paquete raíz y consumidores Sentry,
Vercel y next-intl. El candidato cambia manifiesto y override a 16.3.8 y
regenera el lock; la aceptación exige instalación con lock congelado y
comprobar la resolución efectiva, no solo leer el manifiesto.

### CodeQL

#219 actualizaba `init` a 4.38.2, dejando `analyze` en 4.37.9. El
[log original](https://github.com/pipec80/iroko/actions/runs/36811352305/job/110206877354)
confirma incompatibilidad entre la versión del archivo de configuración y la
acción que lo carga. Ambos pasos deben usar el mismo SHA de 4.38.2. El fallo
era de configuración; ese run fallido no acredita un análisis completado.

### Auditoría de dependencias

El [Security Audit de #220](https://github.com/pipec80/iroko/actions/runs/37886974044/job/113679044215)
registró **18 vulnerabilidades: 1 critical, 8 high, 6 moderate y 3 low**.
Es un baseline histórico del árbol de ese PR, no el resultado del candidato.

La selección actual incluye Next 16.3.8, sharp 0.35.5 y overrides acotados para
fast-uri 3.1.8, brace-expansion 5.0.12, source-map-js 1.2.2 y DOMPurify 3.4.16.
Cada cambio requiere revisar el lock y ejecutar la auditoría nuevamente.

**Riesgo abierto:** `braces` 3.0.3 aparece en el árbol de herramientas de
build. La consulta al registro npm identifica 3.0.3 como última publicación;
3.0.4 no está publicada. El advisory
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
no ofrece una versión corregida publicada. La recomendación inicial de
instalar 3.0.4 se descarta; no se inventa un override ni se silencia el aviso.

`next-sitemap` se mueve a `devDependencies` porque el consumidor ejecutable es
`postbuild`, no una importación de runtime. Este cambio refleja su uso real y
reduce el alcance de la auditoría `--prod`; **no corrige la vulnerabilidad de
sus herramientas de build**. La auditoría completa y el riesgo en ese entorno
siguen abiertos hasta registrar resultado y tratamiento explícitos. No se
afirma árbol sin vulnerabilidades ni auditoría completa aprobada.

### Gitleaks: falsos positivos SQL acotados

Se verificaron cuatro hallazgos históricos como argumentos de
`has_table_privilege`: rol `authenticated`, tabla temporal de prueba y nombres
de privilegios. No son credenciales. `.gitleaksignore` incorpora únicamente
estos fingerprints exactos, sin excluir archivos, reglas o secretos futuros:

```text
b43fbfffa86dfe810f3d44657d365a9513cfbc31:supabase/tests/database/44_minimum_grants.test.sql:generic-api-key:181
b43fbfffa86dfe810f3d44657d365a9513cfbc31:supabase/tests/database/44_minimum_grants.test.sql:generic-api-key:183
b43fbfffa86dfe810f3d44657d365a9513cfbc31:supabase/tests/database/44_minimum_grants.test.sql:generic-api-key:185
b43fbfffa86dfe810f3d44657d365a9513cfbc31:supabase/tests/database/44_minimum_grants.test.sql:generic-api-key:187
```

## Estado registrado antes de publicar el candidato

El coordinador debe reemplazar cada estado pendiente solo con resultados de la
selección exacta final, conservando los fallos y limitaciones observados.

| Comprobación                                               | Estado y evidencia                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Revisión final de manifiesto, overrides y lock             | **[NO VERIFICADO]**: candidato aún en preparación.                                 |
| Instalación frozen y resolución efectiva                   | **[NO VERIFICADO]**: registrar comando, revisión y resultado.                      |
| Auditoría de producción                                    | **[NO VERIFICADO]**: registrar conteos y advisories restantes.                     |
| Auditoría completa, incluidas herramientas de build        | **[NO VERIFICADO]**; `braces` permanece como riesgo abierto.                       |
| Typecheck, lint, formato y Knip                            | **[NO VERIFICADO]** sobre la selección final.                                      |
| Unitarios, SQL, Edge Functions, build y E2E pertinentes    | **[NO VERIFICADO]**: separar checks ejecutados, omitidos y resultados históricos.  |
| Documentación, diff y escaneo de secretos                  | **[NO VERIFICADO]** sobre la revisión final.                                       |
| PR consolidado y SHA publicados                            | **[NO VERIFICADO]**.                                                               |
| CI del PR consolidado                                      | **[NO VERIFICADO]**; checks antiguos de Dependabot no lo sustituyen.               |
| Merge, cierre de originales y limpieza de ramas integradas | **[NO VERIFICADO]**.                                                               |
| `main` local/remoto sincronizados y árbol limpio           | **[NO VERIFICADO]**; registrar SHA y ubicación del material accidental preservado. |
| Deployment automático disparado por Git, si ocurre         | **[NO VERIFICADO]**; merge no equivale a aceptación funcional Cloud.               |

## Actualización del candidato local

Se actualizaron manifiesto, overrides y lock conjuntamente. Los rangos resuelven
Supabase JS 2.117.3, next-intl 4.14.9 y Knip 6.41.0; Next queda en 16.3.8 y
sharp en 0.35.5. Se corrigieron también transitivas de desarrollo publicadas
(undici, ip-address, js-yaml, hono, smol-toml, proxy-addr,
postcss-selector-parser, fast-copy y MCP SDK). Las dependencias directas
conservan su major; Knip 6.41.0 incorpora unbash 5.1.0 frente a 4.0.3,
por lo que el análisis Knip final sigue siendo obligatorio.

Resultados renovados: `pnpm audit --prod --audit-level=high` exit 0, sin avisos;
auditoría completa conserva exactamente un high (`braces`), cero critical,
moderate o low. No se ignora ese advisory. `pnpm install --frozen-lockfile
--ignore-scripts` exit 0. Instalación sin scripts no acredita pruebas de runtime.
El intento de instalar braces 3.0.4 falló porque esa versión no está publicada;
el override inexistente se retiró antes de congelar el lock.

CI usa frozen lock también para Dependabot. Su build usa el gate loopback
existente, sin token/DSN Sentry; no implementa el gate general de 012.4.
El check específico Markdown detectó 24 documentos del candidato sin formato;
se corrigieron mediante la configuración `.prettierignore-docs`, sin editar SQL
aplicado. El escaneo Gitleaks de los 23 commits pasó tras verificar las cuatro
assertions SQL arriba indicadas.

Los cuatro DB accidentales se preservaron fuera del repositorio, en
`C:\_PROYECTOS_DOCKERS\iroko-local-artifacts\20261014-accidental-systemdrive`.
No se borraron credenciales ni archivos ignorados. La primera ejecución local
Vitest sin límite saturó Windows y sufrió timeouts; fue detenida. Otras
validaciones se interrumpieron al renovar dependencias; no se cuentan como PASS.
La aceptación final y CI permanecen pendientes hasta registrar sus resultados.

## Siguiente paso

### Primer candidato publicado

PR [#221](https://github.com/pipec80/iroko/pull/221), SHA `bf72cd4`.
CI renovado aprobó Quality (typecheck, lint, formato de código y Knip),
112 archivos/1281 unitarios, 49 archivos/999 assertions pgTAP, Database Types,
10 pruebas Edge, CodeQL, Gitleaks y auditoría de producción. El preview Vercel
quedó READY; ese build no constituye aceptación funcional del deployment.
El primer check Documentation aprobó enlaces (147 documentos) y design-system,
pero falló formato en dos documentos históricos renombrados de billing.
Se corrigió solo su formato y se amplió la comprobación a la selección completa
de Markdown versionado usada por CI. No se modificaron migraciones aplicadas.
Los checks del candidato sustituto, SQL/E2E/build y merge deben observarse antes
de aceptar integración; consultar el PR para el SHA y estado definitivos.

Completar la aceptación del candidato y su PR; resolver los checks antes del
merge y documentar el riesgo de build pendiente. Solo después partir una
sesión desde `main` sincronizado para ejecutar el
[plan 012.4](../exec-plans/active/012-4-csp-and-secrets.md). Este registro no
cierra las tareas de implementación de ese plan ni los
[seguimientos de 012.3](2026-10-14-plan-012-3-follow-ups.md).
