# Reorganización de la auditoría por capacidades

Fecha:2026-11-18. **Método de la revisión por capacidades**, basado en
la conversación y el protocolo existente. No contiene una nueva auditoría,
aceptación de producto ni resultados de pruebas. Conserva la autoridad de
[ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md) y del
[protocolo por capacidad](../quality/capability-audit-protocol.md).

## Pregunta y resultado esperado

**¿El núcleo SaaS ofrecido por Iroko implementa las capacidades seleccionadas
de Supabase como backend, Next.js como capa de aplicación/presentación y las
integraciones complementarias acordadas, con evidencia y límites suficientes
para el MVP previsto?**

Resultado: una matriz consolidada de lo que ofrecemos, dónde está implementado,
qué evidencia tiene y qué falta. Usar una función opcional menos del catálogo
Supabase no es incumplimiento. Una prueba no observada tampoco es un defecto.

Los planes000/0A–017 aportan compromisos, decisiones y evidencia; no son una
lista que deba ejecutarse otra vez. El inventario vigente identifica016 como
revisión integrada y017 como remediación del freeze, con cierres acotados.
Esta revisión conserva esos cierres y las obligaciones pendientes de sus hijos.

## Enfoque recomendado

Completar primero el diagnóstico por capacidades y después seleccionar un lote
de reparación. El piloto Auth ya produjo diagnóstico y reparaciones; se reutiliza
su [entrega](2026-11-18-access-account-delivery.md). Los dos pendientes operativos
se conservan con dueño, sin bloquear la lectura de áreas independientes.
No se cambia A-ACCESS-01 a aprobado por trasladar su escenario al QA humano.

El enfoque anterior —resolver cada brecha antes de revisar la siguiente área—
acopló diagnóstico, implementación, despliegue y aceptación. No se recomienda
para la siguiente pasada. Tampoco se recomienda repetir todas las pruebas de
todos los planes: no responde mejor a la pregunta y consume recursos.

## Tres trabajos con entregables separados

| Trabajo     | Qué produce                                                           | Cuándo termina                                                                                                                                 |
| ----------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Auditoría   | Matriz global, evidencia reutilizada y brechas deduplicadas           | Cada capacidad ofrecida tiene requisito, implementación localizada, evidencia o límite explícito y disposición. Puede terminar con pendientes. |
| Remediación | Lote de causas seleccionadas, cambios, PR y validación proporcional   | Se demuestra el contrato concreto del lote y se actualizan sus IDs. No reabre toda la auditoría.                                               |
| QA humano   | Recorridos sobre un candidato estable, con pasos y esperado/observado | Cada caso ejecutado tiene revisión, fecha, resultado y evidencia; los no ejecutados permanecen pendientes.                                     |

Una sospecha se registra y se discrimina cuando sea necesario; no dispara
automáticamente una reparación. Un riesgo crítico confirmado se comunica con
su evidencia y se trata como intervención separada. Encontrar nuevas ideas no
amplía la oferta aceptada del MVP.

## Cobertura y orden de la primera pasada

Se conserva el contenido de los seis pasos originales, cambiando la separación
entre diagnóstico y corrección:

| Bloque                | Pregunta acotada                                                                                                                           | Evidencia inicial                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Oferta y trazabilidad | ¿Qué prometemos ahora y qué fue diferido o sustituido?                                                                                     | ADR0005, estrategia, capacidades, inventario de planes y registro existente.                                                                   |
| Supabase              | ¿Auth, Postgres/perfiles, membresías/RLS, Storage, Realtime y trabajo asíncrono seleccionados tienen consumidores y controles suficientes? | Auth se reutiliza; continuar con datos/autorización y luego servicios comunes. No exigir todo el catálogo del proveedor.                       |
| Next.js               | ¿Presenta y conecta esas capacidades respetando límites servidor/cliente, sesión, validación y autorización?                               | Proxy, rutas, acciones/API y consumidores de las capacidades revisadas. Diseño gráfico y revisión web ampliada mantienen su alcance posterior. |
| Integraciones         | ¿Resend, Sentry, PostHog, Turnstile y webhooks implementados cumplen su función concreta?                                                  | Productores/consumidores y evidencia por servicio; configuración o SDK instalado no acredita operación. Billing conserva su aceptación en011.  |
| Reutilización         | ¿La guía y configuración permiten reutilizar el núcleo ofrecido?                                                                           | Reutilizar015 y comprobar brechas pertinentes; distribución comercial y vertical IoT siguen separadas.                                         |
| Consolidación         | ¿Qué ofrecemos realmente y con qué condiciones de aceptación?                                                                              | Matriz cerrada, pendientes con dueño y posterior QA del candidato estable. El veredicto MVPv1 se decide con esos límites.                      |

La [matriz de oferta y evidencia](../capabilities.md#matriz-de-oferta-y-evidencia--2026-11-18)
registra la primera pasada transversal. Los próximos sondeos se eligen por
impacto y por la evidencia que falta en sus filas.

## Una matriz y un registro de causas

El inventario maestro sigue siendo [capabilities](../capabilities.md). La
primera pasada preparará filas con este formato, sin abrir otra fuente de estado:

| Capacidad ofrecida                | Compromiso/selección          | Implementación                              | Evidencia y entorno                                                    | Veredicto                                                | Pendiente/ID                                 |
| --------------------------------- | ----------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| Una fila por capacidad y contrato | Requisito vigente o exclusión | Rutas/acciones/SQL/consumidores pertinentes | Revisión, CI, Cloud o declaración del propietario, con fecha y alcance | Cumple / parcial / no cumple / no verificado / no aplica | Causa existente o evidencia faltante y dueño |

No deducir un incumplimiento de la ausencia de evidencia. Conservar separados
implementación y verificación en el PC, Actions, Cloud y QA humano.
Los defectos y disposiciones siguen en el
[registro central](../exec-plans/active/freeze-remediation-register.csv);
los casos humanos sólo lo referencian, sin duplicar ni cerrar sus hallazgos.

## Límites para evitar otra revisión interminable

- Una primera pasada por bloque: compromisos, consumidores y evidencia; informe
  breve con cobertura y brechas. Corregir código pertenece al lote posterior.
- Revisar sólo fuentes pertinentes y reutilizar resultados fechados. Reabrir un
  escenario cuando cambie su contrato, consumidor, configuración relevante o
  aparezca una contradicción concreta. Mover documentación no invalida por sí
  mismo una prueba funcional.
- Ejecutar un sondeo focal sólo si cambia una conclusión importante. Si falta
  entorno o una validación humana, registrarlo; no encadenar reintentos iguales.
- Usar agentes en áreas independientes con resultados breves y deduplicados;
  reservar revisión profunda para contratos ambiguos o de alto impacto.
- Mantener un checkpoint por bloque: revisión base, cobertura, enlaces, IDs,
  límites y siguiente tarea. Los logs extensos no sustituyen ese resumen.
- Agrupar sincronización documental al cierre del bloque y reparaciones por
  causas relacionadas. Los checks obligatorios de GitHub se conservan. La CI
  actual ejecuta suites generales también en PR documentales; optimizar esa
  política sería una tarea separada, no un cambio implícito de esta propuesta.

## Pendientes que se conservan

| Pendiente                                  | Destino y disposición                                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recuperación MFA Cloud                     | A-ACCESS-01 sigue evidence-pending; caso en el [registro de QA humano](../quality/manual-qa-register.md). Login normal informado por el propietario no prueba recuperación. |
| Migración en la base del PC                | Sigue en el plan de acceso/cuenta y estado actual, pendiente de recursos. SQL validado en Actions y aplicado en Cloud no demuestra aplicación en el PC.                     |
| Pendientes históricos de017 y otros planes | Conservar ID, dueño, transferencias y exclusiones. Incorporar sólo los pertinentes a la capacidad; no volver a inventariar todo en cada bloque.                             |

El QA global detallado se prepara a partir de la matriz y un candidato estable,
después del triage y las reparaciones necesarias. Su registro inicial permite
guardar observaciones ahora sin iniciar todavía ese recorrido completo.
