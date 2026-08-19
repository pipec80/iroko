/* global React */
const FEATURES = [
  {
    icon: 'shield-check',
    title: 'Autenticación lista',
    body: 'Login con email + password, magic link, OAuth (Google, GitHub) y MFA con recovery codes — todo desde Supabase Auth.',
  },
  {
    icon: 'building-2',
    title: 'Orgs + permisos',
    body: 'Cada cuenta soporta múltiples organizaciones, invitaciones por email, y roles owner / admin / member listos para usar.',
  },
  {
    icon: 'credit-card',
    title: 'Billing con Stripe',
    body: 'Suscripciones, trials, upgrades y portal de cliente. Webhooks reciben y reconcilian — solo conectas tus keys.',
  },
  {
    icon: 'globe',
    title: 'Internacionalización',
    body: 'next-intl configurado con es/en de fábrica, mensajes tipados, y switcher de idioma respetando rutas.',
  },
  {
    icon: 'moon',
    title: 'Light + Dark',
    body: 'Theme provider con persistencia, tokens semánticos en CSS, y dark mode que respira la noche-tierra de Iroko.',
  },
  {
    icon: 'database',
    title: 'Esquema Supabase',
    body: 'Migraciones SQL para profiles, organizations, memberships, invitations, subscriptions — todo con RLS.',
  },
];

function FeatureGrid() {
  React.useEffect(() => { window.lucide?.createIcons(); });
  return (
    <section className="section">
      <div className="container">
        <div className="section-head section-head--centered">
          <span className="eyebrow-sm">Step · 02 · Tronco</span>
          <h2 className="display-italic" style={{ fontSize: 56, lineHeight: 1, color: 'var(--text-primary)', margin: 0 }}>
            Todo lo que reescribías,<br />ya está aquí.
          </h2>
          <p style={{ margin: 0, maxWidth: 580, fontSize: 17, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Cada feature está peleada por código de producción real, no por un README. Si la usas
            en cliente, sabes que ya pasó por el siguiente proyecto.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {FEATURES.map((f) => (
            <article key={f.title} style={featStyles.card}>
              <div style={featStyles.iconBox}>
                <i data-lucide={f.icon} style={{ strokeWidth: 1.25, width: 22, height: 22, color: 'var(--color-iron)' }} />
              </div>
              <h3 style={featStyles.title}>{f.title}</h3>
              <p style={featStyles.body}>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const featStyles = {
  card: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 28,
    display: 'flex', flexDirection: 'column', gap: 14,
    transition: 'border-color 200ms, transform 200ms',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 8,
    background: 'rgba(184,81,58,0.10)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(184,81,58,0.18)',
  },
  title: { margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--text-primary)' },
  body: { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' },
};

window.FeatureGrid = FeatureGrid;
