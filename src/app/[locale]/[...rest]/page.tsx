import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

// Catch-all para rutas sin match dentro de un locale válido (ej.
// /es/dashboard/billing/admin). Sin esto, Next.js no encuentra ningún
// page.tsx para el path completo y cae directo al not-found.tsx raíz
// (fuera de [locale], con su propio <html lang="en">) en vez del
// not-found.tsx local (traducido, hereda el layout/tema real) —
// causaba un hydration mismatch de lang/tema al navegar del lado del
// cliente. Este catch-all sí matchea, entra al árbol de [locale], y
// notFound() dispara el boundary correcto.
export default async function CatchAllPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
