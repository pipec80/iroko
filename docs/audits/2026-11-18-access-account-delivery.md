# Acceso/cuenta: entrega y aceptación — 18Nov2026

Continuación del [registro de reparación](2026-11-17-access-account-repair.md).
El propietario autorizó publicación, PR, revisión, merge y actualización/validación
de Supabase Cloud. No se amplía a otro lote de auditoría ni a funciones diferidas.

## Candidato y evidencia inicial

[PR261](https://github.com/pipec80/iroko/pull/261), base91840bad,
candidato inicialb8b3b92. [CI44222502489](https://github.com/pipec80/iroko/actions/runs/44222502489):
tipos de DB, SQL, unit, calidad, Gitleaks, Edge y E2E aprobados. SQL60archivos/
1210assertions incluye18casos nuevos; navegador Chromium91PASS y WebKit PASS.
Security Audit falló por GHSA-fc5q-39xc-vjpf; build no recibe PASS de ese run.

## Bloqueo de seguridad de la entrega

El [advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) alcanza picomatch
4.0.7. Registro npm confirmó404 para4.0.8: no se inventa una release reparada.
Mitigación provisional en `patches/picomatch@4.0.7.patch`, fijada por hash en
lockfile. Detecta wildcard no acotado en rama simple de extglob repetido y usa
la política nativa de literalización de patrones riesgosos. Mantiene patrones
ordinarios y clases/escapes/extglobs no riesgosos. Debe reevaluarse al aparecer
una release upstream reparada o cambiar el advisory; dueño plataforma/seguridad.

Pruebas acotadas: workers32MiB/1500ms reproducen el bloqueo sin colgar el runner;
parche instalado5/5PASS. Decisión de audit5/5PASS y suite de seguridad16/16PASS.
El grafo productivo actual usa4.0.7 parcheado;2.3.2 permanece sólo en desarrollo.
Se preserva la resolución de Prettier ajena a esta reparación.

Ruling: pnpm11.22.0 `audit --ignore` guarda una exclusión y puede retornar antes
de evaluar otras alertas; no se usa. `audit:production` prueba el parche del
árbol instalado y evalúa JSON crudo, rechazando registro/formato incompleto,
otra alerta alta/crítica y cualquier versión no cubierta de este advisory.
No hay exclusión global por GHSA ni relajación del umbral. La revisión detectó
ese problema antes de publicar el cambio del gate y confirmó su corrección.

## Supabase Cloud: aplicado y comprobado

Destino verificado: iroko `rgrxlygtmvavqzkjyywg`, saludable, DB216MB al preflight.
CLI instalada3.0.0, sin actualización. Dry-run mostró exactamente una migración.
Aplicación autorizada:

```text
supabase db push --remote=rgrxlygtmvavqzkjyywg --skip-vault --yes
20261117180000_mfa_recovery_claims.sql
```

Sin seeds/roles ni actualización de Vault. Readback:181migraciones, nueva RPC
presente, anon sin ejecución, authenticated sin acknowledge ni INSERT directo.
Códigos anteriores10→0, usuarios7 conservados. Fingerprint de IDs anterior a
fixtures: `e1ace6f5db337f88f5308c2feddace3b`. Aún no demuestra GoTrue/browser Cloud.
La aplicación anterior sigue compatible mientras llega la entrega Git.

## Aceptación Cloud preparada

Workflow manual `access-account-cloud-acceptance.yml`, origen fijo
`https://project-a89lv.vercel.app`, backend fijo y SHA verificado antes del dispatch.
Ref restringido a main; production actualmente sólo acepta ramas protegidas y
main es la única protegida. Un worker, sin retries de escritura, sin capturas,
trazas, vídeo ni reportes sensibles. Errores saneados; sólo se emite UUID nuevo.

Escenario: usuario nuevo propio; bootstrap preparatorio por Admin OTP sin envíos
ni desactivar CAPTCHA; TOTP; dos refresh+redirect; recuperación UI; nuevo login,
contenido visible tras reload; rechazo de refresh de sesión anterior y de código
usado con otro TOTP vigente. El login UI conserva las exigencias CAPTCHA reales.

Ruling: hint de expiración positivo1, sin modificar JWT firmado ni TTL global.
Se inspecciona Set-Cookie/Location del307 original y luego la persistencia; el
documento final por sí solo podría enmascarar la pérdida original. Revocación
exige error de refresh/sesión inválida, no un fallo de red o429/5xx.

Cleanup Auth por API en finally. La cuenta personal huérfana requiere eliminación
independiente por UUID exacto y evidencia MCP; no declarar cleanup completo sólo
por borrar Auth. La versión desplegada, escenarios y limpieza se registran aquí
al ejecutarlos. Estado actual de aceptación Cloud: **[NO VERIFICADO]**.
