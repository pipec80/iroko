-- Completa comentarios (COMMENT ON TABLE/COLUMN/INDEX) faltantes en el schema
-- billing. Estas tablas son de la fundación F1/F2 y nunca recibieron
-- documentación in-DB, a diferencia de las tablas de F3 en adelante. QA del
-- usuario detectó el gap comparando billing/public contra los módulos
-- recientes (notifications, webhooks, api-keys, flags), que sí la tienen.
-- Solo metadata (COMMENT), no cambia ninguna estructura ni dato.

-- ============================================================================
-- billing.customers
-- ============================================================================
COMMENT ON TABLE billing.customers IS
  'Cliente de billing por cuenta (F2-2A). 1:1 con public.accounts vía account_id -- el proveedor real (Stripe/MercadoPago) se guarda en provider/external_id.';
COMMENT ON COLUMN billing.customers.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.customers.account_id IS
  'Cuenta dueña de este customer. UNIQUE: una cuenta tiene un solo customer de billing.';
COMMENT ON COLUMN billing.customers.provider IS
  'Proveedor de pago que gestiona este customer: ''stripe'' o ''mercadopago''.';
COMMENT ON COLUMN billing.customers.external_id IS
  'ID del customer en el proveedor externo (ej. cus_xxx de Stripe). UNIQUE junto con provider.';
COMMENT ON COLUMN billing.customers.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.customers.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.customers_account_id_key IS
  'Garantiza 1 customer de billing por cuenta.';
COMMENT ON INDEX billing.customers_provider_external_id_key IS
  'Evita duplicar el mismo customer externo (idempotencia de webhooks del proveedor).';

-- ============================================================================
-- billing.events
-- ============================================================================
COMMENT ON TABLE billing.events IS
  'Log append-only de eventos de webhook de los proveedores de pago (F2-2A). Fuente de verdad para reconciliación/debug; processed_at marca si ya se aplicó al estado de billing.';
COMMENT ON COLUMN billing.events.id IS
  'Identity autoincremental (no UUID: solo se usa como cursor de orden interno, nunca se expone).';
COMMENT ON COLUMN billing.events.customer_id IS
  'Customer al que pertenece el evento. ON DELETE SET NULL: preserva el evento (auditoría fiscal) si el customer se purga.';
COMMENT ON COLUMN billing.events.event_type IS
  'Tipo de evento tal como lo nombra el proveedor (ej. ''invoice.paid'', ''customer.subscription.updated'').';
COMMENT ON COLUMN billing.events.provider IS
  'Proveedor que emitió el evento: ''stripe'' o ''mercadopago''.';
COMMENT ON COLUMN billing.events.external_event_id IS
  'ID del evento en el proveedor. UNIQUE: descarta reintentos duplicados del webhook.';
COMMENT ON COLUMN billing.events.payload IS
  'Payload crudo del webhook, tal como lo envió el proveedor -- sin transformar.';
COMMENT ON COLUMN billing.events.processed_at IS
  'NULL = todavía no aplicado al estado de billing (subscriptions/invoices/etc). Se setea al procesar exitosamente.';
COMMENT ON COLUMN billing.events.created_at IS
  'Timestamp de recepción del webhook (inmutable).';

COMMENT ON INDEX billing.events_external_event_id_key IS
  'Idempotencia: un mismo evento del proveedor no se procesa dos veces.';
COMMENT ON INDEX billing.idx_billing_events_created_brin IS
  'Índice BRIN: created_at crece de forma monótona en una tabla append-only, más liviano que un B-tree para rangos de fecha.';
COMMENT ON INDEX billing.idx_billing_events_customer IS
  'Soporte de FK: lookup de eventos por customer.';
COMMENT ON INDEX billing.idx_billing_events_type IS
  'Soporte de queries filtrando/agrupando por event_type (dashboards, debug).';

-- ============================================================================
-- billing.plans
-- ============================================================================
COMMENT ON TABLE billing.plans IS
  'Catálogo de planes de suscripción (F2-2A). features/limits controlan gates de la app (feature flags por plan, límites numéricos) -- ver private.resolve_flag() en flags.sql.';
COMMENT ON COLUMN billing.plans.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.plans.slug IS
  'Identificador legible y estable del plan (ej. ''free'', ''pro''). UNIQUE junto con interval.';
COMMENT ON COLUMN billing.plans.name IS
  'Nombre mostrado al usuario (ej. "Pro").';
COMMENT ON COLUMN billing.plans.description IS
  'Descripción corta mostrada en la página de precios.';
COMMENT ON COLUMN billing.plans.interval IS
  'Periodicidad de facturación: month o year.';
COMMENT ON COLUMN billing.plans.price IS
  'Precio en centavos de la moneda indicada en currency (evita floats para dinero).';
COMMENT ON COLUMN billing.plans.currency IS
  'Código ISO 4217 de 3 letras (ej. USD).';
COMMENT ON COLUMN billing.plans.trial_days IS
  'Días de prueba gratuita al suscribirse. 0 = sin trial.';
COMMENT ON COLUMN billing.plans.features IS
  'jsonb de feature flags habilitadas por este plan (ej. {"webhooks_enabled": true}) -- tercer nivel de prioridad en private.resolve_flag().';
COMMENT ON COLUMN billing.plans.limits IS
  'jsonb de límites numéricos del plan (ej. {"api_keys_max": 5, "seats_max": 10}), consumido por private.get_account_limit().';
COMMENT ON COLUMN billing.plans.provider_ids IS
  'jsonb con el price/plan id de cada proveedor externo (ej. {"stripe": "price_xxx", "mercadopago": "..."}), para no hardcodear IDs de proveedor en la app.';
COMMENT ON COLUMN billing.plans.sort_order IS
  'Orden de despliegue en la página de precios (ascendente).';
COMMENT ON COLUMN billing.plans.is_active IS
  'false = plan retirado/oculto, ya no ofrecible a clientes nuevos (las suscripciones existentes lo siguen usando).';
COMMENT ON COLUMN billing.plans.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.plans.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.plans_slug_interval_key IS
  'Un plan lógico (slug) tiene como máximo una fila por periodicidad (month/year).';

-- ============================================================================
-- billing.subscriptions
-- ============================================================================
COMMENT ON TABLE billing.subscriptions IS
  'Suscripción activa/histórica de un customer a un plan (F2-2A). status refleja el estado real del proveedor externo, sincronizado vía billing.events.';
COMMENT ON COLUMN billing.subscriptions.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.subscriptions.customer_id IS
  'Customer dueño de la suscripción.';
COMMENT ON COLUMN billing.subscriptions.plan_id IS
  'Plan contratado.';
COMMENT ON COLUMN billing.subscriptions.status IS
  'Estado del ciclo de vida (trialing/active/past_due/canceled/etc), espejo del estado real en el proveedor.';
COMMENT ON COLUMN billing.subscriptions.current_period_start IS
  'Inicio del ciclo de facturación actual.';
COMMENT ON COLUMN billing.subscriptions.current_period_end IS
  'Fin del ciclo de facturación actual -- fecha del próximo cobro/renovación.';
COMMENT ON COLUMN billing.subscriptions.cancel_at_period_end IS
  'true = el usuario canceló pero conserva acceso hasta current_period_end (no es un borrado inmediato).';
COMMENT ON COLUMN billing.subscriptions.canceled_at IS
  'Timestamp en que se solicitó la cancelación (distinto de cuándo deja de tener efecto).';
COMMENT ON COLUMN billing.subscriptions.trial_start IS
  'Inicio del período de prueba, si lo tuvo.';
COMMENT ON COLUMN billing.subscriptions.trial_end IS
  'Fin del período de prueba; a partir de acá se cobra.';
COMMENT ON COLUMN billing.subscriptions.provider IS
  'Proveedor que gestiona esta suscripción: ''stripe'' o ''mercadopago''.';
COMMENT ON COLUMN billing.subscriptions.external_subscription_id IS
  'ID de la suscripción en el proveedor externo.';
COMMENT ON COLUMN billing.subscriptions.metadata IS
  'jsonb libre para datos auxiliares del proveedor que no ameritan columna propia.';
COMMENT ON COLUMN billing.subscriptions.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.subscriptions.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.idx_subscriptions_customer IS
  'Soporte de FK: lookup de suscripciones por customer.';
COMMENT ON INDEX billing.idx_subscriptions_plan IS
  'Soporte de FK: lookup de suscripciones por plan (ej. reportes de adopción).';
COMMENT ON INDEX billing.idx_subscriptions_status IS
  'Soporte de queries filtrando por estado (ej. listar todas las active/trialing).';

-- ============================================================================
-- billing.subscription_items
-- ============================================================================
COMMENT ON TABLE billing.subscription_items IS
  'Líneas de una suscripción (F2-2A) -- soporta suscripciones con más de un ítem (ej. flat fee + usage-based). La mayoría de los planes tienen un solo ítem.';
COMMENT ON COLUMN billing.subscription_items.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.subscription_items.subscription_id IS
  'Suscripción a la que pertenece este ítem.';
COMMENT ON COLUMN billing.subscription_items.description IS
  'Descripción del ítem tal como aparece en la factura.';
COMMENT ON COLUMN billing.subscription_items.type IS
  'Tipo de cobro del ítem: flat (monto fijo) o usage-based.';
COMMENT ON COLUMN billing.subscription_items.quantity IS
  'Cantidad del ítem (ej. asientos, unidades de uso).';
COMMENT ON COLUMN billing.subscription_items.unit_price IS
  'Precio unitario en centavos.';
COMMENT ON COLUMN billing.subscription_items.currency IS
  'Código ISO 4217 de 3 letras.';
COMMENT ON COLUMN billing.subscription_items.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.subscription_items.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.idx_subscription_items_subscription IS
  'Soporte de FK: listar los ítems de una suscripción.';

-- ============================================================================
-- billing.invoices
-- ============================================================================
COMMENT ON TABLE billing.invoices IS
  'Facturas emitidas por el proveedor de pago (F2-2A) -- espejo de solo lectura, nunca se generan facturas desde esta app.';
COMMENT ON COLUMN billing.invoices.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.invoices.customer_id IS
  'Customer facturado.';
COMMENT ON COLUMN billing.invoices.subscription_id IS
  'Suscripción que originó la factura. NULL si es un cargo one-off.';
COMMENT ON COLUMN billing.invoices.number IS
  'Número de factura legible asignado por el proveedor (para mostrar al usuario).';
COMMENT ON COLUMN billing.invoices.status IS
  'Estado de la factura (draft/open/paid/void/uncollectible), espejo del proveedor.';
COMMENT ON COLUMN billing.invoices.currency IS
  'Código ISO 4217 de 3 letras.';
COMMENT ON COLUMN billing.invoices.subtotal IS
  'Subtotal antes de impuestos, en centavos.';
COMMENT ON COLUMN billing.invoices.tax IS
  'Monto de impuestos, en centavos.';
COMMENT ON COLUMN billing.invoices.total IS
  'Total a pagar (subtotal + tax), en centavos.';
COMMENT ON COLUMN billing.invoices.amount_paid IS
  'Monto efectivamente pagado hasta el momento, en centavos.';
COMMENT ON COLUMN billing.invoices.period_start IS
  'Inicio del período que cubre esta factura.';
COMMENT ON COLUMN billing.invoices.period_end IS
  'Fin del período que cubre esta factura.';
COMMENT ON COLUMN billing.invoices.paid_at IS
  'Timestamp en que se confirmó el pago. NULL = todavía impaga.';
COMMENT ON COLUMN billing.invoices.external_invoice_id IS
  'ID de la factura en el proveedor externo.';
COMMENT ON COLUMN billing.invoices.hosted_url IS
  'URL alojada por el proveedor donde el usuario puede ver/pagar la factura.';
COMMENT ON COLUMN billing.invoices.pdf_url IS
  'URL del PDF descargable de la factura, generado por el proveedor.';
COMMENT ON COLUMN billing.invoices.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.invoices.updated_at IS
  'Timestamp de última modificación (ej. al cambiar de estado).';

COMMENT ON INDEX billing.invoices_number_key IS
  'El número de factura es único por proveedor.';
COMMENT ON INDEX billing.idx_invoices_customer_date IS
  'Soporte de list_account_invoices(): historial de facturas de un customer ordenado por fecha.';
COMMENT ON INDEX billing.idx_invoices_subscription IS
  'Soporte de FK: facturas de una suscripción.';

-- ============================================================================
-- billing.invoice_line_items
-- ============================================================================
COMMENT ON TABLE billing.invoice_line_items IS
  'Líneas de detalle de una factura (F2-2A) -- espejo de solo lectura de lo que factura el proveedor.';
COMMENT ON COLUMN billing.invoice_line_items.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.invoice_line_items.invoice_id IS
  'Factura a la que pertenece esta línea.';
COMMENT ON COLUMN billing.invoice_line_items.description IS
  'Descripción de la línea tal como la muestra el proveedor (ej. "Plan Pro -- Ago 2026").';
COMMENT ON COLUMN billing.invoice_line_items.quantity IS
  'Cantidad facturada en esta línea.';
COMMENT ON COLUMN billing.invoice_line_items.unit_price IS
  'Precio unitario en centavos.';
COMMENT ON COLUMN billing.invoice_line_items.amount IS
  'Monto total de la línea (quantity * unit_price, salvo ajustes del proveedor), en centavos.';
COMMENT ON COLUMN billing.invoice_line_items.created_at IS
  'Timestamp de creación (inmutable).';

COMMENT ON INDEX billing.idx_invoice_line_items_invoice IS
  'Soporte de FK: listar las líneas de una factura.';

-- ============================================================================
-- billing.payment_methods
-- ============================================================================
COMMENT ON TABLE billing.payment_methods IS
  'Métodos de pago guardados de un customer (F2-2A) -- solo metadata no sensible (marca, últimos 4 dígitos); el dato completo de la tarjeta vive únicamente en el proveedor.';
COMMENT ON COLUMN billing.payment_methods.id IS
  'Clave primaria UUID generada automáticamente.';
COMMENT ON COLUMN billing.payment_methods.customer_id IS
  'Customer dueño del método de pago.';
COMMENT ON COLUMN billing.payment_methods.type IS
  'Tipo de método de pago (ej. card).';
COMMENT ON COLUMN billing.payment_methods.provider IS
  'Proveedor que custodia el método de pago real: ''stripe'' o ''mercadopago''.';
COMMENT ON COLUMN billing.payment_methods.external_id IS
  'ID del método de pago en el proveedor externo.';
COMMENT ON COLUMN billing.payment_methods.brand IS
  'Marca de la tarjeta (ej. visa, mastercard), solo para mostrar un ícono en la UI.';
COMMENT ON COLUMN billing.payment_methods.last_four IS
  'Últimos 4 dígitos de la tarjeta, para identificarla en la UI sin exponer el número completo.';
COMMENT ON COLUMN billing.payment_methods.exp_month IS
  'Mes de expiración de la tarjeta (1-12).';
COMMENT ON COLUMN billing.payment_methods.exp_year IS
  'Año de expiración de la tarjeta (4 dígitos).';
COMMENT ON COLUMN billing.payment_methods.is_default IS
  'true = método de pago usado por defecto en el próximo cobro.';
COMMENT ON COLUMN billing.payment_methods.created_at IS
  'Timestamp de creación (inmutable).';
COMMENT ON COLUMN billing.payment_methods.updated_at IS
  'Timestamp de última modificación.';

COMMENT ON INDEX billing.idx_payment_methods_customer IS
  'Soporte de FK: métodos de pago de un customer.';

-- ============================================================================
-- billing.v_mrr_by_plan (vista de reporting)
-- ============================================================================
COMMENT ON VIEW billing.v_mrr_by_plan IS
  'MRR (revenue mensual recurrente) agregado por plan, normalizando suscripciones anuales a su equivalente mensual. Solo lectura, para dashboards internos.';
COMMENT ON COLUMN billing.v_mrr_by_plan.plan_name IS
  'Nombre del plan (billing.plans.name).';
COMMENT ON COLUMN billing.v_mrr_by_plan.slug IS
  'Slug del plan (billing.plans.slug).';
COMMENT ON COLUMN billing.v_mrr_by_plan.interval IS
  'Periodicidad de facturación del plan.';
COMMENT ON COLUMN billing.v_mrr_by_plan.active_count IS
  'Cantidad de suscripciones activas/trialing de este plan.';
COMMENT ON COLUMN billing.v_mrr_by_plan.mrr_cents IS
  'Revenue mensual recurrente en centavos (suscripciones anuales divididas entre 12).';
COMMENT ON COLUMN billing.v_mrr_by_plan.currency IS
  'Moneda del monto mrr_cents.';
