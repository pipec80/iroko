-- Completa comentarios (COMMENT ON TABLE/COLUMN/INDEX) faltantes en el schema
-- public. Mismo criterio que 20260724200000_comments_billing_schema.sql: solo
-- metadata, ninguna estructura ni dato cambia. Cubre las tablas de fundación
-- F1 que nunca recibieron documentación in-DB, y completa los huecos de
-- columnas "genéricas" (id/created_at/updated_at) en tablas de F3 que solo
-- comentaron sus columnas de negocio.

-- ============================================================================
-- public.accounts
-- ============================================================================
COMMENT ON TABLE public.accounts IS
  'Tenant del multi-tenancy (F1). Cada usuario tiene exactamente una cuenta type=personal (id = profiles.id, creada por private.handle_new_profile); type=team se crea a pedido. Todo recurso de negocio cuelga de una account_id.';
COMMENT ON COLUMN public.accounts.id IS
  'Clave primaria UUID. Para cuentas personales, es IGUAL a profiles.id/auth.users.id por convención (no por FK formal) -- ver private.handle_new_profile().';
COMMENT ON COLUMN public.accounts.type IS
  'personal (1:1 con un usuario, sin transferencia de ownership posible) o team (multi-usuario, con owner(s)).';
COMMENT ON COLUMN public.accounts.name IS
  'Nombre mostrado de la cuenta/organización.';
COMMENT ON COLUMN public.accounts.slug IS
  'Identificador único en URLs, autogenerado a partir de name (private.slugify) con sufijo de desambiguación si hay colisión.';
COMMENT ON COLUMN public.accounts.logo_url IS
  'Path relativo dentro del bucket org-assets. NULL = sin logo (fallback a iniciales en la UI).';
COMMENT ON COLUMN public.accounts.billing_email IS
  'Email de contacto para facturación, independiente del email de auth del owner.';
COMMENT ON COLUMN public.accounts.metadata IS
  'jsonb libre para datos auxiliares que no ameritan columna propia.';
COMMENT ON COLUMN public.accounts.created_by IS
  'Usuario que creó la cuenta. ON DELETE SET NULL: la cuenta sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.accounts.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.accounts.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.accounts.deleted_at IS
  'NULL = activa. Soft-delete: se setea en request_account_deletion()/delete_my_account(); el hard-delete real corre 90 días después vía cron hard-delete-old-accounts.';

COMMENT ON INDEX public.accounts_slug_key IS
  'El slug es único en toda la plataforma (namespace global de URLs).';
COMMENT ON INDEX public.idx_accounts_created_by IS
  'Soporte del FK created_by.';
COMMENT ON INDEX public.idx_accounts_slug IS
  'Lookup de cuenta por slug (resolución de rutas /org/{slug}).';
COMMENT ON INDEX public.idx_accounts_type IS
  'Soporte de queries que filtran por type (ej. cron hard-delete-old-accounts, listados de admin).';

-- ============================================================================
-- public.accounts_memberships
-- ============================================================================
COMMENT ON TABLE public.accounts_memberships IS
  'Relación N:M usuario-cuenta con rol (F1). Es la tabla de RBAC del multi-tenancy: RLS y RPCs de negocio verifican membership+role acá, no en accounts directo.';
COMMENT ON COLUMN public.accounts_memberships.account_id IS
  'Cuenta de la membership. Parte de la PK compuesta (account_id, user_id).';
COMMENT ON COLUMN public.accounts_memberships.user_id IS
  'Usuario miembro. Parte de la PK compuesta (account_id, user_id).';
COMMENT ON COLUMN public.accounts_memberships.role IS
  'owner, admin o member. El trigger enforce_single_owner_per_account impide dejar una cuenta type=team sin owner.';
COMMENT ON COLUMN public.accounts_memberships.invited_by IS
  'Usuario que invitó a este miembro. NULL si no vino de una invitación (ej. el creador de la cuenta).';
COMMENT ON COLUMN public.accounts_memberships.created_at IS
  'Timestamp en que el usuario se unió a la cuenta (inmutable).';
COMMENT ON COLUMN public.accounts_memberships.updated_at IS
  'Timestamp de última modificación (ej. cambio de rol).';

COMMENT ON INDEX public.idx_memberships_invited_by IS
  'Soporte del FK invited_by.';
COMMENT ON INDEX public.idx_memberships_user_id IS
  'Soporte de "cuentas a las que pertenece este usuario" (ej. get_my_accounts()).';

-- ============================================================================
-- public.profiles
-- ============================================================================
COMMENT ON TABLE public.profiles IS
  'Perfil de usuario 1:1 con auth.users (F1) -- separa datos editables por el propio usuario de la tabla auth.users, que no es accesible directo por authenticated.';
COMMENT ON COLUMN public.profiles.id IS
  'Clave primaria, igual a auth.users.id (FK ON DELETE CASCADE).';
COMMENT ON COLUMN public.profiles.given_name IS
  'Nombre de pila.';
COMMENT ON COLUMN public.profiles.family_name IS
  'Apellido.';
COMMENT ON COLUMN public.profiles.display_name IS
  'Columna generada (given_name || '' '' || family_name, con fallback a cualquiera de los dos) -- no se escribe directo.';
COMMENT ON COLUMN public.profiles.avatar_url IS
  'Path relativo dentro del bucket avatars. NULL = sin avatar (fallback a iniciales).';
COMMENT ON COLUMN public.profiles.locale IS
  'Idioma preferido (en/es/pt/fr). Valida contra src/i18n/routing-config.ts vía trigger.';
COMMENT ON COLUMN public.profiles.timezone IS
  'Zona horaria IANA (ej. America/Santiago). Valida contra pg_timezone_names vía trigger.';
COMMENT ON COLUMN public.profiles.phone_number IS
  'Teléfono en formato E.164, opcional.';
COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'false = el edge gate redirige al wizard de /dashboard/onboarding (F3-C4). Claim espejado en el JWT vía custom_access_token_hook.';
COMMENT ON COLUMN public.profiles.metadata IS
  'jsonb libre para datos auxiliares. Excluido explícitamente de export_my_data() (puede contener datos internos, no solo del usuario).';
COMMENT ON COLUMN public.profiles.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.profiles.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.profiles.deleted_at IS
  'NULL = activo. Soft-delete GDPR, ver accounts.deleted_at (mismo ciclo de vida de 90 días).';
COMMENT ON COLUMN public.profiles.birth_date IS
  'Fecha de nacimiento, opcional. Campo clearable: '''' (string vacío) limpia el valor, NULL lo deja sin cambios en update_my_profile().';
COMMENT ON COLUMN public.profiles.bio IS
  'Biografía corta, máx 500 caracteres. Campo clearable, ver birth_date.';
COMMENT ON COLUMN public.profiles.website_url IS
  'URL del sitio personal, máx 255 caracteres. Campo clearable, ver birth_date.';
COMMENT ON COLUMN public.profiles.company IS
  'Empresa/organización declarada por el usuario, máx 100 caracteres. Campo clearable, ver birth_date.';
COMMENT ON COLUMN public.profiles.pending_deletion IS
  'true = marcado para hard-delete GDPR (Art. 17). Consumido por el cron purge-deleted-identities (F3-C3) a los 90 días de deleted_at.';

COMMENT ON INDEX public.idx_profiles_pending_deletion IS
  'Soporte del cron purge-deleted-identities: filtra perfiles pendientes de purga por fecha.';

-- ============================================================================
-- public.projects
-- ============================================================================
COMMENT ON TABLE public.projects IS
  'Recurso de ejemplo del vertical de demo (F1) -- ilustra el patrón account_id + RLS + soft-delete que cualquier recurso de negocio real debería seguir.';
COMMENT ON COLUMN public.projects.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.projects.account_id IS
  'Cuenta dueña del proyecto.';
COMMENT ON COLUMN public.projects.name IS
  'Nombre del proyecto.';
COMMENT ON COLUMN public.projects.slug IS
  'Identificador único dentro de la cuenta (UNIQUE junto con account_id), usado en URLs.';
COMMENT ON COLUMN public.projects.description IS
  'Descripción libre, opcional.';
COMMENT ON COLUMN public.projects.status IS
  'Estado del ciclo de vida del proyecto (ej. active/archived).';
COMMENT ON COLUMN public.projects.color IS
  'Color de acento para diferenciarlo visualmente en la UI (hex o token), opcional.';
COMMENT ON COLUMN public.projects.metadata IS
  'jsonb libre para datos auxiliares que no ameritan columna propia.';
COMMENT ON COLUMN public.projects.created_by IS
  'Usuario que creó el proyecto. ON DELETE SET NULL: el proyecto sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.projects.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.projects.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.projects.deleted_at IS
  'NULL = activo. Soft-delete del recurso.';
COMMENT ON COLUMN public.projects.type IS
  'Tipo de proyecto (ej. docs) -- distingue variantes del recurso de ejemplo.';

COMMENT ON INDEX public.idx_projects_account_id IS
  'Soporte del FK account_id: listar proyectos de una cuenta.';
COMMENT ON INDEX public.idx_projects_created_by IS
  'Soporte del FK created_by.';
COMMENT ON INDEX public.idx_projects_status IS
  'Soporte de queries filtrando por status (ej. solo proyectos activos).';
COMMENT ON INDEX public.projects_account_id_slug_key IS
  'El slug del proyecto es único dentro de su cuenta (no globalmente).';

-- ============================================================================
-- public.documents
-- ============================================================================
COMMENT ON TABLE public.documents IS
  'Recurso de ejemplo del vertical de demo (F1), hijo de projects -- mismo propósito ilustrativo que projects.';
COMMENT ON COLUMN public.documents.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.documents.project_id IS
  'Proyecto dueño del documento.';
COMMENT ON COLUMN public.documents.account_id IS
  'Cuenta dueña del documento (denormalizado desde project_id para simplificar RLS sin join).';
COMMENT ON COLUMN public.documents.name IS
  'Nombre del documento.';
COMMENT ON COLUMN public.documents.description IS
  'Descripción libre, opcional.';
COMMENT ON COLUMN public.documents.content IS
  'Contenido del documento. Límite de 10MB (CHECK documents_content_max_size).';
COMMENT ON COLUMN public.documents.created_by IS
  'Usuario que creó el documento. ON DELETE SET NULL: el documento sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.documents.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.documents.updated_at IS
  'Timestamp de última modificación.';
COMMENT ON COLUMN public.documents.deleted_at IS
  'NULL = activo. Soft-delete del recurso.';

COMMENT ON INDEX public.idx_documents_account_id IS
  'Soporte del FK account_id (y de RLS, que filtra por cuenta sin pasar por project_id).';
COMMENT ON INDEX public.idx_documents_created_by IS
  'Soporte del FK created_by.';
COMMENT ON INDEX public.idx_documents_project_id IS
  'Soporte del FK project_id: listar documentos de un proyecto.';

-- ============================================================================
-- public.invitations
-- ============================================================================
COMMENT ON TABLE public.invitations IS
  'Invitaciones pendientes a una cuenta type=team (F1). token_hash es el único secreto compartido con el invitado -- el token en claro nunca se persiste.';
COMMENT ON COLUMN public.invitations.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.invitations.account_id IS
  'Cuenta a la que se invita.';
COMMENT ON COLUMN public.invitations.email IS
  'Email del invitado. No requiere que ya tenga cuenta en la plataforma.';
COMMENT ON COLUMN public.invitations.role IS
  'Rol que tendrá el invitado al aceptar (member por defecto).';
COMMENT ON COLUMN public.invitations.token_hash IS
  'Hash del token de invitación enviado por email. El token en claro solo existe en el link, nunca en DB.';
COMMENT ON COLUMN public.invitations.status IS
  'pending/accepted/expired/revoked -- ciclo de vida de la invitación.';
COMMENT ON COLUMN public.invitations.invited_by IS
  'Usuario que envió la invitación. ON DELETE SET NULL: la invitación sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.invitations.expires_at IS
  'Vencimiento de la invitación, 7 días desde su creación por defecto.';
COMMENT ON COLUMN public.invitations.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.invitations.updated_at IS
  'Timestamp de última modificación (ej. al aceptar/expirar).';

COMMENT ON INDEX public.idx_invitations_account_id IS
  'Soporte del FK account_id: listar invitaciones de una cuenta.';
COMMENT ON INDEX public.idx_invitations_invited_by IS
  'Soporte del FK invited_by.';
COMMENT ON INDEX public.idx_invitations_pending_unique IS
  'Evita invitaciones duplicadas: un mismo email no puede tener más de una invitación pending activa por cuenta.';
COMMENT ON INDEX public.idx_invitations_token_hash_pending IS
  'Lookup rápido del token al aceptar una invitación, acotado a las que siguen pending.';

-- ============================================================================
-- public.memberships_history
-- ============================================================================
COMMENT ON TABLE public.memberships_history IS
  'Log append-only de cambios de membership (F1, SOC2 CC6.2/CC6.3) -- auditoría de quién entró/salió/cambió de rol en una cuenta, independiente de audit.logs.';
COMMENT ON COLUMN public.memberships_history.id IS
  'Identity autoincremental (cursor de orden interno).';
COMMENT ON COLUMN public.memberships_history.account_id IS
  'Cuenta donde ocurrió el cambio.';
COMMENT ON COLUMN public.memberships_history.user_id IS
  'Usuario afectado por el cambio (el miembro, no quien lo ejecutó).';
COMMENT ON COLUMN public.memberships_history.role IS
  'Rol del usuario en el momento del evento.';
COMMENT ON COLUMN public.memberships_history.action IS
  'Tipo de evento: joined/left/removed/role_upgraded/role_downgraded/invited.';
COMMENT ON COLUMN public.memberships_history.actor_id IS
  'Usuario que ejecutó la acción (puede ser distinto de user_id, ej. un admin removiendo a otro miembro). NULL si fue automático.';
COMMENT ON COLUMN public.memberships_history.metadata IS
  'jsonb libre para contexto adicional del evento.';
COMMENT ON COLUMN public.memberships_history.created_at IS
  'Timestamp del evento (inmutable, append-only).';

COMMENT ON INDEX public.idx_memberships_history_account IS
  'Soporte de "historial de membership de una cuenta", ordenado por fecha.';
COMMENT ON INDEX public.idx_memberships_history_user IS
  'Soporte de "historial de membership de un usuario", ordenado por fecha.';
COMMENT ON INDEX public.idx_memberships_history_created_brin IS
  'Índice BRIN: created_at crece de forma monótona en una tabla append-only, más liviano que un B-tree para rangos de fecha.';

-- ============================================================================
-- public.auth_recovery_codes
-- ============================================================================
COMMENT ON TABLE public.auth_recovery_codes IS
  'Códigos de recuperación de un solo uso para MFA (F1) -- se generan de a 10 al habilitar 2FA, cada uno se consume una vez si el usuario pierde su dispositivo TOTP.';
COMMENT ON COLUMN public.auth_recovery_codes.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.auth_recovery_codes.user_id IS
  'Usuario dueño del código.';
COMMENT ON COLUMN public.auth_recovery_codes.code_hash IS
  'Hash del código. El código en claro solo se muestra una vez, al generarlo.';
COMMENT ON COLUMN public.auth_recovery_codes.used_at IS
  'NULL = código disponible. Se setea al consumirlo -- cada código es de un solo uso.';
COMMENT ON COLUMN public.auth_recovery_codes.created_at IS
  'Timestamp de generación (inmutable). generate_recovery_codes() borra el lote anterior antes de crear uno nuevo.';

COMMENT ON INDEX public.idx_recovery_codes_user_id IS
  'Soporte del FK user_id: contar/listar los códigos de un usuario.';

-- ============================================================================
-- Huecos de columnas genéricas en tablas de F3 (ya tenían comentarios de
-- negocio, faltaban las columnas "genéricas" id/created_at/etc).
-- ============================================================================

COMMENT ON COLUMN public.api_keys.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.api_keys.account_id IS
  'Cuenta dueña de la clave.';
COMMENT ON COLUMN public.api_keys.created_by IS
  'Usuario que creó la clave. ON DELETE SET NULL: la clave sobrevive si ese usuario se borra.';
COMMENT ON COLUMN public.api_keys.created_at IS
  'Timestamp de creación (inmutable).';

COMMENT ON COLUMN public.impersonation_sessions.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.impersonation_sessions.admin_id IS
  'Platform admin que inicia la impersonation.';
COMMENT ON COLUMN public.impersonation_sessions.target_user_id IS
  'Usuario impersonado ("ver como").';
COMMENT ON COLUMN public.impersonation_sessions.reason IS
  'Motivo de la impersonation, ingresado por el admin (mínimo 3 caracteres), queda en audit.logs.';
COMMENT ON COLUMN public.impersonation_sessions.started_at IS
  'Timestamp de inicio de la sesión (inmutable).';
COMMENT ON COLUMN public.impersonation_sessions.expires_at IS
  'Cap duro de 30 minutos desde started_at, chequeado en el edge contra el claim impersonation_expires_at.';
COMMENT ON COLUMN public.impersonation_sessions.ended_at IS
  'NULL = sesión activa. Se setea al salir (manual, expiración, o cierre forzado).';
COMMENT ON COLUMN public.impersonation_sessions.ended_reason IS
  'Cómo terminó: manual/expired/etc.';
COMMENT ON COLUMN public.impersonation_sessions.ip_address IS
  'IP del admin al iniciar la sesión, para auditoría.';
COMMENT ON COLUMN public.impersonation_sessions.user_agent IS
  'User-Agent del admin al iniciar la sesión, para auditoría.';

COMMENT ON COLUMN public.platform_admins.user_id IS
  'Usuario en la whitelist de super-admins. PK y FK a auth.users (ON DELETE CASCADE).';
COMMENT ON COLUMN public.platform_admins.created_at IS
  'Timestamp del alta en la whitelist (inmutable).';

COMMENT ON COLUMN public.webhook_endpoints.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.webhook_endpoints.account_id IS
  'Cuenta dueña del endpoint.';
COMMENT ON COLUMN public.webhook_endpoints.description IS
  'Descripción libre del endpoint, opcional (máx 200 caracteres).';
COMMENT ON COLUMN public.webhook_endpoints.enabled IS
  'false = el endpoint no recibe entregas nuevas (pausado), sin borrarlo.';
COMMENT ON COLUMN public.webhook_endpoints.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.webhook_endpoints.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON COLUMN public.webhook_deliveries.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.webhook_deliveries.endpoint_id IS
  'Endpoint destino de esta entrega.';
COMMENT ON COLUMN public.webhook_deliveries.account_id IS
  'Cuenta dueña de la entrega (denormalizado desde endpoint_id para simplificar RLS).';
COMMENT ON COLUMN public.webhook_deliveries.event_type IS
  'Evento que originó esta entrega, subset de private.webhook_event_catalog().';
COMMENT ON COLUMN public.webhook_deliveries.status IS
  'pending/success/failed/exhausted -- ver comentario de tabla para el ciclo de reintentos.';
COMMENT ON COLUMN public.webhook_deliveries.attempts IS
  'Cantidad de intentos de entrega realizados hasta ahora.';
COMMENT ON COLUMN public.webhook_deliveries.next_retry_at IS
  'Próximo intento programado (backoff 1m/5m/30m). NULL si no hay reintento pendiente.';
COMMENT ON COLUMN public.webhook_deliveries.last_status_code IS
  'Código HTTP de la última respuesta recibida del endpoint destino.';
COMMENT ON COLUMN public.webhook_deliveries.last_error IS
  'Mensaje de error del último intento fallido, para debug.';
COMMENT ON COLUMN public.webhook_deliveries.created_at IS
  'Timestamp de creación de la entrega (inmutable).';
COMMENT ON COLUMN public.webhook_deliveries.delivered_at IS
  'Timestamp en que se confirmó la entrega exitosa. NULL si todavía no se entregó.';

-- Columnas genéricas faltantes en las tablas del vertical de ejemplo "robot"
-- (F1, ya tenían comentarios de negocio en sus columnas específicas).
COMMENT ON COLUMN public.robot_routines.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.robot_routines.account_id IS
  'Cuenta dueña de la rutina.';
COMMENT ON COLUMN public.robot_routines.description IS
  'Descripción libre de la rutina, opcional (distinta de message, que es lo que el robot dice en voz alta).';
COMMENT ON COLUMN public.robot_routines.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.robot_routines.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON COLUMN public.robot_contacts.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.robot_contacts.account_id IS
  'Cuenta dueña del contacto.';
COMMENT ON COLUMN public.robot_contacts.name IS
  'Nombre del contacto.';
COMMENT ON COLUMN public.robot_contacts.relationship IS
  'Relación con el usuario (ej. Hijo, Médico), opcional.';
COMMENT ON COLUMN public.robot_contacts.phone IS
  'Teléfono del contacto.';
COMMENT ON COLUMN public.robot_contacts.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.robot_contacts.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON COLUMN public.robot_memories.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN public.robot_memories.account_id IS
  'Cuenta dueña del recuerdo.';
COMMENT ON COLUMN public.robot_memories.name IS
  'Nombre propio de la entidad (ej. el nombre del nieto, la mascota).';
COMMENT ON COLUMN public.robot_memories.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN public.robot_memories.updated_at IS
  'Timestamp de última modificación.';

-- ============================================================================
-- Índices sin comentario en flags.sql (tablas ya documentadas por completo,
-- solo faltaban estos dos)
-- ============================================================================
COMMENT ON INDEX public.feature_flags_name_key IS
  'El slug del flag es único en todo el catálogo.';
COMMENT ON INDEX public.feature_flag_overrides_flag_account_key IS
  'Un mismo flag tiene como máximo un override por cuenta.';
COMMENT ON INDEX public.idx_feature_flag_overrides_account_flag IS
  'Soporte de private.resolve_flag(): lookup de overrides por cuenta+flag.';

-- ============================================================================
-- Índices restantes sin comentario en tablas ya documentadas (F2/F3) --
-- ninguna de estas tablas tenía sus índices cubiertos todavía.
-- ============================================================================

COMMENT ON INDEX public.idx_announcements_created_at IS
  'Historial ordenado por fecha desc, para la carga inicial de la campana.';
COMMENT ON INDEX public.idx_announcements_created_by IS
  'Soporte del FK created_by.';

COMMENT ON INDEX public.api_keys_key_hash_key IS
  'Lookup O(1) del hash de la clave en verify_api_key() -- es el índice crítico de performance de autenticación por API key.';
COMMENT ON INDEX public.idx_api_keys_account_created IS
  'Soporte de "listar claves de una cuenta" ordenado por fecha.';
COMMENT ON INDEX public.idx_api_keys_created_by IS
  'Soporte del FK created_by.';

COMMENT ON INDEX public.idx_impersonation_active_target IS
  'Soporte de "¿este usuario está siendo impersonado ahora mismo?" -- parcial, solo sesiones sin ended_at.';
COMMENT ON INDEX public.idx_impersonation_one_active_per_admin IS
  'UNIQUE parcial: un admin no puede tener más de una sesión de impersonation activa a la vez.';

COMMENT ON INDEX public.idx_notifications_user_created IS
  'Soporte del listado principal de la campana: notificaciones de un usuario ordenadas por fecha.';
COMMENT ON INDEX public.idx_notifications_user_unread IS
  'Índice parcial (solo read_at IS NULL) para el conteo rápido del badge de no-leídas.';

COMMENT ON INDEX public.idx_robot_contacts_account_id IS
  'Soporte del FK account_id: listar contactos de una cuenta.';
COMMENT ON INDEX public.idx_robot_contacts_priority IS
  'Soporte de ordenar los contactos por prioridad de llamada en emergencia.';
COMMENT ON INDEX public.idx_robot_memories_account_id IS
  'Soporte del FK account_id: listar recuerdos de una cuenta.';
COMMENT ON INDEX public.idx_robot_memories_entity IS
  'Soporte de filtrar recuerdos por tipo de entidad (ej. todos los de tipo Nieto).';
COMMENT ON INDEX public.idx_robot_routines_account_id IS
  'Soporte del FK account_id: listar rutinas de una cuenta.';

COMMENT ON INDEX public.idx_webhook_deliveries_account IS
  'Soporte de "listar entregas de una cuenta" ordenado por fecha.';
COMMENT ON INDEX public.idx_webhook_deliveries_endpoint IS
  'Soporte de "listar entregas de un endpoint" ordenado por fecha.';
COMMENT ON INDEX public.idx_webhook_deliveries_open IS
  'Índice parcial (solo status pending/failed) para que el worker de reintentos no escanee entregas ya cerradas.';
COMMENT ON INDEX public.idx_webhook_endpoints_account IS
  'Soporte de "listar endpoints de una cuenta" ordenado por fecha.';
