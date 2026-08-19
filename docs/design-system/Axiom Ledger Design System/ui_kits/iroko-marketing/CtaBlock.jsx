/* global React */
function CtaBlock({ onNavigate }) {
  return (
    <section className="section">
      <div className="container">
        <div style={ctaStyles.card}>
          <div style={ctaStyles.glow} />
          <div style={ctaStyles.inner}>
            <span className="eyebrow-sm" style={{ color: 'var(--color-gold)' }}>Step · Final · Despliega</span>
            <h2 className="display-italic" style={ctaStyles.h2}>
              Tu próximo micro-SaaS<br />empieza esta tarde.
            </h2>
            <p style={ctaStyles.lead}>
              Clona el repo, ejecuta <code style={ctaStyles.code}>pnpm install</code>, pega tus
              keys de Supabase y Stripe, y rebrandea. Si tardas más de una tarde, abrimos un issue
              juntos.
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button className="btn btn-iron" onClick={() => onNavigate?.('signup')}>
                Empezar gratis →
              </button>
              <button className="btn" style={{ background: 'transparent', color: 'var(--color-bone)', border: '1px solid rgba(245,236,218,0.2)', padding: '13px 28px', borderRadius: 8 }}>
                Ver repo en GitHub
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const ctaStyles = {
  card: {
    position: 'relative',
    background: 'var(--color-night)',
    color: 'var(--color-bone)',
    borderRadius: 18,
    padding: 64,
    overflow: 'hidden',
    textAlign: 'center',
    backgroundImage:
      'linear-gradient(to right, rgba(245,236,218,0.04) 1px, transparent 1px),' +
      'linear-gradient(to bottom, rgba(245,236,218,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  glow: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(184,81,58,0.18), transparent 60%)',
    pointerEvents: 'none',
  },
  inner: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', gap: 18,
    maxWidth: 640, margin: '0 auto', alignItems: 'center',
  },
  h2: { margin: 0, fontSize: 64, lineHeight: 1, color: 'var(--color-bone)' },
  lead: { margin: 0, fontSize: 17, lineHeight: 1.6, color: 'rgba(245,236,218,0.7)' },
  code: {
    fontFamily: 'var(--font-mono)', fontSize: 14,
    background: 'rgba(245,236,218,0.10)', color: 'var(--color-bone)',
    padding: '2px 8px', borderRadius: 4,
  },
};

window.CtaBlock = CtaBlock;
