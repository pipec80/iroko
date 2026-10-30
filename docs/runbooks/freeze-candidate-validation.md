# Freeze — validación del candidato y contrato de evidencia

## Alcance vigente y reauditoría — 2026-10-28

Aplicar [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Este es el gate final de una base replicable, después de015; no una certificación
de Robot ni editor. La exclusión debe estar probada en servidor, acciones y UI.
Mientras no esté implementada, no afirmar que el candidato ofrece ese alcance.
El runner development del editor no es precondición ni siguiente tarea habilitada.

016-T2/T3 revisa el inventario final de código propio, seguridad, datos y consumidores,
incluidos accesos de módulos excluidos. Formular hallazgos reproducibles/falsables,
impacto, controles pertinentes y certeza; separar hechos de hipótesis y resultados
locales de Cloud. Revisor independiente, sin inferir certeza de una marca de modelo.
Una ronda final, corrección de bloqueantes confirmados y retest de su impacto;
no otra auditoría general automática por cada cambio. P0/P1 ofrecidos sin resolver
impiden entrega. Los demás requieren disposición explícita y condición de retorno.

Antes de ejecutar fijar escenarios ofrecidos, método, presupuesto de recursos,
comandos y criterios. Usar automatización existente adecuada o navegador manual
reproducible en recorridos acotados; las capas unitarias/SQL no sustituyen esos
recorridos ni viceversa. No eliminar assertions, bajar umbrales o marcar un
escenario fuera de alcance como PASS. CI debe reflejar el alcance aprobado y
reportar exclusiones: todavía no se modificó su selección por este documento.

Estado: protocolo de ejecución **planificado**, 2026-10-20. Implementa la
validación final de [016-T2/T3](../exec-plans/active/016-nextjs-supabase-code-review.md)
y el gate de [017](../exec-plans/active/017-freeze-remediation.md). El orden lo
define [ROADMAP](../../ROADMAP.md); ejecutar este protocolo después de los últimos
cambios de 015, con validaciones focalizadas durante cada tarea anterior.

El hito **reparaciones locales aceptadas** de 017 se registra antes y permite
avanzar en esa secuencia. Este protocolo acepta el candidato integrado; no debe
ejecutarse entero para cerrar cada tarea o cada lote de 017. Consultar el contrato
común de ese plan para validación proporcional y límites de reintento.

## V0 — Identidad, alcance y preflight

- [ ] Registrar branch/HEAD, git status, diff autorizado, fecha y versiones instaladas. Comprobar comandos existentes con Get-Command/where/version antes de declararlos ausentes. No instalar ni actualizar herramientas para obtener verde sin petición explícita.
- [ ] Identificar qué evidencia previa sigue siendo válida: mismo contenido, dependencias/configuración no afectadas y escenario relevante. Un SHA distinto exige justificar reuso; un conteo histórico no se renueva por copiarlo.
- [ ] Enumerar consumers/proveedores de las superficies modificadas. No leer valores de .env, secretos ni payloads personales al informe.
- [ ] Confirmar stack local `saas-boilerplate`, URL loopback, project_id, contenedor/labels y puertos. Verificar helpers de E2E y dblink antes de escribir fixtures. Corregir 017.5-T11 antes de usar el fixture afectado.
- [ ] Clasificar toda operación: lectura, fixture local, reset autorizado, Cloud. Ninguna URL confirmada ni MCP autenticado sustituye autorización de una escritura.
- [ ] Verificar gate Sentry cerrado por defecto y tráfico de pruebas confinado. Build/E2E no deben subir sourcemaps, enviar emails reales, telemetría ni pagos. Reusar runner de validación local existente y sus sumideros; no modificar secretos privados del mantenedor.

Si falta precondición, registrar [NO VERIFICADO], causa y siguiente acción. No
apuntar a Cloud como atajo. No crear otro stack por inferencia ni borrar datos
del mantenedor confiando en un rollback que no cubre dblink.

## V1 — Calidad y suite sin servicios reales

| Comando actual                | Criterio                                                               | Evidencia                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`              | Exit 0                                                                 | SHA y resumen; revisar supresiones afectadas, no solo resultado                                                                                                           |
| `pnpm lint`                   | 0 errores; warnings con disposición                                    | Sin --fix automático sobre cambios ajenos                                                                                                                                 |
| `pnpm format:check`           | PASS o fallos delimitados                                              | No formatear archivos ajenos para ocultar baseline                                                                                                                        |
| `pnpm knip`                   | Sin hallazgos nuevos sin disposición                                   | Separar hints previos de nuevos exports/código muerto                                                                                                                     |
| `pnpm test:coverage`          | Suite unitaria completa y umbrales existentes 90/78/90/90 o superiores | Registrar pool/workers, duración, fallos y skips; satisface también `pnpm test` si selección/configuración coinciden. No ejecutar dos suites idénticas ni bajar umbrales. |
| `node scripts/check-docs.mjs` | Enlaces/referencias válidos                                            | No demuestra consistencia semántica                                                                                                                                       |
| `pnpm design-system:check`    | PASS en superficies visuales afectadas                                 | No certifica inspección visual de todas las pantallas                                                                                                                     |

El baseline del 19/10 tuvo 122 archivos/1452 tests aprobados con
`pnpm test -- --pool=threads --maxWorkers=1`; el intento previo con pool original
fue interrumpido sin resumen y se conserva como tal. Una alternativa del runner
es válida si se documenta y ejecuta toda la selección, pero no demuestra la
causa del intento anterior ni cambia configuración por sí sola.

## V2 — SQL, tipos y Edge Functions

- [ ] Revisar migración/espejo/ACL y regenerar tipos expuestos si corresponde. Para comparar sin modificar el archivo versionado, generar a copia temporal y comparar; no usar supa:gen:types como lectura inocua.
- [ ] Ejecutar `pnpm supa:lint` y `pnpm supa:test` en el destino identificado, serialmente. Capturar archivos/asserts y fixture cleanup. Cada denegación exige control positivo; error para todos no demuestra RLS correcta.
- [ ] Demostrar D-01 y cuotas/invitaciones/owners del núcleo con sesiones independientes. Conservar regresiones CAS SQL existentes; aceptación browser del editor queda diferida mientras su exclusión sea efectiva. No sustituir una carrera requerida por mocks secuenciales.
- [ ] Un reset limpio de historia local, si la ejecución lo incluye, exige preservar/verificar credenciales y fuentes antes y después; registrar identidad y autorización. Nunca suponer que Vault se recupera de una variable de entorno ni que UPDATE encontró una fila.
- [ ] Ejecutar `pnpm test:functions` con Deno/dependencias ya disponibles, tras verificar mocks/red. Si falta toolchain, registrar no ejecutado; no instalar automáticamente.

## V3 — Build y navegador local

- [ ] Ejecutar `pnpm build` con entorno de validación coherente y uploads/egreso impedidos. Registrar bundler, rutas/errores y ausencia de efectos externos; un build con bypass env no acredita instalación válida.
- [ ] Ejecutar una selección E2E integrada del alcance fijado, con evidencia de exclusión de editor/Robot y alineación de CI; el `pnpm test:e2e` actual no se presume alineado. Targets locales identificados; cleanup finally y controles post-run. Recorridos manuales acotados son alternativa explícita, no reemplazan gates SQL/tipos/build.
- [ ] Casos mínimos: contraseña válida/inválida; caché A→B y fallo B; privacidad si analítica habilitada; catálogo/precio y error; archivo y permisos; evento Realtime/cleanup; operación Edge/correo y resultado; imágenes/audit ofrecidos; configuraciones con/sin nuevas compras; réplica, marca y extensión neutral. Editor avanzado/Robot diferidos, nunca reportados como aprobados.
- [ ] Conservar evidencia de roles viewer/member/admin/owner y platform admin + aal2 donde corresponde. Robot apagado: URL/acción no disponibles; pruebas SQL distinguen roles autorizados.
- [ ] Ejecutar Chromium y las variantes WebKit/smoke requeridas por CI/superficie; explicar skips y no afirmar aceptación de Firefox por un pase Chromium. Inspección responsive/accesibilidad proporcional en UI modificada.
- [ ] Comprobar cleanup y detener solo procesos propios. Registrar cualquier fixture residual como fallo de aceptación/seguimiento explícito.

## V4 — Cloud, proveedores y operación

Solo si existe autorización específica para la acción: renovar identidad del
proyecto, revisión desplegada y configuración antes de aceptar. El destino MVP
es `project-a89lv.vercel.app` según el [runbook existente](mvp-cloud-acceptance.md);
no crear obligación de preview aislado ni recursos pagos.

- [ ] Verificar linked migration state de solo lectura antes de afirmar paridad; aplicación de cambios requiere permiso separado.
- [ ] Pruebas de proveedor/runtime se atribuyen a escenario y fecha. Smoke/HTTP200 no demuestra entrega, reparación financiera ni evento ingerido: correlacionar causa/efecto y recibo correspondiente.
- [ ] Recuperación, email worker/SMTP, Storage/Realtime y observabilidad deben cubrir las capacidades ofrecidas. Mantener fuera del freeze los escenarios diferidos 011 y certificaciones de proveedores no ofrecidos.
- [ ] Cada RL-F/followup tiene resultado o disposición explícita de alcance/motivo/responsable/condición de retorno. Cloud TTL no ejercitado no se etiqueta PASS.

## V5 — Consolidación final y salida del freeze

- [ ] Actualizar registro CSV sin IDs perdidos ni implementaciones duplicadas; cada tarea apunta a evidencia del candidato. Revalidar solo superficies afectadas por cambios posteriores, pero no reutilizar una evidencia invalidada.
- [ ] Revisar semántica de current-state/capabilities/roadmap/planes/runbooks/prompts y metadata. Un checker verde no sustituye esta revisión.
- [ ] Confirmar que 012,014,015,016,017 cumplen su alcance MVP y cada diferido tiene dueño/retorno. Un hijo completamente diferido no mantiene abierto el gate de la base si su exclusión está probada; permanece registrado como diferido, no completado. La aprobación documental o merge no certifican runtime.
- [ ] Ningún P0/P1 de seguridad/integridad vigente queda sin disposición; en capacidades ofrecidas exigir corrección y aceptación antes de usuarios reales. Excepciones de evidencia deben ser explícitas y compatibles con los gates del producto.
- [ ] Publicar auditoría fechada con veredicto, certeza, comandos/resultados, skips, límites locales/Cloud y pendientes. No usar porcentaje global de avance a partir de tareas heterogéneas.

Formato por evidencia: `caseId, taskId, candidateSHA, surface, targetIdentity,
commandOrScenario, expected, observed, result, cleanup, reviewer, evidenceLink`.
Los identificadores de targets son sanitizados; nunca incluir tokens, passwords,
direcciones personales, URLs firmadas o secretos.
