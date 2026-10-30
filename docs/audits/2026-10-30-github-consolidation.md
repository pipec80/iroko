# Consolidación GitHub y Dependabot — 2026-10-30

## Alcance autorizado

El mantenedor autorizó integrar el trabajo local, resolver Dependabot, validar,
hacer merge y retirar ramas integradas para continuar desde `main`. PR de
consolidación: [#232](https://github.com/pipec80/iroko/pull/232).
No autoriza aplicar migraciones a Supabase Cloud ni cerrar el freeze.

Baseline remoto y `main` local: `a2feb3de9ca95bef5b18c7f6d2b4a4e88f6f899f`.
Trabajo local publicado inicialmente: `b107fbea393c9c2c01190c86202d4110c9a60741`,
seis commits, 221 archivos respecto de main; árbol limpio al iniciar.

## Dependencias consolidadas

| PR original | Resultado incorporado al candidato                                              |
| ----------- | ------------------------------------------------------------------------------- |
| #224        | Next 16.4.2, React/React DOM 19.3.1; analyzer, ESLint y override Next alineados |
| #225        | Supabase JS 2.118.0, versión exacta y lockfile                                  |
| #226        | Avatar/Dialog 1.3.1, ScrollArea 1.4.0, Slider 1.6.1, Slot 1.5.0                 |
| #227        | shadcn 4.21.5                                                                   |
| #228        | commitlint config-conventional 21.2.3                                           |
| #231        | Sentry Next.js 10.75.2                                                          |

Se consolidan también correcciones de DOMPurify, fast-uri, Zod de producción,
Vitest/mocker, Vite, SDK MCP, Hono/node-server, body-parser, undici y qs.
No se actualiza el CLI pnpm ni se desactiva su política de supply chain.
Los PR originales sólo se retiran cuando la consolidación esté integrada.

La auditoría del lockfile actualizado deja dos dependencias con avisos: Zod
3.25.76 en shadcn/registry/SDK (desarrollo) y deepmerge 4.3.1, también transitiva
de producción por `@react-email/render > html-to-text` desde correo/Resend.
El advisory Zod prescribe >=4.6.6,
un cambio de major para esos consumidores; no se fuerza una API incompatible.
El registro npm no publica deepmerge 4.3.2, aunque el advisory la indica como
parche. Son pendientes upstream explícitos, sin dismiss de alertas ni bypass.
Producción conserva un aviso low de deepmerge y cero high/critical; el gate
existente exige cero high/critical. Revalidar al existir actualización compatible.

## Primera ejecución GitHub del trabajo local

La ejecución [CI 41088599952](https://github.com/pipec80/iroko/actions/runs/41088599952)
corresponde al head inicial `b107fbe`, no a las dependencias actualizadas.
Unit Tests, Database Tests, Database Types, Edge Function Tests y smoke WebKit
pasaron. CodeQL también pasó. Los fallos confirmados fueron:

- Security Audit: vulnerabilidades del lockfile previo.
- Quality: Knip reportó `supabase.exe`, CLI externo Windows ya usado por un test.
  Se reconoce ese nombre junto con `supabase`; no se omite el test.
- Documentation: formato de 16 documentos; se aplica el formateador existente.
- Gitleaks: hashes Git y tareas `012.4-closeout`/`012.4-exceptions` en el CSV.
  `.gitleaks.toml` conserva reglas default y limita la excepción a esos valores
  exactos junto con la ruta exacta del CSV. Escaneo local de los seis commits:
  cero detecciones después de comprobar cada valor.

Los intentos locales de Vitest con forks no progresaron, con y sin sandbox;
se detuvieron sólo los procesos propios. No se registran como PASS. El pool de
threads sí ejecutó las regresiones posteriores; no se cambia la configuración
por defecto del proyecto. El head final debe renovar los checks afectados.

## Reparación de integración descubierta por CI

El E2E inicial terminó con 85 PASS, dos skips declarados por la suite y un fallo
de onboarding reproducido en los tres intentos de Playwright. La traza muestra
que «Invitar después» llegó a existir y fue desmontado: crear el team cambia la
identidad activa, el guard remonta el subtree y el wizard volvía al paso uno.
No era un selector obsoleto ni un problema de disponibilidad del módulo.

La reparación conserva el guard: el servidor devuelve el ID y nombre del team
activo verificado por `get_my_accounts`; el wizard remonta en invitaciones y
con ese ID para billing. Una cuenta personal, sin cuenta o un RPC fallido no
recibe ese estado. El botón Atrás permite volver a confirmar el nombre.

Regresión local RED: dos fallos y 21 PASS antes de reparar. GREEN: 24/24 en
cuatro archivos, incluidos los controles de identidad entre cuentas y logout.
Comando: `node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1
'onboarding/__tests__' 'providers/__tests__/query-provider'`.

La primera excepción Gitleaks funcionaba en el CLI local 8.30.1, pero CI usa
8.24.3 y no interpretaba `[[allowlists]]` global. Se usa
`[[rules.allowlists]]` sobre `generic-api-key`, compatible con CI, conservando
el AND entre ruta exacta y valores exactos. No se actualiza la herramienta ni
se ignora el archivo completo.

## Ajustes de aceptación tras ejecutar CI

En `43f95c5`, la suite general de Chromium completó 85 PASS, dos skips
preexistentes y un retry de presencia: durante la transición de cuenta el
selector global encontraba un árbol anterior oculto y el actual. Se consulta
el `main` visible, conservando las assertions de presencia y desconexión.

La aceptación confinada posterior obtuvo 20 PASS y un fallo de egress en el
caso de analítica durante impersonación, que visita el perfil. El harness de
0124 no aplicaba el stub local de banderas SVG existente en017. La regresión
ejecutando el fixture generado sin variables017 reproduce ese bloqueo. Se
sirve localmente el mismo GET de SVG de país de ruta exacta; URLs con query,
otros métodos y destinos ajenos permanecen bloqueados. Ninguna petición
remota se permite por esta corrección. Regresión RED1/1 y GREEN62/62 de los
runners0124/017, sin skips en Windows; CI debe renovar la aceptación real.

## Límites

La integración de Git no acepta pricing 012.5, composición/reutilización 015,
revisión final 016, módulos diferidos ni paridad de migraciones Cloud.
El despliegue automático y los checks deben atribuirse a su SHA. El estado de
proveedores y las migraciones vinculadas siguen **[NO VERIFICADO]** aquí.
