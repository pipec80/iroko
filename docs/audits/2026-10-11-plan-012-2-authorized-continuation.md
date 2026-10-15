# Plan 012.2 — Continuación autorizada

Fecha local: 2026-10-11, America/Santiago. Seguimiento de la
[revisión de cierre](2026-10-11-plan-012-closure-review.md).

## Alcance de la autorización

El usuario confirmó Docker corriendo y pidió resolver los cuatro pendientes,
indicando que las operaciones Cloud pueden ejecutarse desde CLI PowerShell
Windows. Se interpreta como autorización de las operaciones Cloud de 012.2
conforme a los gates del [runbook](../runbooks/webhook-safe-delivery.md).
No se interpreta como autorización para instalar, integrar Git o desplegar
indiscriminadamente el árbol pendiente. El paquete selectivo y la migración
exacta siguen siendo la frontera de revisión.

El cierre de grants 012.1 no se reabre por falta de aceptación funcional Cloud;
esa aceptación mantiene su estado separado. El receptor Mercado Pago entrante
no prueba las entregas salientes de Iroko.

## Trabajo en paralelo

- Docker/SQL: renovar identidad y aislamiento del destino exacto; probar bloqueo
  concurrente y rollback, sin reset ni escrituras permanentes en fixtures.
- Build: aislar caché/junction, usar fuentes selladas y dependencias ya
  instaladas; no cambiar el universo CSS del producto para obtener GREEN.
- Cloud/CLI: verificar instalación, autenticación e identidad por separado;
  preparar la aplicación de una sola migración y su postflight, con cron pausado
  hasta aceptación. Nunca imprimir secretos o comandos cron que los contengan.
- Coordinación: revisar resultados y preparar el receptor HTTPS temporal.

Los resultados se incorporarán después de observar su ejecución. Este registro
no convierte la confirmación de Docker del usuario en un preflight técnico.

## Receptor temporal preparado

Artefacto local ignorado:
`.superpowers/012-2-ssrf/acceptance-receiver-1012/`.
Sin dependencias adicionales; handler compatible con WebCrypto y entrada Deno.
Verifica HMAC SHA256 sobre `timestamp + '.' + bytes`, fixture exacto de cuenta,
delivery y ejecución, evento permitido, ventana de cinco minutos y cuerpo de
hasta 4096 bytes. Registra únicamente ID de prueba, ejecución, tamaño, hash del
cuerpo y resultado HMAC; no cuerpos, firmas ni secretos.

`node --test .superpowers/012-2-ssrf/acceptance-receiver-1012/receiver.test.mjs`:
ocho pruebas aprobadas. Incluye UTF-8 positivo, firma alterada, timestamp
vencido, fixture distinto, exceso de tamaño, JSON inválido, null y método no permitido.
Es evidencia local del receptor, no entrega desde el worker desplegado.

El despliegue temporal, secretos exclusivos de prueba, recepción observable y
retirada posterior siguen pendientes de los gates de ejecución. El gateway JWT
del receptor debe dejar llegar el protocolo webhook; el handler impone su
autenticación HMAC. No usar este artefacto como receptor permanente del producto.
La configuración y retirada se harán mediante los comandos CLI instalados y
verificados, siguiendo [secretos](https://supabase.com/docs/guides/functions/secrets)
y [despliegue](https://supabase.com/docs/guides/functions/deploy) de Supabase.

Siguiente paso recomendado: incorporar preflight Docker, build y CLI reales;
revisar la transición concreta antes de aplicar o activar.

Preparado también `functional-cloud-smoke-1012.mjs` en scratch: fixtures propios
para Auth admin/login/hook, triggers de perfil/cuenta, Storage avatars y
notificaciones privadas Realtime, con cleanup explícito de la cuenta antes del
usuario y comprobación de residuos. Sintaxis aprobada; **no ejecutado en Cloud**.
El historial de auditoría inmutable puede conservar identificadores de fixtures;
no se borrará para aparentar ausencia total de trazas operativas.
El preflight indicó que las claves locales existen pero la URL configurada no
es el proyecto Cloud exacto. La guardia aborta antes de cualquier mutación;
no se reutilizan esas claves contra un destino supuesto.
