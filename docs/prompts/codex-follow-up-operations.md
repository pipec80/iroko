# Codex Prompt — Follow-up Operations and Verification

Copy the prompt below into Codex from the repository root. Begin with
reconnaissance and a plan only. Do not modify application code, Cloud services,
credentials or deployments until the user approves one bounded task.

---

Actúa como Principal Software Engineer, SRE, Security Engineer y QA Lead para
el repositorio `pipec80/iroko`.

## Estado ya verificado

- Los seis planes de estabilización originales están en
  `docs/exec-plans/completed/`.
- Las 122 migraciones del repositorio, Supabase local y Supabase Cloud están en
  paridad; no existe drift.
- `process-email-queue` está desplegada en Cloud, `ACTIVE`, y su health check
  más reciente respondió HTTP 200 sin timeout.
- Next.js resuelve una única versión, 16.2.12.
- PostHog está fusionado mediante PR #109 y opera tras consentimiento.
- Los hallazgos de credenciales ya fueron rotados y no son trabajo pendiente.
- La ruta admin que muestra contenido 404 con HTTP 200 no filtra datos. Es un
  P2 diferido: no cambies ese comportamiento salvo que el usuario confirme que
  necesita un HTTP 404 estricto.

## Objetivo

Gestionar las tareas operativas restantes con un plan y una rama/PR por tarea:

1. Diseñar y, solo tras aprobación, implementar smoke checks Cloud para el
   túnel Sentry, el worker de correo y los webhooks de Stripe/Mercado Pago.
2. Verificar la configuración de Vercel Automation Bypass en previews
   protegidos; corregirla únicamente con autorización explícita.
3. Ejecutar y estabilizar la suite completa de validación local. Las pruebas
   específicas pasaron, pero una ejecución completa excedió el límite de tiempo
   disponible y no puede declararse verde sin una corrida nueva y completa.
4. Mantener audit, plan y runbook alineados con evidencia fresca.

## Lee primero

1. `AGENTS.md` si existe localmente; es privado e intencionalmente no versionado.
2. `README.md`, `ROADMAP.md`, `SECURITY.md` y `docs/index.md`.
3. `docs/audits/2026-08-02-full-platform-audit.md`.
4. `docs/runbooks/email-queue.md` y `docs/runbooks/local-sync-and-codex.md`.
5. `docs/exec-plans/completed/002-email-worker-cloud.md`,
   `003-sentry-observability.md`, `005-quality-hardening.md` y
   `006-posthog-integration.md`.
6. `package.json`, `.github/workflows/`, `next.config.ts`, `src/proxy.ts`,
   `supabase/config.toml`, `supabase/functions/` y sus pruebas asociadas.

`ROADMAP.md`, `SECURITY.md`, el código ejecutable y la configuración actual son
la fuente de verdad. Las auditorías y planes son evidencia histórica que debes
revalidar, no instrucciones para repetir acciones ya cerradas.

## Reglas obligatorias

- No hagas push directo a `main` ni combines tareas independientes en una PR.
- No modifiques Supabase Cloud, Vercel, Sentry, PostHog, Stripe, Mercado Pago
  ni otros proveedores sin aprobación humana explícita para la acción concreta.
- No crees, imprimas, copies ni rotes secretos sin aprobación específica.
- No envíes correos, cobros, webhooks ni eventos de analítica reales durante
  reconocimiento. Propón primero una sonda segura y su reversión.
- No ejecutes `supabase db push --linked`, despliegues de Edge Functions ni
  cambios de variables de entorno sin aprobación.
- No debilites RLS, MFA, CSP, aislamiento multi-tenant ni validaciones para
  obtener resultados verdes.
- No marques una comprobación como pasada sin mostrar el comando, salida y
  código de salida correspondientes.
- Mantén `docs/local/`, `docs/private/` y los documentos ignorados como locales;
  no los publiques ni los muevas sin una decisión explícita.
- Detente al finalizar una fase y solicita aprobación antes de implementar la
  siguiente.

## Fase 0 — Reconocimiento obligatorio

Sin modificar archivos ni servicios:

1. Confirma rama, commit, árbol de trabajo, remotos y versiones de Node, pnpm,
   Supabase CLI y Git.
2. Ejecuta las verificaciones de solo lectura disponibles:
   - `supabase migration list --local`
   - `supabase migration list --linked`
   - `supabase functions list --output json`
   - `supabase db query --linked "select * from private.email_worker_health()"`
3. Revisa los workflows para identificar el estado real de los checks, cachés,
   secretos requeridos y protección de previews.
4. Inspecciona el recorrido de `/sentry-tunnel`, sus pruebas y cómo una sonda
   podría confirmar entrega real sin exponer información ni generar ruido.
5. Inspecciona los flujos de webhook y worker para proponer una sonda Cloud
   aislada, reversible y sin datos personales.
6. Ejecuta la validación completa solo cuando el entorno local esté estable. Si
   excede el tiempo o falla, conserva la salida, localiza la causa y no repitas
   la suite completa a ciegas.
7. Clasifica cada objetivo como: confirmado, requiere cambio local, requiere
   aprobación externa, bloqueado por entorno o no necesario.

## Entrega obligatoria de Fase 0

Detente y entrega una tabla con:

- objetivo;
- evidencia actual;
- riesgo;
- archivos y servicios involucrados;
- prueba propuesta;
- cambio mínimo, si existe;
- aprobación externa necesaria.

Recomienda **solo una** tarea para la primera rama y pregunta si está aprobada.

## Forma de trabajo tras una aprobación

1. Crea una rama con un nombre acotado.
2. Revalida el hallazgo y presenta el diseño de la sonda, arreglo o prueba.
3. Implementa el cambio mínimo con pruebas de regresión.
4. Ejecuta los checks relevantes y revisa el diff completo, incluidos secretos.
5. Actualiza solo la documentación afectada: auditoría, nuevo plan o plan
   existente y runbook.
6. Prepara una PR; no la fusiones ni despliegues por tu cuenta.

No implementes ninguna de las tareas en la primera ejecución.
