/* global React */
function Hero({ onNavigate }) {
  return (
    <section style={heroStyles.section} className="iroko-grid">
      {/* glow */}
      <div style={heroStyles.glowL} />
      <div style={heroStyles.glowR} />

      <div className="container" style={heroStyles.inner}>
        <span className="eyebrow-sm">Step · 01 · Origen</span>

        <h1 className="display-italic" style={heroStyles.h1}>
          <span style={{ whiteSpace: 'nowrap' }}>Un tronco común</span>
          <br />
          <span style={{ whiteSpace: 'nowrap' }}>
            para tus <span style={heroStyles.iron}>micro-saas</span>.
          </span>
        </h1>

        <p style={heroStyles.lead}>
          Iroko es el template que rehúsas reescribir cada vez. Autenticación, organizaciones,
          billing, internacionalización — todo cableado a Supabase y listo para que rebrandees
          y despliegues tu siguiente proyecto en una tarde.
        </p>

        <div style={heroStyles.ctas}>
          <button className="btn btn-iron" onClick={() => onNavigate?.('signup')}>
            Empezar gratis →
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate?.('docs')}>
            Ver documentación
          </button>
        </div>

        <div style={heroStyles.proof}>
          <Beat label="Auth + MFA" />
          <Sep />
          <Beat label="Stripe billing" />
          <Sep />
          <Beat label="Orgs + RBAC" />
          <Sep />
          <Beat label="i18n · es/en" />
          <Sep />
          <Beat label="Dark mode" />
        </div>
      </div>
    </section>
  );
}

function Beat({ label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flex: 'none' }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--color-poppy)', opacity: 0.85 }} />
      {label}
    </span>
  );
}
function Sep() {
  return <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />;
}

const heroStyles = {
  section: {
    position: 'relative',
    paddingTop: 80,
    paddingBottom: 120,
    overflow: 'hidden',
  },
  glowL: {
    position: 'absolute', left: '-10%', top: -120,
    width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,81,58,0.10), transparent 65%)',
    pointerEvents: 'none', zIndex: 0,
  },
  glowR: {
    position: 'absolute', right: '-15%', top: 200,
    width: 700, height: 700, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(217,164,65,0.08), transparent 60%)',
    pointerEvents: 'none', zIndex: 0,
  },
  inner: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', textAlign: 'center', gap: 28,
  },
  h1: {
    margin: '8px 0 0',
    fontSize: 'clamp(48px, 5.5vw, 76px)',
    lineHeight: 1.02,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  iron: { color: 'var(--color-iron)' },
  lead: {
    margin: 0, maxWidth: 640,
    fontSize: 18, lineHeight: 1.6,
    color: 'var(--text-secondary)',
  },
  ctas: { display: 'flex', gap: 12, marginTop: 8 },
  proof: {
    marginTop: 16,
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    alignItems: 'center', gap: 18,
  },
};

window.Hero = Hero;
