/* global React */
function SettingsScreen() {
  React.useEffect(() => { window.lucide?.createIcons(); });
  const [tab, setTab] = React.useState('general');

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Seguridad' },
    { id: 'integrations', label: 'Integraciones' },
    { id: 'danger', label: 'Zona peligrosa' },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header>
        <span className="eyebrow-sm">Configuración</span>
        <h1 className="display-italic" style={{ margin: '6px 0 0', fontSize: 44, lineHeight: 1, color: 'var(--text-primary)' }}>
          Ajustes de la organización
        </h1>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'transparent', border: 0,
            padding: '10px 18px',
            fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? 'var(--color-iron)' : 'var(--text-secondary)',
            borderBottom: tab === t.id ? '2px solid var(--color-iron)' : '2px solid transparent',
            marginBottom: -1,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            whiteSpace: 'nowrap',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralPanel />}
      {tab === 'security' && <SecurityPanel />}
      {tab === 'integrations' && <IntegrationsPanel />}
      {tab === 'danger' && <DangerPanel />}
    </div>
  );
}

function GeneralPanel() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Panel title="Identidad" sub="Cómo se ve tu organización en facturas, invitaciones y emails.">
        <Field label="Nombre"   defaultValue="Ace Jewelry" />
        <Field label="Slug"     defaultValue="ace-jewelry" mono hint="usado en URLs · ace.iroko.dev" />
        <Field label="Email de facturación" defaultValue="billing@ace-jewelry.com" />
      </Panel>

      <Panel title="Preferencias" sub="Cómo se comporta el panel para todos los miembros.">
        <Toggle label="Modo oscuro como default" defaultOn />
        <Toggle label="Notificaciones por email" defaultOn />
        <Toggle label="Webhooks de actividad a Slack" />
      </Panel>
    </div>
  );
}
function SecurityPanel() {
  return (
    <Panel title="Autenticación" sub="Asegura los accesos a esta organización.">
      <Toggle label="Requerir MFA a todos los miembros" defaultOn />
      <Toggle label="Auto-cerrar sesión tras 30 min" />
      <Field label="Dominios permitidos" defaultValue="iroko.dev, maker.cl" mono hint="separados por coma · solo emails de estos dominios pueden ser invitados" />
    </Panel>
  );
}
function IntegrationsPanel() {
  const ints = [
    { name: 'Supabase', desc: 'Base de datos + auth + storage', icon: 'database',  connected: true  },
    { name: 'Stripe',   desc: 'Suscripciones + portal cliente',  icon: 'credit-card', connected: true  },
    { name: 'Slack',    desc: 'Notificaciones de actividad',     icon: 'message-square', connected: false },
    { name: 'GitHub',   desc: 'Auto-deploy desde el repo',       icon: 'github',    connected: false },
  ];
  return (
    <div className="card" style={{ padding: 0 }}>
      {ints.map((it, idx) => (
        <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px', borderTop: idx === 0 ? '0' : '1px solid var(--border)' }}>
          <span style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
            <i data-lucide={it.icon} style={{ strokeWidth: 1.25, width: 18, height: 18 }} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{it.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{it.desc}</div>
          </div>
          {it.connected ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: 'rgba(111,147,98,0.16)', color: '#4f6f44' }}>● CONECTADO</span>
          ) : (
            <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>Conectar</button>
          )}
        </div>
      ))}
    </div>
  );
}
function DangerPanel() {
  return (
    <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(193,69,52,0.32)', borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-error)' }}>Transferir propiedad</h3>
        <p style={{ margin: '4px 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>El nuevo owner debe aceptar desde su cuenta. Tú quedarás como admin.</p>
        <button style={{ background: 'rgba(193,69,52,0.10)', color: 'var(--color-error)', border: '1px solid rgba(193,69,52,0.32)', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Transferir</button>
      </div>
      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: 0 }} />
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-error)' }}>Eliminar organización</h3>
        <p style={{ margin: '4px 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>Esto elimina todos los proyectos, miembros y facturación. No se puede deshacer.</p>
        <button style={{ background: 'var(--color-error)', color: '#fff', border: 0, borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Eliminar organización</button>
      </div>
    </div>
  );
}

function Panel({ title, sub, children }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  );
}
function Field({ label, defaultValue, mono, hint }) {
  const [val, setVal] = React.useState(defaultValue ?? '');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
      <div>
        <input value={val} onChange={(e) => setVal(e.target.value)} style={{
          height: 36, width: '100%', padding: '0 12px',
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6,
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: 13, color: 'var(--text-primary)', outline: 'none',
        }} />
        {hint && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{hint}</p>}
      </div>
    </div>
  );
}
function Toggle({ label, defaultOn }) {
  const [on, setOn] = React.useState(!!defaultOn);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '8px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>{label}</span>
      <button onClick={() => setOn(!on)} style={{
        flex: 'none',
        width: 36, height: 20, borderRadius: 999,
        background: on ? 'var(--color-iron)' : 'var(--surface-3)',
        border: 0, position: 'relative', cursor: 'pointer',
        transition: 'background 180ms',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 18 : 2,
          width: 16, height: 16, borderRadius: 999, background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'left 180ms',
        }} />
      </button>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
