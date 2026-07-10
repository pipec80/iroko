# Política de Seguridad

## Reportar una vulnerabilidad

Este repositorio tiene habilitado el **reporte privado de vulnerabilidades** de GitHub.
No abras un issue público para reportar un problema de seguridad — en su lugar:

1. Ve a la pestaña [Security](https://github.com/pipec80/iroko/security) del repositorio.
2. Haz clic en **"Report a vulnerability"**.
3. Describe el problema con el mayor detalle posible (pasos para reproducir, impacto, versión/commit afectado).

El reporte queda visible solo para los mantenedores hasta que se resuelva.

## Alcance

Aplica a todo el código de este repositorio: aplicación Next.js, funciones RPC/SQL de
Supabase, políticas RLS, configuración de CI/CD (`.github/workflows/`) e infraestructura
como código.

Fuera de alcance: vulnerabilidades en dependencias de terceros sin un exploit demostrable
contra este proyecto (repórtalas directamente al mantenedor de esa dependencia; Dependabot
ya monitorea CVEs conocidos).

## Tiempos de respuesta

Proyecto mantenido por una sola persona — sin SLA formal. Se prioriza por severidad:

- **Crítica/Alta** (RCE, bypass de auth, exposición de datos entre tenants): respuesta en 48h.
- **Media/Baja**: respuesta en 7 días.

## Buenas prácticas ya implementadas

- RLS habilitado en todas las tablas de `public`.
- Secret scanning + push protection activos.
- Dependabot con actualizaciones de seguridad automáticas.
- CodeQL en cada push a `main`.
