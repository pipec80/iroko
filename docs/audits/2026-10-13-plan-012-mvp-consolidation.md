# Plan 012 — Consolidación del entorno MVP

Fecha: 2026-10-13, America/Santiago.

Cierre posterior del mismo día: [aceptación Cloud012.2](2026-10-13-plan-012-2-cloud-acceptance.md).
El reset inicial162/45/932 registrado abajo fue seguido por la corrección
de permisos de edición: ledger163, pgTAP46/950 GREEN, Vitest111/1250,
TypeScript y lint aprobados. Cloud/hosting, entrega HMAC, limpieza y ejecución
cron programada aceptados en ese registro; los siguientes pasos iniciales de
esta nota ya se completaron. Integración Git permanece pendiente.

## Contexto y autorización

El propietario confirmó que todos los servicios son MVP/test y que el freeze
busca corregir y pulir capacidades existentes. Autorizó consolidar el entorno
local, reconstruirlo, ejecutar pruebas y continuar la aplicación/despliegue de
012.2 en Cloud de pruebas. No hay datos de clientes en producción que obliguen
a conservar una transición sin interrupción. Se preservan código pendiente,
credenciales y otros proyectos.

La referencia local oficial es `supabase/config.toml`, cuyo `project_id` es
`saas-boilerplate`. No crear otros entornos por defecto.

## Inventario previo de servicios

Inventario estático de código/configuración; no prueba salud de proveedores.

| Servicio     | Papel implementado                                              | Evidencia                                      |
| ------------ | --------------------------------------------------------------- | ---------------------------------------------- |
| Supabase     | PostgreSQL, Auth, Storage, Realtime, Vault/cron, Edge Functions | `supabase/config.toml`, migraciones, funciones |
| GitHub       | CI, seguridad, docs, nightly y aceptación MP manual             | Cinco archivos en `.github/workflows/`         |
| Vercel       | Hosting Next.js y worker Node, Analytics/Speed Insights         | `vercel.json`, layout y rutas API              |
| Cloudflare   | CAPTCHA Turnstile                                               | `captcha-field.tsx`, `src/env.ts`, CSP         |
| PostHog      | Analytics cliente/servidor con sanitización                     | `src/lib/analytics/`                           |
| Resend       | Email Next.js y worker de cola Supabase                         | `src/lib/email/`, `process-email-queue`        |
| Sentry       | Observabilidad navegador, servidor y edge                       | Configuraciones Sentry e instrumentación       |
| Billing      | Mercado Pago, Stripe condicional y mock                         | `src/lib/billing/registry.ts` y providers      |
| Google OAuth | Proveedor Auth configurado localmente                           | `supabase/config.toml`                         |

No se encontró gestión local de Cloudflare Workers/DNS/CDN. No hay un
`supabase db push` o `vercel deploy` explícito en los cinco workflows;
la integración Git del hosting y ejecuciones actuales siguen **[NO VERIFICADO]**.
Los labels técnicos `production` de proveedores no cambian la condición MVP.

## Consolidación ejecutada

- Verificadas etiquetas antes de retirar seis contenedores de ensayo de
  `iroko-014-20261008` y `iroko-012-history-20261009`.
- Retirados exclusivamente su volumen de DB014 y tres redes vacías.
- Conservados todos los recursos de `portal-cms-pax3` y las imágenes compartidas.
- `supabase stop --project-id saas-boilerplate --no-backup --yes`: exit 0.
- `supabase start`, desde el repositorio oficial: exit 0. Salida filtrada para
  no publicar claves. Aplicadas 162 migraciones y `supabase/seed.sql` desde cero.
- SQL posterior: ledger162, última `20261009180000`, endpoints0, deliveries0.
  Once contenedores oficiales levantados; gateway Kong sano.
- `pnpm supa:test`: **PASS**, 45 archivos, 932 pruebas, 28 segundos.

Siguiente paso recomendado: completar build y checks de aplicación, renovar
preflight Cloud y continuar únicamente con el release revisado de 012.2.

## Directorios consultados por el propietario

`test-results` corresponde a Playwright: `.last-run.json`, trace y contexto
de un test Billing/Chromium fallido del 26 de agosto local. Está ignorado en
`.gitignore:16`; puede recrearse al ejecutar E2E. No pertenece a Supabase.

`%SystemDrive%` es una carpeta literal sin seguimiento, creada el 8 de octubre.
Contiene solo cuatro bases de caché Windows bajo
`ProgramData/Microsoft/Windows/Caches`, 989184 bytes, sin reparse points.
El patrón es compatible con una variable Windows sin expandir interpretada
como ruta relativa. Proceso creador y causa exacta: **[NO VERIFICADO]**.
No se atribuye a Docker/Supabase ni a un agente sin evidencia. Ambos directorios
se conservaron durante esta revisión; no forman parte del release selectivo.

## Corrección acotada del diagnóstico CI

El reintento de `nightly.yml` usaba `curl -v` con headers privilegiados.
Se sustituyó por salida de estado y tiempos DNS/conexión/TLS/total, descartando
el cuerpo y sin imprimir headers. Se conserva POST y el fallo del job ante el
error original. No se ejecutó el workflow ni se afirma exposición histórica.

## Límites de aceptación

La sesión anterior preparó el candidato con dependencias copiadas y aprobó el
ensayo transaccional de locks/migración/ledger/rollback en la DB de ensayo.
Son resultados históricos, distintos del reset completo y pgTAP ejecutados hoy.
El smoke Cloud previo se detuvo en CAPTCHA; el usuario y cuenta fixture fueron
eliminados, pero la comprobación REST de notificaciones carecía de SELECT para
`service_role`. Eso no acredita residuos ni aceptación funcional completa.
La continuación no debe ampliar ACL para satisfacer el harness.
