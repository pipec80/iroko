# Acceso/cuenta: entrega y aceptación — 18Nov2026

Continuación del [registro de reparación](2026-11-17-access-account-repair.md).
El propietario autorizó publicación, PR, revisión, merge y actualización/validación
de Supabase Cloud. No se amplía a otro lote de auditoría ni a funciones diferidas.

## Resultado vigente de la entrega

PR261 y [PR262](https://github.com/pipec80/iroko/pull/262) fusionados con sus
checks completos aprobados, sin bypass. PR262:
[CI44322186709](https://github.com/pipec80/iroko/actions/runs/44322186709).
Código desplegado `a1a0decbfb112050f764ee4fc43e120b3e4d6a04`, Vercel READY
`dpl_6s7bqdi7fmopWkhgzneqQrzoN3aR`, URL canónica verificada antes del dispatch.
La migración ya está aplicada en Supabase Cloud; los datos de prueba propios
se limpiaron y los siete usuarios originales conservan el mismo fingerprint.

| Hallazgo | Resultado y límite |
| --- | --- |
| A-ACCESS-02, cookies en redirects | **corrected-cloud**. Ambos307 originales y persistencia de cookies aprobados en dos recorridos Cloud. |
| A-ACCESS-01, recuperación MFA | Implementación entregada; SQL, GoTrue y navegador CI aprobados. **evidence-pending** para el recorrido MFA Cloud con navegador humano. |

Segundo [recorrido Cloud44326726423](https://github.com/pipec80/iroko/actions/runs/44326726423):
ambos refresh PASS, seguido de `ACCESS_ACCOUNT_CAPTCHA_NOT_READY=1` y
`access_account_cloud_failed_at_login_mfa_readiness`. El botón no se habilitó
en15s, antes de probar recuperación. El workflow conserva conclusión **failure**;
no es un PASS de MFA ni prueba de un defecto del mecanismo de recuperación.
El propietario confirmó en este chat18Nov que puede iniciar sesión desde su
navegador habitual: evidencia del propietario, no recorrido MFA observado por el
agente. No se cambió Turnstile ni se intentó eludir el desafío.

Cleanup segundo intento: `finally` Auth PASS y paso independiente PASS. Cuenta
personal residual eliminada por MCP sólo tras comprobar Auth ausente, tipo
personal, UUID y fecha exactos. Primer fixture eliminado por Admin API usando
la CLI oficial con credencial existente sólo en memoria, y su cuenta personal
con la misma validación independiente. Readback conjunto:
Auth7, fingerprint `e1ace6f5db337f88f5308c2feddace3b`, ambos UUIDs ausentes de
Auth/cuentas/códigos. Se conservaron los registros de auditoría inmutables.
UUIDs de prueba: `b085444f-630b-4ed9-b374-0720b15e5165` y
`47d066ab-72f6-4d39-96aa-65f45762c00f`.

**Siguiente evidencia necesaria:** recorrido manual de recuperación con fixture
propio en navegador humano, nueva autenticación, contenido tras recarga,
revocación previa y reuso denegado; registrar revisión y cleanup. No repetir
el mismo runner bloqueado ni abrir lote3 para ocultar el pendiente. La entrega
de código y SQL queda realizada; no se declara MVPv1 ni aceptación Auth completa.
Los apartados siguientes conservan la secuencia histórica de esta entrega.

### Base del PC y límite de recursos

El intento final comprobó Docker inicialmente detenido. Se arrancó únicamente
el motor para inventariar/reutilizar la base oficial, pero la RAM libre cayó a
214MiB antes de iniciar una operación SQL. Se detuvo Docker Desktop y se dejó
sin cambios de esquema, volúmenes ni configuración. **Migración en la base del
PC: [NO VERIFICADO], no aplicada por esta entrega.** Los archivos locales están
actualizados; el reset SQL,1210assertions y tipos se validaron en el Supabase
local de Actions. Esto no acredita la base persistida del PC.

Pendiente operativo adicional: con recursos suficientes, verificar el destino
`saas-boilerplate`, inventariar migraciones, dry-run y aplicar sólo pendientes
con `--skip-vault`, sin seeds/roles ni reset de volúmenes, y leer el resultado.
El [PR263](https://github.com/pipec80/iroko/pull/263) conserva este checkpoint
documental; no modifica la implementación probada en a1a0dec.

## Candidato y evidencia inicial

[PR261](https://github.com/pipec80/iroko/pull/261), base91840bad,
candidato inicialb8b3b92. [CI44222502489](https://github.com/pipec80/iroko/actions/runs/44222502489):
tipos de DB, SQL, unit, calidad, Gitleaks, Edge y E2E aprobados. SQL60archivos/
1210assertions incluye18casos nuevos; navegador Chromium91PASS y WebKit PASS.
Security Audit falló por GHSA-fc5q-39xc-vjpf; build no recibe PASS de ese run.

## Bloqueo de seguridad de la entrega

El [advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) alcanza picomatch
4.0.7. Registro npm confirmó404 para4.0.8: no se inventa una release reparada.
Mitigación provisional en `patches/picomatch@4.0.7.patch`, fijada por hash en
lockfile. Detecta wildcard no acotado en rama simple de extglob repetido y usa
la política nativa de literalización de patrones riesgosos. Mantiene patrones
ordinarios y clases/escapes/extglobs no riesgosos. Debe reevaluarse al aparecer
una release upstream reparada o cambiar el advisory; dueño plataforma/seguridad.

Pruebas acotadas: workers32MiB/1500ms reproducen el bloqueo sin colgar el runner;
parche instalado5/5PASS. Decisión de audit5/5PASS y suite de seguridad16/16PASS.
El grafo productivo actual usa4.0.7 parcheado;2.3.2 permanece sólo en desarrollo.
Se preserva la resolución de Prettier ajena a esta reparación.

Ruling: pnpm11.22.0 `audit --ignore` guarda una exclusión y puede retornar antes
de evaluar otras alertas; no se usa. `audit:production` prueba el parche del
árbol instalado y evalúa JSON crudo, rechazando registro/formato incompleto,
otra alerta alta/crítica y cualquier versión no cubierta de este advisory.
No hay exclusión global por GHSA ni relajación del umbral. La revisión detectó
ese problema antes de publicar el cambio del gate y confirmó su corrección.

## Supabase Cloud: aplicado y comprobado

Destino verificado: iroko `rgrxlygtmvavqzkjyywg`, saludable, DB216MB al preflight.
CLI instalada3.0.0, sin actualización. Dry-run mostró exactamente una migración.
Aplicación autorizada:

```text
supabase db push --remote=rgrxlygtmvavqzkjyywg --skip-vault --yes
20261117180000_mfa_recovery_claims.sql
```

Sin seeds/roles ni actualización de Vault. Readback:181migraciones, nueva RPC
presente, anon sin ejecución, authenticated sin acknowledge ni INSERT directo.
Códigos anteriores10→0, usuarios7 conservados. Fingerprint de IDs anterior a
fixtures: `e1ace6f5db337f88f5308c2feddace3b`. Aún no demuestra GoTrue/browser Cloud.
La aplicación anterior sigue compatible mientras llega la entrega Git.

## CI del candidato publicado

Candidato `71867d3937934d3210f922cc4d7c1d6adeb1b01f`,
[CI44229189736](https://github.com/pipec80/iroko/actions/runs/44229189736).
Security Audit, Quality, Database Tests, Database Types, Edge Functions y Gitleaks
aprobados. Unit:157archivos,1775PASS/1omitida. CodeQL y Documentation aprobados
en sus workflows. Chromium y aceptaciones confinadas aprobados. WebKit agotó
el límite de20min cargando imágenes, tras una instalación de dependencias del
sistema de unos17min; sus tests no llegaron a ejecutarse. El gate E2E rechazó
correctamente el resultado cancelado y build quedó omitido. Se relanzó sólo
WebKit y sus dependientes, conservando el resultado de los otros jobs.

Intento2 aprobado: WebKit16PASS/1omitida en5m52s, gate E2E y build PASS.
Chromium91PASS/3omitidas (incluye el escenario Cloud opt-in); aceptaciones
confinadas CSP/consumidores21,017 ocho y016 siete casos aprobados, sin flakies.
La omisión del escenario Cloud en CI general es intencional; no da aceptación Cloud.
PR261 fusionado sin bypass el18Nov, revisión sin hilos pendientes:
`e20e131753994d85e4d90d4865347996adfbe20f`.

Vercel canónico verificado READY en ese SHA, deployment
`dpl_9xG9TuL4obas7RikMtcLSf46WruU`. Workflow de aceptación
[44318030945](https://github.com/pipec80/iroko/actions/runs/44318030945)
despachado desde main sólo después de esa lectura. Resultado aún pendiente.

## Aceptación Cloud preparada

Workflow manual `access-account-cloud-acceptance.yml`, origen fijo
`https://project-a89lv.vercel.app`, backend fijo y SHA verificado antes del dispatch.
Ref restringido a main; production actualmente sólo acepta ramas protegidas y
main es la única protegida. Un worker, sin retries de escritura, sin capturas,
trazas, vídeo ni reportes sensibles. Errores saneados; sólo se emite UUID nuevo.

Escenario: usuario nuevo propio; bootstrap preparatorio por Admin OTP sin envíos
ni desactivar CAPTCHA; TOTP; dos refresh+redirect; recuperación UI; nuevo login,
contenido visible tras reload; rechazo de refresh de sesión anterior y de código
usado con otro TOTP vigente. El login UI conserva las exigencias CAPTCHA reales.

Ruling: hint de expiración positivo1, sin modificar JWT firmado ni TTL global.
Se inspecciona Set-Cookie/Location del307 original y luego la persistencia; el
documento final por sí solo podría enmascarar la pérdida original. Revocación
exige error de refresh/sesión inválida, no un fallo de red o429/5xx.

Cleanup Auth por API en finally. La cuenta personal huérfana requiere eliminación
independiente por UUID exacto y evidencia MCP; no declarar cleanup completo sólo
por borrar Auth. La versión desplegada, escenarios y limpieza se registran aquí
al ejecutarlos.

## Primer recorrido Cloud y endurecimiento del runner

Run44318030945 sobre e20e131: `ACCESS_ACCOUNT_REFRESH_ONBOARDING=PASS` y
`ACCESS_ACCOUNT_REFRESH_LOGIN=PASS`, inspeccionando el307 original y persistencia.
A-ACCESS-02 pasa a corrected-cloud. MFA agotó180s sin resultado: no se atribuye
al producto ni a CAPTCHA sin diagnóstico. El timeout interrumpió finalmente
la limpieza; Auth y cuenta personal del fixture
`b085444f-630b-4ed9-b374-0720b15e5165` seguían presentes en readback.

Corrección exclusiva del runner: esperas UI15/20s, journal privado con sólo
UUID/runID, limpieza AdminAPI como paso independiente incluso tras fallo del
test y modo de limpieza de un fixture anterior. Requiere SHA validado, origen
fijo, metadata de propietario/run, correo de fixture y antigüedad menor48h.
404 sólo es idempotente con `user_not_found`; errores de otros destinos no
impiden intentar el actual. Revisión independiente y pruebas negativas del
cleanup incluidas. No se desactiva CAPTCHA ni se modifica configuración Cloud.
A-ACCESS-01 permanece **evidence-pending** hasta el resultado del nuevo recorrido.

CI de main44317586466: WebKit16PASS en53s, pero el job agotó20min en post-cache
tras una preparación lenta. Se relanza ese job y se amplía exclusivamente su
presupuesto de infraestructura a30min para próximas ejecuciones; no cambian
timeouts de tests ni assertions. No se presenta un job cancelado como PASS.
