# Plan 013 — Fase D: preparación comercial posterior a v1 propia

- Priority: P2 (comercial, no correctividad — ver regla de la sesión: "P0
  corrige comportamiento, P1 reduce riesgo, Fase D aumenta vendibilidad")
- Status: Roadmap — scope y Definition of Done por sub-fase declarados; NO
  desglosado a nivel de PR todavía (a diferencia de Plan 010/012), porque el
  contenido concreto de D-1/D-4 (copy de landing, estructura de Fumadocs) no
  existe aún y desglosar PRs sobre eso sería inventar detalle, no planificar.
- Baseline: `main` @ `d9e2648`
- Depende de: decidir vender el boilerplate después de la v1 propia.
  Plan 010 está cerrado. Plan 011 conserva el programa de cuatro proveedores,
  pero la v1 Chile requiere su tramo Mercado Pago de Fases 2/6, Plan 012 y los
  gates operacionales. No necesita esperar a la distribución comercial.
- Las promesas comerciales de D-4 requieren evidencia de cada proveedor
  anunciado; «billing completamente resuelto» exige el programa completo.
  Una certificación interna MP no certifica Stripe/Paddle/Lemon Squeezy.
- Orden interno: D-1 → D-2 → D-3 → D-4 → D-5 → D-6 → lanzamiento. D-3
  (licenciamiento) tiene una restricción de timing dura: ver Nota de squash
  de migraciones abajo.

## Separación de gates v1 y preparación comercial (2026-09-11)

**Fuera de v1 propia:** Fumadocs comercial, buyer onboarding, licenciamiento,
distribución, funnel de venta del boilerplate y material de conversión. Retomar
estos entregables cuando se decida vender, con PRs acotados y evidencia de los
proveedores que realmente se ofrecerán.

**Necesario antes de usuarios reales en v1:** smoke de producción del flujo
real, auth/aislamiento, hardening de Plan 012, coherencia de pricing,
observabilidad y alertas de errores/pagos/worker/email, recuperación operacional
y revisión de accesibilidad de los flujos críticos. Los apartados D-5/D-6
mantienen la ampliación comercial; no posponen estos mínimos de operación.
Evidencia y caducidad en el [registro operacional](../../quality/operational-evidence.md)
y aceptación billing en la [matriz v1 Chile](011-mercadopago-v1-chile-acceptance.md).

## Objective

Convertir, después de la v1 propia y con el alcance de proveedores verificado,
el núcleo SaaS en un
producto que un developer externo pueda comprar, instalar sin conocimiento
interno del mantenedor, y usar como base de su propio SaaS.

## D-1 — Documentación comercial con Fumadocs

**Scope.** Quick start real y verificable (clone → configurar → supabase →
env → deploy → login → checkout, sin conocimiento interno); requisitos
previos; Supabase setup; variables de entorno; deploy Vercel; auth/OAuth;
billing Stripe; billing MercadoPago; teams/RBAC; Storage; email;
PostHog/Sentry; custom branding; cómo agregar un feature/vertical nuevo;
flujo de migraciones en Windows (documentar el manual + espejo ya
establecido); troubleshooting; upgrade guide; arquitectura y decisiones
importantes (alimentar desde `docs/architecture/` y `docs/adr/`, ya creados
en el reordenamiento de `docs/` del 2026-08-19); security model; checklist
"go to production".

**Definition of Done.** El flujo completo (`clone → ... → checkout`) lo
ejecuta alguien que no es el mantenedor, sin hacerle preguntas, siguiendo
solo la documentación.

## D-2 — Buyer onboarding / DX

**Scope.** Checklist inicial en README/docs: renombrar marca desde un punto
central; cambiar colores/logo; cambiar dominio/support email; configurar
locales; activar/desactivar módulos; configurar provider de billing;
configurar email; crear primer platform admin; cargar provider IDs; seed/demo
opcional; script o checklist de verificación de "production readiness"
automatizada.

**Definition of Done.** Minimizado el número de lugares que un comprador
debe editar a mano — idealmente un único punto de configuración central por
categoría (marca, dominio, providers), no strings dispersos por el código.

## D-3 — Licenciamiento y distribución

**Scope.** Modelo de licencia (individual, team/agency, límite de
productos/proyectos); mecanismo de entrega (repo privado + GitHub invite vs
template repo — decisión ya inclinada hacia template repo en discusión de
sesión, por ocultar historial de commits interno); estrategia de updates
(upstream, releases/tags, changelog, upgrade guides); no incluir secretos ni
config propia en lo que se entrega; separar demo vs código del comprador;
política de soporte y de breaking changes; licencia legal real.

**Restricción de timing — no reordenar sin releer esto.** El squash/
reorganización de las ~136 migraciones de `supabase/migrations/` (discutido
en sesión, ver `docs/private/legal/iroko-license-eula-structure.md` para el
contexto de por qué importa el timing) **solo puede considerarse antes de la
primera venta real**; incluso entonces requiere preservar los despliegues
propios existentes y planificar su compatibilidad — una vez que exista un comprador con "actualizaciones
de por vida" prometidas, cada migración nueva debe ser aditiva, no se puede
reescribir el historial. Si se va a hacer, debe ir dentro de este ítem, antes
de cerrar D-3, no después.

**Definition of Done.** Existe un flujo de entrega probado de punta a punta
(comprador ficticio recibe acceso, clona, tiene un producto funcional) y el
borrador de licencia (`docs/private/legal/iroko-license-eula-structure.md`,
ya existe como esqueleto de secciones) tiene las 7 decisiones de negocio
pendientes resueltas y texto legal real revisado por alguien con práctica
legal, no solo la estructura.

## D-4 — Landing y conversión

**Precondición dura.** No reescribir el hero/copy de la landing prometiendo
"billing resuelto" o similar hasta que el alcance anunciado de Plan 011 esté cerrado y validado
contra el proveedor real; una promesa sobre los cuatro exige los cuatro — evitar vender una promesa que el código todavía no
cumple.

**Scope.** Hero reescrito alrededor del problema resuelto (no features);
diferencial Supabase explicado; MercadoPago/LatAm destacado como
diferenciador solo con los escenarios aceptados y sus límites explícitos; matriz de features
honesta; comparación con construir desde cero; demo/screenshots/video;
stack exacto documentado; CI/security como argumento comercial (sustentado con evidencia actual de CI y seguridad);
pricing conectado a `billing.plans` (depende de Plan 012, PR 5); FAQ; CTA de
compra; analytics completo del funnel (depende de D-5).

## D-5 — Observabilidad de producto

**Scope.** Ya existen eventos reales en PostHog (signup, login, onboarding,
MFA, account created, invitation sent/accepted, project created, document
uploaded, plan viewed — taxonomía validada con Zod, consentimiento
respetado). Falta construir: dashboard de acquisition; signup conversion;
signup → onboarding completion; activation; pricing viewed → checkout
started → subscription activated (provider breakdown Stripe/MP); feature
adoption; retention; invitation/team adoption; webhook/email failures;
alertas relevantes con acción asociada. Los errores críticos, fallos de
webhooks/email y salud de workers necesarios para operar son gates previos
de v1, no esperan a estos dashboards comerciales.

## D-6 — Polish final

**Scope.** Axe sobre superficies aún no cubiertas por
`src/test/e2e/axe.ts` (ya existe, cubre 4 specs — extender, no rehacer);
keyboard navigation; focus states; responsive completo; Lighthouse CI (único
ítem explícitamente pendiente de D6 original, ver `docs/estado-fases.md`);
bundle analysis; images/fonts; SEO metadata; sitemap/canonicals/hreflang;
páginas 404/500/error boundaries; empty states; loading/skeleton states;
error copy; paridad i18n visual en los 4 locales (el test de paridad de
claves ya existe — esto es paridad _visual_, no de claves); smoke de
producción completo antes de anunciar.

## Orden comercial posterior (referencia histórica de Fase D)

```
Plan 010  Tenant isolation           ┐
Plan 011  Proveedores anunciados     ┤ P0 — comportamiento
                                      ┘
Plan 012  Security hardening +       ┐
          pricing source of truth    ┘ P1 — riesgo/deuda
                                      ↓
D-1  Docs / Fumadocs                 ┐
D-2  Buyer onboarding / DX           │
D-3  Licensing + distribución        │ Fase D — vendibilidad
D-4  Landing / conversión            │
D-5  Product analytics               │
D-6  Accessibility / performance     ┘
                                      ↓
                         DISTRIBUCIÓN COMERCIAL
```

No se desglosa Fase D en PRs ejecutables en este documento. Retomar después de
v1 propia cuando se decida vender, con alcance de proveedores declarado,
archivos exactos y acceptance criteria verificables. El orden operativo v1 es
Fases 2/6 → workers → aceptación interna MP → Plan 012 y checks operacionales;
las otras certificaciones siguen independientes antes de ofrecerlas.
