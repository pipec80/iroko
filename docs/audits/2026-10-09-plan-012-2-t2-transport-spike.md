# Plan 012.2 — T2: ensayo de transporte local

Fecha: 2026-10-09. Estado: **viabilidad mecánica comprobada y revisada; decisión de arquitectura pendiente**.

## Alcance y entorno

Se ejecutó T2 del [desglose 012.2](../exec-plans/active/012-2-webhook-ssrf.md), con backend, seguridad y contratos SQL revisados por agentes especializados en paralelo; el coordinador leyó el harness y repitió ambos ensayos.

Node v24.18.0 satisface engines24.x del repo; Docker daemon29.8.1 accesible. Antes de cualquier uso se renovó identidad de supabase_db_iroko-012-history-20261009: imagen postgres17.6.1.141, sin mounts, red iroko-012-history-20261009 Internal=true, DB postgres,161 migraciones, última20261008130000, cron.launch_active_jobs=off, cero jobs activos. Solo se consultó; el ensayo no necesita modificar esa DB.

No hubo instalaciones, cambios de aplicación, migraciones nuevas, escrituras DB/Cloud, commit, push, merge ni deploy. Checkout pendiente preservado. Certificados generados mediante PowerShell/.NET CertificateRequest en scratch; CA suministrada explícitamente al cliente Node, sin cambiar el trust store de Windows. No se usó openssl del host: Get-Command y where.exe no lo encontraron.

## Comandos y resultados frescos

```powershell
pwsh -NoProfile -File .superpowers/012-2-ssrf/generate-test-certs.ps1
node .superpowers/012-2-ssrf/dns-wire-spike.mjs
node .superpowers/012-2-ssrf/transport-spike.mjs
node --check .superpowers/012-2-ssrf/dns-wire-spike.mjs
node --check .superpowers/012-2-ssrf/transport-spike.mjs
```

Generación ejecutada por backend; ambos ensayos y node --check repetidos por coordinador: exit0. No son aserciones pgTAP ni tests de producto.

| Ensayo                      | Resultado observado                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Comparador doble resolución | Dos resoluciones; una conexión TCP y una solicitud HTTP al receptor prohibido de prueba                              |
| Transporte candidato        | 28/28 controles; cero conexiones TCP y cero solicitudes HTTP prohibidas; una resolución en intento fijado            |
| Control positivo            | HTTPS204, Host y SNI delivery.test, certificado validado, cuerpo UTF-8 exacto y HMAC correcto                        |
| Destinos DNS fixtures       | IPv4 privado/link-local, IPv6 loopback/link-local/ULA/mapped y conjunto A/AAAA mixto rechazados                      |
| DNS vacío/error/timeout     | Rechazo antes del envío                                                                                              |
| Redirecciones               | 301/302/303/307/308 hacia HTTPS prohibido o HTTP no seguidos                                                         |
| TLS inválido                | Hostname de certificado incorrecto rechazado con ERR_TLS_CERT_ALTNAME_INVALID                                        |
| Retry                       | DNS cambia a dirección prohibida; siguiente intento vuelve a validar y no conecta                                    |
| Límites de transporte       | Deadline y límite de respuesta aplicados                                                                             |
| DNS UDP real separado       | 6/6 controles;9 consultas en loopback: A/AAAA, cambio A público→privado, conjunto mixto, NXDOMAIN, ENODATA y timeout |

El primer ensayo del agente detectó una carrera en el límite de respuesta: destroy(error) emitía el error después de end. Se corrigió el harness para rechazar inmediatamente y evitar la resolución posterior. Los resultados finales reflejan esa corrección; no se modificó producto.

## Límites de la evidencia

La allowlist de dos IP públicas es exclusivamente fixture, no clasificador de IPs productivo. Las IP validadas se mapean explícitamente a receptor loopback para evitar tráfico externo. Esto demuestra control de resolución/conexión y TLS; no una conexión pública ni encaminamiento IPv6 real.

DNS UDP y HTTPS se probaron por separado. **[NO VERIFICADO]:** integración DNS wire → clasificador completo → TLS, deadline global de todas las fases, aislamiento de proxy en hosting real, RPC directo, leases/concurrencia, alta/edición seguras y operación Vercel/Cloud. No se ejecutó el binario pg_net para explotar SSRF; el comparador reproduce el diseño de doble resolución controladamente. El SSRF de producto no está corregido.

Artefactos ignorados: .superpowers/012-2-ssrf/root-preflight.json, transport-spike.mjs, transport-spike-results.json, dns-wire-spike.mjs, dns-wire-spike-results.json, generate-test-certs.ps1, certs/ y progress.md. No versionar las claves temporales. Los servidores UDP/HTTPS se cierran al finalizar; no se cambió cron ni confianza del sistema.

## Gate y siguiente paso

Auditor independiente: **GO para viabilidad mecánica T2**, con límites anteriores. Propuesta concreta en [diseño de transporte y RPC](2026-10-09-plan-012-2-transport-design.md): sender Node, ticket DNS de un uso para alta/edición por RPC, leases y firma SQL sobre bytes exactos; eliminar el sender directo pg_net.

El Plan 012 dice «P1-1 no toca RLS ni arquitectura». Nuestra evaluación determina que el cambio real de transporte y contrato RPC supera ese límite: requiere aceptar o ajustar la propuesta antes de T3. Las RPC antiguas rechazarían escrituras sin validación; no es una implementación transparente para consumidores directos.

Siguiente paso recomendado: aceptar ese cambio local de arquitectura/contrato y desglosar T3 con RED/GREEN integrado. Cloud permanece fuera de esa autorización. No usar un doble chequeo DNS como sustituto para cerrar012.2.

Checks documentales: Prettier focalizado exit 0; node scripts/check-docs.mjs exit 0 (128 Markdown); git diff --check exit 0. No se repitieron suites de aplicación porque no hubo cambios de producto.
