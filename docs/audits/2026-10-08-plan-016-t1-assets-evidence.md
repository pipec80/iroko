# Plan 016 T1 — alternativas de assets

Fecha:2026-10-08. Candidato `03ef8730560c638328c7bad12e58d50376493080`.

37 alternativas aplicadas; hashes contrastados. SVG/JSON/XML parse completos, PNG/ICO/WOFF2 cabeceras; grep consumidores. No ejecucion de assets ni inspeccion visual. Fuentes propias layout localFont y metadata, login/signup logo-google; assets sin consumidor directo se mantienen como public distribuidos. Generacion/runtime/PWA [NO VERIFICADO].

| Archivo                               | Evidencia                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `public/apple-touch-icon.png`         | Firma PNG; dimensiones (180, 180); visual no verificado.                                                                       |
| `public/apple-touch-icon.svg`         | XML completo parseado; viewBox 0 0 180 180; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.   |
| `public/favicon-16.png`               | Firma PNG; dimensiones (16, 16); visual no verificado.                                                                         |
| `public/favicon-16.svg`               | XML completo parseado; viewBox 0 0 16 16; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/favicon-32.png`               | Firma PNG; dimensiones (32, 32); visual no verificado.                                                                         |
| `public/favicon-32.svg`               | XML completo parseado; viewBox 0 0 32 32; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/favicon-48.png`               | Firma PNG; dimensiones (48, 48); visual no verificado.                                                                         |
| `public/favicon-64.png`               | Firma PNG; dimensiones (64, 64); visual no verificado.                                                                         |
| `public/favicon-light.svg`            | XML completo parseado; viewBox 0 0 64 64; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/favicon.svg`                  | XML completo parseado; viewBox 0 0 64 64; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/file.svg`                     | XML completo parseado; viewBox 0 0 16 16; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/globe.svg`                    | XML completo parseado; viewBox 0 0 16 16; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/icon-192.png`                 | Firma PNG; dimensiones (192, 192); visual no verificado.                                                                       |
| `public/icon-192.svg`                 | XML completo parseado; viewBox 0 0 192 192; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.   |
| `public/icon-512.png`                 | Firma PNG; dimensiones (512, 512); visual no verificado.                                                                       |
| `public/icon-512.svg`                 | XML completo parseado; viewBox 0 0 512 512; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.   |
| `public/icon-maskable-512.png`        | Firma PNG; dimensiones (512, 512); visual no verificado.                                                                       |
| `public/icon-maskable-512.svg`        | XML completo parseado; viewBox 0 0 512 512; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.   |
| `public/lockup-iroko.svg`             | XML completo parseado; viewBox 0 0 560 96; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.    |
| `public/logo-google.svg`              | XML completo parseado; viewBox 0 0 48 48; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/logo-microsoft.svg`           | XML completo parseado; viewBox 0 0 23 23; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/mark-iroko-light.svg`         | XML completo parseado; viewBox 0 0 64 64; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/mark-iroko.svg`               | XML completo parseado; viewBox 0 0 64 64; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/next.svg`                     | XML completo parseado; viewBox 0 0 394 80; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.    |
| `public/og-image-mark.png`            | Firma PNG; dimensiones (1024, 1024); visual no verificado.                                                                     |
| `public/ornament-iroko.svg`           | XML completo parseado; viewBox 0 0 120 24; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.    |
| `public/robots.txt`                   | robots lectura completa1-15; localhost/disallow sinlocale; crawler no autorizacion.                                            |
| `public/site.webmanifest`             | JSON completo; seis icons existentes; layout.tsx54; no aceptacion PWA.                                                         |
| `public/sitemap-0.xml`                | XML completo 76 locs; localhost/junio; indice vacio y rutas auth/dashboard localizadas presentes; contrastado next-sitemap.    |
| `public/sitemap.xml`                  | XML completo 0 locs; localhost/junio; indice vacio y rutas auth/dashboard localizadas presentes; contrastado next-sitemap.     |
| `public/vercel.svg`                   | XML completo parseado; viewBox 0 0 1155 1000; sin script/foreignObject/handlers/referencias externas; clipurl local permitido. |
| `public/window.svg`                   | XML completo parseado; viewBox 0 0 16 16; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.     |
| `public/wordmark-iroko-dark.svg`      | XML completo parseado; viewBox 0 0 320 80; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.    |
| `public/wordmark-iroko.svg`           | XML completo parseado; viewBox 0 0 320 80; sin script/foreignObject/handlers/referencias externas; clipurl local permitido.    |
| `src/app/favicon.ico`                 | Cabecera ICO (0, 1, 4); convencion metadata Next; visual no verificado.                                                        |
| `src/app/fonts/Geist-latin.woff2`     | WOFF2 firma/longitud; localFont layout.tsx14/21; render no verificado.                                                         |
| `src/app/fonts/GeistMono-latin.woff2` | WOFF2 firma/longitud; localFont layout.tsx14/21; render no verificado.                                                         |

Los tres generados de diseno se reclasifican explicitamente como generated-design-reference y excluded-with-alternative:70 alternativas originales pasan a73, sin sumar lectura humana. Metodo y limites en [evidencia de diseno](2026-10-07-plan-016-t1-design-evidence.md). No se excluye por tamano; fuentesEOF y estructura parseada segun limites016/ADR0002.
