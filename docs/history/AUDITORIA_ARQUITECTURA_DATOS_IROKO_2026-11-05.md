# Auditoría de arquitectura de datos y preparación SaaS — Iroko

**Documento técnico de traspaso a Codex / Astra**
**Corte de evidencia:** 5 de noviembre de 2026
**Proyecto:** `pipec80/iroko` — SaaS Boilerplate / Iroko
**Entorno Cloud inspeccionado:** Supabase `iroko`, organización Free, PostgreSQL 17.6
**Referencia de código observada:** `main`, SHA `032f1a30794241cebc97e0ccd32b48d836110475`
**Estado de este documento:** auditoría de arquitectura y lectura Cloud; **no** certifica pruebas end-to-end ni autoriza migraciones remotas.
**Documento complementario:** `PROMPT_MASTER_CODEX_ASTRA_AUDITORIA_DB_IROKO.md`.

---

## 1. Resumen ejecutivo

### 1.1. Dictamen

La estructura de Iroko **es apta como base arquitectónica para un SaaS B2B multi-tenant con suscripciones de precio fijo y extensiones de negocio**. Su principal fortaleza es separar la identidad de Supabase Auth, los datos del perfil, la pertenencia de usuarios a organizaciones, el catálogo comercial, los estados de suscripción y los recursos por tenant.

No es necesario reemplazar PostgreSQL, crear otra identidad, introducir un ORM por defecto ni rediseñar los esquemas fundamentales. El siguiente salto de calidad no proviene de agregar más tablas sino de **hacer verificables y consistentes los contratos de autorización, cuotas, facturación y extensibilidad**.

El modelo no debe comercializarse todavía como producto listo para instalar de forma independiente: el repositorio mantiene un _feature freeze_; el plan `015` debe demostrar instalación derivada, marca, extensión y actualización; el plan `016` debe completar la reauditoría y aceptación. El plan `014` tiene trabajo previo de presentación/seguridad. El cierre acotado de `017` no representa aceptación global del MVP.

### 1.2. Decisiones principales

1. **Conservar** `auth.users` gestionada por Supabase; extender con `public.profiles` 1:1 y crear cuentas a partir de los triggers existentes.
2. **Conservar** `public.accounts` como frontera multi-tenant y `accounts_memberships` como vínculo N:M con roles vivos. No hacer del JWT la única fuente para operaciones sensibles.
3. **Conservar** `billing` como esquema privado del dominio comercial, con proveedores desacoplados y RPCs explícitas. Diferenciar diseño disponible de cobros reales certificados.
4. **Corregir si se reproduce el riesgo**: privilegios excesivos de `profiles`, incoherencias de flags/entitlements y comportamiento de límites ausentes o fallos de lectura.
5. **Probar concurrentemente** límites de creación de equipos y cambios de suscripciones; no asumir que un `count()` es seguro bajo concurrencia ni introducir índices únicos que rompan flujos legítimos.
6. **Conservar y verificar** restricciones SQL compuestas entre recursos y `account_id`; adoptarlas como patrón estándar de nuevas verticales.
7. **No incorporar por defecto** chat, permisos arbitrarios, facturación metered, catálogo multi-producto compartido, GraphQL ni extensiones adicionales sin un requisito aceptado.
8. **Dejar para la fase 2** una auditoría de Next.js que confirme que cada rol tiene vistas, acciones, navegación y errores coherentes con la autorización de la base.

### 1.3. Escala de certeza

- **VERIFICADO EN CATÁLOGO CLOUD**: observado con SQL de solo lectura en `pg_catalog`, `information_schema`, `pg_policies`, `pg_proc`, catálogo de extensiones o tablas de aplicación.
- **VERIFICADO EN CÓDIGO**: implementación en GitHub y/o texto SQL mostrado; falta necesariamente la ejecución de regresiones actuales.
- **HIPÓTESIS A REPRODUCIR**: riesgo plausible sustentado en diseño, pero no se ejecutó una prueba de ataque, carrera o error controlado.
- **NO VERIFICADO**: ejecución real con proveedor de pagos, seguridad E2E desplegada, gran carga, backups y replicación limpia.

Las observaciones son una **instantánea fechada**. Codex debe reconstruir el baseline antes de corregir.

---

## 2. Alcance, evidencias y restricciones

### 2.1. Alcance revisado

Se inspeccionaron funciones, tablas y relaciones de los esquemas propios `public`, `billing`, `private` y `audit`; triggers; grants de columnas y tablas; RLS; tipos enum; vistas; índices; funciones de Auth/onboarding; ejecución de límites; configuración de planes y flags; extensiones; advisories de seguridad/rendimiento; migraciones y documentación canónica del repositorio.

**No se ejecutaron** migraciones, escrituras remotas, cambios de configuración, checkout real, invocaciones de proveedores, pruebas de carga, concurrencia multisesión ni suites locales de regresión. Esas actividades forman parte del requerimiento para Codex.

### 2.2. Autoridad del repositorio

Según `AGENTS.md`, priorizar: código ejecutable, pruebas, configuración/migraciones, `docs/current-state.md`, ADRs aceptadas, planes vigentes, roadmap y auditorías históricas. Documentos relevantes:

- `AGENTS.md`.
- `docs/index.md`, `docs/current-state.md`, `ROADMAP.md`.
- `docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md`.
- `docs/architecture/product-strategy.md`.
- `docs/architecture/billing-platform-v2-design.md`.
- `docs/capabilities.md`.
- `TESTING-PLAN.md`, `supabase/tests/database/`.

La filosofía aprobada es **Supabase-first**, Next.js para presentación/orquestación, verticales opcionales, seguridad por contrato y mínima integración completa. El freeze vigente no permite introducir nuevos módulos solo porque Supabase los admita.

### 2.3. Restricciones de implementación

Windows + Docker Desktop (16 GB RAM): no ejecutar procesos pesados simultáneamente. `supabase db diff` se encuentra deshabilitado para las migraciones del repositorio por problemas de dependencias; migraciones manuales y espejo declarativo SQL en el mismo commit. Para funciones privilegiadas: `SECURITY DEFINER`, `search_path = ''`, revocación de `PUBLIC`, grants mínimos. Para policies: `(select auth.uid())`, nunca llamadas desnudas que se evalúen por fila. `pnpm typecheck && pnpm lint` antes de commits. Cloud debe permanecer en lectura hasta autorización.

---

## 3. Inventario físico de base de datos

**43 tablas propias observadas** y 2 vistas propias; distribuidas en cuatro esquemas:

| Esquema   | Tablas | Vistas | Alcance                                                             |
| --------- | -----: | -----: | ------------------------------------------------------------------- |
| `public`  |     20 |      0 | Identidad extendida, tenants, RBAC y servicios comunes              |
| `billing` |     14 |      1 | Catálogo comercial, pagos, estado de suscripciones y reconciliación |
| `private` |      8 |      0 | Helpers, controles de seguridad, workers y estados internos         |
| `audit`   |      1 |      1 | Trazabilidad y lectura administrativa                               |

### 3.1. Tablas del esquema `public` (20)

| Tabla                    | Función principal                                               |
| ------------------------ | --------------------------------------------------------------- |
| `profiles`               | Perfil ampliado de `auth.users`                                 |
| `accounts`               | Tenant personal o de equipo                                     |
| `accounts_memberships`   | Membership N:M, rol del usuario por tenant                      |
| `invitations`            | Invitaciones con tokens hash y expiración                       |
| `auth_recovery_codes`    | Códigos de recuperación MFA almacenados como hash               |
| `platform_admins`        | Lista de administradores globales; separada de roles tenant     |
| `impersonation_sessions` | Registro acotado de sesiones «ver como»                         |
| `memberships_history`    | Historial de cambios de membership, protegido contra mutaciones |
| `announcements`          | Avisos globales de plataforma                                   |
| `notifications`          | Notificaciones por usuario y publicación Realtime               |
| `feature_flags`          | Catálogo de toggles operacionales                               |
| `feature_flag_overrides` | Overrides por tenant                                            |
| `projects`               | Recurso de referencia por cuenta                                |
| `documents`              | Recurso de referencia perteneciente a cuenta y proyecto         |
| `api_keys`               | Claves por cuenta, guardadas como hash                          |
| `webhook_endpoints`      | Endpoints suscritos y secreto gestionado aparte                 |
| `webhook_deliveries`     | Entregas, intentos y estados de reintento                       |
| `robot_contacts`         | Vertical Robot diferida                                         |
| `robot_memories`         | Vertical Robot diferida                                         |
| `robot_routines`         | Vertical Robot diferida                                         |

### 3.2. Tablas del esquema `billing` (14)

| Tabla                  | Función principal                                                             |
| ---------------------- | ----------------------------------------------------------------------------- |
| `plans`                | Planes comerciales con precio, moneda, periodo, features y limits             |
| `provider_prices`      | Mapeo plan/precio externo por proveedor y moneda                              |
| `customers`            | Identidad comercial de una cuenta en un proveedor                             |
| `subscriptions`        | Estado, plan, período, cancelación y proveedor                                |
| `subscription_items`   | Ítems flat/per-seat/metered/tiered; modelo no implica motor de cobro completo |
| `invoices`             | Facturas y totales                                                            |
| `invoice_line_items`   | Líneas por factura                                                            |
| `payment_methods`      | Referencias tokenizadas a métodos del proveedor                               |
| `payment_attempts`     | Intentos y resultados de cobro                                                |
| `events`               | Eventos entrantes deduplicados por proveedor                                  |
| `checkout_intents`     | Reserva/estado de checkout e idempotencia de inicio                           |
| `reconciliation_state` | Marca de avance y leasing de reconciliación                                   |
| `recovery_jobs`        | Trabajos de recuperación, intentos y leases                                   |
| `financial_anomalies`  | Refund/chargeback/divergencias y su resolución                                |

Vista `billing.v_mrr_by_plan`: agregación de suscripciones activas sobre precio actual del catálogo; **no** una fuente financiera definitiva.

### 3.3. Tablas internas `private` (8)

`account_api_account_admissions`, `account_api_ip_admissions`, `billing_checkout_resolution_context`, `billing_worker_health`, `email_worker_last_invocation`, `rate_limit_counters`, `rate_limits`, `webhook_url_validations`. No son parte de la Data API pública de la aplicación.

### 3.4. Auditoría (1 tabla)

`audit.logs`: `actor_id`, `actor_type`, acción, recurso, `account_id`, datos antes/después en JSONB, IP, user agent, timestamp e `impersonator_id`; trigger de inmutabilidad. Vista `audit.v_recent_activity` incluye nombre/avatar del actor, sin grants directos de lectura para `anon`/`authenticated` en la lectura Cloud.

### 3.5. Esquemas de infraestructura de Supabase

No confundir con DDL propio: `auth`, `storage`, `realtime`, `pgmq`, `vault` y extensiones instaladas. La integración con `auth.users` se realiza mediante FK/trigger, pero no se debe editar su estructura gestionada por Supabase. La tabla `storage.objects` sigue siendo gestionada por el servicio; las policies que nuestra aplicación necesita se mantienen como migraciones versionadas según contrato del repositorio.

---

## 4. Modelo lógico y lifecycle del usuario

```text
auth.users [Supabase administrado]
   |
   | on_auth_user_created -> private.handle_new_user
   v
public.profiles [id = auth.users.id, FK ON DELETE CASCADE]
   |
   | on_profile_created -> private.handle_new_profile
   +--> public.accounts [personal; id = user_id]
   |       |
   |       +--> public.accounts_memberships [role=owner]
   |
   +--> active_account_id -> public.accounts

public.accounts [personal/team]
   +-- N:M public.accounts_memberships -> public.profiles
   +-- public.invitations
   +-- public.projects -> public.documents
   +-- public.api_keys / webhook_endpoints / feature_flag_overrides
   +-- billing.customers -> billing.subscriptions -> billing.plans
```

### 4.1. La decisión `auth.users` + `profiles` es correcta

Supabase recomienda usar tablas propias para datos adicionales y vincularlas a la PK de `auth.users`. La FK `profiles.id -> auth.users.id ON DELETE CASCADE` está correctamente configurada. Triggers `private.handle_new_user` y `private.handle_new_profile` crean perfil y cuenta personal. El perfil almacena: nombres, `display_name`, avatar, locale, timezone, teléfono, fecha de nacimiento (`birth_date`), bio, URL, empresa, onboarding, consentimiento analítico, cuenta activa y marcas de borrado.

**Edad:** correcto almacenar `birth_date` y calcular edad cuando se necesite. No sumar campos sensibles genéricos al template sin finalidad funcional.

### 4.2. Separación entre usuario y cliente comercial

El usuario autenticado no equivale al tenant facturado. `public.accounts` tiene `type` (`personal`/`team`), `id`, slug único, perfil comercial y datos auditables. `accounts_memberships` utiliza PK compuesta `(account_id, user_id)` y roles. Un usuario puede pertenecer a varios tenants, uno por default puede ser el activo, y una cuenta puede estar representada por distintos clientes de pasarela.

**Alcance que soporta:** una instalación del boilerplate puede servir a muchos tenants, cada uno con su propio plan; cada producto derivado personaliza su catálogo y vertical. **No equivale** todavía a una plataforma compartida que vende varios productos independientes con catálogos y suscripciones separadas por producto: `billing.plans` es catálogo global de la instalación, sin dimensión `product_id`.

### 4.3. Responsabilidad de `active_account_id`

El perfil conserva preferencia de cuenta; el hook `custom_access_token_hook` primero valida membership efectiva para respetarla y, si no, usa una pertenencia alternativa. Una actualización directa de `profiles.active_account_id` a una cuenta ajena no se traduce automáticamente en rol de esa cuenta porque el hook vuelve a cruzar membership. Sin embargo, los permisos de columna siguen siendo demasiado amplios y deben probarse con la aplicación real.

---

## 5. RBAC, superadministración y límites de autorización

### 5.1. Enum de roles

`public.membership_role`: `owner`, `admin`, `member`, `viewer`. Los helpers `private.get_user_role` y `private.user_is_member` consultan memberships vivas. En recursos `projects` y `documents`, RLS permite lectura a miembros, creación/edición a `owner/admin/member` y borrado a `owner` (según políticas observadas). Esto ofrece un RBAC **básico y reutilizable**, no un sistema de permisos arbitrarios.

**Rol auditor:** no existe como rol tenant separado. No se requiere para el MVP. De aparecer la necesidad, un permiso focalizado para consulta de logs auditados y filtrados por cuenta puede ser preferible a agregar un rol genérico que lea todo el negocio.

### 5.2. Superadministrador de plataforma

`public.platform_admins(user_id)` separa operadores globales de owners de tenants. `private.assert_platform_admin()` comprueba whitelist y AAL2 real (`auth.jwt() ->> 'aal'`), no la presencia de factor inscrito. Hay RPCs de listado de cuentas, auditoría global, anuncios e impersonación acotada. El registro de «ver como» no debe convertir automáticamente al operador en otro usuario frente a RLS: las RPCs deben seguir comprobando el actor real.

**Estado Cloud al corte:** cero registros en `platform_admins`. La estructura existe pero no hay un operador global configurado; no crear un superadmin automáticamente sin procedimiento explícito y seguro.

### 5.3. Claims y sesiones

El custom access token hook agrega cuenta activa, rol, MFA inscrito, onboarding e indicador de administración. Su función práctica es optimizar UX/gates; una claim JWT puede quedar obsoleta hasta renovación. Para autorizaciones sensibles, las RPCs deben consultar membership/estado actual y exigir AAL2 cuando proceda. Evitar decisiones RLS basadas en `raw_user_meta_data` editable por el usuario.

### 5.4. Futura fase de Next.js, **fuera de este requerimiento**

Que la DB contenga `viewer` no prueba que la UI presente solo acciones de lectura; que exista `admin` no prueba que los formularios distingan owner/admin. La fase 2 deberá auditar: `src/proxy.ts`, route handlers, Server Actions, hooks, navegación, botones, estados vacíos, mensajes 403/upgrade, seguridad de SSR, fallback de cuenta activa, portales de admin y E2E de matriz rol × tenant × operación. Preparar un handoff y no mezclar una reescritura de UI en la auditoría SQL.

---

## 6. Facturación, suscripciones y entitlements

### 6.1. Modelo comercial soportado

```text
billing.plans (catálogo global por instalación)
  +--> provider_prices (precio externo por provider/currency)
  +--> subscriptions
billing.customers (account_id + provider)
  +--> subscriptions (customer_id, plan_id, status, period, provider)
       +--> subscription_items
       +--> invoices -> invoice_line_items
       +--> payment_attempts
       +--> reconciliation_state
billing.events (idempotencia por provider + external_event_id)
billing.checkout_intents (reserva, lease, estado, checkout URL)
billing.recovery_jobs / financial_anomalies
```

Las FKs, índices parciales para IDs externos, unicidad `(account_id, provider)` en customers y `(provider, external_event_id)` en events son decisiones positivas. Las operaciones de checkout utilizan reserva y locks para mitigar duplicados. El diseño aprobado establece que el proveedor cobra y administra dunning; Iroko normaliza estado, permisos y reconciliación.

### 6.2. Catálogo Cloud observado

| `slug`  | Nombre visible | Periodo |     Precio base | Moneda |
| ------- | -------------- | ------- | --------------: | ------ |
| `free`  | Free           | month   |               0 | USD    |
| `pro`   | Plus           | month   |  2.900 centavos | USD    |
| `pro`   | Plus           | year    | 29.000 centavos | USD    |
| `scale` | Pro            | month   |  9.900 centavos | USD    |
| `scale` | Pro            | year    | 99.000 centavos | USD    |

Moneda real del proveedor (p. ej. CLP para Mercado Pago) se configura en `billing.provider_prices`; no asumir que el catálogo USD es la oferta activa en cada pasarela. No hay fila Enterprise al corte. Los planes no son por sí mismos un «producto SaaS» separado dentro de una misma instancia.

### 6.3. Cuotas y features del catálogo

| Límite                  | Free | Plus | Pro |
| ----------------------- | ---: | ---: | --: |
| `seats_max`             |    2 |   10 |  50 |
| `teams_max`             |    1 |    3 |  10 |
| `api_keys_max`          |    2 |   20 | 100 |
| `webhook_endpoints_max` |    0 |   10 |  50 |

Features declaradas: `api_keys_enabled`, `webhooks_enabled`, `priority_support`; los niveles comerciales alteran esos booleanos. RPCs `get_account_entitlements`, `get_account_subscription`, helpers `get_account_plan_row`, `within_plan_limit`, `account_has_feature` y validadores de recursos aplican aspectos del contrato. Invitar miembros, aceptar invitaciones, crear API Keys y crear webhooks tienen verificaciones explícitas de límite; no son solo textos de pricing.

### 6.4. Estados y derecho de acceso

Enum de suscripción: `trialing`, `active`, `past_due`, `canceled`, `paused`, `unpaid`, `incomplete`. `private.get_account_plan_row()` acepta `active` y `trialing`, y también `canceled` si hay `current_period_end > now()`; si no, toma el plan `free`. Esto permite conservar acceso durante un período ya pagado. `public.get_account_subscription()` es consistente en esa regla de período, pero `private.resolve_flag()` solo inspecciona `active/trialing`. **Esta diferencia debe resolverse con una tabla de verdad de entitlements por estado, no por intuición.**

### 6.5. Qué NO significa tener `subscription_items`

El enum `subscription_item_type` tiene `flat`, `per_seat`, `metered`, `tiered`; **no hay evidencia suficiente de un motor completo de medición y facturación de consumo/asientos**, y el diseño aprobado explícitamente lo difiere. Un SaaS con tarifas fijas Free/Plus/Pro está dentro del modelo; cobros por uso, prorrateos, créditos y Enterprise con negociación contractual requieren decisión y alcance adicionales.

### 6.6. Estado Cloud de facturación

Cuatro registros de `subscriptions`: tres `canceled`, uno `paused`; ninguno `active/trialing`. No hay evidencia actual de una suscripción pagada activa ni de cobro real. Probar proveedores reales, firma de webhook, cancelaciones, invoice/PSP, pago fallido, recuperación e idempotencia pertenece a aceptación específica, no a una inferencia desde las tablas.

### 6.7. Reglas de integridad a probar

- Una cuenta puede tener customers de distintos proveedores; no debe producir pagos duplicados por un checkout concurrente inesperado.
- Idempotencia por evento y por intento, con serialización al reservar checkout; no aplicar `UNIQUE` por estado sin comprender transiciones y multi-provider.
- Cambio de plan y downgrade deben actualizar derechos de acceso en un instante y con estado definidos.
- Invoices y payments no «inventan» planes; el mapeo precio del PSP → plan interno se valida.
- Períodos pagados y estados `past_due`, `paused`, `canceled` deben producir el mismo criterio en UI, RPCs y jobs.
- Una factura `void` o `uncollectible` no debe considerarse cobrada.

---

## 7. Features operacionales versus acceso contratado

El esquema tiene `feature_flags`, `feature_flag_overrides` y la función `is_flag_enabled`. Según la implementación, la resolución prevista es: override por cuenta → plan activo → default global → falso. Sin embargo, el catálogo de flags y el JSONB de plan **usan nombres diferentes**.

| `feature_flags.name`  | En `billing.plans.features` | Efecto directo del desajuste                               |
| --------------------- | --------------------------- | ---------------------------------------------------------- |
| `api_keys`            | `api_keys_enabled`          | `resolve_flag('api_keys', ...)` no lee la feature del plan |
| `webhooks`            | `webhooks_enabled`          | `resolve_flag('webhooks', ...)` no lee la feature del plan |
| `notifications`       | sin clave equivalente       | usa default global/override                                |
| `jobs`                | sin clave equivalente       | usa default global/override                                |
| `feature_flags_admin` | sin clave equivalente       | usa default global/override                                |

Datos globales observados: `notifications=true`; `api_keys=false`, `webhooks=false`, `jobs=false`, `feature_flags_admin=false`.

Mientras tanto, los gates SQL sensibles de webhooks usan `private.account_has_feature(account_id, 'webhooks_enabled')`. Esto puede ser intencional si se conceptualizan **dos interruptores independientes**, pero los comentarios y helpers actuales describen una resolución integrada. **Primero establecer la intención real y consumidores, después unificar nombres/contratos o separar formalmente los conceptos.**

Propuesta conceptual (no implementación automática):

- `entitlement`: derecho comercial derivado del plan vigente, con excepciones contractuales explícitas y controladas.
- `operational_flag`: si una funcionalidad se encuentra habilitada en esta instalación / tenant; no eleva cuotas ni autoriza por sí sola.
- `authorization`: rol/tenant/operación, siempre validado independientemente.
- La decisión final cuando corresponda debe cumplir las tres condiciones, sin confiar en un botón oculto.

El dato adicional más relevante: `private.get_account_limit` devuelve NULL para clave ausente, `within_plan_limit` interpreta ese valor como ilimitado, y `src/lib/billing/entitlements.ts` puede degradar errores a límites `{}` para después considerar esos límites inexistentes como ilimitados. **No aceptar fallos de lectura como concesión de derechos nuevos.** Revisar cada consumidor antes de cambiar el contrato para no bloquear operaciones legítimas al restaurar errores.

---

## 8. Seguridad, grants, RLS, RPCs y auditoría

### 8.1. Evidencia positiva

Todas las 20 tablas `public` y las 14 `billing` consultadas tenían RLS habilitado. La mayoría de las tablas de negocio sensibles no conceden acceso directo a `anon` ni a `authenticated`, sino operaciones RPC con autorización. `accounts` y memberships no tienen SELECT directo para usuarios autenticados en el snapshot Cloud; las funciones de lectura recuperan la información requerida. `platform_admins` e `impersonation_sessions` utilizan deny-all. `audit.logs` y `billing.events` tienen mecanismos de inmutabilidad.

En `public`, las policies de `projects`/`documents` verifican membresía y rol utilizando `(SELECT auth.uid())` y helpers internos. La FK de `documents(project_id, account_id)` a `projects(id, account_id)` es especialmente correcta: una policy por sí sola no sustituye esta integridad referencial.

### 8.2. Hallazgo de privilegios por columna en `profiles`

El catálogo mostró `has_column_privilege('authenticated', 'public.profiles', col, 'UPDATE') = true` **en cada columna**. Esto incluye `id` (aunque las policies de fila impiden normalmente hacerlo ajeno), `onboarding_completed`, `created_at`, `deleted_at`, `metadata`, `analytics_consent`, `pending_deletion` y `active_account_id`. Una llamada directa al Data API puede intentar modificar campos que las RPCs de perfil no exponen.

**Impacto a reproducir:** saltar wizard de onboarding, alterar marcas temporales/estado propio, cambiar consentimiento o preferencia de cuenta sin flujo controlado. **No** afirmar elevación a plataforma admin: ese rol está en una tabla separada y el hook verifica pertenencia activa. Evaluar grants por columna vs actualización por RPC/trigger y probar perfil/cuenta activa/consentimiento.

### 8.3. Avisos de advisors, no todos defectos

| Grupo                                                | Cantidad | Lectura correcta                                                                 |
| ---------------------------------------------------- | -------: | -------------------------------------------------------------------------------- |
| `rls_enabled_no_policy`                              |        6 | Puede ser deny-all previsto en tablas internas/API keys                          |
| `function_search_path_mutable`                       |        1 | `billing.assert_provider_price_matches_plan`; invoker, fijar contexto si procede |
| `anon_security_definer_function_executable`          |        2 | `check_request` y `get_active_plans`, posiblemente públicos deliberadamente      |
| `authenticated_security_definer_function_executable` |       56 | Verificar autorización, grants y propósito RPC a RPC                             |
| `auth_leaked_password_protection`                    |        1 | Revisar disponibilidad/plan/activación                                           |
| FK sin índice                                        |        1 | `(project_id, account_id)` en `public.documents`                                 |
| Tabla sin PK                                         |        1 | `private.rate_limits` (posible registro append-only)                             |
| Índices sin uso                                      |       37 | Muestra pequeña; no retirar índices sin observabilidad                           |

**No resolver automáticamente las 56 RPCs** con `REVOKE`: muchas son la API deliberada del producto y tienen `SECURITY DEFINER`, `search_path=''` y checks internos. Verificar que la exposición efectiva y pruebas de acceso negativo coinciden con el contrato. Lo mismo con las vistas `audit.v_recent_activity` y `billing.v_mrr_by_plan`: no tienen `security_invoker` explícito, pero tampoco grants directos a roles de usuario inspeccionados; mantener fuera de acceso directo y revisar privilegios/owners.

### 8.4. Integridad, privacidad y retención

`audit.logs` persiste cambios y datos de contexto; `billing.events` guarda payload JSONB. Validar redacción de secretos, PII, credenciales, política de retención y borrado legal, de manera proporcional al negocio derivado. No inventar retención para Cloud Free sin documentación. Los códigos MFA, API Keys y tokens de invitación se almacenan hashed según el modelo observado, una fortaleza que hay que preservar.

---

## 9. Rendimiento, índices, locks y escalabilidad

### 9.1. FKs e índices

Catálogo de 52 FKs sobre esquemas propios. El adviser identifica `documents_project_account_fkey`: la FK `(project_id, account_id)` carece de un índice apropiado que comience por las columnas de la FK en ese orden. Los índices separados por `project_id` y `account_id` no siempre sustituyen un índice compuesto para joins o delete/cascade. **Agregar solo tras plan/benchmark**, teniendo en cuenta duplicidad y patrón de queries.

### 9.2. Concurrencia

`create_api_key` toma advisory transaction lock y valida cuota; invitaciones se serializan por cuenta y se revalida disponibilidad. `public.create_team` consulta número de equipos del usuario antes de crear; el SQL observado no exhibía un lock de admisión equivalente en esa función. Con dos peticiones simultáneas podría superarse el último cupo: **hipótesis que requiere test de dos conexiones**. También probar el guard último owner y los flujos de checkout/reconciliation.

### 9.3. Tamaño real y límites de certeza

El snapshot tenía 7 perfiles, 11 cuentas, 1 proyecto, 5 filas de catálogo de planes, 4 suscripciones y 5 flags. No se puede extrapolar un rendimiento para millones de registros ni eliminar los 37 índices clasificados «unused» usando una carga tan reducida. Medir sobre fixtures representativas y `pg_stat_statements` antes de proponer índices nuevos o particionado.

### 9.4. MRR y contabilidad

`billing.v_mrr_by_plan` usa precios actuales del catálogo, suma mensual y `precio/12` para planes anuales, agrupando por moneda. **No es MRR contable certificado**: no captura descuentos históricos, impuestos, cambios de precio, reembolsos, prorateos ni necesariamente paid-through; evitar mostrarlo como fuente financiera auditada. En un template es admisible como indicador aproximado rotulado claramente.

---

## 10. Preparación de verticales y módulos futuros

### 10.1. Extensibilidad que ya existe

Nuevas tablas pueden colgar de `account_id`, relacionarse por FK compuesta y aplicar RLS/roles. `projects` y `documents` demuestran el patrón. Los servicios comunes (`api_keys`, `webhooks`, `notifications`, Storage, jobs, audit`) son reutilizables por verticales, aunque su experiencia UI pueda ser opcional.

### 10.2. Límites que deben quedar explícitos

- **Instalación por cliente**: compatible con esquema/catálogo de planes actual; personalización mediante configuración/vertical.
- **Varios productos independientes en una sola instalación con varias suscripciones por tenant**: no es una capacidad modelada como producto/plan multidimensional; sería cambio estructural, fuera del MVP.
- **Roles arbitrarios por cliente**: no; el enum actual tiene cuatro roles de membership.
- **Enterprise por contrato, SSO/SCIM, permisos por recurso, uso medido, créditos**: no son promesas actuales.
- **Chat/mensajería**: no existe como módulo completo; `notifications` y `announcements` son notificaciones/avisos, no conversaciones.
- **Robot**: tablas `robot_contacts`, `robot_memories`, `robot_routines` están en `public`, pero la vertical está diferida y debe estar excluida efectivamente en rutas y acciones del MVP.

### 10.3. Divergencia de configuración observada

Cloud tenía un bucket privado `robot_configs`; el `config.toml` inspeccionado declara `avatars`, `org-assets` y `documents`. No borrar el bucket ni mezclarlo con recursos propios de otro entorno; reconstruir historia/migraciones, confirmar consumidores y documentar excepción o paridad esperada.

---

## 11. Extensiones de PostgreSQL: criterio de selección

Extensiones instaladas observadas: `pg_cron`, `pgmq`, `pg_net`, `pgcrypto`, `supabase_vault`, `pg_stat_statements`, `pg_trgm`, `pg_partman`, `vector` (`pgvector`), `postgis`, `uuid-ossp`, `unaccent`, `moddatetime`, entre otras. Instalación no implica que cada capacidad tenga módulo, pruebas ni necesidad actual.

| Extensión                    | Decisión                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `pg_cron`, `pgmq`, `pg_net`  | Mantener para tareas, correo, reconciliación y jobs ya existentes                               |
| `supabase_vault`, `pgcrypto` | Mantener para claves/secretos, verificar privilegios y uso real                                 |
| `pg_stat_statements`         | Explotar métricas para consultas lentas; no diseñar índices a ciegas                            |
| `pg_trgm`, `unaccent`        | Disponibles para búsquedas de texto si una vertical lo requiere                                 |
| `vector`                     | No construir RAG hasta tener caso, indexación y costo definidos                                 |
| `postgis`                    | Mantener si existen consumidores o se prevé necesidad fundada; no convertirlo en módulo del MVP |
| `pg_partman`                 | No particionar prematuramente logs/eventos; medir volumen                                       |
| `pg_jsonschema`              | Opción futura para validar JSONB de plan tras definir contrato; no instalar por moda            |
| `pg_graphql`                 | No hace falta para el modelo actual PostgREST + RPC                                             |

La decisión no debe orientarse a «encender todas las extensiones», sino a minimizar costo operacional y superficie de ataque con un caso verificable por módulo.

---

## 12. Registro de hallazgos priorizado para Codex

> **P0/P1/P2** propuestos para triage: no reemplazan los IDs ni severidades del registro oficial. Si el plan vigente ya tiene un hallazgo equivalente, usar su ID y no crear duplicados.

| ID local | Riesgo o mejora                                            | Evidencia                                 | Certeza                           | Acción / validación                                                                     |
| -------- | ---------------------------------------------------------- | ----------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------- |
| DB-01    | UPDATE de todas las columnas en `profiles`                 | `has_column_privilege` Cloud + RLS propia | CONFIRMADO en grants              | Reproducir edición directa; restringir campos internos sin romper cuenta/consentimiento |
| DB-02    | Claves de flags no coinciden con features comerciales      | `resolve_flag`, tablas de planes/flags    | CONFIRMADO en SQL                 | Definir contrato dual o canónico, corregir consumidores y tests                         |
| DB-03    | Límite ausente/error se interpreta como ilimitado          | `within_plan_limit`, TS `withinLimit`     | CONFIRMADO en implementación      | Reproducir condiciones; fail-closed para límites exigibles                              |
| DB-04    | `canceled` paid-through difiere entre entitlements y flags | `get_account_plan_row` vs `resolve_flag`  | CONFIRMADO en SQL                 | Tabla de verdad de estados y cambio mínimo consistente                                  |
| DB-05    | Riesgo de race en `create_team`                            | count → insert sin lock visible           | HIPÓTESIS                         | Dos sesiones concurrentes, última cuota; reparar solo si se reproduce                   |
| DB-06    | Dos suscripciones pagas potenciales entre proveedores      | modelo indirecto customers/subscriptions  | HIPÓTESIS                         | Test de intents simultáneos, eventos y transición provider; no unique prematura         |
| DB-07    | FK compuesta de documentos sin índice de cobertura         | Supabase performance adviser              | CONFIRMADO en adviser             | EXPLAIN/benchmark e índice compuesto si procede                                         |
| DB-08    | `search_path` mutable en una función billing               | Adviser / función invoker                 | CONFIRMADO en adviser             | Revisar definición y fijar configuración mínima si procede                              |
| DB-09    | RPCs privilegiadas expuestas según advisories              | 2 anon, 56 authenticated                  | CONFIRMADO en grants              | Auditar intención y permisos efectivos por RPC, sin revocar a ciegas                    |
| DB-10    | Tablas RLS sin policies                                    | 6 advisories                              | CONFIRMADO, no necesariamente bug | Documentar deny-all previsto y pruebas negativas                                        |
| DB-11    | Leaked-password protection deshabilitada/no disponible     | Adviser Auth                              | CONFIRMADO como aviso             | Verificar disponibilidad/plan y control alternativo                                     |
| DB-12    | `v_mrr_by_plan` es aproximación de catálogo                | Definición de vista                       | CONFIRMADO en SQL                 | Etiquetar métrica y evitar uso contable hasta modelo apropiado                          |
| DB-13    | Índices unused (37)                                        | Adviser en DB pequeña                     | CONFIRMADO como métrica limitada  | No borrar sin carga/estadísticas significativas                                         |
| DB-14    | `private.rate_limits` sin PK                               | Adviser                                   | CONFIRMADO como diseño            | Validar semántica append-only y operación; no crear PK sin caso                         |
| DB-15    | Drift bucket Robot `robot_configs`                         | Cloud vs `config.toml`                    | CONFIRMADO en inventario          | Documentar propiedad/consumidores, no borrar                                            |
| DB-16    | Superadmin sin usuario asignado                            | `platform_admins` count=0                 | CONFIRMADO Cloud                  | Documentar bootstrap seguro; no crear admin por defecto                                 |
| DB-17    | Auditor tenant como rol no existe                          | Enum memberships                          | CONFIRMADO, feature diferida      | No agregar al freeze sin requisito                                                      |
| DB-18    | Billing metered/asientos no está certificado               | Enum + diseño v2                          | LIMITACIÓN                        | No prometer; diferir modelos avanzados                                                  |
| DB-19    | Cobro real y escalabilidad sin evidencia                   | 4 subs no activas / base pequeña          | NO VERIFICADO                     | E2E proveedor real, staging, benchmarks y límites por escenario                         |
| DB-20    | Revisión UI por rol no realizada                           | Fase 2 deliberada                         | NO VERIFICADO                     | Handoff de rutas, actions, hooks y E2E, sin ampliar este requerimiento                  |

**Orden recomendado:** DB-01/02/03/04; después DB-05/06/07/08/09/10; luego evidencias, documentación, performance y capacidades diferidas. Si un hallazgo confirma un P0/P1 en una superficie ofertada, resolverlo antes de seguir expandiendo el análisis.

---

## 13. Matriz de pruebas y aceptación recomendada

| Escenario                                                 | Esperado                                                               | Superficie / evidencia                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Nuevo usuario y perfil                                    | Perfil + cuenta personal + membership owner atómicos; ningún duplicado | Triggers, FKs, tests SQL                  |
| Usuario ajeno a cuenta                                    | 0 filas o error de autorización; nunca filtrar información             | RLS, RPC, Data API                        |
| Viewer modifica proyecto/documento                        | Denegado                                                               | RLS + acciones de referencia              |
| Member edita recurso propio del tenant                    | Permitido donde contrato indique                                       | RLS + FK + test                           |
| Admin cambia rol a otro admin/owner                       | Solo si contrato lo permite; no escalada lateral                       | RPC + tests SQL                           |
| Último owner sale/transfiere                              | Garantizar owner; sin deadlock con concurrencia                        | Trigger + RPC + concurrencia              |
| Admin global sin AAL2                                     | Denegado                                                               | `private.assert_platform_admin`           |
| Usuario edita columna interna de perfil                   | Denegado si campo es reservado; datos legítimos siguen editables       | Grants de columna, Data API directa       |
| Cuenta Free agota API Keys/seats/teams/webhooks           | Rechazo atómico y error estable                                        | RPC + dos conexiones                      |
| Falta clave JSONB de límite                               | No se transforma silenciosamente en ilimitado                          | Helper SQL + TS                           |
| Cancelación con período pagado futuro                     | Acceso comercial coherente hasta el límite elegido                     | Entitlements + features + RLS de recursos |
| Past_due/paused/unpaid/incomplete                         | Matriz explícita de acceso; no inventar estado activo                  | Billing RPCs                              |
| Webhook repetido/reordenado                               | Idempotencia y reconciliación consistente                              | Event reducer + SQL                       |
| Dos checkouts simultáneos                                 | No suscripciones pagadas duplicadas indebidamente                      | Lease + serialización + E2E               |
| Documento enlazado con proyecto de otra cuenta            | Rechazado por FK compuesta                                             | DB constraint                             |
| Consulta de auditoría tenant                              | Solo cuenta autorizada; sin PII innecesaria                            | RPC de auditoría                          |
| Proyecto derivado instala/cambia branding/agrega vertical | Mismas reglas base y migración incremental segura                      | Plan 015                                  |

**Gate:** pruebas positivas y negativas, escenario real de instalación derivada, `pnpm typecheck && pnpm lint` y pgTAP seleccionados, sin Cloud mutations no autorizadas. El MVP solo sale del freeze cuando sus planes de aceptación vigentes se cierran con evidencia.

---

## 14. Diseño de entrega y handoff para Codex

Codex debe producir un informe de estado renovado (fecha, SHA, entorno), matriz de hallazgos reconciliada con el backlog real, pruebas que reproduzcan cada problema, SQL de corrección versionado y espejo, cambios mínimos en consumidores TS, y un PR revisable con todos los comandos de prueba. Debe categorizar cada decisión como **corregido / intencional y justificado / diferido / no verificado**, no eliminar hallazgos por tener demasiados warnings.

**El siguiente paso separado** será una auditoría Next.js: comprobar que `viewer`, `member`, `admin`, `owner` y `platform_admin` disponen únicamente de las vistas y acciones permitidas. Su matriz debe verificarse en SSR, client components, Server Actions, Route Handlers, menús y pruebas Playwright, y no confiar en mostrar/ocultar botones como autorización.

---

## 15. Referencias y trazabilidad

**Repositorio y código:**

- [README](https://github.com/pipec80/iroko/blob/main/README.md)
- [AGENTS.md](https://github.com/pipec80/iroko/blob/main/AGENTS.md)
- [Estado vigente](https://github.com/pipec80/iroko/blob/main/docs/current-state.md)
- [Roadmap del freeze](https://github.com/pipec80/iroko/blob/main/ROADMAP.md)
- [Capacidades](https://github.com/pipec80/iroko/blob/main/docs/capabilities.md)
- [Estrategia de producto](https://github.com/pipec80/iroko/blob/main/docs/architecture/product-strategy.md)
- [Diseño Billing v2](https://github.com/pipec80/iroko/blob/main/docs/architecture/billing-platform-v2-design.md)
- [Flags TS](https://github.com/pipec80/iroko/blob/main/src/lib/flags/index.ts)
- [Entitlements TS](https://github.com/pipec80/iroko/blob/main/src/lib/billing/entitlements.ts)
- [Flags SQL](https://github.com/pipec80/iroko/blob/main/supabase/schemas/flags.sql)
- [Schemas SQL](https://github.com/pipec80/iroko/tree/main/supabase/schemas)
- [Tests DB](https://github.com/pipec80/iroko/tree/main/supabase/tests/database)

**Supabase y PostgreSQL:**

- [Supabase — Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase — Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase — Database Functions / Security Definer](https://supabase.com/docs/guides/database/functions)
- [Supabase — Postgres Extensions](https://supabase.com/docs/guides/database/extensions)
- [Supabase — pg_stat_statements](https://supabase.com/docs/guides/database/extensions/pg_stat_statements)
- [Supabase — pg_jsonschema](https://supabase.com/docs/guides/database/extensions/pg_jsonschema)
- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)

**Método:** inspección read-only de catálogos y advisories Cloud, lectura de funciones y del repositorio; no se conservaron secretos, tokens ni datos personales de usuarios en el informe.

---

## Anexo A — Prompt maestro integrado

El **texto íntegro y listo para pegar** se incorpora a continuación. También se entrega por separado como `PROMPT_MASTER_CODEX_ASTRA_AUDITORIA_DB_IROKO.md`, para copiarlo directamente en Codex.

---

# PROMPT MAESTRO — Auditoría y corrección del modelo de datos SaaS de Iroko

> **Uso:** copiar este archivo completo como nuevo requerimiento a Codex (preferentemente un modelo de alta capacidad de razonamiento). Adjunto de referencia: `AUDITORIA_ARQUITECTURA_DATOS_IROKO_2026-11-05.md`.
>
> **Fecha y baseline de referencia:** 2026-11-05; `pipec80/iroko`, `main` observado `032f1a30794241cebc97e0ccd32b48d836110475`, Supabase Cloud `iroko` en organización Free, PostgreSQL 17.6, 178 migraciones. **Vuelve a comprobar todo al iniciar; esta instantánea puede quedar obsoleta.**

## Rol y misión

Actúa como **arquitecto principal de bases de datos, DBA PostgreSQL/Supabase, ingeniero de seguridad RLS, arquitecto SaaS multi-tenant y revisor independiente de software**. Tu misión no es redactar otro análisis superficial: **inspecciona el código y la base real, reproduce los hallazgos, corrige los defectos confirmados dentro del alcance vigente y entrega evidencia comprobable**.

El producto es un **SaaS Boilerplate reutilizable basado en Supabase + Next.js**, con Auth, perfiles, organizaciones, memberships/RBAC, billing multiproveedor, cuotas y entitlements, Storage, Realtime, Edge Functions, colas, auditoría y verticales futuras. La arquitectura debe permitir ofrecer el template a un tercero para construir, por ejemplo, un sistema de gestión con planes Free, Pro y Enterprise, sin perder aislamiento entre organizaciones ni depender de un producto vertical específico.

**Alcance de esta entrega: PostgreSQL, SQL, RLS, grants, triggers, RPCs, migraciones, tests de base y contratos de servidor directamente afectados.** No hagas aún la auditoría integral de vistas/componentes/UX Next.js por rol. Deja su contrato y backlog listos para una segunda fase. Corrige consumidores TypeScript mínimos si es necesario para preservar el funcionamiento de cambios reales en DB.

## Reglas innegociables del repositorio

1. Lee, en este orden, `AGENTS.md`, `docs/index.md`, `docs/current-state.md`, ADR vigente (`docs/adr/0005-replicable-saas-mvp-and-bounded-acceptance.md`), `ROADMAP.md`, planes `014/015/016` pertinentes y `TESTING-PLAN.md` **antes de editar o ejecutar tests**. Respeta la jerarquía de autoridad del repositorio: código y tests prevalecen sobre documentación histórica.
2. Respeta el **feature freeze** vigente: prioriza reparar y demostrar capacidades ya ofertadas. **No agregues** chat, roles arbitrarios, plugins, metered billing, otra pasarela, vertical Robot ni herramientas nuevas solo por ampliar catálogo. Si un requisito excede el freeze, clasifícalo y difiérelo con propietario explícito.
3. **Inspección Cloud solo lectura.** No uses `db push`, `db reset --linked`, `config push`, migraciones, deletes, cambios de grants, secretos, despliegues ni alteraciones remotas sin autorización explícita del mantenedor. Nunca ejecutes queries destructivas en Cloud. Una migración se desarrolla y valida primero en el stack local oficial `saas-boilerplate`.
4. En Windows, **`supabase db diff` está roto para el flujo actual**; no lo uses para producir migraciones. Escribe cada migración **a mano** en `supabase/migrations/` y actualiza **en el mismo commit** el archivo espejo pertinente de `supabase/schemas/*.sql`; respeta excepciones de objetos gestionados por Supabase (p. ej. políticas `storage.objects`). `pg-delta` sigue siendo experimental/no debe aplicarse sin revisión de grants.
5. RLS de recursos multi-tenant usa identidad actual, **`(select auth.uid())`** en policies, nunca `auth.uid()` desnudo. Protege cada operación con `account_id` y membership/rol efectivos. No tomes `raw_user_meta_data` ni claims JWT de rol obsoletos como única fuente de autorización. `SECURITY DEFINER`: `SET search_path = ''`, referencias SQL calificadas y `REVOKE EXECUTE ... FROM PUBLIC`, grants mínimos por rol. Verifica acceso directo a tablas, RPCs y Storage.
6. Código TS: `strict`, **sin `any`**, SOLID/DRY/KISS/YAGNI, early returns, funciones pequeñas, logger Pino (sin `console.log`). `src/env.ts` es la fuente autorizada de variables. No crees `middleware.ts`; el proyecto usa `src/proxy.ts`.
7. No arranques builds, bases, suites pesadas ni workers en paralelo: el host Windows tiene 16 GB con Docker Desktop. Ejecuta tests focalizados primero; guarda el resultado exacto.
8. Antes de cualquier commit: **`pnpm typecheck && pnpm lint`**. Usa conventional commits (`fix:`, `test:`, `docs:`), PR coherente y, si se autoriza merge y CI está verde, `gh pr merge --squash --delete-branch`. No sobrescribas cambios preexistentes ni alteres proyectos vecinos. Si descubres un bug existente en la rama afectada, arréglalo en esa misma rama si pertenece al alcance.
9. No declares PASS porque exista SQL, un test escrito o una función instalada: diferencia `IMPLEMENTADO`, `VERIFICADO LOCAL`, `VERIFICADO CLOUD`, `NO VERIFICADO`, `DIFERIDO`.

## Fuente de evidencia inicial — no asumir que está vigente

- En Cloud se observaron **43 tablas propias**: `public` 20, `billing` 14, `private` 8 y `audit` 1. `auth.users` es administrada por Supabase; `public.profiles` la extiende con FK `ON DELETE CASCADE`.
- `public.accounts` y `public.accounts_memberships` modelan tenants y usuarios N:M. Enum `membership_role`: `owner`, `admin`, `member`, `viewer`. `public.platform_admins` y `private.assert_platform_admin()` implementan administración global con requisito AAL2; la tabla Cloud estaba vacía.
- El modelo de suscripciones usa `billing.plans`, `provider_prices`, `customers`, `subscriptions`, `subscription_items`, `invoices`, `invoice_line_items`, `payment_methods`, `payment_attempts`, `events`, `checkout_intents`, `recovery_jobs`, `reconciliation_state`, `financial_anomalies`.
- Catálogo observado: `free` US$0 mensual; `pro`/Plus US$29 mensual y US$290 anual; `scale`/Pro US$99 mensual y US$990 anual. Son precios de catálogo internos; los proveedores pueden tener precios/monedas propios. No hay Enterprise registrado. Cuotas `seats_max`, `teams_max`, `api_keys_max`, `webhook_endpoints_max`.
- `pg_cron`, `pgmq`, `pg_net`, `pg_stat_statements`, `pg_trgm`, `vector`, `postgis`, `pg_partman`, `pgcrypto` y Vault estaban instaladas. No agregues extensiones sin necesidad verificada.
- Todas las tablas `public` inspeccionadas tenían RLS habilitado; `billing.*` también. Los grants son restrictivos en tablas críticas. Había 49 triggers, 52 foreign keys de aplicación inspeccionadas, una vista en `billing` y una en `audit`.
- El asesor Cloud reportó un `search_path` mutable (`billing.assert_provider_price_matches_plan`, invoker), 2 RPC `SECURITY DEFINER` invocables por `anon`, 56 por `authenticated`, 6 tablas RLS sin policies (potencialmente _deny-all_), una advertencia de leaked-password protection, 1 FK sin índice compuesto (`documents_project_account_fkey`), `private.rate_limits` sin PK y 37 índices sin uso. **Son advertencias a clasificar, no 104 defectos demostrados.**
- `public.profiles` tenía `UPDATE` concedido a `authenticated` sobre **todas las columnas** de su propia fila, incluyendo `onboarding_completed`, `created_at`, `deleted_at`, `active_account_id` y `metadata`. RLS protege la fila, no las columnas. Impacto exacto por demostrar.
- La función `private.resolve_flag()` busca `p.features -> p_flag_name` y los flags globales se llaman `webhooks`/`api_keys`, mientras el JSONB de planes usa `webhooks_enabled`/`api_keys_enabled`; otra función (`private.account_has_feature`) busca directamente las claves `*_enabled` y se usa para gating de webhooks. **Divergencia funcional confirmada; investigar consumidores antes de cambiar nombres.**
- `get_account_entitlements()` y `private.get_account_plan_row()` admiten `active`/`trialing` y `canceled` pagado-hasta; `private.resolve_flag()` solo `active`/`trialing`. Verificar semántica de acceso paid-through y downgrade.
- `private.get_account_limit()` puede devolver NULL para clave ausente; `private.within_plan_limit()` trata NULL como ilimitado. `src/lib/billing/entitlements.ts` vuelve a Free/JSON vacío ante error y `withinLimit()` interpreta ausencia como ilimitado. Verifica si hay bypass actual, y define un contrato que no eleve cuotas accidentalmente.
- `public.create_team()` verifica `teams_max` con `count()` pero en la definición observada no se veía serialización de esa admisión. Debes reproducir o descartar carrera por concurrencia: no declarar bug sin test.
- `public.invite_members()`, `public.accept_invitation()` y `public.create_api_key()` incluyen controles reales de cuotas, locks y/o serialización. No deshagas esas protecciones ni apliques un «fix» genérico.
- `billing.subscriptions` no tiene una restricción trivial que garantice «una activa por cuenta» entre múltiples proveedores (la relación con `account_id` pasa por `customers`). Investiga serialización, intents, idempotencia y lifecycle; una unique indiscriminada puede romper transiciones legítimas. En la muestra Cloud había 4 suscripciones (3 `canceled`, 1 `paused`) y ninguna activa: **no es prueba de checkout real**.
- `documents(project_id, account_id)` referencia `projects(id, account_id)`: buen aislamiento físico. Asesor indicó ausencia de índice que cubra la FK compuesta. La tabla `private.rate_limits` sin PK puede ser deliberadamente append-only.
- `billing.v_mrr_by_plan` calcula un MRR simplificado desde el precio actual del plan; no representa finanzas conciliadas, impuestos, descuentos ni todas las monedas/estados.
- `robot_contacts`, `robot_memories`, `robot_routines` siguen en `public` y el bucket privado `robot_configs` apareció en Cloud pero no en los tres buckets declarados en `config.toml`. Vertical Robot diferida: validar exclusión y drift, **no borrar ni mover datos automáticamente**.
- Hay tablas `public.notifications` y `announcements` para notificaciones y avisos; **no existe chat conversacional** y no es parte de este requerimiento.

## Procedimiento obligatorio

### Fase 0 — Baseline y contrato

- Lee instrucciones, planes, árbol de esquemas, historial y estado de Git. Identifica `HEAD`, rama, modificaciones ajenas y baseline de migraciones locales/Cloud.
- Emite una matriz `hallazgo | evidencia | severidad | estado | superficie ofrecida | plan dueño | prueba requerida`. Si hay hallazgos ya asignados, continúa el plan existente: **no abras un backlog competidor ni inventes un segundo roadmap**.
- Determina si el objetivo actual admite reparaciones en `014/015/016`; si alguno no pertenece al freeze, deja propuesta diferida y explica por qué.

### Fase 1 — Reconstrucción de entidades y seguridad

1. Inspecciona DDL de `auth.users` únicamente en términos de integración, triggers `private.handle_new_user`/`private.handle_new_profile`, PK/FK y constraints de `profiles`, `accounts`, `accounts_memberships`, invitaciones y cuentas personales/team.
2. Reconstruye el mapa de `billing.*`, claves externas, unicidades, check constraints, índices, tipos enum, triggers, máquinas de estado, idempotencia, acceso paid-through, suscripciones múltiples y billing por proveedor.
3. Audita desde `pg_catalog`, `information_schema`, `pg_policies`, `pg_proc`, `pg_default_acl`, `pg_indexes` y `pg_trigger`: GRANT/REVOKE, RLS, `SECURITY DEFINER`, `search_path`, ejecución `anon`/`authenticated`/`service_role`, vistas y funciones expuestas, schema search path, FKs, constraints y referencias entre tenants.
4. Distingue las tablas operadas por Supabase (`auth`, `storage`, `realtime`) de las nuestras. No edites estructuras gestionadas por Supabase directamente.
5. Compara migraciones versionadas, archivos `supabase/schemas/*.sql` y estado Cloud (solo lectura) con evidencia de divergencia exacta.

### Fase 2 — Pruebas que deben fallar/funcionar

Construye o amplía pgTAP y tests focalizados con **positivos y negativos**, conservando fixtures seguras:

- Alta y borrado: Auth → profile → cuenta personal → membership owner; rechazo de FK rota y limpieza controlada.
- `profiles`: usuario A puede editar solo atributos autorizados de A; no puede cambiar `onboarding_completed`, timestamps, estado interno ni forzar una cuenta activa ajena si el contrato no lo permite; usuario B jamás modifica A.
- RBAC en dos cuentas separadas: owner/admin/member/viewer, lectura/escritura/borrado, cambios de rol, transferencia/último owner, auditoría y restricciones de administración global. `platform_admin` requiere sesión realmente AAL2 para RPCs sensibles.
- Billing: Free fallback, `active`, `trialing`, `canceled` pagado-hasta, `past_due`, `paused`, `unpaid`, `incomplete`; transición entre proveedores, duplicados de eventos, retries, recovery, idempotencia de checkout y concurrencia. Define expectativa explícita para cada estado, no inventes semántica.
- Entitlements/flags: matriz por plan, `features` vs `limits`, override operacional, faltante/inválido, errores de consulta, cuotas 0, límite cumplido, downgrade y derechos vigentes tras cancelación.
- Concurrencia: dos `create_team` sobre último cupo, dos invitaciones/aceptaciones, dos API Keys, dos endpoints webhook, dos checkouts distintos del mismo account/provider, varios proveedores. Usa sesiones separadas y aislamiento transaccional correcto.
- Seguridad: solicitudes `anon`, `authenticated` de tenant ajeno, sesiones obsoletas, Data API directa, SQL/RPC y Storage para recursos críticos, incluyendo rollback sin efectos parciales.
- Rendimiento: `EXPLAIN (ANALYZE, BUFFERS)` sobre fixtures representativas y pruebas del índice compuesto de `documents`; no borres índices por el lint «unused» de una base pequeña.

### Fase 3 — Correcciones focales (no solo documentación)

- Corrige problemas **confirmados y dentro del alcance** en la misma rama, de menor a mayor superficie; acompaña cada corrección con un test que fallaba antes y pasa después.
- Para `profiles`, elige el mínimo de column-level grants / RPCs / trigger, teniendo en cuenta flujo de onboarding, cuenta activa y consentimiento; documenta por qué no rompe el perfil ni Auth.
- Para flags y cuotas, establece contratos separados: **feature comercial** vs **flag operacional**; define claves canónicas y criterios temporales; evita escalación por `NULL`, errores o claims desactualizados. Preserva `seats_max`, `teams_max`, `api_keys_max`, `webhook_endpoints_max` y escenarios pagados actuales.
- Para cualquier corrección de concurrencia, usa lock/índice/constraint acorde al invariante real. No sobre-generalices para modelos que el producto no ofrece (metered/Enterprise/custom roles).
- Cada migración debe ser manual y tener espejo SQL, pruebas, tipo generado si cambia superficie API y estrategia de rollback. Nunca alteres `auth.users` administrada.
- Antes de corregir una advertencia de linter, demuestra si es real o intencional. `get_active_plans()` anónima puede ser una API pública legítima; tables RLS sin policies pueden ser deny-all. Mantén los grants necesarios para los flujos ofrecidos.

### Fase 4 — Verificación y entrega

- Ejecuta **tests focalizados** primero (pgTAP; tests de RPC/surface/TypeScript). No dispares suites pesadas en paralelo. Verifica schema reset local solo tras proteger el entorno y confirmar que no hay cambios/fixtures ajenas que se perderán.
- Antes de commits: `pnpm typecheck && pnpm lint`; además usa los tests y chequeos locales relevantes. Registra comando, resultado, fecha, SHA y entorno.
- No escribas en Cloud sin autorización; si hace falta una migración remota, entrega preflight, lista exacta de objetos afectados, propuesta de SQL, impacto, rollback y petición explícita de autorización, **sin ejecutarla**.
- Deja cambios versionados en PR(s) pequeños y auditables. No fusiones unilateralmente un PR no autorizado; si se autoriza merge y CI verde, `gh pr merge --squash --delete-branch`.
- Actualiza la documentación canónica sin borrar hallazgos pendientes ni reutilizar PASS obsoletos.

## Entregables exigidos

1. **Informe DBA verificable** en `docs/audits/` con: inventario de entidades, relaciones, catálogo, matriz tenant/rol/acción, diagramas de flujo, esquema lógico, invariantes, seguridad, índices y resultados de prueba. Cada afirmación incluye archivo:línea y/o SQL con resultados sanitizados, entorno, fecha, SHA y certeza.
2. **Remediaciones reales** del alcance ofrecido: migraciones manuales + espejo SQL + pgTAP + cambios TS mínimos; no aceptar un PR únicamente documental si existen defectos confirmados corregibles.
3. **Plan de ejecución actualizado** en el plan dueño (014/015/016 o el que corresponda), con IDs, severidad, criterios de aceptación y dependencias. Sin duplicar backlog.
4. **Reporte de paridad** repo/local/Cloud, grants/DDL/migraciones, y del estado real de las extensiones que usa el producto.
5. **Matriz de capacidades comerciales**: qué funciona hoy en un producto derivado Free/Plus/Pro; qué requeriría Enterprise, asientos facturables o consumo medido (diferido). Diferenciar una instalación por cliente de un hipotético catálogo multi-producto compartido (no asumido).
6. **Handoff para fase 2 (Next.js)**: lista precisa de Server Actions, hooks, rutas, componentes y pruebas E2E que deberán verificar UI y restricciones de roles. No realizar esa fase ahora, salvo ajustes técnicos mínimos indispensables.
7. **Resumen final**: hallazgos corregidos, pendientes con dueño, pruebas PASS/FAIL/NO VERIFICADO, archivos modificados, commits/PR y riesgos residuales.

## Criterios de aceptación («Definition of Done»)

- **Ninguna** operación de usuario puede leer/escribir datos de otro tenant mediante cambiar un UUID, llamar directamente RPC/Data API o usar sesión obsoleta.
- `viewer` no ejecuta acciones de escritura; `member`, `admin`, `owner` reciben sus acciones exactamente según contrato; `platform_admin` no se convierte automáticamente en miembro de cualquier cuenta.
- Un usuario no puede modificar atributos internos de su perfil si estos dependen de un flujo controlado; la edición de datos personales legítimos sigue funcionando.
- Plan, flags, cuotas y derechos de acceso son coherentes con el mismo estado de suscripción y no se amplían por error o clave JSONB ausente.
- Cuotas e invariantes relevantes resisten solicitudes concurrentes y eventos duplicados.
- Los tests que prueban el defecto fallan sobre baseline o demuestran claramente la condición antes de la corrección, y pasan después; pruebas de regresión previas continúan funcionando.
- No quedan fallos críticos confirmados de DB en el alcance ofrecido sin tratar. Las limitaciones reales se marcan y asignan, no se declaran «solucionadas» por escribir una nota.
- `pnpm typecheck && pnpm lint` PASS antes de commits; migraciones SQL y espejo en el mismo commit; Cloud intacto hasta autorización.
- Se entrega una **interfaz de verificación para la fase 2 de Next.js**, sin mezclarla en este requerimiento.

## Formato de la respuesta de Codex al finalizar

Entrega en español neutro, conciso y técnico:

**Baseline** (rama/SHA/stack); **Hallazgos** (P0/P1/P2, confirmado vs hipotético); **Cambios** (rutas y SQL); **Pruebas** (comandos exactos y resultados); **Cloud** (solo lectura, divergencias); **Riesgos residuales**; **PR/commits**; **Handoff Next.js**. Si algo no pudo verificarse, marca `[NO VERIFICADO]`, especifica la causa y el siguiente test reproducible.

**No cierres el MVP por haber terminado esta auditoría.** Respeta los gates actuales de planes 014/015/016 y obtén evidencia de replicación, aceptación local/Cloud y funcionalidad de los módulos ofertados.
