# Revalidación de Caché (Next.js 16)

La revalidación es el proceso de actualizar los datos cacheados. Tenemos dos estrategias principales:

## 1. Revalidación Basada en Tiempo (`cacheLife`)

Se usa dentro de un scope de `"use cache"`.

```ts
"use cache";
cacheLife("hours"); // Perfil predefinido
```

### Perfiles Comunes:

- `seconds`: stale: 0, revalidate: 1s, expire: 60s.
- `minutes`: stale: 5m, revalidate: 1m, expire: 1h.
- `hours`: stale: 5m, revalidate: 1h, expire: 1d.
- `max`: revalidate: 30d, expire: indefinido.

## 2. Revalidación On-Demand

### `cacheTag`

Etiqueta datos para invalidarlos manualmente.

```ts
"use cache";
cacheTag("productos");
```

### `updateTag` (Recomendado para Server Actions)

Expira la caché **inmediatamente**. Es ideal para el patrón "read-your-own-writes" (el usuario ve su cambio al instante). Solo disponible en Server Actions.

### `revalidateTag`

Usa semántica **Stale-While-Revalidate**. Sirve contenido viejo mientras el nuevo se genera en segundo plano. Útil para blogs o catálogos donde un pequeño retraso es aceptable.

### `revalidatePath`

Invalida todos los datos de una ruta específica. Úsala solo si no conoces los tags asociados.

---

_Última actualización: 2026-04-22_
