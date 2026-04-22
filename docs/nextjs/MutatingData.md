# Mutación de Datos y Server Actions (Next.js 16)

Este documento detalla cómo realizar cambios en la base de datos utilizando Server Functions.

## ¿Qué son las Server Functions?

Son funciones asíncronas marcadas con la directiva `"use server"`. Se ejecutan exclusivamente en el servidor y pueden ser llamadas desde Client Components.

## 1. Implementación de Server Actions

- **Ubicación**: Recomendamos colocarlas en archivos separados (ej: `src/app/actions.ts` o dentro de la carpeta de la funcionalidad) para que sean reutilizables.
- **Seguridad**: **Siempre** verifica la autenticación y autorización dentro de la acción. Las Server Actions son endpoints POST públicos.

## 2. Uso con Formularios

React extiende el elemento `<form>` para aceptar una acción directamente.

- **Progresive Enhancement**: El formulario funcionará incluso antes de que el JavaScript se haya cargado en el navegador.

```tsx
<form action={createPost}>
  <input name="title" />
  <button type="submit">Crear</button>
</form>
```

## 3. Estados de Carga y Errores

Usa el hook `useActionState` (disponible en React 19 / Next.js 16) para manejar el estado pendiente y los resultados de la acción.

```tsx
const [state, action, isPending] = useActionState(myAction, initialState);
```

## 4. Revalidación y Redirección

Después de una mutación exitosa:

- **`revalidatePath('/')`**: Purga la caché de una ruta específica para mostrar datos frescos.
- **`revalidateTag('tag')`**: Purga la caché basada en etiquetas (más granular).
- **`redirect('/exito')`**: Redirige al usuario. **Importante**: Llama a `revalidate` antes de `redirect`.

## 5. Manejo de Cookies

Puedes leer, crear y eliminar cookies dentro de una acción usando `cookies()`. Next.js re-renderizará la página si cambias una cookie para reflejar el nuevo estado en la UI.

---

_Última actualización: 2026-04-22_
