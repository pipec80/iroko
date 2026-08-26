-- Supporting indexes for Billing Core v2 payment_attempts foreign keys.
-- Required to keep DELETE/UPDATE of referenced rows from scanning the table.

CREATE INDEX payment_attempts_invoice_id_idx
  ON billing.payment_attempts (invoice_id);

CREATE INDEX payment_attempts_subscription_id_idx
  ON billing.payment_attempts (subscription_id);
