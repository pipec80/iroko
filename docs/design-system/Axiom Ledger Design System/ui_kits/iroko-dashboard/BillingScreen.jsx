/* global React */
function BillingScreen() {
  React.useEffect(() => { window.lucide?.createIcons(); });

  const invoices = [
    { id: 'INV-2026-018', date: '01 may 2026', amount: '$49.00', status: 'paid'    },
    { id: 'INV-2026-017', date: '01 abr 2026', amount: '$49.00', status: 'paid'    },
    { id: 'INV-2026-016', date: '01 mar 2026', amount: '$49.00', status: 'paid'    },
    { id: 'INV-2026-015', date: '01 feb 2026', amount: '$49.00', status: 'paid'    },
    { id: 'INV-2026-014', date: '01 ene 2026', amount: '$49.00', status: 'paid'    },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <header>
        <span className="eyebrow-sm">Facturación</span>
        <h1 className="display-italic" style={{ margin: '6px 0 4px', fontSize: 44, lineHeight: 1, color: 'var(--text-primary)' }}>
          Plan y facturación
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)' }}>
          Tu plan actual, próximos cargos, y facturas descargables.
        </p>
      </header>

      {/* Current plan */}
      <div className="card" style={{ padding: 28, background: 'var(--color-night)', color: 'var(--color-bone)', border: '0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'flex-start' }}>
          <div>
            <span className="eyebrow-sm" style={{ color: 'var(--color-gold)' }}>Plan actual</span>
            <div className="display-italic" style={{ fontSize: 48, lineHeight: 1, marginTop: 4, color: 'var(--color-bone)' }}>Studio</div>
            <p style={{ margin: '10px 0 0', maxWidth: 480, fontSize: 15, color: 'rgba(245,236,218,0.7)', lineHeight: 1.55 }}>
              Orgs ilimitadas, proyectos ilimitados, miembros ilimitados, white-label completo.
              Próxima factura el <span className="mono">01 jun 2026</span>.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-iron">Actualizar plan</button>
              <button className="btn" style={{ background: 'transparent', color: 'var(--color-bone)', border: '1px solid rgba(245,236,218,0.2)', padding: '8px 16px', borderRadius: 6 }}>
                Portal Stripe →
              </button>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--color-bone)', lineHeight: 1 }}>
              $49<span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400, color: 'rgba(245,236,218,0.6)' }}>/mes</span>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'rgba(245,236,218,0.55)', marginTop: 6, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Renueva 01·jun·26
            </div>
          </div>
        </div>
      </div>

      {/* Payment method + Usage */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <span className="eyebrow">Método de pago</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
            <span style={{ width: 48, height: 32, borderRadius: 5, background: 'linear-gradient(135deg, #13110d 0%, #3a2c1f 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>VISA</span>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 14, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>•••• •••• •••• 4242</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>vence 09/29 · Pipe Cárdenas</div>
            </div>
            <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>Cambiar</button>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <span className="eyebrow">Uso este mes</span>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <UsageRow label="Proyectos" value={12} max={50} />
            <UsageRow label="Miembros" value={38} max={100} />
            <UsageRow label="Storage" value="2.4 GB" max="50 GB" pct={5} />
          </div>
        </div>
      </div>

      {/* Invoices */}
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="eyebrow">Historial</span>
          <button className="btn btn-ghost" style={{ padding: '6px 12px' }}>
            <i data-lucide="download" style={{ strokeWidth: 1.5, width: 13, height: 13 }} />
            Exportar todo
          </button>
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={iStyles.head}>
            <span>Factura</span><span>Fecha</span><span>Monto</span><span>Estado</span><span></span>
          </div>
          {invoices.map((inv, idx) => (
            <div key={inv.id} style={{ ...iStyles.row, borderTop: idx === 0 ? '0' : '1px solid var(--border)' }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inv.id}</span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inv.date}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{inv.amount}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: 'rgba(111,147,98,0.16)', color: '#4f6f44', justifySelf: 'start' }}>● {inv.status}</span>
              <button className="btn btn-ghost" style={{ justifySelf: 'end', padding: '6px 10px' }}>
                <i data-lucide="download" style={{ strokeWidth: 1.5, width: 13, height: 13 }} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function UsageRow({ label, value, max, pct }) {
  const numericPct = pct ?? (typeof value === 'number' && typeof max === 'number' ? Math.round((value / max) * 100) : 0);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span> / {max}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(numericPct, 4)}%`, background: 'var(--color-iron)', borderRadius: 999 }} />
      </div>
    </div>
  );
}

const iStyles = {
  head: {
    display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 32px',
    gap: 16, alignItems: 'center', padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-tertiary)',
  },
  row: {
    display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 32px',
    gap: 16, alignItems: 'center', padding: '14px 22px',
  },
};

window.BillingScreen = BillingScreen;
