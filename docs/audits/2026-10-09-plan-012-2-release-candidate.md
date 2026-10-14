# Plan 012.2 — Candidato selectivo y diagnóstico de acceso

Fecha: 2026-10-09. Preparación local; sin escrituras Cloud, instalaciones,
commit, push, merge, deploy ni cambios en protecciones Vercel.
Mercado Pago permanece como aceptación separada de Billing por aclaración del
usuario; no se exige cerrar ese proveedor para preparar este release.

## Frontera del candidato

Base exacta: `dfa228fb63e762a77beb291b828561d4547ed2e9`.
El candidato se reconstruyó desde git archive de HEAD más 27 archivos
seleccionados. `src/env.ts` se reconstruyó desde HEAD incorporando únicamente
schema y runtimeEnv de WEBHOOK_WORKER_SECRET. Se excluyeron las cuatro líneas de
LOCAL_VALIDATION y los cambios pendientes Next/Sentry/Robot/E2E de otras tareas.
No se modificó el index ni el checkout de trabajo para construir el staging.

Incluye módulos webhooks, rutas validate/worker, acciones y pruebas, tipos DB,
migración 012.2, su espejo webhook, fixtures10/15/45 y pre/postflight SQL. Las
migraciones 014 y 012.1 se incluyen separadamente como historia prerequisito
ya aplicada en Cloud. No se declara paridad completa de todos los espejos SQL
en el staging Node: su aceptación SQL corresponde al paquete de migración
revisado y a la DB aislada, no a esta compilación.

No se copiaron `.env.local` ni `.vercel`; `.env.example` es la plantilla
rastreada de HEAD. Las variables de validación contienen fixtures locales y
Supabase apunta a loopback sin servicio, no a Cloud. No se instalaron dependencias:
el staging utiliza un junction a node_modules existente para verificación local.
Este junction no forma parte de un artefacto de despliegue.

Artefactos locales ignorados bajo `.superpowers/012-2-ssrf/`:
`release-boundary.json`, `release-candidate-manifest.json`, staging
`release-candidate/`, `prepare-release-candidate.mjs` y
`check-release-candidate.mjs`. Los 27 hashes fueron contrastados por revisor
independiente; el diff selectivo de env y las exclusiones coinciden con HEAD.

## Verificación del árbol exacto

`node .superpowers/012-2-ssrf/check-release-candidate.mjs test`: **106 archivos,
1190 tests aprobados**, exit0. Este conteo pertenece al candidato selectivo,
distinto de las 1249 pruebas del árbol de trabajo que incluía otras tareas.
No sumar ambas ejecuciones como casos independientes.

`node .superpowers/012-2-ssrf/check-release-candidate.mjs typecheck`: exit0.
`node .superpowers/012-2-ssrf/check-release-candidate.mjs lint`: exit0, cero
errores y cuatro warnings preexistentes de non-null assertions en las pruebas
E2E de Mercado Pago. No se cambió ese trabajo ajeno para silenciarlos.

Build webpack aislado **[NO VERIFICADO]**: el coordinador detuvo únicamente su
proceso de compilación PID18380 ante presión de memoria comprobada: 566MiB RAM
libres y aproximadamente 1.06GiB de compromiso disponible, alrededor del 3%.
Los otros procesos Node pertenecían a Codex/MCP y se preservaron. El compilador
seguía consumiendo CPU, sin error de compilación registrado; no se atribuye
la interrupción a un defecto de código ni se afirma OOM. Runner exit4294967295.
No se lanzó una segunda compilación. Debe repetirse con recursos suficientes
antes de aprobar el release; el build canónico Turbopack continúa pendiente.

La validación usó el config de HEAD con telemetry:false temporal para evitar
telemetría de Sentry, fixtures locales y sin credenciales Cloud. El finally del
runner restauró exactamente la fuente; el empaquetador comprobó esa restauración
antes de sellar el artefacto.

## Artefacto de fuentes revisable

`node .superpowers/012-2-ssrf/package-release-candidate.mjs`: exit0.
Archivo local ignorado: `.superpowers/012-2-ssrf/iroko-012-2-source.tar`.
SHA256: `1e73cbb22b00219696f109defa1d8ee60fb1b39c3c6d8d93a3f6f19a8632ba19`.
Incluye 972 archivos: 27 seleccionados y 945 de baseline. Antes de empaquetar
se verificaron los SHA256 seleccionados y cada blob Git del resto, incluida
la configuración restaurada. El manifest local registra estas comprobaciones.
El revisor independiente confirmó nuevamente hash del tar, 972 entradas únicas,
lista exacta, 27 hashes seleccionados, diff de env y restauración a HEAD.
Excluye dependencias, salida de build, credenciales y metadata de proveedores.
Es un artefacto de fuentes para revisión, no un artefacto compilado de deploy;
no acredita paridad completa de espejos SQL ni habilita activación.

## Diagnóstico HTTP429

Una lectura HEAD de `https://project-a89lv.vercel.app/` obtuvo HTTP429 y
`X-Vercel-Mitigated: challenge`, con Server: Vercel. Es evidencia de un desafío
perimetral para ese cliente, no un error429 emitido por Next.js. No demuestra
que las solicitudes pg_net de Supabase reciban el mismo tratamiento.

Request ID para buscar en Security:
`gru1::1791587571-Sk4SfSPUfkTm5AwSSYCW23vei7J4iAou`, observado
2026-10-09 23:12:51 UTC. No se guardó el token de desafío.
Las lecturas MCP de configuración firewall/estado de ataques devolvieron
404 Seawall Config not found; la regla precisa permanece **[NO VERIFICADO]**.

Proyecto Iroko y deployment production READY/Node24 se confirmaron mediante MCP.
No se invocó el worker, creó bypass ni desactivó protección. Antes de activar,
revisar el evento y comprobar acceso M2M a la ruta exacta del worker desde el
origen autorizado. No apagar protección global para corregir este snapshot.

## Cierre y siguiente paso

`node scripts/check-docs.mjs`: 133 documentos Markdown aprobados.
`git diff --check`: aprobado. Rama conservada y sin cambios en el index.

Revisión independiente sin bloqueantes de código encontrados; restauración y
empaquetado comprobados. Pendiente completar build con recursos suficientes.
Activación Cloud requiere todavía
release exacto, acceso M2M, secretos coherentes, quiescencia y autorización de
aplicación/configuración/deploy conforme al [runbook](../runbooks/webhook-safe-delivery.md).

## Reanudación — 2026-10-11

Las tres URLs de proveedores fueron confirmadas por el usuario y registradas en
el [inventario](2026-10-09-webhook-consumer-inventory.md). Preflight en paralelo,
solo lectura: alrededor de 3.2GiB RAM física libre y 13.3GiB de compromiso libre
(41.4%). El margen virtual mejoró, pero la memoria física disponible sigue por
debajo de los 4.14GiB residentes alcanzados por la compilación anterior. No se
repitió el build para evitar reproducir la presión observada.

Se renovaron SHA256 del tar, base HEAD y 27/27 hashes seleccionados, sin cambios.
El agente confirmó configuración restaurada, sin telemetry:false temporal.
La consulta adicional de procesos fue interrumpida por el coordinador antes de
concluir; ausencia global de otros builds **[NO VERIFICADO]**. No hubo escrituras
Cloud ni instalaciones. Siguiente paso: disponer de más RAM física libre y
repetir compilación antes de considerar autorización de transición.

### Continuación posterior del 11 de octubre

Por instrucción de continuar se ensayó Turbopack con root temporal al repositorio
para resolver el junction de dependencias, cpus:1, heap V8 2048MiB y telemetría
Sentry deshabilitada temporalmente. El primer intento acotado alcanzó 12 minutos
en compile sin error registrado; configuración restaurada. Se inició después
un diagnóstico instrumentado fuera del sandbox, con muestreo CPU/memoria de su
propio árbol. Se detuvo administrativamente cuando el worker PostCSS alcanzó
3.62GiB residentes y 4.32GiB privados; no se demostró OOM ni error de código.
Configuración restaurada. El ensayo posterior transmite un heap V8 de 1536MiB
a los hijos y fija el base CSS al candidato; su log confirma cwd/base iguales
al candidato, por lo que no acredita escaneo desde el cwd del repositorio.
Agotó quince minutos sin completar compile: cancelación automática, exit1 y
ambos configs restaurados. Build no aceptado. El probe posterior de
Scanner.files sin scan agotó treinta segundos sin resultado; la participación
del caché webpack histórico sigue como hipótesis pendiente de contraste con
staging limpio. Los overrides de validación no acreditan configuración efectiva
de hosting ni cambian las fuentes del release.

Emulación renovada: ocho archivos / 167 pruebas aprobadas, incluidos los casos
de DNS/HTTPS local observables. Véanse los detalles y gates en la
[revisión de cierre](2026-10-11-plan-012-closure-review.md).

Se reempaquetaron las mismas 972 fuentes verificadas. Al restaurar configuración
cambió metadata de archivo y, por tanto, el hash del tar; no cambiaron los 27
hashes seleccionados ni los blobs baseline. El hash del 9 de octubre arriba es
histórico. El paquete actual sellado es
`.superpowers/012-2-ssrf/iroko-012-2-source-20261011-c81ef6c0.tar`, SHA256
`c81ef6c05504513e5fcb89054a4f9390d9c9ad271dc2b4fc13236e7bbefad1d7`.
Conservar esa copia sin regenerarla. Sigue siendo fuente revisable, no deploy
compilado. Entrega externa pospuesta por el usuario; no marcarla aceptada.
