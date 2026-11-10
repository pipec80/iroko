# Plan 015 — evidencia de base reutilizable

## Veredicto vigente — 2026-11-10

**Aceptado localmente el núcleo reutilizable, con alcance acotado por el
propietario:** páginas públicas, registro/confirmación/acceso y una acción útil
persistida en área privada; permisos y aislamiento siguen siendo obligatorios.
Los checkpoints inferiores son históricos y no sustituyen este veredicto.

| Resultado final | Evidencia |
| --- | --- |
| Circuito útil sin ventas | Signup y confirmación Mailpit, onboarding sin plan, dashboard; registro con archivo privado, recarga y bytes correctos; notificación persistida; browser PASS y 0 errores de consola |
| Adaptación | Tilia, Records, cuatro traducciones y contrato de composición; sin editar navegación compartida para añadir la entrada; SQL12/12, unit59/59, tipos y lint enfocado PASS |
| Actualización real | Versión anterior de `storage.ts` desde base032f1a3 → corrección014 del candidato; dos builds productivos PASS; registro, archivo, marca y módulo conservados; móvil, billing activo y cuatro páginas públicas PASS, consola0 |
| Operación backend acotada | Cola/notificaciones SQL17/17 y worker Deno10/10; rechazos, reintento, agotamiento y cierre de conexión con proveedor simulado; no demuestra entrega programada real a Resend |
| Recuperación final | Hashes offline de2228 archivos DB y1 Storage idénticos; arranque desde checkout original PASS; conteos1 usuario/2 cuentas/1 objeto/179 migraciones; tabla sample_records ausente; servicios principales saludables |
| Revisión | Revisión independiente final sin nuevos P0/P1 por inspección; acepta núcleo local con los límites siguientes |

**Límites con dueño:** 016 conserva la aceptación integrada y paridad Cloud;
011/016 conservan pago real y callbacks PSP usando la matriz ya existente.
016 conserva entrega programada del worker, alerta y recuperación con proveedor
real, y comprobación runtime de expiración del enlace firmado tras revocación.
SQL verifica que la revocación bloquea nueva emisión/lectura; un enlace ya emitido
puede durar60 segundos. La página billing activa se probó sin credenciales de
pago: el catálogo registró `provider_unavailable`, sin fallback ni compra.
Estos límites no reciben PASS por el cierre local015. No hubo commit, push,
merge, deploy ni escritura Cloud. Los respaldos originales y el derivado se
conservan ignorados; los datos del ensayo ya no están en el stack oficial.

## Checkpoint local — 2026-11-06

Estado: **T0/T1 implementados y verificados de forma focalizada; T2 documentado;
T3 [NO VERIFICADO]**. El árbol sigue en `codex/014-images-platform-audit`,
base `032f1a30794241cebc97e0ccd32b48d836110475`, con cambios previos de
014 y de planificación preservados. SHA por sí solo no identifica este
candidato. No hubo commit, push, deploy ni escritura Cloud.

| Alcance | Evidencia ejecutada ahora | Límite |
| --- | --- | --- |
| T0 navegación/composición | RED 5 fallos reales/17; GREEN 30/30 en tres archivos; regresión final 22/22 junto a `env.test.ts` | Navegador desktop/móvil y extensión real pendientes T3 |
| T1 sin nuevas compras | RED 11 fallos/106; GREEN 106/106 en nueve archivos; controles analytics/callback/worker 49/49 | Build, signup y recorrido billing=false en derivado pendientes T3 |
| T1 SQL DB-03 | PgTAP RED: caso 10 devolvió `true` para cuota ausente; migración local `20261106170000_plan_limit_fail_closed.sql`; pgTAP GREEN 21/21 | Paridad linked/Cloud [NO VERIFICADO]; error de lectura específico pendiente de prueba |
| Calidad | `pnpm typecheck` PASS; `pnpm lint` PASS, 0 errores/35 warnings; `git -c core.whitespace=cr-at-eol diff --check` PASS | No es gate de instalación independiente |
| T2 | `node scripts/check-docs.mjs` PASS, 193 Markdown; Prettier de cinco documentos PASS; revisión independiente sin nuevo P0/P1 | Recetas aún no ejecutadas |

La revisión independiente señaló el fail-open de cuota como P1 de aceptación;
la migración y el pgTAP lo cerraron en el stack local. No encontró otro P0/P1
nuevo por lectura estática del código T0/T1. `withinLimit` de TypeScript sólo
tiene consumidores de test en el árbol actual; su contrato histórico divergente
no se usa como gate productivo. Los callback/worker mantienen sus rutas y
validación, pero no se comprobó operación real de proveedor.

El stack local identificado es `saas-boilerplate`, API `127.0.0.1:54321`, DB
`127.0.0.1:54322`, Studio `54323`, Mailpit `54324`. Docker mostró saludables
DB, Auth, Storage, Realtime y otros contenedores. Tras pgTAP hay 179 migraciones
locales, 1 usuario Auth, 2 cuentas y 1 objeto Storage; son conteos, no una
garantía de preservación. DB usa el volumen `supabase_db_saas-boilerplate` y
Storage usa `supabase_storage_saas-boilerplate`. La presencia de datos impide
tratar un reset como desechable por defecto.

## Ejecución T3 parcial — 2026-11-06

El propietario autorizó instalación, respaldo, reset y restauración local. El
derivado quedó en la ruta indicada abajo, con 1204 archivos mantenidos copiados,
`.git` propio y sólo `.env.example` de las plantillas. `pnpm install
--frozen-lockfile` pasó en 3 min 59,5 s y el lockfile conservó su SHA-256;
`node_modules` es un directorio propio, no junction. Supabase CLI v3 inició el
stack local desde ese derivado; descargó imágenes faltantes y luego el reset
local pasó con 179 migraciones, 0 usuarios, 0 cuentas y 0 objetos.

**Respaldo anterior al reset.** Con el stack detenido y `backup=true`, se
archivaron los volúmenes DB y Storage mediante la imagen local
`public.ecr.aws/supabase/postgres:17.6.1.141` y `tar` BusyBox. Archivos en
`backups/2026-11-06-t3`: `db.tar` (113399808 bytes, SHA-256
`2128BE70C4FCF97816A364AF3867ED0A16126CFC4806E6FDB6F8806C9E86C4CB`)
y `storage.tar` (351232 bytes, SHA-256
`2CC039A9171B81BC094C06A32B1C24614E6A6139771B87C3030FD7567EA98974`).
Se restauraron en `iroko015_restore_db` y `iroko015_restore_storage`: hashes de
2228 archivos DB y 1 archivo Storage idénticos a los originales. PostgreSQL
arrancó desde el volumen restaurado sin red ni puertos y confirmó 1 usuario,
2 cuentas, 1 objeto Storage y 179 migraciones. Sólo después se retiraron los
dos volúmenes temporales y se ejecutó reset. Los archivos de respaldo se
conservan hasta la devolución verificada del estado original.

**Primera configuración, sin ventas:** `billing=false` sólo en el derivado;
`.env.local` ignorado desde claves del stack local, Mailpit y secreto nuevo de
impersonación, sin secretos de pago. `pnpm build` fuera del sandbox pasó
(compilación, TypeScript, sitemap). El primer intento de build dentro del
sandbox quedó detenido en compilación y se interrumpió; no se considera PASS.
Browser real: signup/confirmación en Mailpit, onboarding de tres pasos sin
plan, dashboard con cuenta owner y ruta directa billing mostrando 404.
Conteos posteriores: 1 usuario Auth, 2 cuentas y 2 memberships. El navegador
mostró prefetch `https://localhost` fallidos por CSP: test `src/proxy.test.ts`
RED 1/38, corrección acotada a validación loopback, GREEN 38/38. Reconstrucción
y comprobación browser pendientes; este defecto no se atribuye a billing.

La extensión derivada usa URLs firmadas de Storage con 60 segundos de vida.
Revocar una membresía impide emitir una URL nueva; una URL ya emitida sigue
siendo un bearer válido hasta su expiración. La aceptación de revocación debe
probar ambos momentos y no prometer invalidación inmediata del enlace previo.

La configuración con billing activo, extensión neutral, actualización y
restauración final aún están **[NO VERIFICADO]**. No se afirma aceptación T3.

## Reanudación — 2026-11-10

La extensión existe sólo en el derivado: marca ficticia Tilia, módulo Records,
tabla con RLS, acción validada, archivo privado y notificación. La migración
local `20261106220000_sample_records.sql` se aplicó como única pendiente.
`54_sample_records.test.sql` pasó 12/12 (roles, otra cuenta, revocación y lectura
Storage); los tests de disponibilidad/composición/proxy pasaron 59/59.
Tipos regenerados, `pnpm typecheck` PASS y ESLint enfocado PASS sin salida de
errores. El módulo desactivado bloquea tanto ruta como acción.

Se prepara el ensayo de actualización con la versión real anterior de
`src/lib/storage.ts` del SHA base y la corrección014 existente en el candidato.
El objetivo es conservar un registro y sus bytes privados, además de marca y
extensión, tras aplicar esa corrección. Todavía no se declara este resultado.

## Procedimiento autorizado y destino T3

**Destino de código:**
`C:\_PROYECTOS_DOCKERS\saasboilerplate\.superpowers\sdd\015-reusable-foundation-acceptance\derived`.
**Respaldo:** directorio hermano `backups\<fecha-hora>` en ese mismo árbol
ignorado. **Destino de datos:** sólo stack local `saas-boilerplate` y sus dos
volúmenes nombrados arriba. No se operan linked/Cloud ni otros proyectos.

1. Congelar manifiesto del candidato: base Git, `git status --porcelain`,
   hashes de archivos mantenidos staged/unstaged/untracked pertinentes y
   lockfile. Copiar fuentes y lockfile a `derived` sin `.env*` reales,
   `node_modules`, artefactos o `.git` ajena; conservar `.env.example`.
   Instalar allí con `pnpm install --frozen-lockfile`, sin junction. Comprobar
   versión y hash de lockfile. La instalación requiere autorización explícita
   de dependencias según `AGENTS.md`.
2. Antes del reset, detener escrituras y stack oficial con `pnpm supa:stop`.
   Archivar **en frío** ambos volúmenes nombrados con contenedores auxiliares
   de la imagen Postgres ya instalada, montando origen read-only y el directorio
   de respaldo como destino. El volumen DB cubre Auth, perfiles, membresías,
   Vault y la historia de migraciones; el volumen Storage cubre bytes. Conservar
   además manifiesto, conteos previos, tamaños, hashes SHA-256 de los dos
   archivos y listado de entradas. No copiar ni registrar secretos en docs.
3. Restaurar cada archivo en **volúmenes temporales nuevos**, distintos de los
   oficiales, y comparar listado y hashes de contenido. Arrancar un PostgreSQL
   temporal sólo desde el volumen DB restaurado, sin exposición pública, y
   comprobar arranque y conteos de Auth/cuentas/objetos/migraciones; verificar
   un byte de Storage desde el volumen temporal. Si la restauración falla,
   detener T3 sin resetear el original. Retirar únicamente contenedores y
   volúmenes temporales creados por esta prueba tras registrar el resultado.
4. Sólo tras restauración comprobada y aprobación específica de reset: iniciar
   stack oficial, ejecutar `pnpm supa:reset` local desde `derived` y comprobar
   historia/esquema. Ejecutar las dos configuraciones, extensión, update y
   recorridos de Plan015 con datos ficticios. No tocar datos de otros proyectos.
5. Para devolver el estado previo: parar stack, restaurar **ambos** archivos
   validados a los volúmenes oficiales como una pareja consistente, reiniciar
   stack y comparar conteos, historia y bytes con el manifiesto. Esta sustitución
   requiere autorización específica porque reemplaza datos locales. Retener el
   respaldo hasta confirmación de recuperación; no eliminar fuentes pendientes
   ni credenciales del checkout original.

La imagen y la ruta de respaldo se fijaron y la recuperación a volúmenes
temporales se verificó antes del reset. Falta ejecutar la extensión, el update,
la segunda configuración y la devolución de los dos volúmenes originales con
comparación final. Hasta entonces T3 permanece **[NO VERIFICADO]** y no se
declara «reutilizable demostrado».
