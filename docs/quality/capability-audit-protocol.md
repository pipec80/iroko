# Preparación de auditoría por capacidad

Fecha:2026-11-17. Origen: preparación documental; el texto preparatorio siguiente
conserva ese alcance. Ejecución posterior autorizada del piloto:
[acceso y cuenta](../audits/2026-11-17-access-and-account-audit.md), con matriz,
dos causas confirmadas en composición local y límites runtime/Cloud explícitos.
La ejecución no equivale a aceptación integral del producto.

El [índice de auditorías](../audits/README.md) reúne los entregables y registra
la pregunta final planteada por el propietario: si la evidencia permite declarar
MVPv1 del núcleo reutilizable, con oferta, límites y pendientes explícitos.
Se resolverá en la consolidación; no se presupone aceptación por cantidad de
funciones ni se amplía por ello el alcance a distribución comercial.

## Propósito y autoridad

Contrastar la promesa de Iroko con decisiones aceptadas, implementación y
evidencia verificable, conservando la [autoridad documental](../adr/0001-documentation-authority-and-agent-contract.md)
y la [dirección del producto](../architecture/product-strategy.md). La unidad
de revisión es una capacidad ofrecida y su contrato, no el número de un plan.

Esta preparación no reabre016/017, certifica pagos, activa verticales ni crea
otro registro de pendientes. Los planes conservan sus cierres acotados;011
conserva aceptación PSP y013 la condición comercial. La petición actual permite
ordenar documentación y método; una ejecución posterior fija su alcance,
destinos, recursos y operaciones autorizadas antes de probar.

Los templates SaaS investigados, incluidos Python y plataformas Microsoft,
aportan ideas sobre instalación, adaptación, mantenimiento y entrega. Reutilizar
los [estudios fechados](../audits/2026-10-05-saas-template-competitive-landscape.md)
y registrar la decisión que inspira cada referente. Una función anunciada por
un competidor no se convierte automáticamente en un requisito de Iroko.

## Un recorrido, cinco preguntas

| Pregunta                          | Fuente / resultado requerido                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| ¿Para qué se quería?              | Promesa histórica, necesidad y destinatario; identificar propuesta frente a compromiso.                                         |
| ¿Qué se aceptó finalmente?        | ADR/enmienda, configuración ofrecida y exclusiones; conservar diferencias con la idea anterior.                                 |
| ¿Dónde se implementa?             | Productores/consumidores y límites efectivos: UI, proxy, acciones, API, SQL/RLS, Storage, worker y proveedor aplicables.        |
| ¿Qué se demostró?                 | Contrato oficial pertinente, revisión/candidato, entorno, escenario, esperado/observado y controles positivos/negativos.        |
| ¿Qué disposición tiene la brecha? | Defecto confirmado, evidencia faltante, deuda documental, exclusión deliberada o propuesta; dueño y retorno sin PASS implícito. |

El código describe el comportamiento y puede incumplir el requisito aceptado;
su autoridad para describir lo que existe no lo convierte en autorización para
cambiar el requisito. Un fallo de entorno o del test tampoco confirma por sí
solo un defecto del producto.

Extender el inventario existente de [capacidades](../capabilities.md) con la
evidencia del lote, y conservar los IDs/alias del
[registro central](../exec-plans/active/freeze-remediation-register.csv).
El informe fechado del lote puede detallar resultados; no debe crear una cola
paralela con estados incompatibles. Si aparece un caso nuevo, deduplicarlo y
asignar propietario antes de introducir otro ID.

## Primer nivel acordado: selección y suficiencia

El propietario precisa el primer resultado: identificar qué capacidades ofrece
el servicio, cuáles necesita Iroko, cuáles consume y si ese conjunto basta para
operar el alcance acordado. No maximizar el catálogo utilizado ni interpretar
una función opcional sin uso como deuda. Supabase-first significa aprovechar
sus servicios donde resuelven una necesidad, con consumidores y límites claros.

Para cada producto Supabase, usar un catálogo funcional acotado con fuente
oficial y fecha; no inventar un número universal de «herramientas» ni contar
endpoints como si cada uno fuera una capacidad de producto. Registrar:

| Campo                | Pregunta                                                                  |
| -------------------- | ------------------------------------------------------------------------- |
| Capacidad disponible | ¿Qué permite el proveedor en la versión/plan pertinente?                  |
| Selección            | ¿La necesitamos ahora, queda opcional o se excluyó/difirió?               |
| Uso efectivo         | ¿Hay un consumidor real y dónde está, además de configuración o SDK?      |
| Resultado básico     | ¿Resuelve el recorrido necesario y rechaza el acceso indebido?            |
| Suficiencia          | ¿Falta algo indispensable para operar ese recorrido?                      |
| Límite y disposición | ¿Hay defecto, evidencia faltante o dependencia externa? ¿Quién lo recibe? |

Las selecciones siguientes expresan lo solicitado y sus fronteras, no resultados
de una auditoría ya ejecutada:

| Área       | Alcance a contrastar primero                                                                                                    | Lo que no se incorpora automáticamente                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Auth       | Registro/acceso, confirmación/recuperación y mecanismos ofrecidos; Google es el proveedor externo mencionado por el propietario | SSO empresarial u otros proveedores sólo por existir en Supabase            |
| Perfil     | Datos de aplicación vinculados a la identidad Auth, lifecycle y permisos del perfil                                             | Duplicar identidad, credenciales o autoridad de autorización                |
| Storage    | Avatar y archivos de los recorridos actualmente ofrecidos, con persistencia y permisos                                          | Todo tipo de archivo o un importador genérico                               |
| PostgreSQL | Persistencia, relaciones, autorización e invariantes necesarias para esos recorridos                                            | Todas las extensiones o productos del catálogo                              |
| Correo     | Identificar qué envía Auth, qué envía la aplicación, qué plantilla usa cada flujo y qué transporte entrega el mensaje           | Rediseño visual de todos los emails como condición de funcionamiento básico |

El Excel con formato conocido conserva su papel de referencia histórica Robot;
esa vertical sigue diferida/excluida bajo ADR0005. Clasificar su código y uso
sin reactivar su menú ni convertir la ausencia de oferta en un fallo del MVP.
El upload/descarga no demuestra por sí solo que el procesamiento de Excel sea
correcto. El avatar y el caso de archivo privado conservan contratos propios.

El informe inicial responderá «sí», «no» o «no verificado» a uso y resultado,
con justificación breve; selección y disponibilidad son columnas separadas.
Una capacidad innecesaria queda «no aplica al alcance». Un bloqueo por dominio,
cuenta o cuota queda identificado como dependencia; no se convierte en defecto
de código ni en PASS. Se pueden contar capacidades seleccionadas y verificadas,
pero ese cociente no es un porcentaje de calidad de todo Iroko.

La primera pasada localiza implementación y evidencia vigente; amplía revisión
o pruebas sólo cuando una brecha concreta lo exige. La matriz pertenece al
inventario existente de capacidades y sus evidencias, sin otra cola de tareas.

### Servicios gratuitos, dominio y correo

El propietario reconfirma que todos los servicios actuales son gratuitos/free-tier:
Vercel, Supabase, GitHub, Resend, PostHog, Sentry y Cloudflare/Turnstile. Es una
declaración del propietario, no una nueva auditoría de cuentas/cuotas. Conservar
el stack oficial y verificar capacidad/cupo antes de operaciones; no contratar,
actualizar planes ni añadir servicios para completar esta revisión.

El propietario declara pendiente adquirir un dominio. Identificar qué escenario
lo requiere realmente antes de bloquearlo: lectura de código/plantillas, pruebas
locales y evidencia previa no equivalen a recepción externa con remitente propio.
El dominio y su configuración son dependencia del propietario donde procedan,
no una tarea de compra autorizada ni un bloqueo global de la auditoría.

Para esta pasada, un correo sencillo en texto es suficiente si el destinatario
correcto recibe la información y puede completar el flujo esperado. Comprobar
enlaces/códigos, tratamiento seguro de datos y errores pertinentes; registrar
estética/branding pendiente por separado. Distinguir plantillas Auth de las de
correo de aplicación y el transporte/proveedor efectivo: compartir proveedor
de entrega no implica compartir plantilla ni recorrido.

### Frontend posterior: diseño y seguridad web

Registrar dos bloques posteriores: fidelidad/adaptación del sistema gráfico y
seguridad web del frontend. El diseño parte de la
[autoridad canónica existente](../design-system/README.md), con tipografía,
paleta, tokens y clasificación de originales/handoffs/previews; no adoptar el
primer template histórico encontrado como contrato vigente.

Supabase es la prioridad actual. No se inicia aquí otra investigación frontend.
Sin embargo, Auth puede atravesar Next, cookies, callbacks, caché y acciones;
esos límites mínimos de seguridad pertenecen al recorrido actual. Postergar el
bloque general de frontend no permite aceptar un acceso inseguro a datos o
secretos. Auditoría visual completa y seguridad web ampliada conservan una
entrada posterior con alcance propio, sin ejecutar ahora sus pruebas.

## Cobertura de skills disponible

Inventario local de preparación:182 carpetas con SKILL.md de primer nivel en
`.agents/skills`,10 globales en la carpeta de usuario `.agents/skills`, además
de skills de sistema/plugins disponibles en la sesión. Los números describen
archivos encontrados, no skills cargadas simultáneamente ni eficacia validada.
El catálogo y las skills son contexto auxiliar local según ADR0001; un checkout
limpio debe poder ejecutar este protocolo sin depender de esos archivos.

Se revisaron entradas y alcance de las skills relevantes; no se auditó cada
referencia/script de las182 ni se certificó su procedencia integral. El lock
local de skills sólo registra seis entradas; no acredita el origen de todas las
carpetas. `find-skills` local/global y `supabase` local/plugin coincidían byte
a byte en esta inspección: son duplicados de contexto, no garantías adicionales.

| Frente               | Skills disponibles útiles                                                          | Límite de aplicación                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Proceso y cierre     | Superpowers: preparación, revisión, diagnóstico y verificación                     | Organiza el trabajo; no es una certificación de Supabase ni debe multiplicar rondas/harness.                                           |
| Supabase             | supabase; supabase-postgres-best-practices                                         | Docs oficiales actuales por capacidad, contrastadas con SDK/runtime efectivos; Postgres performance no cubre por sí solo Auth o pagos. |
| Next/React           | next-best-practices; vercel-react-best-practices                                   | Guías de la versión instalada y contratos de Iroko prevalecen sobre ejemplos genéricos.                                                |
| Auth/SSR             | nextjs-supabase-auth como apoyo                                                    | No copiar referencias a middleware.ts; Iroko usa proxy.ts. Complementar con Supabase Auth/SSR oficial.                                 |
| Requisitos/seguridad | security-requirement-extraction; threat-mitigation-mapping; code-review-excellence | Extraer controles y evidencia proporcional; no adoptar todos sus ejemplos de frameworks, compliance o infraestructura.                 |
| Calidad              | clean-code y reglas del repositorio                                                | No reescribir ActionResult/null/errores ni servicios sólo por preferencias de estilo.                                                  |
| Pruebas              | javascript-testing-patterns; e2e-testing-patterns; vitest; diagnóstico Superpowers | TESTING-PLAN y fixtures existentes primero; la skill vitest inspeccionada declara basarse en3.x y la instalación local era4.1.12.      |
| Documentación        | Contrato ADR0001, índices y checker existentes                                     | HADS está disponible, pero no se adopta otra convención documental ni se migra docs como parte de esta preparación.                    |

Selección mínima por lote: proceso/verificación, Supabase, guía Next aplicable,
revisión de seguridad y herramienta de pruebas sólo si se necesita. Cargar las
referencias concretas del contrato, no todas las skills ni todos los manuales.
Las skills de Supabase Studio son para ese producto; no son requisitos de esta
aplicación por compartir proveedor. Python/robótica se reservan al futuro
consumidor que las necesite.

### Búsqueda externa y CLI

Se consultaron las fuentes oficiales de
[Supabase Agent Skills](https://supabase.com/docs/guides/ai-tools/ai-skills),
[supabase/agent-skills](https://github.com/supabase/agent-skills) y
[Skills CLI](https://github.com/vercel-labs/skills/blob/main/docs/commands.md).
Las skills centrales ya están presentes; no se identificó una carencia que
obligue a instalar otra antes del piloto. Esto no evalúa todo el catálogo externo.

`find-skills` está instalado como skill. `Get-Command skills -All` y
`where.exe skills` no encontraron un ejecutable independiente; Node/npx/pnpm sí
están presentes. No se ejecutó `npx skills` porque puede resolver/descargar el
CLI: se realizó descubrimiento por fuentes web oficiales sin instalarlo ni
actualizar paquetes. La búsqueda no prueba que el CLI nunca se haya usado o
que no exista en otra caché/contexto.

### Conflictos que deben filtrarse antes de ejecutar

- La skill genérica Auth habla de middleware; nunca crear middleware.ts en
  Iroko. Consultar proxy y SSR según la versión efectiva.
- La regla TypeScript local aún nombra env.js; el contrato vigente es env.ts.
- La regla de calidad conserva ejemplos Material; el contrato visual es
  Poppy/Cobalt/Geist. No usar otra paleta al auditar o corregir.
- Las recomendaciones genéricas de schema/pull/diff no sustituyen la excepción
  Windows: migración versionada y espejo SQL en el mismo cambio, sin escribir
  Cloud por inferencia de una skill.
- La regla Next de caché no autoriza habilitar cacheComponents ni introducir
  caché de identidad/tenant por defecto; debe respetar la configuración real.
- Recomendaciones Realtime no justifican migrar transportes ya aceptados por
  uniformidad. Revisar primero contrato, privacidad y fallo medido.
- Una skill no es norma infalible ni evidencia runtime. Sus ejemplos necesitan
  contraste oficial y pruebas pertinentes antes de atribuir un fallo a Iroko.

Estas discrepancias se registran sin editar las skills/reglas locales ni cambiar
la jerarquía de AGENTS. No se instalaron ni actualizaron herramientas.

## Evolución de Supabase y fuentes técnicas

No tratar Supabase como una única versión monolítica. Por lote, fijar versiones
de supabase-js, SSR, CLI, Next/React y productos/servicios aplicables; distinguir
lo declarado, lo instalado y lo observado en el destino. El lock/manifiesto y
metadatos efectivos son sus fuentes, no una tabla permanente duplicada aquí.

La lectura local preparatoria encontró supabase-js2.119.0, SSR0.12.7 y
Next16.4.6 coincidentes con el manifiesto resuelto; esto no verifica el runtime
Cloud. Se consultó el [changelog oficial](https://supabase.com/changelog.md)
para orientar el método; no se hizo un análisis exhaustivo de todos sus cambios.

Antes de revisar una capacidad, consultar el changelog y sólo las guías
oficiales pertinentes. Separar incompatibilidad/seguridad, deprecación,
recomendación y función nueva opcional. Registrar URL, fecha de consulta,
versión aplicable y efecto en consumidores. No actualizar SDKs o activar
productos sólo porque aparecieron en el catálogo del proveedor.

## Secuencia propuesta, con salida finita

1. **Base documental:** propósito, decisiones, autoridad, cierres y referencias
   consistentes. Esta sincronización no acepta implementación nueva.
2. **Piloto Auth/cuentas:** primera matriz de selección, uso y suficiencia;
   revisar productores/consumidores, reutilizar evidencia válida y comprobar
   únicamente las brechas necesarias del contrato ofrecido.
   Entregar matriz y muestra de hallazgos antes de ampliar a todo el repositorio.
3. **Datos y autorización:** membresías/RBAC, SQL/RLS/grants/RPC, invariantes,
   cuotas y aislamiento/concurrencia de lo ofrecido.
4. **Storage/Realtime/correo y trabajo asíncrono:** caso útil y negativo, identidad,
   expiración/reintento/cleanup según el contrato. Billing financiero mantiene011.
5. **Adaptación e instalación:** guía ejecutable, marca/módulo, extensión útil,
   update y recuperación. Reusar015 salvo cambio que invalide su evidencia.
6. **Consolidación:** disposiciones por capacidad, documentos sincronizados y
   veredicto acotado. Comercialización013 e IoT/Arduino/ESP32 mantienen retorno
   posterior; no se implementan para aceptar el núcleo.

El frontend completo queda registrado en los bloques posteriores de diseño y
seguridad web descritos arriba. La selección actual de Supabase no pretende
aceptarlos ni excluir los límites Next indispensables para Auth/datos.

El orden es una propuesta de revisión por capacidades, no una nueva ejecución
de001–017 ni una autorización automática para fixtures o proveedores. P0/P1
confirmados de superficies ofrecidas se atienden según el contrato vigente.

## Contrato propuesto para el piloto Auth

Las preguntas siguientes definen evidencia a localizar; no dicen que esos
escenarios hayan pasado ni que cada mecanismo opcional se ofrezca.

| Control             | Qué contrastar en la capacidad ofrecida                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Identidad/SSR       | Clientes browser/server/admin, verificación apropiada, cookies/refresco, callbacks y límites de privilegio.                        |
| Flujos              | Signup/confirmación, login/logout, recuperación, MFA y OAuth sólo donde se ofrecen/configuran; éxito, error y retorno seguro.      |
| Autorización        | Usuario ajeno, rol insuficiente, cambio de cuenta y membresía revocada; verificar límites de acción/API/RLS además de navegación.  |
| Sesión/caché        | Identidad A→B, expiración/revocación y sus límites, almacenamiento/caché sin compartir datos entre usuarios/tenants.               |
| Abuso/configuración | Anti-enumeración, límites/CAPTCHA efectivos en el destino y errores observables; no confundir configuración local con Cloud.       |
| Secretos/telemetría | Claves administrativas y cookies/OTP fuera del cliente o artefactos; consentimiento y saneamiento en los consumidores pertinentes. |
| Reutilización       | Instalación/documentación suficiente para repetir el flujo sin conocimiento implícito del mantenedor.                              |

Fuente técnica inicial:
[Auth SSR oficial](https://supabase.com/docs/guides/auth/server-side/nextjs) y
[seguridad de productos](https://supabase.com/docs/guides/security/product-security),
complementadas por guías instaladas Next y los contratos/ADRs de Iroko.

## Modelo, recursos y criterios de salida

Recomendación de organización, no benchmark: usar el modelo habitual para
inventarios, trazabilidad, diferencias y controles claros; reservar Astra para
una segunda lectura acotada de Auth/RLS, concurrencia, billing o razonamiento
ambiguo. Un protocolo común facilita reproducibilidad entre modelos, pero no
demuestra que todos detecten lo mismo. No se cambió el modelo ni se lanzó otro
agente en esta preparación.

Entregar al revisor un paquete breve: requisito, versiones/destino, archivos,
hipótesis, evidencia y decisiones pendientes. Revisar independientemente causas
de alto impacto; deduplicar por causa/impacto y conservar IDs. Un acuerdo entre
modelos no sustituye reproducción o prueba discriminante.

Cada lote fija una pregunta, superficie, evidencia reutilizable, comprobaciones
faltantes y presupuesto de recursos antes de ejecutar. Pruebas pesadas seriales,
stack oficial, fixture propio y cleanup verificable. Después de dos fallos con
igual firma sin información nueva, cambiar método y registrar el límite, sin
bajar assertions/umbrales ni fabricar PASS. No repetir suites por mover planes.

La salida por control identifica: requisito vigente, ubicación de implementación,
escenario/entorno/revisión, esperado/observado, evidencia, certeza, severidad,
disposición, dueño y retorno. Un defecto, falta de evidencia y deuda documental
son resultados distintos. Runtime/Cloud no observado permanece [NO VERIFICADO].

## Mantenimiento de documentos y validación de esta preparación

La estrategia posee el propósito; ADR las decisiones; capacidades el inventario;
current-state los hechos vigentes; planes/registro las tareas y disposiciones;
auditorías la evidencia fechada; runbooks el procedimiento. README e índices
orientan y enlazan: evitar duplicar allí checklists/resultados que cambian.

Actualizar en el mismo cambio el documento dueño del hecho y sus resúmenes
vigentes. Preservar checkpoints históricos con fecha y límites; no editar
snapshots del derivado ni documentos completados para convertir pendientes
antiguos en PASS. Detectar también referencias estructuradas CSV: el checker
Markdown actual no valida esos campos ni contradicciones semánticas.

Esta entrega sincroniza README, SECURITY y arquitectura, enlaza este protocolo,
registra la aclaración del propietario y corrige nueve rutas owner_plan de014/015.
Conserva los125IDs y sus restantes campos, sin cambios de aplicación, pruebas,
SQL, configuración, skills, CI o Cloud. Los checks ejecutados y su alcance se
informan al entregar el diff; no se infiere una nueva aceptación funcional.
