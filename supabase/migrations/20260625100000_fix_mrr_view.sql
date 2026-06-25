-- Fix: v_mrr_by_plan dividía incorrectamente planes anuales.
-- Los planes 'year' contribuyen price/12 al MRR mensual.

DROP VIEW IF EXISTS "billing"."v_mrr_by_plan";

CREATE OR REPLACE VIEW "billing"."v_mrr_by_plan" AS
 SELECT "p"."name" AS "plan_name",
    "p"."slug",
    "p"."interval",
    "count"(*) AS "active_count",
    "sum"(
      CASE "p"."interval"
        WHEN 'month'    THEN "p"."price"
        WHEN 'year'     THEN "p"."price" / 12
        WHEN 'one_time' THEN 0
        ELSE 0
      END
    ) AS "mrr_cents",
    "p"."currency"
   FROM ("billing"."subscriptions" "s"
     JOIN "billing"."plans" "p" ON (("p"."id" = "s"."plan_id")))
  WHERE ("s"."status" = 'active'::"billing"."subscription_status")
  GROUP BY "p"."id", "p"."name", "p"."slug", "p"."interval", "p"."currency";

ALTER VIEW "billing"."v_mrr_by_plan" OWNER TO "postgres";
