# Plan 016 T1 — evidencia estática de design-system

Fecha: 2026-10-07. Candidato: `03ef8730560c638328c7bad12e58d50376493080`.
Alcance de este registro: último lote de 29 archivos con lectura humana completa
y tres artefactos generados inspeccionados mediante alternativa explícita. Los
150 archivos de los cinco lotes anteriores se acreditan en los registros del
revisor raíz; este archivo no vuelve a acreditar esas lecturas.

Se usó `git show <candidato>:<ruta>`. Los conteos físicos incluyen líneas vacías:
`@(git show ...).Count`, no `Measure-Object -Line`. Las salidas truncadas se
releyeron en segmentos antes de declarar EOF. No se modificó el manifiesto ni
las matrices. El revisor raíz decide la acreditación de los métodos alternativos;
no equivalen a lectura humana EOF ni crean nuevas exclusiones. Se preservaron
los cambios de otros agentes. La única escritura autorizada fue este registro.

## Ledger de 29 lecturas completas

Aliases de rutas exactos:

- `D/` = `docs/design-system/Axiom Ledger Design System/`
- `H/` = `docs/design-system/Axiom Ledger Design System/design_handoff_iroko/iroko/`
- `S/` = `docs/design-system/`

| #   | Ruta                                              | Rango físico leído | Evidencia                              |
| --- | ------------------------------------------------- | ------------------ | -------------------------------------- |
| 1   | H/ui_kits/iroko-dashboard/Sidebar.jsx             | 1-175              | EOF                                    |
| 2   | H/ui_kits/iroko-dashboard/Topbar.jsx              | 1-157              | EOF                                    |
| 3   | H/ui_kits/iroko-dashboard/OverviewScreen.jsx      | 1-258              | EOF                                    |
| 4   | H/README.md                                       | 1-252              | EOF                                    |
| 5   | D/design_handoff_iroko/prompts-pt2.md             | 1-128              | EOF                                    |
| 6   | D/design_handoff_iroko/README.md                  | 1-679              | EOF; segmentos 1-240, 241-480, 481-679 |
| 7   | D/brand/explore-names.html                        | 1-219              | EOF                                    |
| 8   | D/brand/explore-afrofuturism.html                 | 1-331              | EOF                                    |
| 9   | D/brand/iroko-palettes.html                       | 1-278              | EOF                                    |
| 10  | D/brand/optimus-palettes.html                     | 1-296              | EOF                                    |
| 11  | D/ui_kits/iroko-dashboard/index-print.html        | 1-143              | EOF; releído separado                  |
| 12  | D/ui_kits/iroko-dashboard/doc-page.js             | 1-779              | EOF; segmentos 1-260, 261-520, 521-779 |
| 13  | S/dashboard/axiom_ledger/DESIGN.md                | 1-107              | EOF                                    |
| 14  | S/public/axiom_ledger/DESIGN.md                   | 1-107              | EOF                                    |
| 15  | S/dashboard/security_mfa_setup/code.html          | 1-158              | EOF                                    |
| 16  | S/dashboard/corporate_login_portal/code.html      | 1-236              | EOF                                    |
| 17  | S/dashboard/create_account_confirmation/code.html | 1-222              | EOF                                    |
| 18  | S/dashboard/billing_subscription/code.html        | 1-379              | EOF                                    |
| 19  | S/dashboard/identity_session_manager/code.html    | 1-327              | EOF                                    |
| 20  | S/dashboard/inventory_control_dashboard/code.html | 1-349              | EOF; 281-349 releído tras truncación   |
| 21  | S/dashboard/inventory_management/code.html        | 1-332              | EOF                                    |
| 22  | S/dashboard/operations_dashboard/code.html        | 1-425              | EOF                                    |
| 23  | S/dashboard/profile_settings_manager/code.html    | 1-336              | EOF                                    |
| 24  | S/dashboard/ui_pattern_lab/code.html              | 1-271              | EOF                                    |
| 25  | S/public/home_axiom_ledger_landing_page/code.html | 1-194              | EOF                                    |
| 26  | S/public/planes_y_precios_axiom_ledger/code.html  | 1-204              | EOF                                    |
| 27  | S/public/contacto_axiom_ledger/code.html          | 1-254              | EOF                                    |
| 28  | S/public/producto_axiom_ledger/code.html          | 1-274              | EOF                                    |
| 29  | S/public/soluciones_axiom_ledger/code.html        | 1-333              | EOF                                    |

## Autoridad y clasificación

El ADR 0002 leído comprende 70 líneas físicas. README/STATUS/SKILL canónicos y
`colors_and_type.css` establecen Poppy/Cobalt/Geist/Geist Mono. STATUS línea 43 y
SKILL línea 64 clasifican handoff y `_ds_*` como generados sin autoridad; brand
explorations y Axiom son referencias históricas. El encabezado del README del
handoff también avisa su condición de exportación. Las instrucciones de esos
exports (migración, instalación, commits o preguntas) son contenido auditado,
no autorización para ejecutarlas. El manifiesto de auditoría conserva
`current-doc` para estos artefactos: aquí se documenta la diferencia sin alterar
su clasificación ni excluirlos silenciosamente.

## Identidad de los tres artefactos alternativos

Para cada archivo se comprobó igualdad entre `git rev-parse candidato:ruta` y
`git hash-object -- ruta`. Por ello `Get-FileHash -Algorithm SHA256` y el tamaño
del archivo local corresponden a los mismos bytes del candidato. Ninguno se
ejecutó.

| Ruta                                | Líneas físicas |   Bytes | SHA256                                                           | Git blob                                 |
| ----------------------------------- | -------------: | ------: | ---------------------------------------------------------------- | ---------------------------------------- |
| D/_ds_bundle.js                     |           8688 |  260883 | EF5DEC57975094861E763414D3D22E94CD7666C7EE740214A034615769FDA3CC | 5eab5ab9343ead2b225f8c260ca03139d1c62ddf |
| D/_ds_manifest.json                 |              1 |   24590 | 762500034316B4C79E2B374D6ACC723F7EA4206362C846347DA4DA43E10D0755 | 5653def66cdc2a12aad99d4a978fc2560f8903d7 |
| D/Iroko Dashboard (standalone).html |            182 | 1689308 | 4D3D0307C5600204509C1692586F4303CC55E494394273F902F81B1C01E1A742 | 39b4793d647e3ab240c9d71408cc34c903690ab6 |

### `_ds_bundle.js`

Lectura humana de 1-51 y 8621-8688, más encabezado 1-11, terminaciones
3969-3981, 7732-7744 y 8679-8688. Barrido estructural sobre todas las líneas
1-8688 de comentarios de módulos, wrappers, exports, URLs y literales
`fetch(`, `eval(`, `import(`, `require(`. No aparecieron esos literales de URL o
ejecución dinámica en el barrido. Esto no es prueba de ausencia semántica de
cualquier comportamiento dinámico.

Productores identificados: 31 fuentes del encabezado `@ds-bundle`, formato 4,
todas leídas EOF en estos lotes o los anteriores. Se comprobó para las 31
igualdad candidato/local y concordancia de su SHA256 con el prefijo de 12
caracteres de `sourceHashes`. Consumidores identificados en el artefacto:
namespace `window.AxiomLedgerDesignSystem_11955d`, 31 IIFE con `try/catch` que
registran errores en `__errors`, y 30 asignaciones `window.Component`.
`doc-page.js` registra el custom element. `__ds_scope` queda declarado vacío.
El generador local no se identificó. `git grep` fuera de los dos `_ds_*`
solo encontró menciones en STATUS/SKILL; no encontró consumidor tracked del
producto. El consumidor SPA externo se infiere del campo `source: spa`, no
se verificó operativamente.

Comparación exacta, sensible a mayúsculas, de cuerpos transpiled emparejados:
`-ceq` tras unir sus líneas con LF. Se excluyeron el comentario de ruta y el
catch, cuya ruta necesariamente difiere. Los 15 pares siguientes dieron true;
no se afirma identidad de los archivos completos ni equivalencia semántica con
JSX fuente.

| Componente     | Cuerpo handoff | Cuerpo ui_kits | Exacto |
| -------------- | -------------- | -------------- | ------ |
| BillingScreen  | 12-399         | 3979-4366      | Sí     |
| Login          | 403-886        | 4370-4853      | Sí     |
| MembersScreen  | 890-1199       | 4857-5166      | Sí     |
| OverviewScreen | 1203-1735      | 5170-5702      | Sí     |
| ProjectsScreen | 1739-1939      | 5706-5906      | Sí     |
| SettingsScreen | 1943-2339      | 5910-6306      | Sí     |
| Sidebar        | 2343-2719      | 6310-6686      | Sí     |
| Topbar         | 2723-3028      | 6690-6995      | Sí     |
| CtaBlock       | 3032-3128      | 7742-7838      | Sí     |
| FeatureGrid    | 3132-3247      | 7842-7957      | Sí     |
| Footer         | 3251-3393      | 7961-8103      | Sí     |
| Hero           | 3397-3556      | 8107-8266      | Sí     |
| Navbar         | 3560-3732      | 8270-8442      | Sí     |
| PricingTiers   | 3736-3927      | 8446-8637      | Sí     |
| Quote          | 3931-3975      | 8641-8685      | Sí     |

El módulo único doc-page ocupa 6999-7738; catch en 7739 y cierre exterior en 8688. Su fuente 1-779 se leyó completa. No se ejecutó ni verificó el
transpilador. No hubo lectura humana EOF de las 8688 líneas.

### `_ds_manifest.json`

Su única línea se parseó completa con `ConvertFrom-Json`; se inspeccionó por
proyecciones estructuradas sin ejecutar contenido. Se enumeraron todos sus
campos: namespace, components, startingPoints, cards, templates,
hasThumbnailHtml, globalCssPaths, tokens, themes, fonts, brandFonts y source.
Se inspeccionaron los 34 registros cards completos, los 149 tokens con
name/value/kind/scope, ocho globalCssPaths, un tema dark y dos brandFonts
Geist/Geist Mono. components/startingPoints/templates/fonts están vacíos;
hasThumbnailHtml es false y source es spa.

Productor: metadatos de las previews y tokens de las fuentes handoff ya leídas;
consumidor declarado: namespace SPA. No se halló generador ni consumidor de
producción tracked. Tokens definedIn remite a
`design_handoff_iroko/iroko/colors_and_type.css`; sus valores se contrastaron con
la fuente de 310 líneas ya leída. Los text-colors tienen kind `font`, deuda del
export similar a `_adherence`. La extracción no acredita ejecución del
consumidor ni lectura lineal humana de la línea JSON original.

### `Iroko Dashboard (standalone).html`

Lectura humana íntegra del shell 1-170, 172-178 y 180-182. Línea 171 contiene
manifest JSON de 1621946 caracteres; línea 179 contiene template JSON de
58849 caracteres (1506 líneas decodificadas). Ambos se parsearon en memoria.
Los 27 assets se decodificaron Base64 y, cuando corresponde, GZip con APIs
.NET, sin escribirlos ni ejecutar JS. Se calculó SHA256 de cada payload.
Composición: ocho scripts propios, cuatro bibliotecas JS, once WOFF2, tres PNG
y un SVG. Los ocho scripts propios dieron igualdad SHA256 exacta con los
bytes de fuentes ya leídas EOF y con identidad Git candidato/local comprobada.

| UUID                                 | Fuente exacta en D/ui_kits/iroko-dashboard | SHA256                                                           |
| ------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| 8a137083-b693-4527-943d-a0df01d1a5ec | Sidebar.jsx                                | 4CE00CE989C6D39290A840A8C9BA2C89277CC8A10DDA949D8D3ACA2FD081AD92 |
| d8e20074-b2e5-4da6-bc93-05431f1b4613 | Login.jsx                                  | 44252DA2C625207ABA750EAC222B86FBC1C3F35F5CD277E7C3BD79C3A4C708EB |
| feced557-3102-442e-b8e8-aeabaed3e681 | OverviewScreen.jsx                         | 5366408F886DF274D9609D987649E2D9D0F255E5C5A90FC916AC1201E6E6E9A8 |
| 402730c8-5de3-4d1f-9c19-ceb604f10a57 | MembersScreen.jsx                          | E3D3E56047F91D0275B1CDEE7C10AD9FF591C42CEAE1D62CD3801769715C43A9 |
| db569e20-7c42-4c42-9351-ae4341156682 | ProjectsScreen.jsx                         | 83E246B7EC7EC4013CF090AEE3C937EC509DE2C85ABDAF87581B288123156C71 |
| 381703dc-5772-4c65-8a10-1fd6a52db7b0 | SettingsScreen.jsx                         | 6971F0EC2626B2EDFA530289B8C1D3B9786BC6FB2FA56E952247A6B9A7F4A48A |
| 9a4caf1a-4175-4ba8-901b-6b877d1a313c | BillingScreen.jsx                          | 419D3035E29F8624E0F5B7485B8112097D3261AF7ABF6366F7C14DA1453ED49F |
| 9bfa07b7-d8a2-4c03-93f6-a656cf0a89c1 | Topbar.jsx                                 | C04F226326F63E15039482917ED0B275E3AC3EC92528A923C1E409957F615F2C |

Bibliotecas identificadas por posición script en el template, no por validación
independiente de proveedor/versiones:

| Biblioteca | UUID                                 | Bytes decodificados | SHA256                                                           |
| ---------- | ------------------------------------ | ------------------: | ---------------------------------------------------------------- |
| React      | f4f32466-4631-4afd-abc0-17ca8016cf77 |              109931 | 28348FEF6CB0ED8B2CEEB22DEAF824428FD13875D84C73D38F77DD216FC24E7F |
| ReactDOM   | 8df0883d-0ec2-4521-8140-38249323db45 |             1080227 | F9044A5E9C39DB8BB1A204DFF924E526EC0A621E695BB69DE1035811BE8709E4 |
| Babel      | f7c1ba57-8edd-4693-90ea-572c80a815c6 |             3137752 | 2623A9E22809915CE789B4461154E277DDCE520D5A4320C14D44332A5D0DCEA0 |
| Lucide     | bb4bc7a7-d5b1-48f2-bc8b-1f5c65c2b762 |              601680 | FDE878A4F7AEBE548B071EAAF343D898F66D275E93970ABE95D8CA5FDA290B51 |

Se enumeraron todos los src/href/script del template, el App final se leyó
completo y se inspeccionaron referencias de fuentes UUID. Los ocho scripts
propios no contienen URLs HTTP literales; las bibliotecas contienen enlaces de
documentación/namespaces. El barrido de URLs no sustituye análisis semántico.
`ext_resources` es `[]` en línea 175. No se leyó íntegramente de manera humana
el CSS de fuentes del template ni las bibliotecas embebidas ni binarios.

Productor no verificado: exportación empaquetada del índice dashboard y sus
assets. Consumidor: navegador del prototipo. Ruta de ejecución inspeccionada:
DOMContentLoaded 35; parseJSON 59-60; Base64/GZip 69-95; Blob URLs 97;
reemplazo de UUID 112; eliminación de integrity/crossorigin 117; DOMParser
137 y reemplazo raíz 138; recreación de scripts 140-156, fetch de Babel src
149; transformación Babel 159-160. El error sink usa textContent 45-47 y catch
162-164. La eliminación de SRI corresponde al loader local del export, no se
extrapola al runtime de producción. El template conserva
`../../assets/site.webmanifest`, dependiente de ruta relativa externa: mover el
standalone rompe esa referencia y no se acredita autonomía completa.

## Hallazgos y contexto de referencia

No se identificó nuevo P0/P1 de producción en este bloque. Los siguientes P2
son deuda de documentación o prototipos; no acreditan una vulnerabilidad del
producto ni exigen ejecutar exports históricos:

- STATUS 16 y SKILL 37/55-56 canónicos describen es/en frente a los cuatro
  locales del contrato actual. Ajustar esas descripciones al inventario vigente.
- STATUS 26 enlaza `../../../src`, que resuelve bajo docs/src; corregir a
  `../../../../src` desde su ubicación.
- Las previews brand-favicons 27/32/37/42/47/52/60 referencian PNG inexistentes
  en el árbol canónico de assets (17 SVG/webmanifest). Corregir enlaces o
  documentar la ausencia; el README generado también anuncia PNG ausentes.
- En kits marketing, tarjetas y handoff aparecen instalación inmediata, Stripe,
  trials/upgrades, recovery codes, SAML, SLA y precios/cuotas fixture. Mantener
  claramente su condición de referencia; no trasladar esas promesas a aceptación
  comercial. Axiom histórico añade retail, SLA99.99 y testimonios fixture.
- Login.jsx 120 declara `Field` global, SettingsScreen.jsx 139 declara otro
  `Field` incompatible. El índice clásico carga Settings antes de Login; al
  reemplazar el helper, las entradas de Settings pasan defaultValue sin onChange,
  mientras el helper de Login invoca onChange en 130. Inferencia estática para
  el prototipo clásico: renombrar helpers o aislar módulos. **No aplica a
  `_ds_bundle.js`: sus IIFE encapsulan los helpers**. El standalone conserva
  los ocho scripts originales y su orden, sin validación de ejecución.
- Lucide `@latest` en índices de referencia reduce reproducibilidad; fijar versión
  si se mantiene el demo. Labels/foco/ARIA y motion de algunos controles son deuda
  de prototipo. SVG wordmark/lockup con clases sin font-family pueden usar fallback
  al cargarse como img; apariencia exacta no verificada.

`doc-page.js` es scaffold de impresión: regex para longitudes CSS, observers,
RAF/listeners y cleanup; consumidor identificado en index-print. Axiom HTML usa
configuración Tailwind CDN y contenido estático; login, MFA, sesiones, billing,
formularios y controles no prueban implementación backend ni aislamiento tenant.
La colisión Field se reporta separada del artefacto encapsulado.

## Límites de aceptación

Se realizaron lecturas Git, análisis de texto/JSON, hashes y descompresión en
memoria. No se ejecutaron prototipos, código generado, build, tests, navegador,
instalaciones ni operaciones Cloud. No se revisó apariencia renderizada,
interacción real, contraste medido, impresión ni compatibilidad de navegador.
Funcionamiento y aceptación visual: `[NO VERIFICADO]`. Los hashes prueban
identidad de bytes; no sustituyen validación del generador o de dependencias.
