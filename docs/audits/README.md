# Auditorías y evidencia

Este directorio conserva informes fechados y evidencia de las revisiones de
Iroko. Se mantiene la convención existente `AAAA-MM-DD-tema.md`: no se mueven
informes históricos ni se rompen sus enlaces para crear una carpeta nueva.
Este índice reúne el recorrido actual; no sustituye el estado vigente ni el
registro de remediación.

## Auditoría por capacidades iniciada el 17Nov2026

Pregunta general: **¿lo que Iroko ofrece está implementado con Supabase como
backend y Next.js como capa de aplicación/presentación, y tiene evidencia
suficiente para el uso acordado?**

| Documento                                                                                                                            | Para qué sirve                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [Protocolo por capacidad](../quality/capability-audit-protocol.md)                                                                   | Método, alcance, selección de skills/modelos y secuencia acordada                |
| [Estrategia de producto](../architecture/product-strategy.md) y [ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md) | Propósito y decisiones aceptadas; prevalecen sobre ideas históricas no adoptadas |
| [Inventario de planes](../exec-plans/README.md)                                                                                      | Ubicar planes, cierres, dependencias y trabajo diferido                          |
| [Acceso y cuenta: informe/matriz](2026-11-17-access-and-account-audit.md)                                                            | Primer lote ejecutado; selección, consumidores, suficiencia, hallazgos y límites |
| [Acceso y cuenta: evidencia reproducible](2026-11-17-access-and-account-evidence.md)                                                 | Comandos, resultados, fixture sintético y huellas del candidato                  |
| [Registro central de remediación](../exec-plans/active/freeze-remediation-register.csv)                                              | Único estado de hallazgos, con IDs, dueño, retorno y aceptación                  |
| [Estado actual](../current-state.md) e [inventario de capacidades](../capabilities.md)                                               | Síntesis vigente y oferta del proyecto, actualizadas con cada lote               |

Los siguientes lotes se agregan aquí con su fecha y enlace al informe. La
secuencia sigue el protocolo: datos/autorización, Storage/Realtime/correo y
trabajo asíncrono, adaptación/instalación y consolidación. La remediación de
acceso/cuenta conserva sus dos causas actuales; no recibe PASS por abrir el
siguiente lote. Billing mantiene su aceptación en011. El frontend ampliado
conserva su alcance posterior acordado.

## Ruta de avance y punto de reanudación — 17Nov2026

Checkpoint posterior: [reparación implementada](2026-11-17-access-account-repair.md)
en rama `codex/fix-access-account`, revisión apta para CI y unit193/193 PASS.
Publicación/CI, SQL/E2E real y Cloud pendientes. La tabla y el texto de reanudación
siguientes conservan el punto previo; leer este resultado antes de repetir cambios.

La [propuesta de reparación y validación de acceso/cuenta](../exec-plans/active/2026-11-17-access-account-remediation.md)
detalla rama/PR, diseño MFA, pruebas por entorno y límites de RAM. Es el
siguiente trabajo propuesto; no declara código reparado ni publicación realizada.

Precisión de ejecución17Nov: código y diagnóstico focal en el PC; validación
general automatizada en Actions; recorridos reales acotados en Cloud. No levantar
el stack completo local por defecto ni confundir aceptación funcional con carga.

Se mantienen los seis pasos acordados. Auditoría terminada y capacidad aceptada
son estados distintos: el paso2 ya produjo conclusiones útiles, pero dejó
correcciones pendientes. La siguiente intervención de producto propuesta es
resolver esas causas antes de ampliar la ejecución al paso3. Esta organización
no ejecuta ni acepta por sí sola esas reparaciones.

| Paso | Trabajo                          | Estado al cierre de este checkpoint                                             | Próxima salida                                                                               |
| ---- | -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1    | Sincronización documental previa | Realizada sobre los puntos identificados; mantenimiento continuo                | Conservar coherencia al actualizar cada lote                                                 |
| 2    | Piloto Auth/cuentas              | Auditoría e informe terminados; capacidad parcial, sin reparación               | Corregir y validar A-ACCESS-01 y A-ACCESS-02; mantener límites de evidencia restantes        |
| 3    | Datos y autorización             | Próximo lote de auditoría; todavía no ejecutado como lote completo              | Matriz de membresías, roles, RLS, grants, RPC, cuotas e invariantes                          |
| 4    | Servicios comunes                | Pendiente como lote completo; correo ya tiene una revisión acotada en el piloto | Storage, Realtime, correo y trabajo asíncrono, reutilizando evidencia válida                 |
| 5    | Instalación y adaptación         | Pendiente de contraste;015 tiene aceptación local histórica                     | Cotejar guía y consumidores con015; comprobar sólo brechas o cambios que invaliden evidencia |
| 6    | Consolidación                    | Pendiente                                                                       | Capacidades, evidencia y disposiciones sincronizadas; veredicto explícito sobre MVPv1        |

### Cómo incorporar los pendientes del017

El cierre acotado del padre017 no significa que todas las ideas, pruebas o
reparaciones de sus hijos hayan terminado. En cada lote se cruzan el
[inventario de planes](../exec-plans/README.md), los hijos017 pertinentes y el
[registro central](../exec-plans/active/freeze-remediation-register.csv) con
implementación y evidencia. No se vuelve a ejecutar todo017 por su nombre.

Para cada caso pertinente, distinguir: corregido y demostrado en su escenario;
implementado con evidencia insuficiente; pendiente; condicional; diferido fuera
de la oferta; o transferido a otro dueño/plan. Un cierre estático no demuestra
runtime. Un pendiente transferido tampoco desaparece al cerrar su padre.

Conservar ID/alias, decisión vigente, evidencia reutilizable, dependencia,
dueño y condición de retorno. No duplicar un hallazgo al reencontrarlo ni
activar funcionalidad diferida para cerrar una casilla. Ejemplos del registro
actual: N-04/N-05/017-R02 siguen diferidos con editor; DB-01 conserva su P2 de
datos; aceptación PSP transferida sigue en011. Los dos hallazgos A-ACCESS son
causas nuevas deduplicadas, no reaperturas automáticas de017.

### Texto breve para retomar tras una pausa

```text
Retomemos la auditoría por capacidades de Iroko.
Lee AGENTS.md, docs/index.md, docs/current-state.md y docs/audits/README.md.
Aplica docs/quality/capability-audit-protocol.md y la decisión ADR0005 vigente.
Verifica git status y la revisión actual antes de reutilizar este checkpoint.

Checkpoint del17Nov2026:
1. Sincronización documental realizada sobre los puntos identificados.
2. Auditoría Auth/cuentas terminada; suficiencia parcial. A-ACCESS-01 (P1,
   recuperación MFA) y A-ACCESS-02 (P2, cookies en redirects) sin reparar.
   La siguiente intervención propuesta es su corrección y validación acotada.
3. Después: datos/autorización (membresías, roles, RLS, grants, RPC, cuotas).
4. Luego: Storage, Realtime, correo y trabajo asíncrono.
5. Luego: instalación/adaptación, reutilizando evidencia válida del015.
6. Finalmente: consolidación y pregunta de suficiencia para MVPv1.

Cruza cada lote con los hijos017 y el registro central; conserva IDs, pendientes,
transferencias, exclusiones y dueños. No supongas que el cierre del padre
resolvió todo. No repitas suites sin una brecha concreta ni conviertas intención,
configuración o evidencia histórica en aceptación runtime/Cloud actual.
Actualiza informe fechado, registro y resúmenes al terminar cada lote.
```

Este bloque es un punto de reanudación fechado; el estado actual y el registro
pueden superarlo. No repetir una reparación ya entregada si sus evidencias
posteriores muestran que este checkpoint quedó antiguo.

## Pregunta final: ¿podemos declarar MVP versión 1?

El propietario plantea el17Nov que la base podría tener alcance suficiente para
un MVPv1. Se registra como **hipótesis de cierre a evaluar**, no como aceptación
anticipada ni como requisito de agregar funcionalidades.

La consolidación debe responder: **¿podemos declarar Iroko MVPv1 como núcleo
SaaS reutilizable para productos propios, qué incluye esa versión y qué evidencia
respalda sus límites?** La referencia es ADR0005, incluida su enmienda vigente;
el cierre técnico016 no certifica por sí solo pagos ni distribución comercial.

La respuesta final debe identificar:

1. Oferta exacta de esa versión, configuración y candidato evaluado.
2. Recorridos indispensables que funcionan y evidencia por entorno, fecha y
   escenario; distinguir implementación, prueba local y operación Cloud.
3. Defectos conocidos y su impacto en la oferta. No declarar aceptada una
   capacidad bloqueada ni convertir evidencia faltante en PASS.
4. Exclusiones/diferidos aceptados y pendientes compatibles con el uso declarado,
   cada uno con dueño y retorno, sin exigir todo el catálogo de Supabase.
5. Veredicto explícito y acotado: suficiente para el uso indicado o todavía
   insuficiente, con condiciones concretas. Separar ese resultado de estar listo
   para instalar en clientes o cobrar suscripciones certificadas.

Por ahora el lote de acceso/cuenta tiene suficiencia parcial; su informe no
resuelve el veredicto de todo el MVP. Esta pregunta se responde al consolidar
la evidencia necesaria, reutilizando la válida sin repetir suites por calendario.

## Conservación y correcciones

- Cada informe registra candidato, alcance, esperado/observado y límites. La
  evidencia necesaria para entenderlo/reproducirlo queda en documentos del repo,
  sin depender exclusivamente de `.superpowers` o del historial del chat.
- Una corrección conserva el ID y enlaza implementación y validación en el
  registro central. Se añade evidencia fechada; no se borra el fallo original
  para presentarlo retrospectivamente como aprobado.
- Los resúmenes vigentes se sincronizan en el mismo cambio. Los planes y
  auditorías anteriores conservan sus checkpoints históricos.
- Ningún respaldo incluye secretos, tokens, cookies reales o trazas sensibles.
  Los archivos guardados localmente pasan a historial Git al hacer commit;
  el respaldo remoto requiere además push, acciones separadas de esta organización.
