/* global React */
const NAV_ITEMS = [
  { id: 'overview',  icon: 'layout-grid',  label: 'Overview' },
  { id: 'projects',  icon: 'folder-tree',  label: 'Proyectos' },
  { id: 'members',   icon: 'users',        label: 'Miembros' },
  { id: 'billing',   icon: 'credit-card',  label: 'Billing' },
  { id: 'settings',  icon: 'settings',     label: 'Ajustes' },
];

const ORG_LIST = [
  { id: 'ace',     name: 'Ace Jewelry',     plan: 'Studio',   initial: 'AJ', tone: 'iron' },
  { id: 'maker',   name: 'Maker Lab CL',    plan: 'Studio',   initial: 'ML', tone: 'gold' },
  { id: 'pipec',   name: 'Pipec personal',  plan: 'Free',     initial: 'PC', tone: 'night' },
];

function Sidebar({ active, onNavigate, currentOrg = ORG_LIST[0], onSwitchOrg }) {
  const [orgOpen, setOrgOpen] = React.useState(false);
  React.useEffect(() => { window.lucide?.createIcons(); });

  return (
    <aside style={s.aside}>
      {/* Brand strip */}
      <div style={s.brandStrip}>
        <span style={s.markBox}>
          <svg viewBox="0 0 28 28" width="20" height="20"><circle cx="14" cy="14" r="8.5" fill="none" stroke="var(--color-poppy)" strokeWidth="2"/><circle cx="14" cy="14" r="3" fill="var(--color-cobalt)"/><line x1="14" y1="3" x2="14" y2="5.5" stroke="var(--color-poppy)" strokeWidth="1.4"/><line x1="14" y1="22.5" x2="14" y2="25" stroke="var(--color-poppy)" strokeWidth="1.4"/></svg>
        </span>
        <span className="wordmark" style={s.brand}>Iroko</span>
      </div>

      {/* Org switcher */}
      <div style={{ padding: '0 12px' }}>
        <button onClick={() => setOrgOpen(!orgOpen)} style={s.orgBtn}>
          <span style={{ ...s.orgAvatar, background: orgTone(currentOrg.tone) }}>{currentOrg.initial}</span>
          <span style={s.orgInfo}>
            <span style={s.orgName}>{currentOrg.name}</span>
            <span style={s.orgPlan}>Plan {currentOrg.plan}</span>
          </span>
          <i data-lucide={orgOpen ? 'chevron-up' : 'chevron-down'}
             style={{ strokeWidth: 1.5, width: 14, height: 14, color: 'var(--text-tertiary)' }} />
        </button>

        {orgOpen && (
          <div style={s.orgList}>
            {ORG_LIST.map(org => (
              <button key={org.id} onClick={() => { onSwitchOrg?.(org); setOrgOpen(false); }} style={{
                ...s.orgListItem,
                background: org.id === currentOrg.id ? 'var(--surface-3)' : 'transparent',
              }}>
                <span style={{ ...s.orgAvatar, background: orgTone(org.tone), width: 22, height: 22, fontSize: 10 }}>{org.initial}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textAlign: 'left', flex: 1 }}>{org.name}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{org.plan}</span>
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
            <button style={s.orgListItem}>
              <span style={{ ...s.orgAvatar, background: 'var(--surface-3)', color: 'var(--text-secondary)', width: 22, height: 22 }}>+</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Nueva organización</span>
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {NAV_ITEMS.map((it) => {
          const isActive = it.id === active;
          return (
            <button key={it.id} onClick={() => onNavigate?.(it.id)} style={{
              ...s.item,
              background: isActive ? 'rgba(184,81,58,0.10)' : 'transparent',
              color: isActive ? 'var(--color-iron)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
            }}>
              <i data-lucide={it.icon} style={{ strokeWidth: isActive ? 1.5 : 1.25, width: 17, height: 17 }} />
              <span style={{ fontSize: 13 }}>{it.label}</span>
              {isActive && <span style={s.activeDot} />}
            </button>
          );
        })}
      </nav>

      {/* Footer engine card */}
      <div style={s.footer}>
        <div style={s.engineCard}>
          <div className="eyebrow-sm" style={{ fontSize: 9, opacity: 0.6 }}>Build</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>iroko · v1.0</span>
            <span className="mono" style={{ fontSize: 9, color: 'var(--color-iron)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>● stable</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function orgTone(tone) {
  if (tone === 'iron') return 'var(--color-iron)';
  if (tone === 'gold') return 'var(--color-gold)';
  return 'var(--color-night)';
}

const s = {
  aside: {
    position: 'sticky', top: 0,
    height: '100vh',
    background: 'var(--surface-2)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
  },
  brandStrip: {
    height: 60,
    padding: '0 18px',
    display: 'flex', alignItems: 'center', gap: 8,
    borderBottom: '1px solid var(--border)',
  },
  markBox: {
    width: 32, height: 32, borderRadius: 6,
    background: 'var(--color-night)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brand: { fontSize: 22, lineHeight: 1, color: 'var(--text-primary)' },
  orgBtn: {
    width: '100%', margin: '14px 0 8px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8, padding: '8px 10px',
    display: 'flex', alignItems: 'center', gap: 10,
    cursor: 'pointer',
  },
  orgAvatar: {
    width: 26, height: 26, borderRadius: 6,
    color: '#fff', fontWeight: 700, fontSize: 11,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    flex: 'none',
  },
  orgInfo: { display: 'flex', flexDirection: 'column', flex: 1, textAlign: 'left', minWidth: 0 },
  orgName: { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  orgPlan: { fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' },
  orgList: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8, padding: 6,
    marginBottom: 8,
    boxShadow: 'var(--shadow-md)',
  },
  orgListItem: {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 8px', borderRadius: 4, border: 0,
    background: 'transparent', cursor: 'pointer',
  },
  nav: { flex: 1, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '8px 12px', borderRadius: 6,
    border: 0, textAlign: 'left',
    transition: 'background 180ms, color 180ms',
    cursor: 'pointer',
    position: 'relative',
  },
  activeDot: {
    marginLeft: 'auto',
    width: 5, height: 5, borderRadius: 999,
    background: 'var(--color-iron)',
  },
  footer: { padding: 12 },
  engineCard: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 12px',
  },
};

window.Sidebar = Sidebar;
