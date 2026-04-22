# Manejo de Errores (Next.js 16)

El manejo de errores en Next.js 16 se divide en dos categorías: errores esperados y excepciones no capturadas.

## 1. Errores Esperados (Validaciones, Fallos de Red)

- **Server Actions**: No uses `try/catch` para errores que el usuario puede corregir (ej. login fallido). **Retorna un objeto con el mensaje de error**.
- **Hook `useActionState`**: Captura ese retorno en el cliente para mostrar el mensaje sin recargar la página.

```tsx
// action.ts
if (!res.ok) return { error: "Credenciales inválidas" };

// component.tsx
const [state, action] = useActionState(login, initialState);
{
  state.error && <p>{state.error}</p>;
}
```

## 2. Excepciones No Capturadas (Bugs)

- **`error.tsx`**: Es un Client Component que actúa como un Error Boundary para un segmento de ruta.
- **`unstable_retry`**: Función recibida como prop para intentar renderizar el segmento nuevamente.
- **`global-error.tsx`**: Ubicado en la raíz de `app/`. Maneja errores en el Root Layout. **Debe incluir sus propias etiquetas `<html>` y `<body>`**.

## 3. Not Found (404)

- **`notFound()`**: Función que dispara el archivo `not-found.tsx` más cercano.
- Úsalo cuando un recurso (ej. un post por ID) no existe en la base de datos.

## 4. `unstable_catchError`

Nueva API para crear Error Boundaries personalizados a nivel de componente, permitiendo envolver cualquier parte del árbol sin necesidad de un archivo `error.tsx` separado.

---

_Última actualización: 2026-04-22_
