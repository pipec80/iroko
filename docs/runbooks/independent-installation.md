# Instalación derivada y actualización de Iroko

## Alcance y estado

Guía de trabajo de Plan015-T2 para una instalación local derivada. **[NO
VERIFICADO]** como procedimiento independiente: T3 debe ejecutarla sin pasos
ocultos y registrar preguntas, tiempos, fallos y recuperación en
`docs/quality/reusable-foundation-evidence.md`. Iroko es una base interna en
MVP; esta guía no es una promesa de distribución a clientes. La [estrategia](../architecture/product-strategy.md)
y las [recetas](../modules/foundation-recipes.md) definen límites de adaptación.

## Decisiones previas y protección del entorno

1. Leer `AGENTS.md`, `docs/index.md`, `docs/current-state.md`, ADR0005, Plan015
   y `TESTING-PLAN.md`. Fijar revisión base y manifiesto de cambios sin commit:
   un SHA de Git no incluye archivos staged/unstaged/untracked.
2. Inventariar servicios y consumidores existentes antes de modificar entorno:
   Supabase local/Cloud, GitHub CI, Cloudflare, PostHog, Resend, Sentry,
   Vercel y proveedores de billing implementados. Distinguir instalado,
   configurado y verificado en runtime. Antes de operar un proveedor Free,
   comprobar capacidad y cuota en fuentes oficiales y estado de cuenta de
   solo lectura; no habilitar planes pagados.
3. Identificar checkout derivado absoluto, puerto web y stack destino. La pila
   local oficial es `project_id = "saas-boilerplate"` en `supabase/config.toml`.
   Verificar estado con `docker ps` y `pnpm supa:status`; el error de acceso al
   socket dentro del sandbox no prueba que Docker esté detenido. No vincular ni
   resetear Cloud. No crear pila Supabase adicional por conveniencia.
4. Antes de cualquier reset, entregar el procedimiento exacto de backup,
   verificación y restauración del stack oficial, incluidos Auth del mantenedor,
   perfil/membresías, base completa, historia de migraciones, Vault y bytes de
   Storage además de metadatos. El procedimiento debe preservar credenciales,
   cambios fuente pendientes y recursos ajenos; requiere aprobación específica
   del destino y operación. Un dump sólo de SQL de aplicación no satisface
   esta protección. Si no se ha probado recuperación, no resetear.

El runner `scripts/run-plan-0124-local.mjs` sirve para regresión confinada:
usa dependencias compartidas y borra su copia. No demuestra instalación nueva.
`scripts/prepare-local-acceptance.mjs` también comparte dependencias. T3
necesita un derivado persistente con instalación propia. Una copia de archivos
se describe como snapshot, no como checkout Git si carece de historia/ref.

## Preparación del instalador

Requisitos declarados por `README.md`: Node24+, pnpm11+, Docker Desktop y el
lockfile del repositorio. Registrar versiones observadas, recursos libres y
espacio en disco antes de un build. No ejecutar SQL, build, navegador y suites
en paralelo; usar un worker. Evitar copias anidadas que hagan que Tailwind o
Turbopack recorran `node_modules` mediante junctions; el derivado persistente
necesita frontera Git y raíz Turbopack verificadas.

1. Crear una ruta derivada nueva fuera del checkout de trabajo, o bajo el
   workspace ignorado `.superpowers/sdd/015-reusable-foundation-acceptance/derived`
   con frontera propia. Transferir sólo fuentes mantenidas y lockfile del
   candidato congelado. Conservar por separado un manifiesto de hashes, staged,
   unstaged y untracked relevantes. Conservar únicamente `.env.example` como
   plantilla versionada y saneada; no copiar `.env.local` ni otros `.env*`
   con valores reales, tokens, `.git` ajena,
   material privado, `node_modules` o artefactos build por inferencia.
2. Instalación independiente: `pnpm install --frozen-lockfile` **en el derivado**
   y comprobación de que el lockfile no cambió. Instalar dependencias requiere
   autorización explícita conforme a `AGENTS.md`; si no se obtiene o la red
   falla, marcar esta parte [NO VERIFICADO]. Un junction de `node_modules`
   permite regresiones, pero no cumple este gate.
3. Crear `.env.local` desde `.env.example` en el derivado sin versionarlo.
   `src/env.ts` es el inventario vigente: consultar allí nombres/requisitos,
   sin reproducir secretos en el informe. Los endpoints deben ser los del
   stack oficial comprobado. Elegir configuración de referencia según
   `src/config/app.config.ts`: proveedor ofrecido o sin nuevas compras. La
   selección de correo local se deriva de `MAILPIT_URL`; no añadir una env
   `MAIL_TRANSPORT` paralela. Cuando billing está apagado en una instalación
   nueva, no exigir credenciales de pago; una instalación con suscripciones
   previas conserva firma de callbacks, worker y soporte operacional.
4. Aplicar historia de migraciones y seed desde el derivado sólo sobre el
   destino local aprobado e identificado. `pnpm supa:start`, `pnpm supa:reset`
   y `pnpm supa:migration:up` son scripts locales; `supa:cloud:*`/linked son
   operaciones distintas y no quedan autorizadas por esta guía. En Windows
   escribir migración manual y espejo `supabase/schemas/*.sql`; no usar
   `supa:diff` mientras continúe la limitación documentada.

5. Con destino y puerto 3000 comprobados, ejecutar `pnpm build` y luego
   `pnpm start`, de forma secuencial. Abrir `http://localhost:3000/es/` y
   confirmar el correo local en Mailpit `http://127.0.0.1:54324` antes de
   completar el primer acceso. Verificar que los orígenes de Auth apuntan a
   ese mismo servidor; un HTTP200 aislado no prueba signup ni onboarding.

Checks focalizados tras cada cambio: `pnpm typecheck`, `pnpm lint` y los tests
Vitest/Playwright que correspondan a los archivos y recorridos modificados,
con un worker y tareas pesadas secuenciales. Para SQL, seleccionar el archivo
pgTAP pertinente mediante `pnpm supa:test <ruta>` sólo tras comprobar que el
runner atestado acepta ese argumento y valida el proyecto local exacto; no
sustituirlo por consultas ad hoc que omitan sus guards. Registrar comandos,
resultado y limpieza en la evidencia T3.

## Configuración y primer resultado

**Instalador:** registrar ruta, revisión, puertos, migraciones, variables no
sensibles configuradas, diferencias del derivado, dependencias opcionales,
tiempos activos y esperas. Cambiar marca siguiendo
`docs/design-system/README.md` y runtime `src/app/globals.css`/`layout.tsx`;
anotar todos los archivos tocados, no prometer un único archivo. Completar
traducciones de los cuatro idiomas si se agregan claves. No inventar otra
paleta ni instalar UI/tooling nuevo para este ensayo.

**Administrador:** crear primer usuario por signup/confirmación real en el
stack local y comprobar cuenta personal y membership owner. Para admin de
plataforma, seguir `docs/modules/platform-admin.md`: alta explícita en
`platform_admins` sólo para usuario elegido y sesión AAL2; no crear un
superadmin automático ni asumir que owner de tenant lo es. Registrar método
y resultado sin identificar persona/credenciales en documentación versionada.

**Usuario:** entrar, completar onboarding y llegar al dashboard; comprobar
cuenta activa, acceso de owner/member/viewer en un segundo tenant, navegación
y URL directa. Con billing=false, plan y checkout no se ofrecen, pero cuentas,
límites Free y recursos vigentes funcionan. Con billing=true, usar solamente
proveedor/escenarios ya aceptados para el MVP, sin inventar certificación de
otro PSP. Registrar un resultado observable, no sólo HTTP200.

## Extensión neutral y actualización

La extensión T3 crea un registro de negocio por tenant en el derivado, con
entrada validada, archivo privado y notificación. Usar
[recetas 1, 2, 3 y 6](../modules/foundation-recipes.md); T0 proporciona la
composición de navegación. Probar cuenta A/B, owner/admin/member/viewer,
escritura válida, rechazo viewer y ajeno, revocación con JWT antiguo, acceso
directo, persistencia tras recarga y cleanup propio. Mantener Projects/editor y
Robot fuera de la oferta. Si se necesita `service_role`, comprobar tenant/rol
antes de su uso; RLS no protege automáticamente ese cliente.

Actualizar el derivado desde una revisión base anterior compatible a una
corrección real de 012/014 que no sea un cambio trivial inventado. Registrar
revisión origen/destino, migraciones aditivas, conflictos, archivos resueltos,
datos antes/después, bytes de Storage, marca/personalización y tests. Conservar
un diff del derivado para que el próximo update no requiera conocimiento oculto.
Probar recuperación en destino desechable aprobado; una copia SQL sola no
recupera archivos de Storage. Registrar objetivo de recuperación acordado y
observado, sin declarar RPO/RTO por intuición.

## Ficha de entrega del derivado

| Campo | Registro requerido en evidencia T3 |
| --- | --- |
| Base y destino | SHA + manifiesto del árbol sucio, ruta absoluta, stack/puertos, revisión origen/destino |
| Oferta | billing y proveedor, módulos, idiomas, flags; configuración no secreta |
| Diferencias | código, SQL/migraciones/espejos, tokens de marca, traducciones, archivos preservados |
| Operación | responsable, correo/worker, alertas, fallo/reintento/agotamiento, cuotas Free comprobadas |
| Seguridad | matriz tenant/rol/operación, Data API/RPC/Storage, URL directa y acción |
| Recuperación | alcance backup DB/Auth/Vault/Storage, comprobación de restauración y destino |
| Actualización | corrección real, conflictos, estado antes/después, pruebas y tiempo activo |
| Límites | preguntas al mantenedor, pasos ocultos, bloqueos, [NO VERIFICADO] y siguiente prueba |

El resultado se registra en `docs/quality/reusable-foundation-evidence.md`
al ejecutar. Antes de eso, la ficha es un contrato de evidencia, no un PASS.
