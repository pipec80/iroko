/* global React */
function ProjectsScreen() {
  React.useEffect(() => { window.lucide?.createIcons(); });
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <span className="eyebrow-sm">Bosque</span>
          <h1 className="display-italic" style={{ margin: '6px 0 0', fontSize: 44, lineHeight: 1, color: 'var(--text-primary)' }}>
            Tus proyectos
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--text-secondary)' }}>
            Cada proyecto es una rama que crece del mismo tronco Iroko.
          </p>
        </div>
        <button className="btn btn-iron" style={{ padding: '10px 18px', fontSize: 13 }}>
          <i data-lucide="plus" style={{ strokeWidth: 1.5, width: 14, height: 14 }} />
          Nuevo proyecto
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { name: 'ace-jewelry', env: 'prod',    desc: 'Checkout v2 + analytics realtime',  tone: 'iron'   },
          { name: 'maker-lab-cl', env: 'prod',   desc: 'Plataforma de cursos + comunidad',  tone: 'gold'   },
          { name: 'pipec.cl', env: 'prod',       desc: 'Sitio personal + blog técnico',     tone: 'indigo' },
          { name: 'iot-greenhouse', env: 'staging', desc: 'Telemetría ESP32 + dashboards',  tone: 'iron'   },
          { name: 'invoice-uv-prints', env: 'preview', desc: 'Cotizador + órdenes UV',       tone: 'gold'   },
          { name: 'rituales-tarot', env: 'idea', desc: 'Experimento de UX místico',         tone: 'indigo' },
        ].map(p => (
          <article key={p.name} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 30, height: 30, borderRadius: 6, background: tone2(p.tone), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i data-lucide="folder" style={{ strokeWidth: 1.5, width: 14, height: 14 }} />
              </span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.12em', textTransform: 'uppercase', background: envBg(p.env), color: envFg(p.env) }}>{p.env}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{p.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}><i data-lucide="users" style={{ strokeWidth: 1.5, width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }} />4</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}><i data-lucide="git-branch" style={{ strokeWidth: 1.5, width: 11, height: 11, verticalAlign: 'middle', marginRight: 4 }} />main</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>hace 2 h</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function tone2(t) { return t === 'iron' ? 'var(--color-iron)' : t === 'gold' ? 'var(--color-gold)' : 'var(--color-indigo)'; }
function envBg(e) { return e === 'prod' ? 'rgba(111,147,98,0.16)' : e === 'staging' ? 'rgba(217,164,65,0.18)' : e === 'preview' ? 'rgba(60,79,115,0.16)' : 'var(--surface-2)'; }
function envFg(e) { return e === 'prod' ? '#4f6f44' : e === 'staging' ? '#a87a1f' : e === 'preview' ? '#2a3a5a' : 'var(--text-tertiary)'; }

window.ProjectsScreen = ProjectsScreen;
