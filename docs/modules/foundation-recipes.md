# Recetas de extensión de la base Iroko

Estas recetas describen cómo reutilizar el núcleo en una instalación derivada.
Son instrucciones de adaptación, no funciones ya aceptadas en un derivado.
Evidencia de ejecución de cada receta: **[NO VERIFICADO]** hasta el ensayo T3.
La [guía de instalación](../runbooks/independent-installation.md) registra la
revisión base y los cambios del derivado. Mantener `src/env.ts` como inventario
de entorno y el [sistema de diseño](../design-system/README.md) al cambiar marca.

## Contrato común

Una extensión declara (1) propietario del dato y `account_id`, (2) rol de cada
operación, (3) entrada validada y salida, (4) permiso efectivo en ruta/acción,
SQL/RLS y Storage, (5) estados de error observables y reintento cuando proceda,
(6) dependencias/efecto al desactivar, y (7) migración/actualización aditiva.
El rol de presentación obtenido del JWT mejora la interfaz; efectos sensibles
revalidan pertenencia vigente. El `service_role` ejecuta trabajo interno en
servidor y omite RLS: el código debe derivar y comprobar identidad/tenant antes
de usarlo. Un flag operativo no eleva entitlements ni reemplaza autorización.
Roles tenant existentes: `owner`, `admin`, `member`, `viewer`; `platform_admin`
es un operador distinto y no se convierte en miembro de cualquier cuenta.

En Windows, cambios de SQL se escriben como migración versionada en
`supabase/migrations/` y espejo legible en `supabase/schemas/`; ejecutar
reset/pruebas sólo en destino local verificado. `supabase db diff` no es el
generador vigente. Seguir [AGENTS](../../AGENTS.md) y [TESTING-PLAN](../../TESTING-PLAN.md)
antes de editar SQL/tests. Nunca editar las estructuras gestionadas `auth.users`
o `storage.objects`; las políticas propias de Storage sí se versionan.

## 1. Dato de negocio por tenant

**Entrada/salida.** Entrada de negocio validada con Zod; salida tipada de un
registro propio asociado a `account_id`. Referencias:
`src/lib/active-account.ts`, `src/lib/permissions.ts`,
`src/app/[locale]/dashboard/projects/actions.ts`, `src/lib/projects.ts`,
`supabase/schemas/public.sql`,
`supabase/migrations/20261020102000_document_project_account_integrity.sql`.
Projects/editor sirve de patrón de código y SQL, no se reactiva en el MVP.

**Cambio del derivado.** Crear tabla de dominio con `account_id NOT NULL`, FK
a `public.accounts`, FK compuesta cuando referencia otro recurso tenant, índices
para filtros/policies, grants y RLS por pertenencia/rol. Crear migración manual,
espejo, tipo generado si cambia Data API, acción con validación y página propia.
Lectura para miembro autorizado; escritura para `owner/admin/member` cuando el
caso lo permita; `viewer` sólo lectura. Confirmar con la matriz de SQL real.
Una operación rechazada devuelve error estable sin cambio parcial.

**Negativos y prueba.** Dos cuentas A/B: usuario de B no lee/escribe A mediante
UUID cambiado; viewer de A no escribe; revocar membership antes de una acción
con token antiguo deniega. Comprobar Data API/RPC además de UI y persistencia
tras recarga. Node valida entrada y actor; PostgreSQL aplica RLS/FK. Resultado
en T3: [NO VERIFICADO].

## 2. Archivo público y privado

**Entrada/salida.** Avatar/logo público produce path persistido y URL filtrada
al renderizar; adjunto privado produce path de objeto cuya lectura exige cuenta
y rol. Referencias: `src/app/[locale]/dashboard/account/actions.ts`,
`src/lib/storage.ts`, `src/lib/project-documents.ts`, `supabase/config.toml`
(`avatars`, `org-assets`, `documents`) y
`supabase/migrations/20260821214012_storage_rls_live_membership.sql`.

**Cambio del derivado.** Usar bucket privado `documents` sólo para un recurso
autorizado y su estructura de path por cuenta; crear vínculo en tabla con FK
compuesta. Si la semántica exige otro bucket, declarar política y límite de
archivo antes de crearlo. No convertir un objeto privado en URL pública.
Archivos públicos siguen las acciones de avatar/logo existentes; no compartir
su policy con `documents`. Servidor valida nombre/tipo/tamaño, owner/tenant y
efecto; Storage aplica policies. Error de upload deja registro sin referencia
huérfana o usa compensación/cleanup documentado.

**Negativos y prueba.** Viewer no sube; usuario B no lee el path de A; URL
pública no permite abrir un documento privado; reemplazo y borrado respetan
permisos. Probar acceso directo, no sólo ocultación de botones. Resultado T3:
[NO VERIFICADO].

## 3. Notificación a destinatario

**Entrada/salida.** Evento de negocio autorizado → `notify(userId, payload)`
→ fila de `notifications`; cliente destinatario recibe `notification_created`
en canal privado y puede marcar leído. Referencias: `src/lib/notifications/index.ts`,
`src/hooks/use-notifications.ts`, `supabase/schemas/notifications.sql`.

**Cambio del derivado.** Tras persistir el dato, resolver destinatarios desde
membership vigente de la cuenta, nunca desde `userId` arbitrario del request.
Validar `link` con la función existente y mantener `emailDelivery` optativo.
La acción Node valida actor y destinatario; la tabla/RPC restringen lectura y
marcado; Realtime privado sólo entrega al usuario autorizado. El hook existente
usa `setAuth()` y `removeChannel` en cleanup. Un fallo de correo no revierte la
notificación in-app; registrar el fallo operacional sin exponer PII.

**Negativos y prueba.** B no recibe/lee evento de A, viewer no dispara una
operación restringida, salida/cambio de identidad retira canal y datos visibles.
Comprobar un evento útil y persistencia de lectura. Resultado T3: [NO VERIFICADO].

## 4. Job pequeño y correo

**Entrada/salida.** Trabajo validado → cola durable PGMQ → worker
`process-email-queue` → resultado/reintento/agotamiento observable. Referencias:
`supabase/functions/process-email-queue/handler.ts`,
`docs/runbooks/email-queue.md`, `supabase/config.toml` y migraciones de
cron/Vault. El envío inline de `src/lib/email/index.tsx` es otro contrato;
documentar cuál se usa.

**Cambio del derivado.** Reutilizar la cola/worker existente sólo para correo
con destinatario autorizado; no crear un sistema de jobs genérico. Node/Edge
validan payload y autenticación del invocador, SQL/PGMQ almacena estado durable.
Idempotencia del efecto externo y reintentos deben explicarse: repetir una
entrega puede duplicar correo si el proveedor respondió pero la confirmación
falló. No registrar secreto, email o payload completo en evidencia.

**Negativos y prueba.** Falta de secreto cron deniega antes de abrir la cola;
fallo de proveedor conserva trabajo para reintento o agotamiento; operador
puede ver resultado/alerta y acción de recuperación. La guía de worker
contiene controles, no certifica un envío en este derivado. Resultado T3:
[NO VERIFICADO].

## 5. API externa con clave

**Entrada/salida.** `Authorization: Bearer` con clave válida → admisión
durable → cuenta derivada de la clave → respuesta acotada. Referencias:
`src/app/api/v1/account/route.ts`, `src/lib/api-keys/admission.ts`,
`src/lib/api-keys/index.ts` y `supabase/schemas/api-keys.sql`.

**Cambio del derivado.** Añadir ruta explícita que use `admitAccountApiRequest`;
usar `admission.accountId` para todas las consultas. No aceptar `accountId`
del cuerpo/query como fuente de identidad. Node verifica formato/IP y RPC
reserva cuota; consulta posterior se limita a la cuenta admitida. Respuestas
401/429/503 actuales no deben filtrar existencia de otra cuenta. Errores
después de admisión no devuelven presupuesto ya reservado.

**Negativos y prueba.** Clave ausente/inválida, IP no confiable y cuota agotada
rechazan; clave de A con UUID de B nunca lee B; efecto de error no eleva cuota.
La capacidad puede estar deshabilitada comercialmente aunque la API exista:
verificar contrato de plan, flag operativo y autorización. Resultado T3:
[NO VERIFICADO] (esta receta no es requisito de la extensión neutral).

## 6. Acción con permisos vivos

**Entrada/salida.** Acción de servidor con entrada Zod y cuenta explícita →
`requireAccountRole(accountId, allowedRoles)` → efecto SQL/RLS → `ActionResult`
tipado. Referencias: `src/lib/active-account.ts`, `src/lib/permissions.ts`,
`src/lib/server-action.ts`, acciones de org/settings y SQL/RPC de memberships.

**Cambio del derivado.** Definir matriz por operación antes de mostrar controles.
La UI puede usar `canEditContent`, `canManageMembers` u otro resolver existente;
la acción revalida membership actual y la base aplica RLS/grants. Asegurar que
la cuenta del recurso coincida con la autorizada. No usar rol JWT antiguo para
una mutación ni conceder acceso tenant por `platform_admin`.

**Negativos y prueba.** Revocar rol entre render y acción deniega; viewer no
escribe; admin/owner sólo ejecutan las operaciones de su matriz; token de A
con recurso B falla. No reemplazar prueba SQL por test de botón. Resultado T3:
[NO VERIFICADO].

## 7. Nuevo módulo de producto

**Entrada/salida.** Selección estática de capacidad de instalación →
navegación/título/atajo y ruta/acción coherentes → dato, entitlement y
telemetría cuando se ofrecen. Referencias: `src/config/app.config.ts`,
`src/components/layout/app-sidebar-client.tsx`, `app-topbar-client.tsx`,
`src/app/[locale]/dashboard/page.tsx`, `src/lib/billing/entitlements.ts` y
`src/lib/analytics/server.ts`. T0 puede extraer metadatos mínimos; consultar
la implementación final antes de adaptar.

**Cambio del derivado.** Declarar ID, rutas hijas, clave i18n, orden, acceso
home y condición; crear página/acción/SQL explícitos. Disponibilidad de
instalación gobierna nuevas operaciones, entitlement gobierna oferta y rol
vivo/RLS gobierna permiso. Especificar efecto al apagar: menú, acceso directo,
acción, consultas, jobs y datos previos. No borrar recursos por ocultar módulo.

**Negativos y prueba.** Flag false oculta accesos y rechaza acción/URL directa,
sin consulta de home; B y viewer no ganan acceso por enlace profundo; cambio de
cuenta recalcula navegación. Probar branding y cuatro idiomas si se toca
navegación. Resultado T3: [NO VERIFICADO].

## Ficha de adaptación y entrega

| Petición ficticia | Clase y ámbito | Responsable/mecanismo | Validación y efecto en upgrade |
| --- | --- | --- | --- |
| A cambia marca, soporte y módulos visibles | Configuración de instalación | Instalador; tokens/datos/capacidades existentes | Registrar archivos y valores no secretos; probar rutas/acciones; conservar diff al actualizar |
| B pide un expediente privado por cuenta | Extensión de instalación con dato por tenant | Desarrollador; migración, acción, página y policy explícitas | Dos cuentas/roles y archivo privado; upgrade aditivo conserva dato |
| A pide su idioma personal | Preferencia de usuario dentro de idiomas existentes | Usuario; perfil/navegación vigente | Persistencia y fallback; no añadir locale sin traducciones completas |
| B pide jerarquías de organizaciones o roles arbitrarios | Cambio estructural | Decisión de producto y diseño separado | No soportado por configuración actual; coste/migración propios |
| A pide configuración dinámica por tenant o cobro por consumo | Cambio estructural | Decisión futura fuera de015 | No hay panel ni motor genérico para prometerlo |

La [guía de instalación](../runbooks/independent-installation.md) conserva una
ficha real por derivado: revisión origen/destino, cambios de código y SQL,
configuración no secreta, operador, recuperación, pruebas y conflictos. Ninguna
fila ficticia prueba una adaptación ejecutada.
