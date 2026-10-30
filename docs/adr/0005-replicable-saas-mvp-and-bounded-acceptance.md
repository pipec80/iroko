# ADR 0005: MVP SaaS replicable y aceptación acotada

- Estado: Accepted.
- Fecha: 2026-10-28, America/Santiago.
- Decisor: propietario del repositorio, instrucción explícita en esta sesión.
- Alcance: dirección de producto y criterio de cierre; no aceptación runtime.
- Desarrolla ADR 0001; conserva ADR 0002/0003/0004. Sustituye la prioridad
  anterior de 017.4 y la dependencia de una vertical Robot para demostrar la base.

## Contexto

Iroko debe permitir entregar productos adaptados sobre un núcleo común: acceso,
cuentas, permisos, datos, archivos, correo, eventos y suscripciones cuando se
ofrezcan. Cosmética, tarot y Robot son ejemplos de dominios consumidores; no se
construyen los tres ni se convierten sus reglas en funcionalidades del núcleo.
La comparación competitiva orienta decisiones, no obliga a igualar catálogos.

El runner local del editor ha consumido memoria y tiempo sin cerrar sus escenarios.
Un arranque HTTP200 no acepta la aplicación. Su fallo tampoco demuestra un fallo
del SaaS desplegado. Optimizar esa herramienta dejó de ser el siguiente resultado
de producto. Se conserva el código reparado y toda la evidencia, sin declarar R02 PASS.

## Decisión

### Producto y exclusiones

La entrega es una base SaaS reutilizable primero para productos propios y
adaptaciones a clientes. Demostrar reutilización es obligatorio; vender una
licencia de boilerplate, construir un generador o un editor de aplicaciones no.

| Superficie | Resultado mínimo de la base |
| --- | --- |
| Auth y cuentas | Acceso, salida, recuperación y roles efectivos; ningún dato cruza cuentas |
| PostgreSQL/RLS | Una operación útil persistida, con positivos y negativos de autorización |
| Storage | Un caso de subida/lectura/eliminación; público o privado según lo ofrecido |
| Realtime | Un evento útil recibido y cleanup al salir/cambiar identidad |
| Edge/correo | Una operación pequeña existente, autenticada, con resultado y error observables |
| Suscripciones | Un proveedor y alcance ya acordados; alternativa sin nuevas compras coherente |
| Adaptación | Marca, módulos, un registro de negocio y actualización sin duplicar autorización |

No se exige usar todos los productos de Supabase, certificar todo tipo de archivo,
todos los escenarios financieros, otro proveedor o una plataforma colaborativa.
Una imagen pública no certifica archivos privados; se prueba sólo el contrato ofrecido.
Las suscripciones existentes conservan callbacks/worker aunque se retiren nuevas compras.

Robot/IoT es una vertical posterior opcional, no el producto base ni una dependencia
del MVP. El editor Markdown avanzado y su aceptación R02/N04/N05 quedan diferidos.
No se eliminan sus pruebas, reparaciones ni historial. No se afirma que estén aceptados.

La exclusión comercial NO prueba exclusión técnica: 015-T1 debe demostrar para la
configuración MVP que editor y Robot no se ofrecen ni son accesibles por navegación,
URL directa o acciones de aplicación no autorizadas. Mantener RLS/grants y controles
de recursos existentes. Si siguen accesibles/ofrecidos, sus P0/P1 vuelven a bloquear
esa configuración. No borrar datos ni esquemas para simular desactivación.

### Herramientas y evidencia

El runner development/webpack del editor sale del camino crítico. Se conserva
como herramienta no aceptada para su alcance pendiente; no se optimiza ni ejecuta
automáticamente. El runner SQL atestado de T11 NO se retira: su aislamiento sigue
siendo obligatorio. Los confinamientos de secretos/egress no se debilitan.

El criterio es el comportamiento observado, no un script determinado. Una
aceptación alternativa identifica candidato, configuración, destino, fixture propio,
resultado esperado/observado y cleanup; comprueba autorización y errores pertinentes.
Puede usar navegador manual reproducible o automatización existente adecuada.
No sustituye permisos/RLS con mocks ni convierte un HTTP200 en aceptación de flujo.

No se eliminan assertions ni umbrales para obtener verde. Los casos fuera del
producto se disponen expresamente, no se esconden como skips de una suite aceptada.
El alcance seleccionado se fija antes de ejecutar, sin omitir fallos a posteriori.

### Secuencia finita

1. Adelantar015-T1/RS-05 para fijar oferta y exclusión efectiva, sin ejecutar aún
   el ensayo completo de réplica. 017: conservar T11 y reparaciones vigentes; cerrar privacidad/identidad, cuotas,
   aislamiento e integridad del billing ofrecido. Resolver filas agregadas mediante
   sus subfilas/evidencia, sin reimplementar componentes ya reparados.
2. 012.5 y 014: corregir catálogo/copy, imágenes y auditoría en superficies ofrecidas.
3. 015: primero exclusión efectiva y configuraciones coherentes; luego replicar la
   base, cambiar marca y extender un caso neutral pequeño con datos aislados.
   Demostrar una actualización real conservando personalización y datos. Sin Robot.
4. 016-T2/T3: reauditoría final del candidato, por método de abajo; cerrar hallazgos
   bloqueantes y entregar veredicto del MVP con límites. No otra ronda de funciones.
5. Después del MVP: decidir vertical cliente/Robot, editor y restantes diferidos.

P0/P1 de seguridad/integridad de capacidades ofrecidas bloquean la entrega. Otros
hallazgos requieren disposición y dueño, no se convierten automáticamente en una
nueva condición de salida. El roadmap y CSV concretan esta secuencia.

## Método de reauditoría final

Usar 016 existente, después de los cambios finales de 015, no un plan paralelo.
Antes de ejecutar fijar revisión/manifiesto, configuración ofrecida y entorno.
Inventariar todo el código propio y revisar riesgos/dependencias, incluidos límites
de acceso de módulos excluidos. No repetir auditorías de assets generados como si
fueran otra implementación. Cada hallazgo exige ubicación, hipótesis falsable,
impacto, reproducción o evidencia estática, controles positivo/negativo pertinentes,
severidad y certeza; distinguir producto, prueba, entorno y causa desconocida.

Separar frentes aplicación, seguridad/datos e integración/operación; revisión
independiente del autor. Modelos más capaces pueden apoyar el contraste, pero su
nombre, acuerdo o número no sustituyen evidencia. No prometer certificación científica.
Una ronda de revisión, reparación de hallazgos confirmados y retest proporcional;
si queda bloqueo, informe explícito, sin nuevas rondas generales automáticas.
Tras dos intentos con igual firma sin información nueva, detener ese gate. Un
bloqueo de capacidad local obliga a cambiar estrategia o entorno autorizado,
no a optimizar indefinidamente el harness ni a dar por aceptado el escenario.

Un único gate integrado de tipos/lint/cobertura/SQL/build y recorridos ofrecidos,
con reutilización justificada de evidencia vigente; no multiplicarlo por cada tarea.
Cloud observa revisión desplegada y servicios efectivos, no el checkout local.
Registrar tiempos y recursos de CI antes de afirmar que soporta la carga. No
autoriza instalar herramientas, gastar en proveedores, push, merge ni deploy.

## Consecuencias y aceptación de esta decisión

Las filas editor pasan a deferred con condición de retorno. La obligación de
excluirlas efectivamente se incorpora a RS-05/015-T1 y sigue pendiente hasta prueba.
Las reparaciones Robot ya aceptadas conservan su evidencia; su vertical no se amplía.
No reescribir auditorías históricas ni ADR aceptados como si ya hubieran dicho esto.

Aceptación documental: roadmap, planes, CSV, estrategia y estado consistentes,
enlaces válidos y revisión independiente. No demuestra código desactivado,
instalación repetida, CI verde, paridad Cloud ni MVP terminado.
