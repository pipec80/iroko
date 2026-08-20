# Iroko Design System — entrada oficial

El sistema de diseño canónico del repositorio está en
[Axiom Ledger Design System](<Axiom Ledger Design System/>). El nombre de la
carpeta se conserva por trazabilidad del paquete descargado; no define la marca
vigente.

## Orden de lectura

1. [Estado y límites](<Axiom Ledger Design System/STATUS.md>)
2. [Guía del sistema](<Axiom Ledger Design System/README.md>)
3. [Instrucciones para agentes](<Axiom Ledger Design System/SKILL.md>)
4. [Tokens canónicos](<Axiom Ledger Design System/colors_and_type.css>)
5. [Kits de interfaz](<Axiom Ledger Design System/ui_kits/>)
6. [ADR 0002](../adr/0002-canonical-design-system-authority.md)

## Matriz de autoridad

| Pregunta                                     | Autoridad                                        |
| -------------------------------------------- | ------------------------------------------------ |
| Intención visual, voz y reglas               | `Axiom Ledger Design System/README.md`           |
| Colores, tipografía y tokens                 | `Axiom Ledger Design System/colors_and_type.css` |
| Reglas para Claude Code, Codex u otro agente | `Axiom Ledger Design System/SKILL.md`            |
| Implementación que corre hoy                 | `src/app/globals.css` y `src/app/layout.tsx`     |
| Estado, evidencia y brechas                  | `Axiom Ledger Design System/STATUS.md`           |
| Razón de esta estructura                     | ADR 0002                                         |

La especificación expresa lo que debe existir y el código demuestra lo que
existe. Si divergen, se registra y corrige la brecha; ninguno reemplaza al otro
en silencio.

## Material no canónico

- `Axiom Ledger Design System/design_handoff_iroko/` es una exportación
  generada y preservada como referencia de origen.
- `Axiom Ledger Design System/brand/` conserva exploraciones históricas.
- Las muestras retiradas están identificadas en
  [preview/README.md](<Axiom Ledger Design System/preview/README.md>).
- `dashboard/` y `public/` en este directorio son referencias anteriores a la
  decisión canónica; no deben guiar trabajo nuevo.

No se debe editar una copia generada para cambiar la especificación. Los cambios
comienzan en los archivos canónicos y deben mantener paridad con el runtime y
pasar `pnpm design-system:check`.
