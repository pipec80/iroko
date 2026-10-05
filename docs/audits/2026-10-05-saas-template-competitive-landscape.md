# Panorama competitivo de plantillas SaaS — 2026-10-05

## Alcance y método

Esta investigación compara Iroko con referentes públicos que resuelven partes
similares del arranque de un SaaS. Se revisaron las páginas, documentación y
repositorios oficiales disponibles el **2026-10-05**. Las capacidades de los
productos privados son afirmaciones de sus proveedores: no se compró su código,
no se auditó su seguridad y no se midió su soporte ni su operación.

Para Iroko se usa el [inventario de capacidades](../capabilities.md), cuyo orden
de evidencia es código, pruebas, configuración y migraciones antes que la
documentación. Esta comparación tampoco convierte una capacidad estática en
evidencia de que el despliegue actual esté sano. La evidencia runtime o Cloud
no renovada permanece **[NO VERIFICADO]**.

La pregunta de producto no es quién enumera más integraciones. Es cuánto falta
para cumplir la promesa acordada: una base Next.js + Supabase reutilizable, con
ejemplos mínimos completos, que permita dedicar el siguiente producto a su
dominio.

## Correcciones a la comparación inicial

| Afirmación inicial | Verificación | Corrección usada en esta investigación |
| --- | --- | --- |
| MakerKit se orienta a B2B y multi-tenant | Confirmada para su kit Supabase | Es el referente directo: cuentas personales y de equipo, invitaciones, roles, RLS, superadministración, billing y operación |
| ShipFast es “la más famosa” y no tiene multi-tenancy | No se puede demostrar un superlativo ni una ausencia absoluta desde la documentación pública | Se trata como referente de lanzamiento rápido B2C/indie; su documentación pública observada no presenta organizaciones y RBAC como núcleo |
| supastarter es multi-framework con Prisma/Drizzle | Confirmada y más amplia de lo descrito | Soporta Next.js, Nuxt y SvelteKit; en Next.js ofrece Prisma o Drizzle, varias bases, storage y cinco proveedores de pagos |
| Achromatic y Shipped forman una misma categoría AI-native | Parcial | Ambos anuncian IA, pero son productos distintos. Achromatic integra chat persistente y consumo de créditos; Shipped presenta integraciones con Vercel AI SDK y prioriza páginas/componentes de lanzamiento |
| Next.js SaaS Starter es la plantilla oficial de Vercel | Requiere precisión | Está publicado bajo la organización `nextjs` en GitHub. Es un starter MIT, deliberadamente pequeño, no una certificación comercial de Vercel |
| Ixartz tiene más de 14.000 estrellas | Falsa al corte | El repositorio oficial mostraba **7,4 mil** estrellas. La cifra es volátil y no mide calidad técnica |
| Open SaaS es gratuito e incluye administración | Confirmada | Es open source y gratuito, con Wasp/React/Node/Prisma, pagos, trabajos de fondo, carga S3 y panel de administración; no usa Next.js + Supabase |

## Familias competitivas

Los referentes no compiten todos por la misma decisión de compra:

1. **Supabase B2B directo:** MakerKit. Comparte la tesis de Auth, Postgres, RLS,
   Storage y Realtime bajo un mismo backend.
2. **Plataforma configurable y multi-framework:** supastarter. Compite por
   amplitud de proveedores, configuraciones y superficies ya empaquetadas.
3. **Lanzamiento rápido:** ShipFast y Shipped. Compiten por reducir el tiempo
   entre compra, landing, cobro y primera venta.
4. **Producto comercial con IA y Stripe:** Achromatic. Compite por una
   experiencia integrada de organizaciones, billing, créditos e IA.
5. **Entrada abierta o didáctica:** Next.js SaaS Starter, Ixartz y Open SaaS.
   Compiten por acceso inmediato, comunidad, recorrido de instalación y
   claridad del ejemplo.

## Distancia de Iroko frente a cada referente

“Cerca” se refiere al núcleo funcional observable, no a una equivalencia de
producto, licencia, soporte o madurez operativa.

| Referente | Cercanía al núcleo de Iroko | Ventaja observable de Iroko | Brecha observable de Iroko |
| --- | --- | --- | --- |
| [MakerKit Supabase](https://makerkit.dev/supabase) | **Muy cerca en arquitectura; lejos todavía en producto distribuible** | RBAC de cuatro roles, aislamiento RLS, superadministración, impersonación, audit log, API keys, webhooks, colas, cron/Vault, Realtime y una integración profunda con Mercado Pago | Instalación independiente no aceptada, actualización no ensayada, configuraciones incompletas, menor amplitud de billing, sin portal maduro ni soporte/documentación comercial |
| [supastarter](https://supastarter.dev/docs/nextjs) | **Cercanía media; filosofía más amplia y menos Supabase-first** | Más profundidad declarada en servicios Supabase y autorización en base de datos; operación de correo y cobros con estado durable | Multi-framework, Prisma/Drizzle, organizaciones configurables, API tipada/OpenAPI, cinco proveedores, varios storages, jobs y superficies marketing/docs ya empaquetadas |
| [ShipFast](https://shipfa.st/docs/tutorials) | **Lejos como arquitectura; cerca en la necesidad de lanzar** | Equipos, RBAC, RLS, administración, auditoría y servicios comunes mucho más profundos | Recorrido corto a una landing, auth, Stripe, email, analítica y primera venta; Iroko aún no demuestra ese tiempo de arranque |
| [Achromatic](https://www.achromatic.dev/docs/starter-kits/pro-nextjs-prisma) | **Cercanía media en B2B; stack de datos distinto** | Supabase nativo, RLS, Realtime, colas/Vault/cron y Mercado Pago | Stripe con suscripciones, pago único, créditos, cobro por asiento y portal; chatbot persistente con consumo de créditos; marketing, blog y docs integrados |
| [Shipped](https://shipped.club/) | **Cercanía baja en el núcleo; referente de presentación** | Mayor profundidad multi-tenant, autorización, administración y operación | Landing, waitlist, preventa, pricing, afiliados, blog, dashboards e integraciones de IA presentados como un recorrido de lanzamiento |
| [Next.js SaaS Starter](https://github.com/nextjs/saas-starter) | **Iroko supera ampliamente su núcleo; el starter gana en simplicidad** | Más roles, RLS, Supabase Auth/Storage/Realtime, administración y servicios operativos | Clone/setup pequeño y comprensible, Stripe Customer Portal y gran prueba de adopción pública |
| [Ixartz SaaS Boilerplate](https://github.com/ixartz/SaaS-Boilerplate) | **Cercanía media como starter Next.js** | Backend Supabase propio, autorización SQL, correo durable y billing Mercado Pago implementado | Distribución MIT de la edición Free, onboarding público, adopción visible y una matriz clara que separa ediciones gratuitas y comerciales |
| [Open SaaS](https://github.com/wasp-lang/open-saas) | **Lejos en stack; cerca en promesa de base reutilizable** | Profundidad Supabase, RLS y operación multi-tenant | Instalación por comando, documentación de actualización, pagos alternativos, jobs nativos de Wasp, S3, IA de ejemplo y comunidad open source |

## Comparación por capacidad decisiva

| Dimensión | Iroko hoy | Referente que marca el estándar observado | Lectura |
| --- | --- | --- | --- |
| Auth, cuentas, membresías y RBAC | Implementación amplia, con excepción Robot conocida | MakerKit | **Cerca**; cerrar Plan 014-T1 y demostrar los recorridos reales |
| Aislamiento multi-tenant | RLS, helpers y regresiones para superficies cubiertas | MakerKit | **Cerca y técnicamente competitivo**; no extrapolar la prueba a módulos futuros |
| Superadministración y operación | Admin global, AAL2, impersonación, auditoría, anuncios y alertas | MakerKit / supastarter | **Cerca**, con defecto de filtros/paginación en Plan 014-T3 y runtime actual **[NO VERIFICADO]** |
| Supabase como backend integrado | Auth, Postgres, RLS, Storage, Realtime, PGMQ, Edge Functions, cron, `pg_net` y Vault | MakerKit | **Fuerte**; es la zona más diferenciada de Iroko si se acompaña con ejemplos y evidencia |
| Billing listo para reutilizar | Mercado Pago funciona en el alcance aceptado; quedan escenarios diferidos y evidencia fechada | MakerKit / supastarter / Achromatic | **Parcial**; no hay paridad en portal, anual, asiento, uso, créditos ni múltiples proveedores certificados |
| Email y trabajo durable | React Email, Resend, cola PGMQ, worker Edge, reintentos y health RPC | supastarter / Open SaaS | **Fuerte en diseño**; salud Cloud actual **[NO VERIFICADO]** |
| Storage y Realtime de ejemplo | Avatares/assets/documentos, notificaciones, presencia y anuncios | MakerKit | **Cerca**, condicionado por los defectos de Plan 014 y por demostrar configuración reproducible |
| Analítica, errores y logging | PostHog, Sentry y Pino | supastarter / Achromatic | **Presente**; se necesita evidencia integrada del candidato, no otro proveedor |
| IA lista para producto | No hay vertical IA completa; pgvector disponible no equivale a producto | Achromatic | **Lejos por decisión consciente**; no bloquea el MVP acordado |
| Marketing, docs y onboarding comercial | Superficies parciales; distribución condicionada | supastarter / Achromatic / Shipped | **Lejos** como producto vendible; Plan 013 sigue condicionado a decidir vender |
| Instalación, extensión y actualización | No aceptadas en un checkout independiente | MakerKit / Open SaaS / Ixartz | **Brecha principal del MVP reutilizable**; Plan 015 es la prueba determinante |

## Posición que sí puede defender Iroko

La posición más creíble durante el freeze es:

> Base SaaS interna, Supabase-first y orientada a B2B, que reúne identidad,
> cuentas, membresías, RBAC, aislamiento RLS, administración, servicios comunes
> y cobro Mercado Pago para construir productos propios sobre un núcleo
> verificable.

Iroko no debería presentarse todavía como el boilerplate con más proveedores,
el más rápido para una primera venta ni una plataforma AI-native. Esas
posiciones pertenecen a competidores con recorridos distintos y obligarían a
abrir el alcance.

La ventaja potencial no es una integración aislada. Es la combinación de:

- Supabase usado como backend integral, con autorización en PostgreSQL;
- un ejemplo B2B completo con cuentas, membresías, RBAC y administración;
- servicios comunes que muestran Storage, Realtime, colas, Edge, cron y Vault;
- disciplina de evidencia para aislamiento, reintentos, auditoría y operación;
- Mercado Pago/CLP como adaptación regional ya trabajada, sin afirmar cobertura
  general de Latinoamérica.

Esa combinación aún necesita la prueba de reutilización. Sin Plan 015, existe
una aplicación rica y bien documentada; todavía no hay evidencia suficiente de
que sea una base que otro producto pueda instalar, adaptar y actualizar con un
coste predecible.

## Decisión para el freeze

La investigación no justifica agregar nuevas funciones al MVP. Refuerza el
orden ya acordado:

1. fijar el candidato y revisar el núcleo completo con Plan 016-T0/T1;
2. corregir los límites de seguridad y verdad ya conocidos en Planes 014 y 012;
3. aceptar Storage, Realtime, correo, administración y billing mediante casos
   mínimos completos, usando el [inventario](../capabilities.md);
4. demostrar instalación, configuración sin venta de suscripciones, extensión
   y actualización con Plan 015;
5. ejecutar Plan 016-T2/T3 sobre el candidato corregido y consolidar evidencia.

Durante ese recorrido se difieren Stripe, otros proveedores, IA con créditos,
multi-framework, SAML/SCIM, billing por uso/asiento, una suite de marketing y la
preparación para vender. Si una necesidad real los activa después, esta
investigación sirve para elegir el referente y escribir un plan separado.

## Fuentes oficiales consultadas

- [MakerKit — Supabase SaaS Starter Kit](https://makerkit.dev/supabase)
- [supastarter — Next.js documentation](https://supastarter.dev/docs/nextjs)
- [supastarter — payments](https://supastarter.dev/docs/nextjs/payments/overview)
- [ShipFast — tutorials and features](https://shipfa.st/docs/tutorials)
- [Achromatic — Pro Next.js Prisma](https://www.achromatic.dev/docs/starter-kits/pro-nextjs-prisma)
- [Shipped — product and FAQ](https://shipped.club/)
- [Next.js SaaS Starter — repository](https://github.com/nextjs/saas-starter)
- [Ixartz SaaS Boilerplate — repository](https://github.com/ixartz/SaaS-Boilerplate)
- [Open SaaS — repository](https://github.com/wasp-lang/open-saas)
