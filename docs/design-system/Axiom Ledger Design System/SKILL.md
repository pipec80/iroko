---
name: iroko-design
description: Use the canonical Iroko Poppy, Cobalt, Geist, and Geist Mono design system when creating or reviewing production UI, prototypes, or visual assets in this repository.
user-invocable: true
---

# Iroko design — instrucciones para agentes

Antes de producir o modificar una interfaz, lea completos y en este orden:

1. `STATUS.md`
2. `README.md`
3. `colors_and_type.css`
4. el README del UI kit correspondiente
5. `AGENTS.md` en la raíz del repositorio

## Autoridad

- `README.md` define intención visual y de contenido.
- `colors_and_type.css` define el contrato de tokens.
- `ui_kits/` sirve como referencia de composición.
- `src/app/globals.css` y `src/app/layout.tsx` demuestran el runtime actual.
- `STATUS.md` registra paridad, evidencia y brechas.

Si estas fuentes divergen, no elija silenciosamente ni improvise otra variante.
Informe la brecha y, si la tarea autoriza cambios, alinee especificación y
runtime de forma explícita.

## Reglas canónicas

- Primario: Poppy `#d92121`; pressed: Crimson `#b11226`.
- Secundario: Cobalt `#0047ab`.
- Base: Ink `#0e1117` y Paper `#ffffff`.
- Tipografía: Geist para interfaz/display y Geist Mono para datos/código.
- No invente colores, fuentes, radios o sombras; use tokens existentes.
- Use `lucide-react` en producción.
- Use `cn()` de `@/lib/utils` para combinar clases.
- Mantenga español e inglés mediante `next-intl`; español es el default.
- Preserve App Router, contratos de componentes, accesibilidad y lógica de
  negocio existentes.
- No cree `middleware.ts`; el edge vive en `src/proxy.ts`.
- No afirme estados de producto o negocio sin evidencia versionada.

## Trabajo de producción

1. Identifique la ruta y el componente real antes de usar un mockup.
2. Reutilice primitivas en `src/components/ui/` y APIs existentes.
3. Mapee la intención del kit a tokens semánticos de `globals.css`.
4. Use componentes React para iconos; no CDN ni scripts inyectados.
5. Incluya estados interactivos, teclado, foco, contraste, responsive y
   reducción de movimiento.
6. Actualice mensajes `es` y `en` cuando cambie copy visible.
7. Ejecute `pnpm design-system:check` y las pruebas de la superficie.
8. Adjunte evidencia visual cuando el resultado sea perceptible.

## Prototipos y artefactos aislados

Los HTML de `ui_kits/` pueden orientar un prototipo autocontenido. Cargue
`colors_and_type.css`, use los assets existentes y mantenga la misma semántica.
Un prototipo no prueba que la ruta de producción esté implementada.

## Material generado o histórico

- `design_handoff_iroko/`, `_ds_manifest.json`, `_ds_bundle.js` y el PDF son
  referencias generadas; no los edite como fuente de autoridad.
- `brand/` y las muestras rotuladas como históricas en `preview/README.md` no
  deben inspirar trabajo nuevo.
- Los alias CSS heredados sólo garantizan compatibilidad transitoria.

## Cuando falta información

Pregunte por la superficie, el objetivo del usuario y el modo claro/oscuro sólo
si no pueden deducirse de la ruta o tarea. Si falta evidencia, marque
`[NO VERIFICADO]`; no complete el vacío desde memoria o desde una exportación
generada.
