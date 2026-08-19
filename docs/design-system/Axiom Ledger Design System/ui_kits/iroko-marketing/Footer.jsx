/* global React */
function Footer() {
  return (
    <footer style={fStyles.footer}>
      <div className="container" style={fStyles.grid}>
        <div>
          <div style={fStyles.brandRow}>
            <svg viewBox="0 0 36 36" width="22" height="22"><rect width="36" height="36" rx="6" fill="var(--color-ink)"/><circle cx="18" cy="18" r="11" fill="none" stroke="var(--color-poppy)" strokeWidth="2.2"/><circle cx="18" cy="18" r="4" fill="var(--color-cobalt)"/></svg>
            <span className="wordmark" style={{ fontSize: 22, color: 'var(--text-primary)' }}>Iroko</span>
          </div>
          <p style={fStyles.small}>
            El template multi-tenant que rehúsas reescribir.
          </p>
          <p className="mono" style={{ ...fStyles.small, opacity: 0.55 }}>
            © 2026 pipec · v1.0
          </p>
        </div>

        <div style={fStyles.col}>
          <span className="eyebrow-sm">Producto</span>
          <a href="#">Features</a>
          <a href="#">Precios</a>
          <a href="#">Changelog</a>
          <a href="#">Roadmap</a>
        </div>
        <div style={fStyles.col}>
          <span className="eyebrow-sm">Recursos</span>
          <a href="#">Documentación</a>
          <a href="#">Guía de inicio</a>
          <a href="#">Migración</a>
          <a href="#">Comunidad</a>
        </div>
        <div style={fStyles.col}>
          <span className="eyebrow-sm">Compañía</span>
          <a href="#">Manifiesto</a>
          <a href="#">Contacto</a>
          <a href="#">GitHub</a>
          <a href="#">Twitter</a>
        </div>
      </div>

      <hr className="rule" style={{ margin: '40px 32px 0' }} />

      <div className="container" style={fStyles.bottom}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          pipec · iroko · made in cl
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          ∼ aprende del pasado · construye el futuro ∼
        </span>
      </div>
    </footer>
  );
}

const fStyles = {
  footer: { marginTop: 96, paddingBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 32, padding: '64px 32px 0' },
  brandRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  small: { margin: '0 0 4px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320 },
  col: { display: 'flex', flexDirection: 'column', gap: 10 },
  bottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px 0' },
};

window.Footer = Footer;
