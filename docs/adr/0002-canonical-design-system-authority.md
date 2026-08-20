# ADR 0002: Autoridad canónica del sistema de diseño

- **Estado:** Aceptado
- **Fecha:** 2026-08-20
- **Decisor:** propietario del repositorio

## Contexto

`docs/design-system/` acumuló una versión vigente, prototipos anteriores, una
exportación descargada que replica gran parte del árbol y un PDF. Algunas guías
todavía describían la paleta y tipografías retiradas, mientras los tokens y el
runtime ya usaban Poppy, Cobalt, Geist y Geist Mono. Una persona o agente no
podía determinar formalmente qué archivo debía obedecer.

## Fuerzas de decisión

- Un único punto de entrada para humanos, Claude Code, Codex y otros agentes.
- Preservar la descarga original y su trazabilidad sin convertir duplicados en
  fuentes alternativas.
- Separar intención de diseño, implementación ejecutable y evidencia.
- Evitar pérdidas o eliminaciones durante la curación inicial.
- Poder detectar automáticamente divergencias esenciales.

## Opciones consideradas

1. Mantener la colección sin jerarquía. Rechazada porque conserva la ambigüedad.
2. Eliminar duplicados y aplanar todo inmediatamente. Rechazada por pérdida de
   trazabilidad y riesgo de borrar material recién descargado.
3. Declarar una raíz canónica y clasificar el handoff como exportación generada.
   Elegida porque resuelve la autoridad sin destrucción.

## Decisión

La raíz oficial es
`docs/design-system/Axiom Ledger Design System/`. Dentro de ella:

- `STATUS.md` es el estado operativo y las brechas fechadas.
- `README.md` define la intención visual y editorial.
- `SKILL.md` guía el trabajo de agentes.
- `colors_and_type.css` es el contrato canónico de tokens.
- `ui_kits/` contiene referencias canónicas de superficies.

La base visual aceptada es Poppy `#d92121`, Crimson `#b11226`, Cobalt
`#0047ab`, Ink `#0e1117`, Paper `#ffffff`, Geist y Geist Mono.

`src/app/globals.css` y `src/app/layout.tsx` son la evidencia de implementación
en ejecución. Si la especificación y el runtime divergen, la diferencia debe
registrarse y resolverse explícitamente; no se elige uno en silencio ni se crea
una tercera versión.

`design_handoff_iroko/`, los archivos `_ds_*` y el PDF se conservan como
exportaciones/referencias generadas. `brand/` y las muestras identificadas en
`preview/README.md` son históricas. Esta decisión no elimina archivos.

## Consecuencias

- Toda persona o agente obtiene el mismo orden de lectura y reglas de autoridad.
- La exportación puede volver a descargarse sin cambiar automáticamente la
  especificación.
- El repositorio conserva material histórico, pero debe rotularlo y excluirlo de
  controles que sólo aplican a documentación canónica.
- Un validador compara tokens esenciales, tipografías runtime y lenguaje de las
  guías canónicas; la revisión visual sigue siendo necesaria para cambios de UI.

## Mantenimiento y verificación

- Ejecutar `pnpm design-system:check` y `pnpm test:design-system-check`.
- Adjuntar evidencia visual fechada para cambios perceptibles.
- Actualizar `STATUS.md` al cerrar o introducir una brecha.
- Modificar este ADR sólo mediante otro ADR si cambia la autoridad declarada.
