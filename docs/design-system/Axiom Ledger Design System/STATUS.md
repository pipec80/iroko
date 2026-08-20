# Estado del sistema de diseño Iroko

**Estado:** canónico y aceptado
**Última revisión:** 2026-08-20
**Decisión:** [ADR 0002](../../adr/0002-canonical-design-system-authority.md)

## Base vigente

- Marca: Iroko.
- Acción primaria: Poppy `#d92121`; variante presionada: Crimson `#b11226`.
- Acento secundario: Cobalt `#0047ab`.
- Texto/superficie base: Ink `#0e1117` y Paper `#ffffff`.
- Tipografía: Geist para interfaz y display; Geist Mono para numerales, código y
  etiquetas técnicas.
- Iconos de producción: `lucide-react`.
- Locales de producto: español e inglés; español es el locale predeterminado.

## Autoridades

| Alcance                    | Archivo                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Guía visual y de contenido | [README.md](README.md)                                                                                      |
| Contrato de tokens         | [colors_and_type.css](colors_and_type.css)                                                                  |
| Uso por agentes            | [SKILL.md](SKILL.md)                                                                                        |
| Referencias de superficies | [ui_kits/](ui_kits/)                                                                                        |
| Implementación real        | [`src/app/globals.css`](../../../src/app/globals.css) y [`src/app/layout.tsx`](../../../src/app/layout.tsx) |

La especificación y el runtime tienen responsabilidades distintas. Una
divergencia es deuda explícita y no autoriza a inventar una tercera variante.

## Evidencia observada el 2026-08-20

- Los tokens primarios Poppy, Crimson, Cobalt, Ink y Paper coinciden entre
  `colors_and_type.css` y `src/app/globals.css`.
- `src/app/layout.tsx` carga Geist y Geist Mono.
- El validador automatizado comprueba esa paridad y que las guías canónicas no
  vuelvan a recomendar el lenguaje visual retirado.
- La carpeta contenía 180 archivos; 48 grupos de contenido idéntico agrupaban
  98 archivos. Esta cifra es una fotografía de la revisión, no una invariante.

## Clasificación del contenido

- `design_handoff_iroko/`, `_ds_manifest.json`, `_ds_bundle.js` y el PDF son
  exportaciones o referencias generadas. Se conservan, pero no se editan para
  definir el sistema.
- `brand/` es exploración histórica.
- `preview/colors-iron.html`, `preview/colors-gold-indigo.html` y
  `preview/colors-bones.html` muestran la paleta retirada; consulte
  [preview/README.md](preview/README.md).
- Los alias CSS con nombres antiguos se mantienen sólo por compatibilidad. Su
  valor apunta a los tokens actuales y no constituye una paleta alternativa.

## Brechas conocidas

- La inspección visual integral del PDF está **[NO VERIFICADO]** en esta
  revisión; sólo se verificaron su presencia, metadatos y tipografías embebidas.
- No existe certificación visual reciente de cada pantalla de los UI kits contra
  cada ruta de producción.
- La automatización de CI existe en el worktree, pero no es obligatoria hasta
  que se integre y se configure como check requerido.

## Regla de mantenimiento

Todo cambio visual material debe actualizar la especificación y el runtime en
el mismo PR, ejecutar `pnpm design-system:check`, adjuntar evidencia visual
cuando corresponda y actualizar este archivo si cambia una brecha o autoridad.
