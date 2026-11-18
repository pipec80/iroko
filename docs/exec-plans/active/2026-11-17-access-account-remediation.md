# Acceso/cuenta: plan de reparación y validación

> Para ejecución: usar Superpowers executing-plans con un implementador y una
> revisión independiente del cambio completo. Checkboxes registran resultados,
> no intenciones. Leer este plan y el informe antes de cambiar producto.

**Estado:** núcleo de reparación implementado localmente el17Nov2026;
publicación/CI y aceptación SQL/E2E/Cloud pendientes. Decisión MFA y rulings en
[registro de ejecución](../../audits/2026-11-17-access-account-repair.md).
Revisión independiente: apto para CI. Unit focal193/193 PASS y typecheck PASS;
no se declara completado el plan por esos resultados.

Código en commit local7448aee, hooks normales PASS. Transporte SSH de lectura
verificado con permisos adecuados. El checkpoint previo que decía fallo SSH
se conserva como histórico; no hay fallo de autenticación demostrado. Siguiente
autorización: publicar rama/PR y ejecutar CI. Sin merge ni cambios Cloud ejecutados.

**Precisión del propietario,17Nov:** concentrar automatización y comprobaciones
generales en GitHub Actions; reservar el equipo local para código y diagnóstico
puntual. Validar integración real en Vercel/Supabase con un alcance controlado.
La solicitud de este turno es concretar el plan antes del OK de ejecución.

**Objetivo:** reparar A-ACCESS-01 y A-ACCESS-02, demostrar el resultado en los
entornos pertinentes y sincronizar entrega/documentación antes del lote3.

**Arquitectura:** conservar Supabase Auth como autoridad de identidad/AAL y
Next.js como integración. Resolver cookies en el adaptador de respuestas y
recuperación mediante un mecanismo compatible con Auth; no exceptuar dashboard
del guard para hacer pasar un código. No ampliar a otros módulos.

**Stack:** Next16.4.6, supabase-js/Auth-js2.119.0, SSR0.12.7; Vitest y Playwright
instalados. Sin actualizaciones, nuevas dependencias ni entornos por defecto.

**Contrato:** [informe y criterios por causa](../../audits/2026-11-17-access-and-account-audit.md),
[evidencia inicial](../../audits/2026-11-17-access-and-account-evidence.md) y
[ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
El [registro central](freeze-remediation-register.csv) conserva los IDs.

## Límites globales y recursos

- Preservar documentación pendiente, credenciales y material ignorado. No
  reset/stash/pull sobre el árbol sucio ni commits con `git add .`.
- Sin reapertura general017, pruebas de estrés/carga, esperas largas de TTL,
  cobertura global o builds locales repetidos por defecto.
- Antes de cada ejecución costosa, comprobar RAM disponible. Vitest local:
  un worker, sin paralelismo de archivos y sin cobertura. No ejecutar a la vez
  build, Docker, browser y suites. El heap de Node no limita el consumo total.
- Si una comprobación falla dos veces por la misma limitación de recursos,
  detener esa estrategia, conservar el resultado y trasladar el check pertinente
  a CI o registrar evidencia pendiente. No subir memoria, quitar guards ni
  debilitar assertions para fabricar PASS.
- CI existente mantiene gates completos. Trasladar cobertura/build/E2E generales
  a Actions no los convierte en pruebas contra Supabase Cloud o Vercel.
- Usar servicios Free/free-tier existentes. Antes de operar un proveedor,
  verificar destino, capacidad/cuota aplicable y autorización de esa operación;
  no crear proyectos ni activar cobros. No inspeccionar secretos para probar paridad.
- Publicación, merge, despliegues y escrituras/migraciones Cloud conservan el
  requisito de autorización explícita del repositorio; este plan no los ejecuta.

## Archivos y responsabilidades

| Frente              | Superficie prevista                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cookies             | `src/lib/supabase/middleware.ts`, su `middleware.test.ts`; `src/proxy.ts`/`src/proxy.test.ts` sólo si el contrato de respuesta lo requiere                     |
| Recuperación        | `src/app/[locale]/(auth)/actions.ts` y sus tests; `src/components/dashboard/account/mfa-setup.tsx` y acciones de cuenta sólo según mecanismo aprobado en paso1 |
| Prueba de recorrido | Un spec acotado `src/test/e2e/mfa-recovery.spec.ts`, reutilizando fixtures/cleanup existentes; no confundirlo con `recovery.spec.ts` de contraseña             |
| SQL condicional     | Sólo si la decisión1 demuestra necesidad: migración versionada manual y espejo en `supabase/schemas/`, SQL focal y tipos cuando corresponda                    |
| Evidencia/estado    | Informe original preservado; evidencia de reparación fechada, registro, capabilities, current-state e índice de auditorías sincronizados                       |

No se fija un archivo nuevo de backend ni una migración ficticia antes de
resolver el contrato de recuperación. Los archivos exactos adicionales y sus
interfaces deben quedar anotados en la decisión1 antes de implementarlos.

## Revisión de mayor riesgo

1. Código inválido, usado, de otro usuario o llamada anónima no recupera acceso.
2. Dos intentos con el mismo código no autorizan dos recuperaciones independientes.
3. Fallo intermedio de Auth/refresh no anuncia éxito ni deja un bypass persistente;
   la política de reintento después de consumir el código debe ser explícita.
4. Cambiar respuesta conserva cookies con sus opciones y headers pertinentes;
   no copia indiscriminadamente headers de control interno de Next.
5. Navegación con recarga conserva el resultado; fixtures, sesiones y factores
   creados para la prueba se eliminan sin afectar cuentas ajenas.

Los casos1–3 pertenecen a los tests del mecanismo MFA;4 a middleware/proxy;
5 al spec de recorrido y su cleanup. Revisión independiente centrada en estas
fronteras, no otra reauditoría completa del repositorio.

## Paso0 — preparar una entrega trazable

- [ ] Registrar baseline, cambios pendientes y lista explícita de archivos propios.
- [ ] Releer `main` remoto antes de crear `codex/fix-access-account`; preservar el
      trabajo documental de esta auditoría en la misma entrega con commit separado.
      Reutilizar checkout actual; no crear otro stack ni worktree por defecto.
- [ ] Resolver transporte Git de escritura antes de publicar. En esta preparación
      `git ls-remote` por SSH falló; el conector GitHub sí leyó el remoto y confirmó
      `main=91840bad4931a60a06d346c811671b8af89473a7`, igual a HEAD local. Esto no
      demuestra permiso efectivo para push ni publicación de cambios sin commit.

Propuesta: una rama, un PR y commits separados para documentación base, cookies
y MFA. Si MFA encuentra un bloqueo de compatibilidad, cookies puede entregarse
independientemente, manteniendo A-ACCESS-01 abierto. No mezclar otros pendientes.

## Paso1 — cerrar el mecanismo de recuperación MFA

- [ ] Registrar una decisión breve con transición de sesión/factor/AAL, prueba
      requerida y archivos/interfaces exactos. A-ACCESS-01 conserva prioridad P1.
- [ ] Contrastar SDK instalado y servidor destino antes de elegir. Auth-js2.119.0
      contiene `auth.mfa.recoveryCodes.*`, pero exige `experimental.recoveryCodes`
      y habilitación del servidor (`src/lib/types.ts` de Auth-js). SDK instalado no
      demuestra soporte de Auth local/Cloud; no activar experimental automáticamente.
- [ ] Evaluar vía nativa sólo si compatibilidad, configuración disponible y uso
      gratuito del destino quedan demostrados. Resolver transición de los códigos
      propios existentes: no son intercambiables por inferencia con códigos nativos.
- [ ] Si no procede la vía nativa, diseñar recuperación propia apoyada en APIs
      Auth oficiales: identidad obtenida en servidor, código de un uso ligado al
      caller y una recuperación segura con reintento acotado. No editar tablas
      `auth.*` directamente ni confiar en un userId enviado por el navegador.
- [ ] Si se considera borrar un factor mediante Admin API, incorporar su efecto
      documentado de cierre de sesiones y nueva autenticación al contrato; no
      suponer que un simple refresh mantiene válida la sesión anterior.

Salida finita: decisión elegida, compatibilidad demostrada o límite concreto,
interfaces y tests precisos. Si falta evidencia para elegir una vía segura,
no improvisar una elevación AAL ni declarar listo el código MFA. Completar
esta decisión antes de escribir su implementación; no hace falta probar todo Auth.

Fuentes consultadas17Nov:
[MFA](https://supabase.com/docs/guides/auth/auth-mfa),
[recovery codes](https://supabase.com/docs/reference/javascript/auth-mfa-recovery-codes),
[deleteFactor](https://supabase.com/docs/reference/javascript/auth-admin-deletefactor)
y tipos/código del Auth-js instalado. Ninguna capacidad Cloud fue activada.

## Paso2 — corregir y demostrar cookies

- [ ] Incorporar al test estable la invocación `setAll` en la frontera SDK;
      confirmar RED antes de la corrección. Reutilizar el sondeo, no duplicar harness.
- [ ] Mantener `updateSession(request: NextRequest): Promise<NextResponse>`.
      Hacer que cada respuesta alternativa conserve cookies emitidas y headers
      de sesión pertinentes de la respuesta SSR; preservar destino, status y guards.
- [ ] Comprobar pass-through, onboarding, login/root autenticado, MFA y redirects
      admin/impersonación alcanzables según configuración. Assertion concreta:
      cookie sintética `audit-session=refreshed` con sus opciones preservadas;
      respuesta protegida conserva no-store. Sin refresh no inventar cookies.
- [ ] Ejecutar en serie:
      `pnpm exec vitest run src/lib/supabase/middleware.test.ts src/proxy.test.ts --maxWorkers=1 --no-file-parallelism`.
      Registrar total y exit; sólo PASS del run terminado permite corrected-local.

## Paso3 — implementar y validar recuperación elegida

- [ ] Añadir los tests exactos de la decisión1 y comprobar el fallo real inicial;
      no basta la assertion de redirect del unit antiguo.
- [ ] Implementar la transición elegida en servidor/UI, conservando guard y
      permisos. Probar error/reintento, uso único e identidad ajena además del éxito.
- [ ] Ejecutar sólo archivos de acciones/MFA tocados, con un worker. Si cambia SQL,
      probar función/permisos afectados en stack oficial o runner CI, sin repetir
      todo016 local. Mantener migración, espejo y tipos sincronizados.
- [ ] Agregar el spec acotado reutilizable con fixture propio: enrolar TOTP,
      generar recovery, entrar en nueva sesión sin dispositivo, recuperar,
      recargar y comprobar resultado, rechazar reuso y limpiar. El estado final
      exacto (AAL/factor/re-enrolamiento) lo fija la decisión1, no un mock conveniente.

## Dónde demuestra cada prueba su resultado

La ruta habitual será código/tests focales locales → Actions → recorrido Cloud.
No levantar Docker/Supabase/browser locales por defecto para esta reparación.
Sólo hacerlo ante un fallo puntual cuyo diagnóstico lo necesite, con un único
escenario y recursos comprobados. La fila de browser local siguiente es esa
excepción, no una etapa obligatoria adicional ni otra suite global en el PC.

| Entorno                               | Qué ejecutar                                                                                        | Qué demuestra y qué no                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Local ligero                          | Tests focales, typecheck y lint requeridos en serie; docs/format/diff                               | Causas de lógica y contratos de código; no proveedor real. Los checks antes de commit siguen vigentes                    |
| GitHub Actions existente              | Gates de calidad, coverage, SQL, E2E y build que correspondan al PR                                 | Reproducibilidad y regresiones en runner. Su Supabase local en contenedores sigue siendo local, aunque corra en GitHub   |
| Browser local contra build real       | Un recorrido dirigido si RAM lo permite y aporta evidencia que falta                                | Integración Next/Auth del candidato; evitar repetir E2E global. Si CI ya lo demuestra, no duplicarlo sólo por calendario |
| Vercel + Supabase Cloud identificados | Tras entrega autorizada: un fixture propio, MFA recovery real y refresh+redirect observado, cleanup | Runtime del SHA y destino comprobados; no se deduce de READY, mock ni CI. Mantener [NO VERIFICADO] hasta observación     |

El spec debe reutilizarse donde sea seguro: primero verificar fixtures, destino
y protocolos antes de apuntarlo a Cloud. El harness local actual no se considera
automáticamente apto para Cloud. No desactivar CAPTCHA ni seguridad del proyecto
para reproducir; no acortar TTL global ni esperar horas por expiración. Preparar
sesión de prueba y condición de refresh soportada dentro de una ejecución
acotada; si no se logra observar refresh real, registrar ese límite.

No se promete eliminar todo consumo local: typecheck/lint de las reglas siguen
siendo requisitos de entrega. Si recursos los impiden, documentar el bloqueo y
definir alternativa conforme al contrato antes de omitirlos. Cobertura general
permanece en CI; no se bajan thresholds ni se cambian workflows para esquivarla.

### Automatización en Actions y límites de ejecución

El inventario actual contiene `ci.yml`, `codeql.yml`, `docs.yml`, `nightly.yml`
y `mercadopago-sandbox-acceptance.yml`. CI ya tiene unit/coverage, SQL, E2E y
build; nightly tiene comprobaciones alojadas. El workflow manual de Mercado Pago
no se reutiliza como una autorización de fixtures Auth ni se mezcla con billing.

- [ ] Integrar las regresiones nuevas en la selección normal del PR. Aprovechar
      gates existentes; cambiar `ci.yml` sólo si se demuestra una selección faltante.
      El spec MFA debe demostrar resultado con GoTrue real del runner, además de unit.
- [ ] Revisar si el harness Cloud existente permite los dos recorridos con destino,
      revisión y fixture verificados. Si no, preparar un entrypoint manual acotado
      de Auth en `.github/workflows/auth-account-acceptance.yml` y su spec dedicado
      `src/test/e2e/access-account-cloud-acceptance.spec.ts`; no adaptar a Cloud los
      runners que deliberadamente rechazan credenciales/destinos de proveedores.
- [ ] Para ese entrypoint, exigir destino permitido y SHA verificado, ejecución
      manual, un worker, sin ejecuciones solapadas, timeout15min y sin retries
      automáticos del escenario con escritura. Permisos Git mínimos; reutilizar
      controles de secretos/entorno existentes, nunca exponerlos a PR no confiable.
- [ ] Usar sólo identidades propias de prueba y operaciones de Auth necesarias
      para el recorrido. Cleanup idempotente en finally y evidencia de su resultado,
      sin borrar usuarios/factores de terceros ni resetear el proyecto Cloud.
- [ ] Mantener trazas, HAR y capturas sensibles desactivadas en Cloud; exportar
      únicamente resultado saneado, revisión, escenario y cleanup. Preservar los
      guards actuales; no volver a introducir el incidente de credenciales de016.
- [ ] Verificar minutos/cuotas y capacidad Free antes del primer dispatch; ejecutar
      una tanda por candidato. Repetir sólo al cambiar código o encontrar un fallo
      concreto. La planificación no dispara workflows ni crea usuarios Cloud.

Aquí «usar más Actions/Cloud» significa ejecutar allí las comprobaciones útiles;
no generar carga hasta agotar los servicios. Estos defectos requieren pruebas
funcionales y algunos intentos concurrentes dirigidos al uso único del código,
no benchmarks ni saturación. Una prueba de carga posterior necesita hipótesis,
objetivo, tasa/duración máximas y presupuesto propios antes de ejecutarse.

## Paso4 — revisar, entregar y actualizar el punto de reanudación

- [ ] Una revisión independiente de seguridad/corrección del cambio completo,
      con paquete breve: dos IDs, diff, decisión MFA y resultados. Sin agente por archivo.
- [ ] Revisar y publicar rama/PR cuando la publicación esté autorizada. Esperar
      checks del SHA exacto; no atribuir a este cambio un CI histórico verde.
- [ ] Antes de merge autorizado, verificar base actual y resultado de CI. Evaluar
      el despliegue automático esperado; no tratar merge y deploy como inocuos si
      modifican el entorno. Si hay migración, fijar orden compatible de SQL/app y
      rollback antes de cualquier aplicación remota autorizada.
- [ ] Comprobar revisión desplegada y recorridos Cloud bajo autorización; registrar
      cleanup y límites. Una dependencia de dominio ajena al caso no bloquea toda
      esta reparación; una configuración Auth faltante sí conserva su caso pendiente.
- [ ] Actualizar registro por causa, informe de reparación, capabilities,
      current-state e índice. Mantener informe inicial y fallos originales.
      No cerrar ambos hallazgos por un solo PASS ni aceptar Cloud con pruebas locales.
- [ ] Retomar lote3 con checkpoint breve: SHA/PR, qué cambió, pruebas, estados
      de los dos IDs y pendientes. El chat no es la única fuente para continuar.

## Aplicación de reglas y excepciones

Se revisaron las ocho reglas actuales de `.codex/rules`:

- TypeScript/Next, code-quality, software-principles y JSDoc: strict/no-any,
  límites servidor/cliente, validación y errores observables; sin refactor general.
- Git-workflow: branch/commits convencionales y checks. Prefijo `codex/` de la
  sesión prevalece sobre ejemplos `fix/`; no pull destructivo con docs pendientes.
- Testing-standards: comportamiento, controles y fronteras mínimas de mocks.
  Coverage general exigida se mantiene en CI; no repetirla localmente por defecto.
- Supabase-setup/SQL: excepción Windows vigente de migración manual más espejo;
  RLS/grants/search_path mínimos si se toca SQL. No ejecutar `supabase db diff`.
- Supabase-realtime: leído, sin consumidor cambiado; no agregar canales ni migrar
  Realtime en esta corrección.
- Contradicciones resueltas por AGENTS/código: `src/env.ts` frente al ejemplo
  antiguo env.js; proxy.ts frente a middleware.ts; paleta aceptada de AGENTS
  frente al ejemplo Material3; no cachear identidad por la regla genérica use-cache.

Checkpoint histórico de preparación: lectura de checkout y GitHub; ninguna prueba de producto
ejecutada en esta fase de planificación. Los resultados199PASS y probe2PASS/3FAIL
siguen siendo los del informe inicial, no una reparación. Estado de proveedor,
RAM disponible al ejecutar y disponibilidad del mecanismo MFA deben refrescarse
cuando se implemente, sin abrir de nuevo todo el contexto histórico.
