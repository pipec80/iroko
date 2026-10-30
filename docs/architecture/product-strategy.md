# Estrategia de producto — base SaaS reutilizable

## Dirección vigente — 2026-10-28

[ADR0005](../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md) formaliza
la prioridad del mantenedor: primero un núcleo SaaS replicable y adaptable;
después la vertical que lo consuma. La propuesta es reutilizar capacidades
comunes para dedicar el trabajo al dominio del cliente y su look and feel.
Cosmética, tarot y Robot ilustran usos futuros, no son tres productos comprometidos.

El criterio de MVP es una base segura con ejemplos mínimos de Auth/Postgres/RLS,
Storage, Realtime, Edge/correo y suscripciones en el alcance ofrecido. Demostrar
una instalación derivada, cambio de marca, una extensión y actualización; no
perseguir paridad de catálogo ni preparar aún distribución comercial del kit.
La comparación competitiva permanece como evidencia fechada, no como backlog.

Robot/IoT y editor Markdown avanzado salen del camino crítico. Su exclusión
debe ser efectiva y comprobada por015-T1 antes de ofrecer el candidato. No
se borra su trabajo, no se declara runtime aceptado y no se abandonan datos/jobs.
No sacrificar seguridad de superficies accesibles para acortar pruebas.
La reauditoría final016 verifica el candidato después de015 con evidencia
reproducible y revisión independiente; no añade funciones ni ciclos infinitos.

Fecha: 2026-09-24. Ampliaciones documentales de referentes: 2026-09-25 y
2026-10-05.
Dirección acordada con el mantenedor; contratos de
implementación propuestos en los planes enlazados. Este documento es estrategia
viva, no una certificación de operación ni autorización para desplegar.

## Promesa y destinatario

> Tengo una base que ya resuelve acceso, cuentas, permisos y servicios comunes.
> Podemos dedicar el desarrollo a tu operación y adaptar la experiencia a lo
> que necesitas.

Esta es la **promesa objetivo que gobierna el cierre**. Su uso comercial en
presente requiere los gates de evidencia de abajo para el alcance ofrecido.
Hoy Iroko tiene implementación considerable, hallazgos abiertos y aceptación
pendiente; no se declara que cualquier producto derivado esté listo.

El primer destinatario es el mantenedor construyendo productos propios y
soluciones adaptadas sobre un núcleo compartido. El mantenedor aportó después
el chat de su vertical IoT, con el robot como primer consumidor: el
[piloto propuesto](iot-vertical-pilot.md) registra esa dirección y los límites
entre núcleo, vertical y robot. Después se inspeccionó selectivamente el
servidor oficial y su contrato HTTP en modo lectura: existen señales de
disponibilidad y latencia, pero no se verificó una integración cloud ni se
modificó ese repositorio. Plan 015 T0 propone la composición común de menús,
títulos y accesos del dashboard. Vender una licencia del boilerplate es una
opción posterior y distinta de entregar un SaaS adaptado.

## Política de integración mínima completa

Cada capacidad incorporada debe resolver una necesidad reutilizable mediante
un caso pequeño, completo y verificable. Estar disponible en Supabase Free
es un criterio de coste, **no una obligación de incluirla en v1**.

Un caso se considera completo cuando tiene:

1. contrato de entrada/salida y propietario de los datos;
2. autorización en el límite efectivo, incluidos usuario ajeno y rol insuficiente;
3. comportamiento definido ante errores, reintentos y efectos parciales;
4. prueba del recorrido real, además de pruebas aisladas;
5. configuración y límites de coste documentados;
6. instrucciones para extenderlo sin copiar reglas de seguridad;
7. evidencia fechada y procedimiento de operación proporcional al riesgo.

Un avatar público demuestra una parte de Storage; no certifica documentos
privados. Una notificación demuestra un patrón Realtime; no una plataforma
colaborativa. Una cola de correo demuestra un worker; no tareas arbitrariamente
largas ni entrega exactamente una vez. Un proveedor aceptado no certifica otro.

## Supabase-first y límites de ejecución

Supabase concentra identidad, PostgreSQL, RLS, Storage, Realtime y coordinación
durable. Next.js mantiene presentación y orquestación de aplicación. Edge
Functions se usan donde el contrato y las dependencias lo justifican.

El correo tiene un worker Edge. Billing conserva un worker Node invocado desde
`pg_cron`/`pg_net`, con estado durable en PostgreSQL y un reducer común. Es una
decisión consciente de distribución de responsabilidades, no una migración
pendiente por defecto. Véanse [ADR 0003](../adr/0003-mercadopago-reliability-boundaries.md)
y el [diseño de fiabilidad](mercadopago-reliability-design.md).

Revisar ese runtime solo ante un requisito medido de portabilidad, coste,
límite de ejecución o simplificación que compense la migración y preserve
autorización, idempotencia y observabilidad. No duplicar el reducer en Deno.

Free es una opción de arranque dentro de cuotas. El presupuesto incluye
transferencia, crecimiento de auditoría/colas, conexiones Realtime, correo,
hosting y comisiones de pago. No se promete coste cero en producción ni que
50.000 MAU equivalgan a capacidad para cualquier carga. El detalle vigente se
consulta en [Supabase Pricing](https://supabase.com/pricing); el servicio SMTP
predeterminado tiene [restricciones de uso](https://supabase.com/docs/guides/auth/auth-smtp)
y [Vercel Hobby](https://vercel.com/docs/plans/hobby) es de uso personal no comercial.

## Qué se configura, qué se extiende y qué se evalúa aparte

| Clase                | Ejemplos                                                                                      | Contrato de aceptación                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Configuración        | Marca, idiomas, módulos y proveedor habilitado                                                | Cambios acotados, sin editar reglas de negocio compartidas; dependencias declaradas                                             |
| Extensión de negocio | Reservas, expedientes, cotizaciones u otro dominio                                            | Datos y acciones del producto reutilizan identidad, autorización y servicios; sin modificar contratos compartidos por comodidad |
| Cambio estructural   | Jerarquías de organizaciones, permisos excepcionales, nueva infraestructura o modelo de cobro | Diseño y presupuesto propios; no entra automáticamente en el núcleo                                                             |

Una adaptación para un cliente no se generaliza hasta entender su utilidad
común y el coste que impone a los demás productos. Los módulos pueden actuar
como servicios sin tener una página propia.

Ocultar navegación no desactiva una capacidad. Cada módulo debe declarar qué
pasa con sus rutas, acciones, dependencias, jobs y datos al desactivarlo. Los
callbacks de una suscripción existente no se apagan porque desaparezca el
botón de compra. Los flags nunca sustituyen autorización/RLS.

## Configuraciones de referencia y no-metas

El cierre propuesto comprueba dos configuraciones acotadas:

- **MVP a demostrar:** cuentas personales/equipos, servicios mínimos y billing
  según el proveedor aceptado; Projects/editor y Robot efectivamente excluidos
  en UI/rutas/acciones por015-T1. No describe todavía la configuración runtime.
- **Sin venta de suscripciones:** mismo modelo de cuentas, sin navegación,
  onboarding de plan ni nuevas compras; sin credenciales de pagos en una
  instalación nueva. Conservar el catálogo Free para límites internos cuando
  lo necesiten los módulos. Esto no desmantela suscripciones existentes.

No se promete todavía un modo B2C sin organizaciones, extraer paquetes,
desinstalar esquemas, multi-framework, roles arbitrarios, SAML/SCIM, cobro por
uso/asiento, cuatro proveedores certificados, IA con créditos ni marketplace
de plugins. Se evalúan al aparecer un requisito de producto. No se adopta otro
framework ni se reescribe la arquitectura para imitar un competidor.

## Referentes y decisiones competitivas

Fuentes oficiales consultadas el 2026-09-24 y verificadas nuevamente el
2026-10-05. La
[investigación competitiva fechada](../audits/2026-10-05-saas-template-competitive-landscape.md)
separa los referentes por categoría, corrige las afirmaciones que cambiaron o
no pudieron sostenerse y compara su distancia con el inventario actual de
Iroko. Son capacidades **anunciadas**;
no una auditoría del código privado, de su seguridad ni de su disponibilidad.
No encontrar una función en una landing no demuestra su ausencia. Las
comparaciones históricas de `docs/local/` no son autoridad actual.

| Referente                                                      | Oferta observada                                                                                                                 | Decisión para Iroko                                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [MakerKit](https://makerkit.dev/)                              | Cuentas/equipos, RBAC, billing/portal, documentación, soporte, actualizaciones, reglas de agentes y MCP; kits por stack          | Comparar instalación, extensión y upgrades. Supabase, i18n o instrucciones para agentes por sí solos no diferencian |
| [supastarter](https://supastarter.dev/)                        | Organizaciones configurables, varios proveedores, API tipada/OpenAPI, billing por uso/asientos, herramientas para agentes y docs | Priorizar configuraciones coherentes. OpenAPI y billing avanzado dependen de una necesidad real                     |
| [ShipFast](https://shipfa.st/)                                 | Auth, pagos, correo, SEO/blog y componentes presentados alrededor de lanzar rápido                                               | Medir tiempo hasta un producto funcionando; no ampliar alcance por número de integraciones                          |
| [Achromatic](https://www.achromatic.dev/)                      | Organizaciones, administración, Stripe, documentación, chat en streaming y créditos                                              | IA monetizada es un vertical posible; habilitar pgvector no equivale a tenerlo                                      |
| [Shipped](https://shipped.club/)                               | Auth, pagos, Prisma, correo, blog, dashboards e integraciones de IA                                                              | Referencia de presentación de producto; no asumir paridad de créditos con Achromatic                                |
| [Open SaaS](https://opensaas.sh/)                              | Starter abierto Wasp/React/Node/Prisma, pagos, administración, ejemplos, docs y despliegue                                       | Copiar el valor del recorrido didáctico ejecutable, preservando nuestro stack                                       |
| [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) | Starter MIT, Postgres/Drizzle, equipos, RBAC básico y Stripe                                                                     | Referencia de un alcance comprensible; no una base Supabase equivalente                                             |
| [Ixartz](https://github.com/ixartz/SaaS-Boilerplate)           | Oferta gratuita y comercial; la matriz distingue auth/equipos/i18n de funcionalidades premium como Stripe                        | Documentar inclusiones y dependencias por configuración; no mezclar ediciones al comparar                           |

### Brechas que sí cambian el cierre

| Dimensión anunciada por referentes                          | Situación de Iroko en esta investigación                                                                   | Decisión                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Instalación, guías y actualizaciones para reutilizar el kit | Hay setup y guías; no hay ensayo independiente observado de instalación/extensión/upgrade                  | Plan 015, necesario incluso para uso propio                                                               |
| Configuraciones coherentes de organizaciones y billing      | Hay flags y modelo de cuentas; ocultar enlaces no garantiza ausencia de dependencias o bloqueo de acciones | Plan 015 demuestra solo dos configuraciones; no prometer presets adicionales                              |
| Servicios comunes listos para extender                      | Existe una base amplia, con defectos concretos y recetas incompletas                                       | Plan 014 corrige; Plan 015 documenta y prueba la extensión                                                |
| Varios proveedores y cobros avanzados                       | Core extensible y adapters no equivalen a certificación; la evidencia MP está acotada por escenario        | Plan 011 diferido para escenarios/proveedores adicionales; no agregar uso/asientos para igualar una tabla |
| IA monetizada, créditos o stacks alternativos               | No hay vertical IA completo ni soporte multi-framework demostrado                                          | Fuera del cierre; no mejora por sí solo la promesa acordada                                               |
| Empaquetado, soporte y entrega comercial                    | Iroko no está aceptado como producto instalable para terceros                                              | Plan 013 diferido hasta decidir vender, reutilizando evidencia de 015                                     |

La hipótesis es **adaptación rápida sobre Supabase con operación explicable y
una ruta de cobro Chile/CLP aceptada**. Mercado Pago puede aportar valor regional,
pero no se afirma exclusividad ni cobertura de toda Latinoamérica. El historial
de evidencia es útil si reduce fallos y trabajo; su rareza comercial no está
demostrada. El uso propio valida reutilización; entrevistas/adopciones externas
y disposición a pagar validan demanda, todavía **[NO VERIFICADO]**.

## Aprendizajes de instalación, adaptación y postventa — 2026-09-25

Revisión selectiva de documentación pública oficial, README y oferta publicada.
No se compraron ni instalaron kits, no se auditó su código privado y no se
midió su soporte. Las conclusiones siguientes son recomendaciones para Iroko;
la oferta de otro producto no demuestra demanda ni rentabilidad propias.

| Referente y evidencia                                                                                                                      | Qué enseña su recorrido                                                                                                                     | Aplicación propuesta a Iroko                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [Makerkit: FAQ técnica](https://makerkit.dev/docs/next-supabase-turbo/installation/faq)                                                    | Entrega código y documentación; el comprador configura producción y puede pedir soporte                                                     | Separar licencia, ayuda técnica y servicio de instalación                                                                                |
| [supastarter: setup](https://supastarter.dev/docs/nextjs/setup) y [configuración](https://supastarter.dev/docs/nextjs/configuration)       | Tiene inicializador y configuración por responsabilidad de app/paquete                                                                      | Documentar qué se cambia y dónde; automatizar después de verificar el recorrido manual                                                   |
| [ShipFast: inicio](https://shipfa.st/docs)                                                                                                 | Arranque breve, archivo de configuración y tutoriales por tarea                                                                             | Ofrecer una ruta corta hasta el primer resultado; medir local, integración y producción por separado                                     |
| [Achromatic: desarrollo a medida](https://www.achromatic.dev/custom-saas-development)                                                      | Ofrece construcción sobre su base, con alcance previo, entrega del código/despliegue/documentación y soporte acordado                       | Referente directo para entregar soluciones adaptadas; separar base, configuración y trabajo de dominio                                   |
| [Shipped: inicio](https://docs.shipped.club/)                                                                                              | Fork, ejecución local y configuración posterior obligatoria para buena parte de las funciones; presenta Sync Fork como vía de actualización | Recibir cambios upstream no demuestra compatibilidad con personalizaciones; exigir ensayo propio                                         |
| [Open SaaS: inicio](https://docs.opensaas.sh/start/getting-started/) y [actualización](https://docs.opensaas.sh/guides/updating-opensaas/) | Guía ejecutable; desaconseja fusionar indiscriminadamente cambios de la plantilla cuando la aplicación ya divergió                          | Definir una política de mantenimiento del derivado desde su creación                                                                     |
| [Next.js SaaS Starter: README](https://github.com/nextjs/saas-starter)                                                                     | Se define como plantilla intencionalmente mínima y recurso de aprendizaje                                                                   | Referencia de alcance comprensible, no evidencia de servicio comercial ni certificación de producción                                    |
| [Ixartz: README](https://github.com/ixartz/SaaS-Boilerplate)                                                                               | Distingue capacidades y dependencias de las ediciones Free/Plus/Pro/Max                                                                     | Publicar inclusiones por configuración sin mezclar posibilidades del proveedor con lo entregado                                          |
| [SaaS Pegasus: inicio](https://docs.saaspegasus.com/getting-started/)                                                                      | Selecciona opciones antes de generar código; recomienda integración GitHub para facilitar actualizaciones                                   | Inspiración para una ficha de configuración del producto; un generador no es requisito de cierre                                         |
| [SaaSykit: configuración](https://saasykit.com/docs/configurations) y [onboarding](https://saasykit.com/docs/onboarding)                   | Permite ajustes administrativos persistidos; el onboarding de usuarios es otro mecanismo extensible                                         | Separar configuración del despliegue, ajustes operativos y alta del usuario; esa página no demuestra configuración arbitraria por tenant |
| [Laravel Spark: introducción](https://spark.laravel.com/docs/introduction)                                                                 | Aporta un portal de billing sobre una aplicación Laravel                                                                                    | No comparar un componente especializado con una plataforma completa; un alcance pequeño también puede tener valor                        |
| [ASP.NET Zero: documentación](https://docs.aspnetzero.com/common/latest)                                                                   | Combina base, soporte, herramientas de generación y preparación temprana de la estrategia de upgrades                                       | Tomar la disciplina de mantenimiento; no incorporar generadores o infraestructura empresarial sin necesidad                              |

La tabla original de referentes se centraba en capacidades. Esta lectura
amplía la comparación al ciclo de vida. En particular, Achromatic también es
referente de servicios, Spark tiene alcance especializado y Next.js SaaS
Starter se presenta como recurso mínimo de aprendizaje. No son ofertas
intercambiables ni corresponde ordenarlas por cantidad de funcionalidades.

### Orientación propuesta para A y B

Para productos con operaciones diferentes, la hipótesis inicial es reutilizar
el núcleo en derivados con instalaciones independientes. Empresas que usan el
mismo producto pueden ocupar cuentas distintas en una instalación multi-tenant.
Son decisiones diferentes: disponer de cuentas aisladas no demuestra marca,
módulos o dashboards arbitrariamente configurables por empresa.

Plan 015 prueba configuración por producto/instalación y visibilidad por rol.
No implementa un editor de aplicaciones ni una plataforma de configuración
dinámica por tenant. Una necesidad real de variación por cuenta requiere
definir claves permitidas, valores por defecto, autoridad para modificarlas,
validación, auditoría y efecto en servidor, caché, jobs y datos existentes.
La selección definitiva de alojamiento compartido o independiente depende del
producto; esta orientación no es todavía un ADR aceptado de despliegue.

El entregable inmediato es una **ficha de adaptación** dentro de las recetas:
requisito, configuración/extensión/cambio estructural, ámbito
(instalación/cuenta/usuario), responsable, archivo o mecanismo efectivo,
dependencias, prueba y efecto al actualizar. Usar A y B ficticias para explicar
la clasificación no obliga a construir dos verticales nuevas.

### Tres recorridos y una entrega comprobable

1. **Instalador:** prepara dependencias, secretos, migraciones y despliegue.
2. **Administrador del producto:** configura marca, módulos e integraciones
   mediante los mecanismos soportados; cambios de código conservan su revisión.
3. **Usuario de la empresa:** crea o recibe su cuenta, completa los pasos de su
   vertical y obtiene su primer resultado útil con permisos correctos.

Llegar a una pantalla de bienvenida no acepta los tres recorridos. La evidencia
debe identificar qué recorrido se ejecutó, por quién y con qué resultado.
Una extensión neutral puede demostrar el tercero. IoT queda como consumidor
posterior opcional; ni dispositivo, señal real ni chatbot bloquean la base.

Para una entrega adaptada, registrar versión base, diferencias del derivado,
configuración no secreta, responsables de infraestructura/datos, verificaciones,
recuperación y procedimiento para incorporar correcciones. Distinguir soporte
de defectos del alcance entregado, mantenimiento y nuevas funcionalidades.
Plazos, precio y SLA se acuerdan al ofrecer el servicio; no se inventan aquí.

### Consecuencias para el cierre

- **015 T0/T1:** composición y dependencias coherentes, con dos configuraciones
  comprobadas. No añadir presets solo porque otro kit los anuncia.
- **015 T2/T3:** ficha de adaptación, recorridos diferenciados y registro del
  derivado; actualización real conservando datos y personalización.
- **013:** si se comercializa, especificar por separado licencia del kit,
  puesta en marcha y solución adaptada, con límites de soporte y costes externos.
  La entrega técnica para uso propio sigue perteneciendo a 015.
- **011/012/014:** mantienen su prioridad y criterios de aceptación. Una guía
  atractiva o un instalador no corrigen permisos ni certifican billing.

La decisión vigente es probar primero la base con una extensión neutral y su
mantenimiento. Una vertical completa no es precondición. Un
asistente de instalación, un generador, un editor de dashboards o más proveedores
solo se priorizan si esa prueba revela un coste repetido que justifique hacerlo.

## Escala de afirmaciones permitidas

| Etapa                          | Evidencia exigida                                                                             | Afirmación permitida                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Implementado                   | Código/esquema identificados; límites y defectos conocidos                                    | «Existe implementación de X»                                   |
| Probado localmente             | SHA, comando, entorno y resultado del escenario                                               | «X pasó estas pruebas locales»                                 |
| Integración observada          | Recorrido real y resultados correlacionados con proveedor/servicio                            | «Estos escenarios de X funcionaron en este entorno»            |
| Operable para alcance definido | Seguridad, aceptación, alertas, recuperación y límites del candidato cerrados                 | «Podemos operar este alcance bajo estas condiciones»           |
| Reutilizable demostrado        | Instalación independiente, cambio de marca/configuración, extensión y ensayo de actualización | «Esta base se instaló, adaptó y actualizó en estos escenarios» |
| Distribuible                   | Lo anterior más entrega, licencia, soporte y upgrades para terceros                           | «Starter instalable y soportado» dentro del alcance anunciado  |

Las etapas aplican por capacidad y configuración, no como una nota global del
repositorio. No hay porcentaje de cierre defendible con el inventario actual.
Para cuantificar ahorro se necesita además una comparación equivalente; el
primer ensayo fija una línea base y no prueba por sí solo horas ahorradas.
No se puede afirmar todavía «billing completamente resuelto», «cualquier SaaS
en un día» o «seguro porque la suite pasa». La fecha prevista de una renovación
no es evidencia de que haya ocurrido.

## Programa de cierre y responsabilidades

La [auditoría de esta investigación](../audits/2026-09-24-reusable-saas-readiness.md)
conecta hallazgos con código y propietarios. No duplicar planes:

- [011](../exec-plans/deferred/011-billing/README.md), diferido: el alcance
  requerido por el freeze está satisfecho; la
  [matriz Chile](../exec-plans/deferred/011-billing/011-mercadopago-v1-chile-acceptance.md)
  conserva evidencia y escenarios pendientes sin declararlos completos.
- [012](../exec-plans/active/012-security-hardening-and-pricing-truth.md): grants,
  salida HTTP, rate limit, CSP/secretos y pricing/copy coherente.
- [014](../exec-plans/active/014-reference-surface-correctness.md), activo:
  cerrar superficies de ejemplo, confianza de URLs e interacción de auditoría.
- [015](../exec-plans/active/015-reusable-foundation-acceptance.md), activo:
  configuraciones mínimas, recetas, instalación independiente, operación y
  ensayo de actualización; aporta valor aunque no se venda la base.
- [013](../exec-plans/deferred/013-launch-readiness-roadmap.md), diferido: distribución,
  documentación comercial, licencias y soporte cuando se decida vender.

Corregir los defectos independientes de 014 no requiere esperar una renovación
externa. La planificación/documentación de 015 puede avanzar; su aceptación
operativa depende de 011 en el alcance ofrecido, 012 y 014. Las certificaciones
de proveedores no ofrecidos no bloquean la base Chile/MP.

Medir en 015 tiempo activo y esperas externas por separado, archivos cambiados,
preguntas al mantenedor, defectos de instrucciones, modificaciones del núcleo
y conflictos de actualización. Primera ejecución: línea base, sin inventar
un SLA de instalación ni un porcentaje de ahorro. El siguiente ensayo compara
con esa línea base usando una tarea equivalente.
