# Revisión semántica de matrices e inventario Git — 2026-10-13

## Veredicto

Las matrices de 016-T1 conservan identidad y cobertura estática sobre el
candidato histórico `03ef8730560c638328c7bad12e58d50376493080`. Son integrables
como evidencia histórica, no como aceptación del árbol actual ni cierre de
016-T2/T3. Esta revisión no ejecutó pruebas de aplicación, DB, Cloud o hosting.

## Comprobaciones renovadas

- Manifiesto: 947 filas y rutas únicas, 947 tamaños y conteos físicos correctos
  donde existe `line_count`, y 946 hashes SHA256 permitidos correctos. La
  migración Vault mantiene su omisión preventiva de hash; se verificó su tamaño
  y número de líneas sin divulgar contenido ni secretos.
- Configuración: 4.153 claves únicas `(origin, line)`, frente a 4.136 en HEAD.
  Las 17 adiciones corresponden exclusivamente a `src/config/app.config.ts`,
  líneas 62–88 del candidato histórico. No son nuevas pruebas de configuración
  efectiva ni cambios funcionales del archivo actual.
- Reglas: 654 claves únicas, sin altas frente a HEAD. Todas las referencias
  señalan líneas existentes del candidato. Ocho textos difieren solo por
  espacios de tablas/comandos; no cambia su significado.
- Configuración: referencias de línea válidas. Se conservaron 18 valores de
  `.env.example` redactados deliberadamente, tres previews de líneas largas y
  una descripción multilínea. No se sustituyeron esas representaciones por
  valores sensibles. No se detectó pérdida de filas o duplicación de claves.

Las comprobaciones usaron `csv.DictReader`, `git cat-file --batch` y comparación
binaria/hash contra Git; los resúmenes excluyeron valores sensibles. El diff
numérico amplio refleja reescritura de evidencia CSV: por sí solo no demuestra
ni ampliación funcional ni revisión de cada defecto en runtime.

## Hallazgos que permanecen acotados

- **D-03:** cuotas de creación de API keys/webhooks con `count` separado del
  `INSERT`; su cierre requiere la corrección y prueba concurrente propias.
  La admisión HTTP de 012.3 no cierra automáticamente esas cuotas de creación.
- **D-04:** invariante documento/proyecto/cuenta pendiente de reproducción y
  corrección específicas. Esta revisión no demuestra exfiltración.
- **N-06:** reproducción aislada React/jsdom registrada; transición integrada
  de impersonación y conservación real de datos siguen **[NO VERIFICADO]**.

Las categorías `reviewed-in-static-scope` documentan decisiones, excepciones y
consumidores; no afirman cumplimiento universal. La precedencia `env.ts` y la
excepción Windows para migraciones prevalecen sobre recetas antiguas.

## Inventario e integración

El [inventario](2026-10-13-git-integration-inventory.csv) registra 130 rutas en el
snapshot de esta entrega, incluyendo este informe. Cuatro DB de
`%SystemDrive%/` conservan `EXCLUDE`; se preservan físicamente. Las rutas se
clasifican por unidad, no se seleccionan mediante un `git add` global.

Se mantienen las diez unidades anteriores y se añaden 11 hook, 12 admisión API
y 13 evidencia 012.3. `public.sql`, tipos y documentos compartidos requieren
separar hunks; los cambios 014/012.1/012.2 deben conservar sus dependencias y
referencias. El inventario se renovará si aparecen más archivos o se crean
commits después de este snapshot; no es un registro permanente del índice.

**Siguiente paso recomendado:** revisar las selecciones exactas antes de cada
commit local y ejecutar sus checks. No se realizaron staging, commits, push,
merge, instalaciones ni modificaciones Cloud desde esta tarea.

## Seguimiento de la aceptación HTTP local

La prueba real del endpoint Next detectó que `service_role` no podía leer las
columnas del resumen de cuenta. Se incorporan al inventario la migración
`20261014012941_account_api_summary_columns.sql` y su regresión
`49_account_api_summary_grants.test.sql`, ambas en la unidad 12. El espejo
`api-keys.sql` conserva su fila existente de esa unidad. La corrección concede
solo las cuatro columnas necesarias, sin `SELECT` global de la tabla.

El inventario pasa a **132 rutas fuente relativas al baseline original**;
conserva las 130 anteriores aunque los commits locales en curso reduzcan el
estado pendiente. No debe interpretarse como conteo actual de `git status`.
Estas dos incorporaciones no alteran las matrices históricas ni renuevan su
aceptación en runtime; no se repitió la comparación de los 947 blobs porque
sus fuentes y matrices permanecieron sin cambios.

## Integración local registrada

Las nueve unidades de código quedaron integradas en commits locales:
02 `e718439`, 03 `38278c9`, 04 `d18acf2`, 05 `b43fbff`, 06 `0e45afd`,
07 `af8fbbc`, 09 `feedbc0`, 11 `441e755` y 12 `71ae75d`.
La columna `integration_ref` del inventario identifica esos commits por ruta;
cuando una ruta contiene hunks de distintas unidades registra sus referencias
únicas. Las unidades documentales 01/08/10/13 se consolidan en el cierre
documental conjunto para mantener disponibles los destinos de sus enlaces,
incluidos los dos scripts SQL de inspección de lectura.

`status` y las 132 rutas conservan el snapshot original, no el índice ni el
estado pendiente después de esos commits. `local-preserved-excluded` señala
los cuatro artefactos locales preservados. Esta integración local no implica
push, merge, deploy ni aplicación Cloud de 012.3.
