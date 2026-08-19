/* global React */
function Login({ onSubmit }) {
  React.useEffect(() => { window.lucide?.createIcons(); });
  const [email, setEmail] = React.useState('pipec@iroko.dev');
  const [pw, setPw]       = React.useState('');

  return (
    <div style={l.page}>
      {/* Form side */}
      <div style={l.formSide}>
        <div style={l.formCard}>
          <a style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
            <svg viewBox="0 0 32 32" width="24" height="24"><rect width="32" height="32" rx="6" fill="var(--color-ink)"/><circle cx="16" cy="16" r="10" fill="none" stroke="var(--color-poppy)" strokeWidth="2.2"/><circle cx="16" cy="16" r="3.5" fill="var(--color-cobalt)"/></svg>
            <span className="wordmark" style={{ fontSize: 22, color: 'var(--text-primary)' }}>Iroko</span>
          </a>

          <span className="eyebrow-sm">Sign in</span>
          <h1 className="display-italic" style={{ margin: '6px 0 10px', fontSize: 40, lineHeight: 1, color: 'var(--text-primary)' }}>
            Vuelve a tu tronco.
          </h1>
          <p style={{ margin: '0 0 28px', fontSize: 15, color: 'var(--text-secondary)' }}>
            Continúa con la organización donde estabas trabajando.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Email" icon="mail" value={email} onChange={setEmail} type="email" placeholder="tu@dominio.com" />
            <Field label="Contraseña" icon="lock" value={pw} onChange={setPw} type="password" placeholder="••••••••" trailing={<a style={{ fontSize: 12, color: 'var(--color-iron)', fontWeight: 600 }}>Olvidé mi contraseña</a>} />

            <button type="submit" className="btn btn-iron" style={{ height: 44, fontSize: 14, justifyContent: 'center', marginTop: 4 }}>
              Iniciar sesión
            </button>

            <button type="button" className="btn btn-outline" style={{ height: 44, fontSize: 14, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i data-lucide="wand-sparkles" style={{ strokeWidth: 1.5, width: 14, height: 14 }} />
              Enviarme un magic link
            </button>

            <div style={l.divider}>
              <span className="eyebrow-sm" style={{ fontSize: 9 }}>O continúa con</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" style={l.oauth}>
                <svg viewBox="0 0 48 48" width="14" height="14"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13.7 24 13.7c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 40.4 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 36 45 30.5 45 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
                Google
              </button>
              <button type="button" style={l.oauth}>
                <svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M8 .2C3.6.2 0 3.8 0 8.2c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.6.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3.7 0 1.4.1 2 .3 1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.4v2c0 .2.1.5.5.4 3.2-1.1 5.5-4.1 5.5-7.6C16 3.8 12.4.2 8 .2z"/></svg>
                GitHub
              </button>
            </div>

            <p style={{ margin: '20px 0 0', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              ¿No tienes cuenta? <a style={{ color: 'var(--color-iron)', fontWeight: 600 }}>Crear una</a>
            </p>
          </form>
        </div>
      </div>

      {/* Brand panel — editorial */}
      <aside style={l.brandSide}>
        <div style={l.gridOverlay} />
        <div style={l.glow} />
        <div style={l.brandInner}>
          <span className="eyebrow-sm" style={{ color: 'var(--color-gold)' }}>Proverbio Akan</span>
          <blockquote className="display-italic" style={l.quote}>
            "Antes de cortar el iroko, se le pide permiso al espíritu del árbol — porque sin tronco, no hay ramas."
          </blockquote>
          <hr className="rule rule--gold" style={{ width: 80, marginTop: 4, marginBottom: 4, borderColor: 'rgba(217,164,65,0.4)' }} />

          <div style={l.tree}>
            <svg viewBox="0 0 200 200" width="200" height="200">
              <defs>
                <radialGradient id="hud" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,58,58,0.35)"/>
                  <stop offset="100%" stopColor="rgba(255,58,58,0)"/>
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="92" fill="url(#hud)"/>
              <g stroke="rgba(230,232,235,0.12)" strokeWidth="0.5" fill="none">
                <circle cx="100" cy="100" r="90"/>
                <circle cx="100" cy="100" r="60"/>
                <circle cx="100" cy="100" r="30"/>
                <line x1="100" y1="0" x2="100" y2="200"/>
                <line x1="0" y1="100" x2="200" y2="100"/>
              </g>
              <circle cx="100" cy="100" r="70" fill="none" stroke="#ff3a3a" strokeWidth="2"/>
              <circle cx="100" cy="100" r="40" fill="none" stroke="#4682bf" strokeWidth="1.6" strokeDasharray="3 4"/>
              <circle cx="100" cy="100" r="14" fill="#0047ab"/>
              <circle cx="100" cy="100" r="5" fill="#ff3a3a"/>
              {/* orbit nodes */}
              <circle cx="100" cy="30" r="4" fill="#ff3a3a"/>
              <circle cx="170" cy="100" r="4" fill="#4682bf"/>
              <circle cx="100" cy="170" r="4" fill="#ff3a3a"/>
              <circle cx="30" cy="100" r="4" fill="#4682bf"/>
            </svg>
          </div>

          <div style={l.beats}>
            <div><div className="mono" style={l.beatVal}>1.0</div><div className="eyebrow-sm" style={{ color: 'rgba(245,236,218,0.5)', fontSize: 9 }}>VERSION</div></div>
            <div><div className="mono" style={l.beatVal}>23</div><div className="eyebrow-sm" style={{ color: 'rgba(245,236,218,0.5)', fontSize: 9 }}>COMMITS</div></div>
            <div><div className="mono" style={l.beatVal}>∞</div><div className="eyebrow-sm" style={{ color: 'rgba(245,236,218,0.5)', fontSize: 9 }}>RAMAS</div></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, icon, value, onChange, type, placeholder, trailing }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</label>
        {trailing}
      </div>
      <div style={{ position: 'relative' }}>
        <i data-lucide={icon} style={{ strokeWidth: 1.5, width: 15, height: 15, color: 'var(--text-tertiary)', position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={value} type={type} placeholder={placeholder} onChange={e => onChange(e.target.value)}
          style={{ height: 44, width: '100%', padding: '0 14px 0 38px', background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 14, outline: 'none', color: 'var(--text-primary)' }} />
      </div>
    </div>
  );
}

const l = {
  page: { display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', background: 'var(--background)' },
  formSide: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 },
  formCard: { maxWidth: 420, width: '100%' },
  divider: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 0', position: 'relative',
  },
  oauth: {
    height: 44, padding: '0 14px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: 'pointer', fontFamily: 'var(--font-sans)',
  },
  brandSide: {
    background: 'var(--color-night)',
    color: 'var(--color-bone)',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute', inset: 0,
    backgroundImage:
      'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px),' +
      'linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute', top: -200, right: -200,
    width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,81,58,0.18), transparent 60%)',
    pointerEvents: 'none',
  },
  brandInner: {
    position: 'relative', zIndex: 1,
    padding: '56px 64px', height: '100%',
    display: 'flex', flexDirection: 'column', gap: 24,
    maxWidth: 560, justifyContent: 'center',
  },
  quote: {
    margin: 0, fontSize: 32, lineHeight: 1.3,
    color: 'var(--color-bone)',
  },
  tree: { display: 'flex', justifyContent: 'flex-start', margin: '12px 0' },
  beats: {
    display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: 36,
    paddingTop: 24, borderTop: '1px solid rgba(245,236,218,0.14)',
  },
  beatVal: { fontSize: 32, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--color-bone)', lineHeight: 1, marginBottom: 4 },
};

window.Login = Login;
