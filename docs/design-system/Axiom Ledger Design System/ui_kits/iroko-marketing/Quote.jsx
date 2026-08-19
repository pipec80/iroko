/* global React */
function Quote() {
  return (
    <section className="section section--tight">
      <div className="container" style={{ maxWidth: 760, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
        <span className="eyebrow-sm" style={{ color: 'var(--color-iron)' }}>Proverbio Akan</span>
        <blockquote className="display-italic" style={{ margin: 0, fontSize: 36, lineHeight: 1.3, color: 'var(--text-primary)' }}>
          "Antes de cortar el iroko, se le pide permiso al espíritu del árbol —
          porque sin tronco, no hay ramas."
        </blockquote>
        <hr className="rule rule--gold" style={{ width: 120 }} />
        <p className="mono" style={{ margin: 0, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          La filosofía detrás del template
        </p>
      </div>
    </section>
  );
}
window.Quote = Quote;
