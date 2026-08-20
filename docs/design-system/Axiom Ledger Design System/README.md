# Iroko Design System

> Sistema visual canónico del repositorio. Lea primero [STATUS.md](STATUS.md)
> para conocer la autoridad, la evidencia y las brechas vigentes.

Iroko es la identidad de esta base SaaS reutilizable. Este documento define su
lenguaje visual y editorial; la arquitectura, las capacidades implementadas y
la preparación comercial se documentan en los índices generales del proyecto.

## Contrato canónico

| Rol                | Token       | Valor                                      |
| ------------------ | ----------- | ------------------------------------------ |
| Acción primaria    | Poppy       | `#d92121`                                  |
| Estado presionado  | Crimson     | `#b11226`                                  |
| Acento secundario  | Cobalt      | `#0047ab`                                  |
| Acento claro       | Cobalt Soft | `#4682bf`                                  |
| Texto/fondo oscuro | Ink         | `#0e1117`                                  |
| Superficie base    | Paper       | `#ffffff`                                  |
| Interfaz y display | Geist       | `var(--font-sans)` / `var(--font-display)` |
| Numerales y código | Geist Mono  | `var(--font-mono)`                         |

El contrato completo de colores, semántica, espaciado, radios, sombras y tema
oscuro vive en [colors_and_type.css](colors_and_type.css). Los nombres antiguos
que aún aparecen como alias CSS existen sólo por compatibilidad; no autorizan
una paleta paralela.

## Contenido y voz

- Español primero; inglés como traducción o microcopy técnica cuando corresponda.
- Voz técnica, directa y cercana. Las metáforas del árbol pueden apoyar la
  identidad, pero no reemplazan información precisa.
- Sentence case en títulos y acciones; etiquetas técnicas cortas pueden usar
  mayúsculas y Geist Mono.
- Sin afirmaciones de producto, seguridad, disponibilidad o preparación
  comercial que no tengan evidencia en la documentación vigente.
- Sin emoji ni signos de exclamación decorativos.
- Numerales, identificadores, slugs y código usan Geist Mono.

## Fundamentos visuales

### Color

Poppy guía las acciones principales y el foco; Crimson cubre estados
presionados. Cobalt es un acento secundario, no un segundo CTA competidor. Ink y
Paper crean el contraste base. Los colores semánticos y variantes `wash` deben
salir de los tokens, nunca de hexadecimales inventados dentro de un componente.

### Tipografía

Geist cubre display, encabezados, cuerpo e interfaz. Geist Mono se reserva para
datos, código, numerales y etiquetas técnicas. La jerarquía proviene de tamaño,
peso, espacio y contraste, no de introducir otra familia tipográfica.

### Espacio, radios y elevación

Use la escala definida en `colors_and_type.css`. Prefiera jerarquía por
superficie y borde; reserve sombras para elementos realmente elevados. Los
componentes interactivos deben mantener estados visibles de hover, focus,
pressed, disabled y error, además de respetar reducción de movimiento.

### Iconografía

Lucide es el set de producción mediante `lucide-react`. Use un icono semántico
existente antes de crear SVG propio. No use emoji ni caracteres Unicode como
sustitutos de iconos de interfaz.

### Temas y accesibilidad

Los tokens semánticos deben funcionar en claro y oscuro. Todo cambio necesita
contraste legible, foco visible, navegación por teclado y nombres accesibles. El
color no puede ser el único canal para comunicar estado.

## Superficies y activos

```text
STATUS.md                estado, evidencia y brechas
README.md                intención visual y editorial
SKILL.md                 contrato operativo para agentes
colors_and_type.css      tokens canónicos
assets/                  marca y recursos SVG
preview/                 muestras vigentes e históricas clasificadas
ui_kits/
  iroko-marketing/       referencia para superficies públicas
  iroko-dashboard/       referencia para app autenticada y auth
brand/                   exploración histórica
design_handoff_iroko/    exportación generada, no canónica
```

Los HTML de `preview/` y `ui_kits/` son referencias visuales. No se copian
directamente a producción: se recrean respetando App Router, componentes
existentes, `next-intl`, accesibilidad y contratos de datos.

## Flujo para cambios de producción

1. Lea `STATUS.md`, este documento y `SKILL.md`.
2. Determine el componente/ruta real y reutilice sus primitivas y APIs.
3. Use tokens semánticos; no agregue colores o fuentes ad hoc.
4. Si cambia el contrato, actualice `colors_and_type.css` y
   `src/app/globals.css` juntos.
5. Compruebe `pnpm design-system:check` y las pruebas relevantes.
6. Para cambios perceptibles, capture evidencia visual fechada y actualice
   `STATUS.md` si cambia una brecha.

La relación formal entre especificación, runtime, handoff e historia está en
[ADR 0002](../../adr/0002-canonical-design-system-authority.md).
