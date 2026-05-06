-- ============================================================================
-- Migration 015: BI Views
-- ============================================================================
-- Reporting views for admin dashboards. These live in internal schemas
-- and are only accessible via service_role.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- MRR by plan — Monthly Recurring Revenue breakdown
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW billing.v_mrr_by_plan AS
SELECT
  p.name AS plan_name,
  p.slug,
  COUNT(*) AS active_count,
  SUM(p.price) AS mrr_cents,
  p.currency
FROM billing.subscriptions s
JOIN billing.plans p ON p.id = s.plan_id
WHERE s.status = 'active'
GROUP BY p.id, p.name, p.slug, p.currency;

-- ---------------------------------------------------------------------------
-- Recent activity feed — joins audit logs with profile names
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW audit.v_recent_activity AS
SELECT
  a.*,
  pr.display_name AS actor_name,
  pr.avatar_url
FROM audit.logs a
LEFT JOIN public.profiles pr ON pr.id = a.actor_id
ORDER BY a.created_at DESC;
