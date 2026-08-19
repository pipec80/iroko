/* global React */
const ROUTE_LABELS = {
  overview: 'Overview',
  projects: 'Proyectos',
  members: 'Miembros',
  billing: 'Billing',
  settings: 'Ajustes',
};

function Topbar({ user, org, route, onSignOut }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => { window.lucide?.createIcons(); });

  return (
    <header style={t.bar}>
      <div style={t.crumbRow}>
        <span style={t.crumbOrg}>{org.name}</span>
        <span style={t.crumbSep}>/</span>
        <span style={t.crumbPage}>{ROUTE_LABELS[route] || route}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={t.searchWrap}>
          <i data-lucide="search" style={{ strokeWidth: 1.5, width: 14, height: 14, color: 'var(--text-tertiary)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input placeholder="Buscar…" style={t.search} />
          <span className="mono" style={t.kbd}>⌘ K</span>
        </div>

        <button style={t.iconBtn} title="Notificaciones">
          <i data-lucide="bell" style={{ strokeWidth: 1.5, width: 17, height: 17, color: 'var(--text-secondary)' }} />
          <span style={t.notiDot} />
        </button>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={t.avatarBtn}>
            <span style={t.avatar}>{initials(user.name)}</span>
          </button>
          {menuOpen && (
            <div style={t.menu}>
              <div style={t.menuHeader}>
                <span style={t.menuName}>{user.name}</span>
                <span style={t.menuMail}>{user.email}</span>
              </div>
              <div style={t.menuSep} />
              <MenuItem icon="user" label="Perfil" />
              <MenuItem icon="settings" label="Preferencias" />
              <MenuItem icon="keyboard" label="Atajos" hint="⌘ /" />
              <div style={t.menuSep} />
              <MenuItem icon="moon" label="Cambiar tema" />
              <MenuItem icon="globe" label="Idioma" hint="ES" />
              <div style={t.menuSep} />
              <MenuItem icon="log-out" label="Cerrar sesión" tone="error" onClick={onSignOut} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon, label, hint, tone, onClick }) {
  return (
    <button onClick={onClick} style={{
      ...t.menuItem,
      color: tone === 'error' ? 'var(--color-error)' : 'var(--text-secondary)',
    }}>
      <i data-lucide={icon} style={{ strokeWidth: 1.25, width: 15, height: 15 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{label}</span>
      {hint && <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em' }}>{hint}</span>}
    </button>
  );
}

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const t = {
  bar: {
    position: 'sticky', top: 0, zIndex: 20,
    height: 60,
    padding: '0 32px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(245,236,218,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border)',
  },
  crumbRow: { display: 'flex', alignItems: 'center', gap: 10 },
  crumbOrg: {
    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
  },
  crumbSep: { color: 'var(--text-tertiary)', fontSize: 14, opacity: 0.5 },
  crumbPage: {
    fontFamily: 'var(--font-sans)',
    fontSize: 18, fontWeight: 700, lineHeight: 1,
    color: 'var(--text-primary)',
  },
  searchWrap: { position: 'relative' },
  search: {
    height: 32, width: 240,
    padding: '0 56px 0 32px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6, fontSize: 13, outline: 'none',
    color: 'var(--text-primary)',
  },
  kbd: {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    fontSize: 10, color: 'var(--text-tertiary)',
    background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 3,
    border: '1px solid var(--border)',
  },
  iconBtn: {
    position: 'relative',
    width: 32, height: 32, borderRadius: 6,
    background: 'transparent', border: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  notiDot: {
    position: 'absolute', top: 6, right: 6,
    width: 6, height: 6, borderRadius: 999,
    background: 'var(--color-iron)',
    border: '2px solid var(--background)',
  },
  avatarBtn: { background: 'transparent', border: 0, padding: 0, cursor: 'pointer' },
  avatar: {
    width: 32, height: 32, borderRadius: 6,
    background: 'var(--color-iron)', color: '#fff',
    fontWeight: 700, fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  menu: {
    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
    width: 240, padding: 8,
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 30,
  },
  menuHeader: { padding: '8px 10px 10px' },
  menuName: { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' },
  menuMail: { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 },
  menuSep: { height: 1, background: 'var(--border)', margin: '4px -2px' },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '7px 10px', borderRadius: 4,
    background: 'transparent', border: 0,
    cursor: 'pointer', textAlign: 'left',
  },
};

window.Topbar = Topbar;
