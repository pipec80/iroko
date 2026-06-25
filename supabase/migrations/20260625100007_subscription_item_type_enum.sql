-- Convertir subscription_items.type de text a ENUM.
-- Text acepta strings arbitrarios; 'FLAT' o 'per-seat' serían valores inválidos
-- que pasarían silenciosamente sin este constraint.

CREATE TYPE billing.subscription_item_type AS ENUM (
  'flat',
  'per_seat',
  'metered',
  'tiered'
);

-- Eliminar el DEFAULT primero (requerido antes de cambiar el tipo en PostgreSQL)
ALTER TABLE billing.subscription_items
  ALTER COLUMN type DROP DEFAULT;

-- Cambiar el tipo de text a ENUM
ALTER TABLE billing.subscription_items
  ALTER COLUMN type TYPE billing.subscription_item_type
    USING type::billing.subscription_item_type;

-- Restaurar el DEFAULT con el tipo correcto
ALTER TABLE billing.subscription_items
  ALTER COLUMN type SET DEFAULT 'flat'::billing.subscription_item_type;

-- Asegurar NOT NULL (puede haberse perdido)
ALTER TABLE billing.subscription_items
  ALTER COLUMN type SET NOT NULL;

COMMENT ON TYPE billing.subscription_item_type IS
  'Modelo de precio de un item de suscripción: flat=precio fijo, per_seat=por usuario, '
  'metered=por uso, tiered=escalado por volumen.';
