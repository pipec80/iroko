# Plan 012 — Revisión de cierre de 012.1 y continuación de 012.2

Fecha: 2026-10-11, America/Santiago. Revisión especializada en paralelo y
coordinación local. Sin escrituras Cloud, instalaciones, commits, push, merge
ni deploy. Se preservó el árbol pendiente.

## Veredicto 012.1

**Cerrado en su alcance de grants: implementación, aceptación SQL local y
aplicación/postflight Cloud. No equivale a aceptación funcional Cloud completa.**

Lectura MCP renovada 2026-10-11 21:07:48 Chile (2026-10-12 00:07:48 UTC),
proyecto `rgrxlygtmvavqzkjyywg`:

- 161 migraciones, última `20261008130000`; migración de grants presente.
- Diez firmas objetivo sin EXECUTE de PUBLIC. Excepciones conservadas:
  anon/get_user_role y authenticated/get_user_role/user_is_member.
- 34 tablas y 272 combinaciones de rol/privilegio: cero TRUNCATE, REFERENCES,
  TRIGGER o MAINTAIN efectivos restantes para anon/authenticated.
- USAGE private: authenticated permitido, anon denegado. Defaults postgres
  public/billing sin los cuatro privilegios administrativos para roles API.
- Controles positivos de ACL Auth hook, memberships/MFA, Realtime SELECT/INSERT
  y consumidores service_role aprobados. Son permisos efectivos, no circuitos
  funcionales ejecutados.
- Advisors: 57 WARN y 3 INFO, misma distribución y clasificación registradas.
  Esta revisión no afirma comparación nueva de cada detalle normalizado.

Evidencia local ignorada: `.superpowers/012-2-ssrf/grants-closure-1011.json`.
Las 44 suites SQL/884 aserciones son aceptación histórica del
[ensayo](2026-10-09-plan-012-1-history-rehearsal.md); no se repitieron en Cloud.

Pendiente: aceptación funcional Cloud de signup, Billing/webhooks,
notificaciones, Storage y Realtime. UPDATE de secuencias sigue fuera del alcance
aprobado; backup/PITR es un límite operativo no verificado. Los cambios locales
siguen pendientes de integración Git; esta revisión no autoriza commit/merge.
No se encontró una nueva corrección de grants que deba aplicarse ahora.

Siguiente paso recomendado: conservar el cierre técnico de grants y coordinar
los circuitos funcionales como aceptación operativa separada, sin atribuirles
los resultados de catálogo ni bloquear 012.2 por Mercado Pago.

## Preflight 012.2 renovado

En la misma lectura Cloud: cero endpoints, cero entregas, cero solicitudes
en cola asociadas a entregas webhook. Cron legacy activo cada minuto;
`webhook_worker_url` y `webhook_worker_secret` todavía ausentes. Migración
`20261009180000` no aplicada. Esto no demuestra quiescencia futura o ausencia de
tráfico en vuelo durante una ventana de transición.

Vercel sigue reportando proyecto Iroko, Node24 y el deployment production READY
`dpl_9VJu3v91Csf8qJXkTmpWaPgQijAG`. Dominio confirmado/verificado sin redirect;
SSO solo previews. HEAD raíz: HTTP429 con X-Vercel-Mitigated: challenge.
Request ID: `gru1::1791763671-63TtgGlMln2EYCE9JJhf1VlELRsEaMEe`.
MCP firewall devolvió 404 Seawall Config not found. Regla precisa y acceso
Supabase → worker **[NO VERIFICADO]**; no se probaron bypasses ni POST Cloud.

Artefactos sanitizados locales: `cloud-preflight-1011.json` y
`transition-gates-1011.json` bajo `.superpowers/012-2-ssrf/`.

## Decisión sobre la prueba externa

El usuario indicó dejar el receptor/entrega externa para el final y continuar
con emulación o revisión de logs. Se adopta ese orden: Mercado Pago entrante
es un protocolo separado y no se usa como receptor del sender saliente.
Con cero entregas salientes Cloud no hay logs históricos que prueben recepción
ni HMAC. La emulación local no cierra el gate funcional Cloud.

Emulación renovada sobre el candidato: ocho archivos / 167 pruebas aprobadas,
incluidos 16 casos reales UDP DNS/HTTPS locales. Comando:
`node .superpowers/012-2-ssrf/emulate-candidate-1011.mjs`, exit0. El intento
inicial dentro del sandbox falló con EPERM al renombrar caché temporal de Vitest,
sin ejecutar tests; repetición autorizada fuera del sandbox aprobada. No se
usaron credenciales Cloud ni destinos externos. El build Turbopack inicial agotó
12 minutos en compile, sin error registrado, y restauró config. El siguiente
intento instrumentado se detuvo administrativamente por presión de memoria:
el worker PostCSS alcanzó 3.62GiB residentes y 4.32GiB privados. No hubo un
error de compilación ni OOM demostrado; configuración restaurada.

Un tercer ensayo acotado transmite el límite V8 de 1536MiB a los hijos y fija
temporalmente el directorio de escaneo CSS al candidato. El log confirmó
`cwd == base == candidato`: no respalda la hipótesis de un cwd ampliado al
repositorio. Alcanzó el límite de quince minutos, sin completar compile;
cancelación automática UTC 2026-10-12 00:57:18, exit1 y restauración de ambos
configs confirmada. El límite V8 no contuvo todo el crecimiento del worker.
Ambos overrides son diagnósticos de validación, no cambios del release sellado.
**Build no aceptado.**

El staging conserva aproximadamente 1.017GB de caché webpack histórica. Su
participación en el escaneo no está demostrada: el probe nativo de
`Scanner.files`, sin llamar `scan()`, agotó treinta segundos sin resultado.
No se observó un OOM en ese probe. El contraste con fuentes selladas extraídas
a un staging nuevo verificó los 972 archivos y retornó en 1.15 segundos: 960
archivos elegibles, cero packs, directorios ignorados o archivos fuera de base.
Ese staging no tenía cachés ni junction de dependencias; la diferencia ambiental
es reproducible, pero no distingue aún esas dos causas. Evidencia ignorada:
`tailwind-scanner-clean-comparison-1011.json`. No cambiar el universo CSS del
producto para obtener un resultado verde.
La comparación adicional con solo el junction no pudo ejecutarse: EPERM al
crearlo dentro del sandbox y reintento elevado interrumpido sin resultado.
No existe resultado comparativo ni se confirmó la creación del junction en
ese reintento. La causa exacta del bloqueo CSS sigue **[NO VERIFICADO]**.

Antes de activar cron se requiere aún el receptor controlado, prueba M2M,
hosting efectivo, secreto coherente, postflight y entrega observable según el
[runbook](../runbooks/webhook-safe-delivery.md). También falta concretar la
barrera efectiva y ventana para RPC directas/emisiones; no basta una pantalla
de mantenimiento. Todo ello queda para una transición autorizada aparte.

La propuesta especializada para el baseline cero usa locks ACCESS EXCLUSIVE
sobre endpoints y deliveries, revalidación de cero y aplicación/ledger en una
misma transacción. No ejecutar el lock en una conexión y la migración en otra.
Es una propuesta local pendiente de ensayo concurrente, no un procedimiento
Cloud aceptado. Revokes aislados no bloquean SECURITY DEFINER/propietarios;
los locks pueden hacer esperar emisores de negocio. Pausa de invocadores,
drenaje previo y control de logins SQL siguen siendo necesarios.
Propuesta ignorada: `.superpowers/012-2-ssrf/maintenance-proposal-1011.md`.

Preflight local adicional: `Get-Command docker -All`, `where.exe docker` y
`docker --version` confirmaron Docker 29.8.1, build 4a63305. La inspección del
destino `supabase_db_iroko-012-history-20261009` falló porque no existe el pipe
`dockerDesktopLinuxEngine`; el reintento elevado se interrumpió sin resultado.
Disponibilidad, imagen, mounts, red, cron y ledger locales actuales
**[NO VERIFICADO]**. No se arrancaron contenedores ni se escribió en la DB.
No se creó ni ejecutó el harness concurrente de la barrera en esta entrega.
Siguiente paso: recuperar el daemon, renovar identidad/aislamiento y ensayar
la barrera antes de convertirla en procedimiento ejecutable.

Revisión independiente: TAR sellado C81, 972 entradas únicas, 27 hashes
seleccionados y 945 blobs Git baseline comprobados, cero discrepancias.
Configuración empaquetada idéntica a HEAD. Evidencia ignorada:
`closure-independent-review-1011.json` en el mismo directorio de scratch.
`node scripts/check-docs.mjs`: 134 documentos aprobados; formato focalizado y
`git diff --check`: aprobados. Estos checks documentales no cierran el build
ni los gates funcionales Cloud.
