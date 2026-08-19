/* global React */
const TIERS = [
  {
    name: 'Personal',
    price: '$0',
    period: '/mes',
    desc: 'Para tu proyecto en solitario. Sin tarjeta.',
    cta: 'Empezar',
    features: ['1 organización', '3 proyectos', 'Hasta 5 miembros', 'Comunidad Discord'],
    featured: false,
  },
  {
    name: 'Studio',
    price: '$49',
    period: '/mes',
    desc: 'Tu agencia y todos tus micro-SaaS bajo un mismo paraguas.',
    cta: 'Empezar Studio',
    features: ['Orgs ilimitadas', 'Proyectos ilimitados', 'Miembros ilimitados', 'White-label completo', 'Soporte prioritario'],
    featured: true,
  },
  {
    name: 'Custom',
    price: 'A medida',
    period: '',
    desc: 'On-prem, SLA dedicado, integración con tu infra existente.',
    cta: 'Hablemos',
    features: ['Self-hosted Supabase', 'SSO + SAML', 'SLA 99.9%', 'Account manager dedicado'],
    featured: false,
  },
];

function PricingTiers() {
  return (
    <section className="section" style={{ background: 'var(--surface-2)' }}>
      <div className="container">
        <div className="section-head section-head--centered">
          <span className="eyebrow-sm">Step · 03 · Ramas</span>
          <h2 className="display-italic" style={{ fontSize: 56, lineHeight: 1, color: 'var(--text-primary)', margin: 0 }}>
            Precios sin ramas extra.
          </h2>
          <p style={{ margin: 0, maxWidth: 560, fontSize: 17, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Comienza gratis. Cuando tu proyecto pase de "tronco" a "bosque", escalamos juntos.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1080, margin: '0 auto', alignItems: 'start' }}>
          {TIERS.map((t) => (
            <article key={t.name} style={{ ...priceStyles.card, ...(t.featured ? priceStyles.featured : null) }}>
              {t.featured && <span style={priceStyles.ribbon}>Más popular</span>}

              <div style={{ ...priceStyles.tierName, color: t.featured ? 'var(--color-bone)' : 'var(--text-primary)' }}>{t.name}</div>
              <div style={{ ...priceStyles.tierDesc, color: t.featured ? 'rgba(245,236,218,0.7)' : 'var(--text-secondary)' }}>{t.desc}</div>

              <div className="mono" style={{ ...priceStyles.price, color: t.featured ? 'var(--color-bone)' : 'var(--text-primary)' }}>
                {t.price}
                {t.period && (
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400, color: t.featured ? 'rgba(245,236,218,0.6)' : 'var(--text-secondary)' }}>
                    {t.period}
                  </span>
                )}
              </div>

              <button style={{
                ...priceStyles.cta,
                background: t.featured ? 'var(--color-iron)' : 'var(--surface-elevated)',
                color: t.featured ? '#fff' : 'var(--text-primary)',
                border: t.featured ? '0' : '1px solid var(--border-strong)',
              }}>
                {t.cta}
              </button>

              <ul style={priceStyles.list}>
                {t.features.map((f) => (
                  <li key={f} style={{ ...priceStyles.li, color: t.featured ? 'rgba(245,236,218,0.86)' : 'var(--text-secondary)' }}>
                    <span style={{ color: t.featured ? 'var(--color-gold)' : 'var(--color-iron)', fontWeight: 700 }}>·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const priceStyles = {
  card: {
    position: 'relative',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 28,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  featured: {
    background: 'var(--color-night)',
    border: '1px solid var(--color-night)',
    transform: 'translateY(-12px)',
    boxShadow: 'var(--shadow-xl)',
  },
  ribbon: {
    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
    background: 'var(--color-gold)', color: 'var(--color-night)',
    padding: '4px 12px', borderRadius: 999,
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.2em', textTransform: 'uppercase',
  },
  tierName: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' },
  tierDesc: { fontSize: 13, lineHeight: 1.55, minHeight: 40 },
  price: { fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 6 },
  cta: {
    height: 44, borderRadius: 8,
    fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
    marginTop: 8, cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0, margin: '12px 0 0', display: 'flex', flexDirection: 'column', gap: 10 },
  li: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.5 },
};

window.PricingTiers = PricingTiers;
