/* global React */
const NAV_ROUTES = [
  { id: 'product', label: 'Producto' },
  { id: 'pricing', label: 'Precios' },
  { id: 'docs', label: 'Documentación' },
  { id: 'changelog', label: 'Changelog' },
];

function Navbar({ route, onNavigate }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav style={{ ...navStyles.nav, borderBottomColor: scrolled ? 'var(--border)' : 'transparent', background: scrolled ? 'rgba(245,236,218,0.86)' : 'transparent' }}>
      <div className="container" style={navStyles.inner}>
        <button onClick={() => onNavigate?.('home')} style={navStyles.brand}>
          <svg viewBox="0 0 36 36" width="26" height="26" style={{ display: 'block' }}>
            <rect width="36" height="36" rx="6" fill="var(--color-ink)"/>
            <circle cx="18" cy="18" r="11" fill="none" stroke="var(--color-poppy)" strokeWidth="2.2"/>
            <circle cx="18" cy="18" r="4" fill="var(--color-cobalt)"/>
            <line x1="18" y1="3" x2="18" y2="6.5" stroke="var(--color-poppy)" strokeWidth="1.4"/>
            <line x1="18" y1="29.5" x2="18" y2="33" stroke="var(--color-poppy)" strokeWidth="1.4"/>
          </svg>
          <span className="wordmark" style={navStyles.brandText}>Iroko</span>
        </button>

        <div style={navStyles.links}>
          {NAV_ROUTES.map((r) => (
            <button key={r.id} onClick={() => onNavigate?.(r.id)}
              style={{ ...navStyles.link, color: route === r.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {r.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={navStyles.signIn} onClick={() => onNavigate?.('login')}>Iniciar sesión</button>
          <button style={navStyles.cta} onClick={() => onNavigate?.('signup')}>
            Empezar gratis <span style={{ opacity: 0.7 }}>→</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

const navStyles = {
  nav: {
    position: 'sticky', top: 0, zIndex: 50,
    borderBottom: '1px solid transparent',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    transition: 'all 200ms ease',
  },
  inner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px' },
  brand: { background: 'transparent', border: 0, padding: 0, display: 'flex', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 26, lineHeight: 1, color: 'var(--text-primary)' },
  links: { display: 'flex', alignItems: 'center', gap: 4 },
  link: {
    background: 'transparent', border: 0,
    padding: '8px 14px', borderRadius: 6,
    fontSize: 14, fontWeight: 500,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  },
  signIn: {
    background: 'transparent', border: 0,
    padding: '8px 14px', fontSize: 14, fontWeight: 500,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  cta: {
    background: 'var(--color-ink)', color: 'var(--color-paper)',
    border: 0, borderRadius: 6,
    padding: '10px 18px',
    fontSize: 14, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap',
  },
};

window.Navbar = Navbar;
