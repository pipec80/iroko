# 012.5 — Pricing y promesas Implementation Plan

**Dirección vigente 2026-10-28:** [ADR0005](../../adr/0005-replicable-saas-mvp-and-bounded-acceptance.md).
Este plan sigue siendo cierre del catálogo ofrecido, no paridad con competidores.
No anunciar editor/Robot diferidos ni productos cosmética/tarot como implementados.
La base adaptable se demuestra en015 antes de prometerla. No bloquear pricing por
el runner editor ni certificar otro proveedor; preservar límites/cobros existentes.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Mostrar y contratar el mismo catálogo vigente en landing, pricing y billing, con límites/capacidades y promesas públicas fieles a evidencia.

**Architecture:** Extraer una lectura servidor común a partir de planes activos y precios por proveedor, sin duplicar precios en i18n ni exponer información privada. Checkout conserva su autorización y resuelve el precio en servidor; la UI recibe solo un DTO público.

**Tech Stack:** Next.js 16.4.1, React 19/Compiler, TypeScript, Supabase RPC, next-intl, Vitest/pgTAP/Playwright existentes.

**Spec:** [PR 5 del Plan 012](012-security-hardening-and-pricing-truth.md#pr-5--featpricing-single-source-of-truth), [auditoría](../../audits/2026-10-19-freeze-code-and-documentation-revalidation.md) y [contrato de remediación](017-freeze-remediation.md).

Estado: **planificado, no ejecutado**, 2026-10-20. Baseline `a2feb3d`. Responsable lógico: pricing/product truth; revisión datos/billing, seguridad y UI/i18n.

## Identidad y dependencias

012.5 **no se desarma** ni se fusiona con 017: conserva pricing, límites, nombres, copy y metadata. El bloque P1 de 017 la precede por el orden aprobado; cuotas/invariantes se reparan allí y aquí se refleja su contrato. 014 mantiene imágenes/audit log. 015 reutiliza el catálogo al configurar billing; no vende una segunda oferta.

## Global Constraints

- Aplican todas las restricciones de 017, AGENTS y TESTING-PLAN. Esta entrega solo redacta el plan; ningún checkbox acredita código ejecutado.
- Conservar etiquetas Free / Plus / Pro, slugs `free` / `pro` / `scale`, IDs y precios de la oferta vigente. Catálogo versionado MP mensual CLP: 0 / 19.990 / 102.990 al baseline; son fixtures de regresión, no nuevos valores hardcodeados de UI ni confirmación Cloud actual.
- No anual MP ni trial; no presentar tier con precio self-serve como contactar ventas. No certificar otros proveedores ni cambiar nomenclatura a Teams.
- `billing.plans` contiene identidad/intervalo/features/limits; `billing.provider_prices` determina importes por proveedor/moneda. No asumir que price de plans coincide con MP.
- Reutilizar CSP/render dinámico actual, proxy, tokens Iroko y cuatro locales. No rediseñar la oferta ni alterar paleta/fuentes.
- Leer el sistema de diseño canónico completo antes de implementar UI; no usar handoffs generados para decidir precios o capacidades.
- No exponer external_price_id, metadata proveedor, cuentas, suscripciones ni llaves en el DTO. Un RPC público existente no hace públicos los RPC de catálogo service-role.
- Sin dependencias nuevas, sin migración de catálogo/precios, sin providers/Cloud/pagos/deploy implícitos.

## Review Focus

- CLP no se divide por 100; presentación localizada conserva currency/interval reales — T1/T2.
- Proveedor mal configurado o catálogo parcial no puede caer en precios inventados — T1/T2.
- Un cambio de importe/features/limits aparece en ambas superficies y dashboard — T3.
- Pago se inicia con slug/interval autorizados y precio actual servidor, nunca con precio enviado por browser — T1/T3.
- Copy de SLA, trial, certificación, readiness o tiempos debe tener evidencia o retirarse en los cuatro idiomas — T4.

## 012.5-T1 — Proyección pública y lectura común

**Files:** crear `src/lib/billing/public-catalog.ts`, `src/lib/billing/__tests__/public-catalog.test.ts`; modificar `src/app/[locale]/dashboard/billing/actions.ts` y sus tests; leer `catalog.ts`, `service.ts`, `registry.ts`, `capabilities.ts`, RPCs en `supabase/schemas/public.sql` y pruebas DB 33/34.

**Interfaces propuestas:** módulo `server-only`; exportar
`getPublicCatalog(): Promise<PublicCatalogResult>` y DTO:

```ts
type PublicPlan = {
  slug: string;
  name: string;
  interval: 'month' | 'year' | 'one_time';
  amount: number;
  currency: string;
  trialDays: number;
  features: Record<string, boolean>;
  limits: Record<string, number>;
};
type PublicCatalogResult =
  | { status: 'available'; provider: string; plans: PublicPlan[]; checkoutAvailable: boolean }
  | { status: 'unavailable'; provider: string; plans: []; checkoutAvailable: false };
```

El reader obtiene `get_active_plans`, usa selección de proveedor servidor y
`getProviderPrice` para MP/CLP exactamente como checkout. Otros adaptadores ya
configurados conservan su comportamiento sin prometer certificación. Preservar
el fallback de billing que muestra estado de cuenta aunque checkout no esté
configurado; oferta incompleta implica checkoutAvailable false. Mantener la
firma getBillingData y adaptar DTO a PlanRow dentro del servidor. Cero datos
de cuenta en getPublicCatalog y cero import del módulo en Client Components.

- [ ] RED: fixtures incluyen planes base en otra moneda y precios MP CLP. Afirmar month/CLP, etiquetas no derivadas del slug y trialDays=0; un precio MP ausente/inactivo o fallo RPC produce unavailable/checkout false. Afirmar que el JSON del DTO no contiene external IDs, metadata ni usuario.
- [ ] Ejecutar `pnpm test src/lib/billing/__tests__/public-catalog.test.ts "dashboard/billing/__tests__/actions"`; registrar fallos por divergencia actual.
- [ ] Implementar reader común y reutilizarlo desde getBillingData sin mezclar overview/paymentHealth con lectura pública. Evitar caché persistente implícita; toda lectura nueva debe observar el catálogo vigente en su siguiente request.
- [ ] GREEN del mismo comando y typecheck/lint. Conservar regresiones existing de catálogo no disponible, owner/admin y checkout MP mensual. Revisión de imports servidor/cliente antes de cerrar.

## 012.5-T2 — Landing y pricing consumen el DTO

**Files:** modificar `src/app/[locale]/(public)/page.tsx`, `(public)/pricing/page.tsx`, `messages/{es,en,pt,fr}.json`; crear `src/lib/billing/presentation.ts`, `src/lib/billing/__tests__/presentation.test.ts` y tests de ambas páginas junto a sus rutas.

**Interfaces:** `formatPlanAmount(amount: number, currency: string, locale: string): string` usa Intl y exponentes de moneda; CLP amount es unidad entera, monedas de dos decimales siguen contrato minor-unit actual. Las páginas servidor llaman getPublicCatalog. Mostrar nombre del catálogo, interval/trial/features/limits del DTO; el diccionario i18n solo traduce labels explicativos, no contiene importes ni otro catálogo. No inventar capacidades desconocidas: omitirlas o usar etiqueta neutral explícita.

- [ ] RED de páginas: mockear reader con un importe sintético distinto del baseline y límite de miembros distinto; ambos aparecen en landing y pricing en los cuatro locales. Catálogo unavailable muestra mensaje traducido y ninguna compra/precio de fallback. Free tiene CTA válido; ningún self-serve vigente usa contactar ventas.
- [ ] RED formatter: CLP 19990 contiene monto entero 19.990 en es-CL y USD 1990 representa 19.90 según contrato; no hardcodear separadores en lógica.
- [ ] Reemplazar arrays de datos comerciales/comparación independientes por proyección de DTO. Mantener estructura visual, accesibilidad y navegación tipada existentes. Eliminar strings de precios/capacidades retirados solo tras revisar todos sus consumidores.
- [ ] Ejecutar `pnpm test "public-catalog" "presentation" "(public)/__tests__" "pricing/__tests__"`, `pnpm typecheck`, `pnpm lint` y `pnpm design-system:check`. Aportar evidencia browser de ambos estados y cuatro idiomas durante aceptación local; no confundir render con checkout.

## 012.5-T3 — Regresión catálogo mostrado/contratado/habilitado

**Files:** crear `src/test/e2e/pricing-catalog.spec.ts`; extender tests unitarios de reader/acciones y `supabase/tests/database/34_mercadopago_clp_catalog.test.sql` solo donde falte un contrato observado. No añadir migraciones por escribir tests.

**Interfaces:** conservar `startCheckout({ planSlug, interval })`; la oferta no recibe amount/currency del browser como autoridad. Entitlements siguen plan ID/slug y límites en servidor. El fixture SQL restaura su catálogo al finalizar y usa solo el stack oficial identificado.

- [ ] RED local: modificar de forma controlada y reversible el precio/provider_price y un límite del fixture, cargar landing/pricing/dashboard y verificar el mismo resultado. Interceptar el provider en sumidero/mock local autorizado para comprobar amount/currency/interval del intento; ninguna llamada Mercado Pago real.
- [ ] Afirmar rechazo anual MP, no trial, slug inválido, viewer/no miembro, proveedor no configurado y catálogo incompleto. Control positivo owner/admin; entitlements no se elevan por manipular precio/slug en cliente.
- [ ] Ejecutar el E2E focalizado y `pnpm supa:test` solo tras preflight del runbook final. Registrar que un cambio de UI no modifica suscripciones existentes y que el caso de catálogo actualizado no requirió editar componentes/i18n.
- [ ] Revisión datos/seguridad del DTO y prueba de cleanup/rollback fixture. Si falta entorno, dejar aceptación local pendiente; no marcar tarea completa por mocks.

## 012.5-T4 — Promesas y metadata

**Files:** `src/config/app.config.ts`, cuatro catálogos messages, consumidores generateMetadata de rutas públicas y `src/app/layout.tsx` si consume description; `docs/capabilities.md` y estado al cerrar.

**Contrato editorial:** sustituir afirmaciones incondicionales de production-ready,
ready on day one, SLA garantizado, trial, SAML y tiempos de instalación por
descripción verificable: «Base SaaS en desarrollo con autenticación, cuentas,
permisos e integraciones configurables». Traducir el mismo alcance, sin afirmar
aceptación independiente hasta 015. Claims específicos existentes solo permanecen
si remiten a evidencia aceptada para ese alcance.

- [ ] Crear matriz claim → consumidor → evidencia → conservar/reformular/retirar para landing, pricing, metadata y cuatro idiomas. Revisión semántica humana; paridad de keys no basta.
- [ ] Tests de metadata/copy comprueban el contrato acordado, no un barrido indiscriminado de palabras en material histórico. Los handoffs/prototipos permanecen clasificados como referencias.
- [ ] Ejecutar tests afectados y checker docs. Registrar el texto final y evidencia; revisión editorial/funcional independiente y commit local de la tarea cuando esté autorizado.

## Reglas y cierre

Aplican las ocho reglas leídas y excepciones del contrato 017: TS/import type,
JS asíncrono, límites RSC, env.ts, React Compiler, SQL/ACL, tests observables,
Realtime no afectado. Se conserva cacheComponents false; no usar use cache de
la regla antigua ni Material 3, ni limitar cambios a es/en omitiendo pt/fr.

- [ ] T1–T4 tienen RED/GREEN/revisión y evidencia por SHA.
- [ ] Lectura común no expone campos privados ni precios alternativos hardcodeados.
- [ ] Catálogo actualizado se refleja en las tres superficies y entitlements sin cambiar oferta ni slugs.
- [ ] Pruebas locales de proveedor/moneda/intervalo y UI unavailable completas.
- [ ] Claims/metadata de cuatro locales revisados y documentación sincronizada.
- [ ] Gate proporcional y posterior gate final 016-T2; Cloud separado [NO VERIFICADO] hasta aceptación autorizada.

Mover a completed únicamente al satisfacer este alcance. El cierre no ejecuta
`scale → teams`, certifica otros proveedores ni cierra 015 o todo Plan 012.
