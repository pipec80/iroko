# Plan 014 → 012.1 — Aplicación Cloud autorizada

Fecha: 2026-10-09. Última comprobación de salud: 17:15:16 UTC.
Estado: **aplicación y postflight de catálogo completados; revisión independiente aprobada**.

## Alcance y autorización

El usuario autorizó explícitamente aplicar las dos migraciones mediante «si te autorizo», después de revisar el paquete de preparación. Destino verificado: proyecto iroko, ref rgrxlygtmvavqzkjyywg, us-east-2, PostgreSQL 17.6.1.141. Rama local: codex/014-t1-robot-permissions. Se preservaron los cambios pendientes.

La autorización cubrió exclusivamente 014 → 012 con gate intermedio y postflight de lectura. No hubo instalaciones, commits, push, merge ni deploy de aplicación. La preparación histórica está en [el paquete revisado](2026-10-09-plan-012-1-cloud-application-preparation.md).

## Fuentes y ejecución

CLI Supabase Windows 2.110.0 autenticado; MCP autenticado para catálogo, historial, estado y Security Advisors. Los 161 archivos originales y sus stages coincidieron con el manifiesto SHA256 antes de aplicar.

| Migración                               | SHA256                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| 20261008120000_robot_reference_rbac.sql | E5D488D7465BBE12718A71B09783DAB2B8DD3214FE5A1DAF13134751B6CED753 |
| 20261008130000_revoke_excess_grants.sql | C2496AC67D2E674B9A5933FDC774330CF69D9877E1EDB274EA335F00B325E313 |

Comandos ejecutados, todos con exit 0:

```powershell
supabase --workdir .superpowers/012-cloud-prepare/stage-014 db push --linked --dry-run
supabase --workdir .superpowers/012-cloud-prepare/stage-014 db push --linked --yes
supabase --workdir .superpowers/012-cloud-prepare/stage-012 db push --linked --dry-run
supabase --workdir .superpowers/012-cloud-prepare/stage-012 db push --linked --yes
supabase db push --linked --dry-run
```

Cada stage propuso y aplicó únicamente su migración; sin seeds ni roles. El dry-run final respondió upToDate=true, migrations=[], seeds=[], roles=[]. Historial observado: 159 → 160 → 161; última versión 20261008130000. Salud final: ACTIVE_HEALTHY. La atomicidad SQL/ledger se revisó en el código oficial del CLI y el rollback se ensayó localmente; no se provocaron fallos en Cloud.

## Gate intermedio: 014

Las 77 policies resultantes coincidieron con la referencia local aprobada: once policies alteradas y nueva policy UPDATE de Storage. La única definición de función modificada fue replace_robot_config(uuid,jsonb,jsonb,jsonb), cuyo cuerpo coincidió con la referencia local; propietario, ACL y configuración permanecieron iguales. Tablas, esquemas, defaults, secuencias, roles y membresías se conservaron. Historial 160 y Advisors estables. Revisor independiente aprobó continuar con 012.

Siguiente paso de esta tarea: aplicar 012, completado después del gate.

## Postflight: 012

- Diez firmas privadas perdieron EXECUTE efectivo de PUBLIC. entre esas diez firmas, anon conserva EXECUTE únicamente en get_user_role; authenticated conserva get_user_role y user_is_member entre esas diez firmas. Es la excepción necesaria para las policies Storage existentes.
- USAGE private: authenticated=true, anon=false.
- Eliminados 105 privilegios administrativos efectivos; cero añadidos y cero restantes de TRUNCATE, REFERENCES, TRIGGER o MAINTAIN para anon/authenticated en las 34 tablas propias inventariadas.
- Cero cambios CRUD, de propietarios o RLS de tablas por 012. Cero cambios de cuerpos, propietarios, configuración o SECURITY DEFINER de funciones. Policies, esquemas, secuencias, roles y membresías idénticos entre 014 y 012.
- Única diferencia efectiva de defaults: postgres/public/tablas, retirando esos cuatro permisos a anon/authenticated. El default postgres/billing/tablas ya estaba ausente antes y después: revocación idempotente. service_role y defaults de supabase_admin preservados.

Una comprobación auxiliar esperaba inicialmente dos filas de defaults modificadas; el catálogo demostró que billing ya carecía de esa ACL. Se corrigió la expectativa del verificador y se comprobó la transformación exacta. No fue un fallo SQL ni requirió otra escritura Cloud.

Gate final aprobado por coordinador y revisor independiente. Siguiente paso de esta tarea: cerrar evidencia y separar la aceptación funcional pendiente.

## Security Advisors

Comparación normalizada antes/después por nombre, nivel, detalle y metadata: **60 hallazgos idénticos, 57 WARN y 3 INFO; cero regresiones atribuibles**.

| Hallazgo                                                  | Cantidad | Decisión                                                                                                                                        |
| --------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| authenticated SECURITY DEFINER ejecutable                 | 53 WARN  | Exposición RPC intencional; conservar autorización interna, sin revocación automática. No se reauditaron aquí las 53 funciones individualmente. |
| anon SECURITY DEFINER ejecutable                          | 2 WARN   | check_request y get_active_plans: consumidores públicos intencionales ya clasificados.                                                          |
| Search path de billing.assert_provider_price_matches_plan | 1 WARN   | Seguimiento separado; no modificado.                                                                                                            |
| Protección Auth de contraseñas filtradas desactivada      | 1 WARN   | Seguimiento de configuración separado; no modificado.                                                                                           |
| RLS habilitado sin policy                                 | 3 INFO   | Baseline preservado; no añadido por estas migraciones.                                                                                          |

## Evidencia y límites

Artefactos locales ignorados en .superpowers/012-cloud-prepare/: authorized-before.json, authorized-after-014.json, authorized-after-012.json, migrations-after-014.json, migrations-after-012.json, security-after-014.json, security-after-012.json, gate-014-invariants.json, postflight-012-invariants.json, effective-functions-after-012.json, schema-usage-after-012.json, administrative-privileges-after-012.json, apply-014.log, apply-012.log y final-dry-run.log. No contienen credenciales impresas. El manifiesto conserva los hashes de las fuentes revisadas.

La aceptación SQL local previa está en [el ensayo del historial](2026-10-09-plan-012-1-history-rehearsal.md): 44 archivos / 884 aserciones consolidadas, con repetición aislada de fixture42. Es evidencia local histórica, no una ejecución de pgTAP en Cloud ni una nueva ejecución de checks de aplicación en esta etapa.

**[NO VERIFICADO]:** aceptación funcional Cloud de signup, Billing/webhooks, notificaciones, Storage y Realtime; backup/PITR. El postflight solo consultó catálogo: no ejecutó fixtures ni RPC mutantes. No se desplegaron los cambios web de 014. La paridad comprobada es del historial de migraciones de aplicación y del cambio acotado, no de toda la plataforma ni de su operación externa.

Plan 012 continúa activo. Siguiente paso recomendado: inventario de Plan 012.2 (SSRF), conservando como etapa separada cualquier aceptación funcional Cloud que requiera datos o efectos externos autorizados.

Checks documentales de cierre: Prettier focalizado exit 0; node scripts/check-docs.mjs exit 0 (125 Markdown); git diff --check exit 0. Revisión documental independiente aprobada.
