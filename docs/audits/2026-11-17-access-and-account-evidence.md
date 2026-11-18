# Evidencia reproducible: acceso y cuenta, 17Nov2026

Candidato `91840bad4931a60a06d346c811671b8af89473a7`; producto sin cambios
por esta auditoría. [Informe y disposición](2026-11-17-access-and-account-audit.md).
Los siguientes son resultados locales del runner instalado, no GoTrue vivo,
SQL, navegador ni proveedor. Ningún valor de credencial se leyó o se necesita.
El publishable key del fixture es una cadena sintética sin autorización real.

## Contratos existentes

Comando ejecutado desde raíz, salida exit0:

```powershell
node --max-old-space-size=768 node_modules/vitest/vitest.mjs run src/lib/supabase/middleware.test.ts src/proxy.test.ts "(auth)/__tests__/actions.test.ts" src/lib/auth/safe-redirect.test.ts src/lib/validation/auth.test.ts src/lib/validation/profile.test.ts src/lib/email/__tests__/send-email.test.ts src/lib/email/__tests__/templates.test.tsx --maxWorkers=1 --no-file-parallelism
```

```text
Test Files  8 passed (8)
Tests       199 passed (199)
Start at    17:15:10
Duration    34.10s
```

## Sondeo discriminante

Se guardaron los dos bloques siguientes como archivos locales ignorados
`.superpowers/sdd/access-account-audit/vitest.audit.config.ts` y
`.superpowers/sdd/access-account-audit/access-contract.probe.test.ts`.
El contenido se preserva aquí para poder recrearlos en otra copia del repositorio;
no se incorporó un nuevo test al conjunto estable ni se cambió configuración.

Comandos ejecutados, primero selección y luego prueba:

```powershell
node --max-old-space-size=768 node_modules/vitest/vitest.mjs list --config .superpowers/sdd/access-account-audit/vitest.audit.config.ts --maxWorkers=1 --no-file-parallelism
node --max-old-space-size=768 node_modules/vitest/vitest.mjs run --config .superpowers/sdd/access-account-audit/vitest.audit.config.ts --maxWorkers=1 --no-file-parallelism
```

La selección devolvió exactamente los cinco casos de este archivo. El run válido
empezó a17:14:36, duró5.49s y retornó exit1. Se conserva RED: no hay reparación
ni red-green. Los199 PASS de arriba pertenecen a otros contratos.

| Caso                                                      | Esperado                              | Observado                                              |
| --------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| Control positivo, pass-through con refresh                | Cookie presente y cache-control       | PASS: `audit-session=refreshed`, `private, no-store`   |
| Redirect a onboarding después de refresh                  | Ubicación correcta y cookie presente  | FAIL: ubicación correcta, cookie `undefined`           |
| Redirect desde login autenticado después de refresh       | Ubicación dashboard y cookie presente | FAIL: ubicación correcta, cookie `undefined`           |
| Control de seguridad, factor enrolado con AAL1            | Desafío MFA, sin acceso dashboard     | PASS: `/es/login?mfa=required`                         |
| Recovery aceptado por RPC simulado, acción y guard reales | Destino de recuperación alcanzable    | FAIL: `/es/login?tab=security&reenroll=1&mfa=required` |

```text
Test Files  1 failed (1)
Tests       3 failed | 2 passed (5)
Expected cookie: "refreshed"; received: undefined (dos casos)
Expected location: null; received: "http://localhost:3000/es/login?tab=security&reenroll=1&mfa=required"
```

La RPC se simula aceptando el código, no se ejecuta. El SQL se leyó por separado:
consume marcando used_at, sin alterar AAL/factor. El control MFA confirma el
rechazo AAL1, no verifica un TOTP válido. El probe de cookies aísla el callback
SSR; no usa un servidor Auth ni mide impacto/frecuencia en browser.

Incidencia del harness: un intento anterior con mergeConfig concatenó include
del config raíz y alcanzó un test ajeno (`sentry-build-env`) antes de Ctrl-C,
exit1. Se descartó como evidencia de este sondeo y no se afirma suite global.
El config independiente de abajo evitó esa selección ampliada.

### Config aislado

```typescript
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
      'server-only': path.resolve(process.cwd(), 'src/test/server-only-shim.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['.superpowers/sdd/access-account-audit/*.probe.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: { enabled: false },
  },
});
```

### Fixture y assertions

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type CookieAdapter = {
  setAll: (
    cookies: { name: string; value: string; options: { path: string; httpOnly: boolean } }[],
    headers?: Record<string, string>,
  ) => void;
};

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  redirect: vi.fn(),
  refresh: false,
  claims: {
    sub: 'audit-user',
    aal: 'aal2',
    app_metadata: { mfa_enrolled: false, onboarding_completed: true },
  },
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
    auth: {
      getClaims: async () => {
        if (mocks.refresh) {
          options.cookies.setAll(
            [{ name: 'audit-session', value: 'refreshed', options: { path: '/', httpOnly: true } }],
            { 'Cache-Control': 'private, no-store' },
          );
        }
        return { data: { claims: mocks.claims } };
      },
    },
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'es') }));
vi.mock('@/i18n/routing', () => ({
  redirect: mocks.redirect,
  routing: { locales: ['es', 'en', 'pt', 'fr'], defaultLocale: 'es' },
}));
vi.mock('@/config/app.config', () => ({ appConfig: { features: { onboarding: true } } }));
vi.mock('@/env', () => ({
  env: {
    SITE_URL: 'http://localhost:3000',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_audit_fixture',
  },
}));
vi.mock('@/lib/analytics/server', () => ({ captureServer: vi.fn() }));

import { updateSession } from '@/lib/supabase/middleware';
import { verifyRecoveryAction } from '@/app/[locale]/(auth)/actions';

describe('access audit discriminating contracts — unchanged application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refresh = false;
    mocks.claims.aal = 'aal2';
    mocks.claims.app_metadata.mfa_enrolled = false;
    mocks.claims.app_metadata.onboarding_completed = true;
    mocks.redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('positive control: pass-through retains refreshed cookie and cache header', async () => {
    mocks.refresh = true;
    const response = await updateSession(new NextRequest('http://localhost:3000/es/dashboard'));
    expect(response.status).toBe(200);
    expect(response.cookies.get('audit-session')?.value).toBe('refreshed');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('refreshed cookies must survive onboarding redirect', async () => {
    mocks.refresh = true;
    mocks.claims.app_metadata.onboarding_completed = false;
    const response = await updateSession(new NextRequest('http://localhost:3000/es/dashboard'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe(
      '/es/dashboard/onboarding',
    );
    expect(response.cookies.get('audit-session')?.value).toBe('refreshed');
  });

  it('refreshed cookies must survive authenticated login-page redirect', async () => {
    mocks.refresh = true;
    const response = await updateSession(new NextRequest('http://localhost:3000/es/login'));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/dashboard');
    expect(response.cookies.get('audit-session')?.value).toBe('refreshed');
  });

  it('positive control: ordinary AAL1 with enrolled MFA is denied dashboard', async () => {
    mocks.claims.aal = 'aal1';
    mocks.claims.app_metadata.mfa_enrolled = true;
    const response = await updateSession(
      new NextRequest('http://localhost:3000/es/dashboard/account'),
    );
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe('/es/login');
    expect(new URL(response.headers.get('location') ?? '').searchParams.get('mfa')).toBe(
      'required',
    );
  });

  it('successful offered recovery must lead to a reachable re-enrollment route', async () => {
    mocks.claims.aal = 'aal1';
    mocks.claims.app_metadata.mfa_enrolled = true;
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    const form = new FormData();
    form.set('code', 'AB12-CD34');
    await expect(verifyRecoveryAction({}, form)).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.rpc).toHaveBeenCalledWith('consume_recovery_code', { p_code: 'AB12-CD34' });
    const target = mocks.redirect.mock.calls[0]?.[0] as { href: string; locale: string };
    expect(target.href).toBe('/dashboard/account?tab=security&reenroll=1');
    const response = await updateSession(
      new NextRequest(`http://localhost:3000/${target.locale}${target.href}`),
    );
    expect(response.headers.get('location')).toBeNull();
  });
});
```

## Huellas de entradas del sondeo

SHA256 del checkout auditado; no son comparación exhaustiva con candidatos históricos.

| Archivo                                          | SHA256                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `src/lib/supabase/middleware.ts`                 | `b0795ba33e751adb283355ae21f17f4b741982c1e3febc719d07644c0447db37` |
| `src/proxy.ts`                                   | `c24ae54015e4ff4f1b9d0907ade5ac68e61b2d085f32d2424884435e3082bb09` |
| `src/app/[locale]/(auth)/actions.ts`             | `7d3651b14df60bca61978a56d5a3605f38b0f1e1643418ed610e0c2e96998b60` |
| `supabase/schemas/public.sql`                    | `e910d951c30d28192acd876f4072be1e7574a28ba64315e9e4085475d256f2c7` |
| `src/components/dashboard/account/mfa-setup.tsx` | `c9bb5808320aa721517a1b0e159ff1a225b79647d31131590471995c9d1ec079` |
