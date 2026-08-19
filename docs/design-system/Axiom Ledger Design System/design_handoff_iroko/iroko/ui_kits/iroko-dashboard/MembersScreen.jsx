/* global React */
const MEMBERS_SEED = [
  { name: 'Pipe Cárdenas',  email: 'pipec@iroko.dev',     role: 'owner',   status: 'active',   last: 'hace 2 min',   initial: 'PC', tone: 'iron' },
  { name: 'Sofía Reyes',    email: 'sofia@maker.cl',      role: 'admin',   status: 'active',   last: 'hace 18 min',  initial: 'SR', tone: 'gold' },
  { name: 'Tomás Villalba', email: 'tomas@maker.cl',      role: 'member',  status: 'active',   last: 'hace 3 h',     initial: 'TV', tone: 'indigo' },
  { name: 'Camila Núñez',   email: 'cami@external.dev',   role: 'member',  status: 'invited',  last: '—',            initial: 'CN', tone: 'night' },
  { name: 'Andrés Soto',    email: 'andres@iroko.dev',    role: 'member',  status: 'active',   last: 'ayer',         initial: 'AS', tone: 'iron' },
  { name: 'Luna Pérez',     email: 'luna@iroko.dev',      role: 'member',  status: 'invited',  last: '—',            initial: 'LP', tone: 'gold' },
];

function MembersScreen() {
  React.useEffect(() => { window.lucide?.createIcons(); });
  const [q, setQ] = React.useState('');
  const filtered = MEMBERS_SEED.filter(m =>
    m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <span className="eyebrow-sm">Equipo</span>
          <h1 className="display-italic" style={{ margin: '6px 0 0', fontSize: 44, lineHeight: 1, color: 'var(--text-primary)' }}>
            Miembros de la organización
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-secondary)' }}>
            {MEMBERS_SEED.filter(m => m.status === 'active').length} activos · {MEMBERS_SEED.filter(m => m.status === 'invited').length} pendientes
          </p>
        </div>
        <button className="btn btn-iron" style={{ padding: '10px 18px', fontSize: 13 }}>
          <i data-lucide="user-plus" style={{ strokeWidth: 1.5, width: 14, height: 14 }} />
          Invitar miembro
        </button>
      </header>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <i data-lucide="search" style={{ strokeWidth: 1.5, width: 14, height: 14, color: 'var(--text-tertiary)', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar miembros…" style={{ height: 36, width: '100%', padding: '0 12px 0 34px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, outline: 'none' }} />
        </div>
        <select className="mono" style={{ height: 36, padding: '0 28px 0 12px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <option>Todos los roles</option><option>Owner</option><option>Admin</option><option>Member</option>
        </select>
        <select className="mono" style={{ height: 36, padding: '0 28px 0 12px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <option>Todos los estados</option><option>Activos</option><option>Invitados</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={m.head}>
          <span></span>
          <span>Miembro</span>
          <span>Rol</span>
          <span>Estado</span>
          <span style={{ textAlign: 'right' }}>Último acceso</span>
          <span></span>
        </div>
        {filtered.map((row, idx) => (
          <div key={row.email} style={{ ...m.row, borderTop: idx === 0 ? '0' : '1px solid var(--border)' }}>
            <span style={{ ...m.avatar, background: tone(row.tone) }}>{row.initial}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{row.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{row.email}</div>
            </div>
            <span style={m.roleChip(row.role)}>{row.role}</span>
            <span style={m.statusChip(row.status)}>
              <span style={m.statusDot(row.status)} />
              {row.status === 'active' ? 'ACTIVO' : 'INVITADO'}
            </span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', letterSpacing: '0.02em' }}>{row.last}</span>
            <button style={m.iconBtn} title="Más opciones">
              <i data-lucide="more-horizontal" style={{ strokeWidth: 1.5, width: 15, height: 15, color: 'var(--text-tertiary)' }} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function tone(t) {
  if (t === 'iron') return 'var(--color-iron)';
  if (t === 'gold') return 'var(--color-gold)';
  if (t === 'indigo') return 'var(--color-indigo)';
  return 'var(--color-night)';
}

const m = {
  head: {
    display: 'grid',
    gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 32px',
    gap: 16, alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.2em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 32px',
    gap: 16, alignItems: 'center',
    padding: '14px 22px',
  },
  avatar: {
    width: 32, height: 32, borderRadius: 6,
    color: '#fff', fontWeight: 700, fontSize: 11,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
  },
  roleChip: (role) => ({
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase',
    padding: '3px 10px', borderRadius: 999,
    justifySelf: 'start',
    background:
      role === 'owner' ? 'var(--color-iron)' :
      role === 'admin' ? 'rgba(184,81,58,0.16)' :
                         'var(--surface-2)',
    color:
      role === 'owner' ? '#fff' :
      role === 'admin' ? 'var(--color-iron)' :
                         'var(--text-secondary)',
    border:
      role === 'member' ? '1px solid var(--border)' : '0',
  }),
  statusChip: (s) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    padding: '3px 10px', borderRadius: 999,
    justifySelf: 'start',
    background: s === 'active' ? 'rgba(111,147,98,0.16)' : 'rgba(217,164,65,0.18)',
    color: s === 'active' ? '#4f6f44' : '#a87a1f',
  }),
  statusDot: (s) => ({ width: 5, height: 5, borderRadius: 999, background: s === 'active' ? '#6f9362' : '#d9a441' }),
  iconBtn: {
    width: 28, height: 28, borderRadius: 6,
    background: 'transparent', border: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
};

window.MembersScreen = MembersScreen;
