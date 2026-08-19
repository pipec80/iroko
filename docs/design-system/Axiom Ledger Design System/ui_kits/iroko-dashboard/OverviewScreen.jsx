/* global React */
function OverviewScreen({ user, org }) {
  React.useEffect(() => { window.lucide?.createIcons(); });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Greeting */}
      <header>
        <span className="eyebrow-sm">{org.name} · Overview</span>
        <h1 className="display-italic" style={{ margin: '6px 0 4px', fontSize: 44, lineHeight: 1, color: 'var(--text-primary)' }}>
          Hola, {user.name.split(' ')[0]}.
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: 'var(--text-secondary)' }}>
          Tres ramas crecieron esta semana. Cuatro miembros pendientes de aceptar invitación.
        </p>
      </header>

      {/* KPI grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KpiCard icon="dollar-sign" label="MRR" value="$4,820" delta="+12.4%" trend="up" period="vs mes" />
        <KpiCard icon="tree-pine"   label="Proyectos activos" value="12" delta="+3" trend="up" period="esta semana" />
        <KpiCard icon="users"       label="Miembros" value="38" delta="+5" trend="up" period="este mes" />
        <KpiCard icon="activity"    label="Uptime" value="98.7%" delta="-0.2%" trend="down" period="últ. 30 d" />
      </section>

      {/* Two-column: chart + activity */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        <RevenueCard />
        <ActivityFeed />
      </section>

      {/* Project list */}
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <span className="eyebrow">Proyectos recientes</span>
            <h2 className="display-italic" style={{ margin: '4px 0 0', fontSize: 28, lineHeight: 1, color: 'var(--text-primary)' }}>
              Las ramas activas
            </h2>
          </div>
          <button className="btn btn-iron">
            <i data-lucide="plus" style={{ strokeWidth: 1.5, width: 14, height: 14 }} />
            Nuevo proyecto
          </button>
        </div>
        <ProjectsTable />
      </section>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({ icon, label, value, delta, trend, period }) {
  const isUp = trend === 'up';
  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>{label}</span>
        <i data-lucide={icon} style={{ strokeWidth: 1.25, width: 17, height: 17, color: 'var(--text-tertiary)' }} />
      </div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span className="mono" style={{
          background: isUp ? 'rgba(111,147,98,0.16)' : 'rgba(193,69,52,0.14)',
          color: isUp ? '#4f6f44' : 'var(--color-error)',
          padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
        }}>{delta}</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{period}</span>
      </div>
    </div>
  );
}

// ─── Revenue Card with simple chart ──────────────────────────
function RevenueCard() {
  // Stylized bar chart, no library
  const data = [42, 48, 51, 46, 55, 58, 52, 60, 64, 68, 72, 78];
  const max = Math.max(...data);
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <span className="eyebrow">Ingresos · últimos 12 meses</span>
          <div className="mono" style={{ marginTop: 8, fontSize: 28, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>
            $48,720
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, letterSpacing: '0.04em' }}>
            +$5,420 vs período anterior
          </div>
        </div>
        <select className="mono" style={{ padding: '5px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', outline: 'none' }}>
          <option>12 meses</option><option>30 días</option><option>7 días</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 6, alignItems: 'end', height: 160 }}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          const stopA = 0.30 + (i / data.length) * 0.45;  // poppy
          const stopB = 0.15 + (i / data.length) * 0.25;  // cobalt
          return (
            <div key={i} style={{
              height: `${(d / max) * 100}%`,
              background: isLast
                ? 'var(--color-poppy)'
                : `linear-gradient(to top, rgba(217,33,33,${stopA}), rgba(0,71,171,${stopB}))`,
              borderRadius: '4px 4px 2px 2px',
            }} />
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 6, marginTop: 10 }}>
        {['E','F','M','A','M','J','J','A','S','O','N','D'].map((m, i) => (
          <span key={i} className="mono" style={{ fontSize: 9, color: 'var(--text-tertiary)', textAlign: 'center', letterSpacing: '0.05em' }}>{m}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Activity Feed ───────────────────────────────────────────
function ActivityFeed() {
  const items = [
    { who: 'Pipe', what: 'creó el proyecto', target: 'ace-jewelry · checkout-v2', when: 'hace 2 min', icon: 'plus' },
    { who: 'Sofía', what: 'invitó a', target: 'tomas@maker.cl', when: 'hace 18 min', icon: 'user-plus' },
    { who: 'Stripe', what: 'cobró', target: '$49 · Studio · ace', when: 'hace 1 h', icon: 'credit-card' },
    { who: 'Tomás', what: 'desplegó', target: 'maker-lab · production', when: 'hace 3 h', icon: 'rocket' },
    { who: 'System', what: 'rotó keys de', target: 'supabase service role', when: 'ayer', icon: 'key-round' },
  ];
  return (
    <div className="card" style={{ padding: 22 }}>
      <span className="eyebrow">Actividad</span>
      <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column' }}>
        {items.map((it, idx) => (
          <li key={idx} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 0',
            borderTop: idx === 0 ? '0' : '1px solid var(--border)',
          }}>
            <span style={{ width: 26, height: 26, borderRadius: 5, background: 'rgba(184,81,58,0.10)', color: 'var(--color-iron)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <i data-lucide={it.icon} style={{ strokeWidth: 1.5, width: 13, height: 13 }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                <strong style={{ fontWeight: 600 }}>{it.who}</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{it.what}</span>{' '}
                <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{it.target}</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: '0.06em', marginTop: 2 }}>{it.when}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Projects Table ──────────────────────────────────────────
function ProjectsTable() {
  const rows = [
    { name: 'ace-jewelry',          env: 'prod',    members: 4, status: 'active',    lastDeploy: 'hace 2 min' },
    { name: 'maker-lab-cl',         env: 'prod',    members: 7, status: 'active',    lastDeploy: 'hace 3 h' },
    { name: 'pipec.cl',             env: 'prod',    members: 1, status: 'active',    lastDeploy: 'ayer' },
    { name: 'iot-greenhouse',       env: 'staging', members: 2, status: 'building',  lastDeploy: 'ahora' },
    { name: 'invoice-uv-prints',    env: 'preview', members: 1, status: 'idle',      lastDeploy: 'hace 6 d' },
  ];
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={tStyles.head}>
        <span>Proyecto</span>
        <span>Entorno</span>
        <span>Miembros</span>
        <span>Estado</span>
        <span style={{ textAlign: 'right' }}>Último deploy</span>
      </div>
      {rows.map((r, idx) => (
        <div key={r.name} style={{ ...tStyles.row, borderTop: idx === 0 ? '0' : '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={tStyles.dot}>
              <i data-lucide="folder" style={{ strokeWidth: 1.5, width: 13, height: 13, color: 'var(--color-iron)' }} />
            </span>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</span>
          </div>
          <span className="mono" style={tStyles.envChip(r.env)}>{r.env}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.members}</span>
          <span style={tStyles.statusChip(r.status)}>
            <span style={tStyles.statusDot(r.status)} />
            {r.status}
          </span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', letterSpacing: '0.02em' }}>{r.lastDeploy}</span>
        </div>
      ))}
    </div>
  );
}

const tStyles = {
  head: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 16, alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.2em', textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 16, alignItems: 'center',
    padding: '14px 22px',
  },
  dot: {
    width: 26, height: 26, borderRadius: 5,
    background: 'rgba(184,81,58,0.10)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  envChip: (env) => ({
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 4,
    background:
      env === 'prod'   ? 'rgba(111,147,98,0.16)' :
      env === 'staging'? 'rgba(217,164,65,0.18)' :
                         'rgba(60,79,115,0.16)',
    color:
      env === 'prod'   ? '#4f6f44' :
      env === 'staging'? '#a87a1f' :
                         '#2a3a5a',
    justifySelf: 'start',
  }),
  statusChip: (status) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.16em', textTransform: 'uppercase',
    padding: '3px 10px', borderRadius: 999,
    background:
      status === 'active'   ? 'rgba(111,147,98,0.16)' :
      status === 'building' ? 'rgba(217,164,65,0.18)' :
                              'var(--surface-2)',
    color:
      status === 'active'   ? '#4f6f44' :
      status === 'building' ? '#a87a1f' :
                              'var(--text-tertiary)',
    justifySelf: 'start',
  }),
  statusDot: (status) => ({
    width: 5, height: 5, borderRadius: 999,
    background:
      status === 'active'   ? '#6f9362' :
      status === 'building' ? '#d9a441' :
                              'var(--text-tertiary)',
  }),
};

window.OverviewScreen = OverviewScreen;
