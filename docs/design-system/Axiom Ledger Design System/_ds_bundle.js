/* @ds-bundle: {"format":4,"namespace":"AxiomLedgerDesignSystem_11955d","components":[],"sourceHashes":{"design_handoff_iroko/iroko/ui_kits/iroko-dashboard/BillingScreen.jsx":"419d3035e29f","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Login.jsx":"44252da2c625","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/MembersScreen.jsx":"e3d3e56047f9","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/OverviewScreen.jsx":"5366408f886d","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/ProjectsScreen.jsx":"83e246b7ec7e","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/SettingsScreen.jsx":"6971f0ec2626","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Sidebar.jsx":"4ce00ce989c6","design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Topbar.jsx":"c04f226326f6","design_handoff_iroko/iroko/ui_kits/iroko-marketing/CtaBlock.jsx":"01c8f5d3c98a","design_handoff_iroko/iroko/ui_kits/iroko-marketing/FeatureGrid.jsx":"bacc813a5ad7","design_handoff_iroko/iroko/ui_kits/iroko-marketing/Footer.jsx":"06c550661d07","design_handoff_iroko/iroko/ui_kits/iroko-marketing/Hero.jsx":"7d0feaf2b18d","design_handoff_iroko/iroko/ui_kits/iroko-marketing/Navbar.jsx":"70be7083cd47","design_handoff_iroko/iroko/ui_kits/iroko-marketing/PricingTiers.jsx":"130febc0f432","design_handoff_iroko/iroko/ui_kits/iroko-marketing/Quote.jsx":"d17b96cde884","ui_kits/iroko-dashboard/BillingScreen.jsx":"419d3035e29f","ui_kits/iroko-dashboard/Login.jsx":"44252da2c625","ui_kits/iroko-dashboard/MembersScreen.jsx":"e3d3e56047f9","ui_kits/iroko-dashboard/OverviewScreen.jsx":"5366408f886d","ui_kits/iroko-dashboard/ProjectsScreen.jsx":"83e246b7ec7e","ui_kits/iroko-dashboard/SettingsScreen.jsx":"6971f0ec2626","ui_kits/iroko-dashboard/Sidebar.jsx":"4ce00ce989c6","ui_kits/iroko-dashboard/Topbar.jsx":"c04f226326f6","ui_kits/iroko-dashboard/doc-page.js":"f52ae9c02fca","ui_kits/iroko-marketing/CtaBlock.jsx":"01c8f5d3c98a","ui_kits/iroko-marketing/FeatureGrid.jsx":"bacc813a5ad7","ui_kits/iroko-marketing/Footer.jsx":"06c550661d07","ui_kits/iroko-marketing/Hero.jsx":"7d0feaf2b18d","ui_kits/iroko-marketing/Navbar.jsx":"70be7083cd47","ui_kits/iroko-marketing/PricingTiers.jsx":"130febc0f432","ui_kits/iroko-marketing/Quote.jsx":"d17b96cde884"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AxiomLedgerDesignSystem_11955d = window.AxiomLedgerDesignSystem_11955d || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/BillingScreen.jsx
try { (() => {
/* global React */
function BillingScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const invoices = [{
    id: 'INV-2026-018',
    date: '01 may 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-017',
    date: '01 abr 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-016',
    date: '01 mar 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-015',
    date: '01 feb 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-014',
    date: '01 ene 2026',
    amount: '$49.00',
    status: 'paid'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Facturaci\xF3n"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 4px',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Plan y facturaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, "Tu plan actual, pr\xF3ximos cargos, y facturas descargables.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 28,
      background: 'var(--color-night)',
      color: 'var(--color-bone)',
      border: '0',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 24,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-gold)'
    }
  }, "Plan actual"), /*#__PURE__*/React.createElement("div", {
    className: "display-italic",
    style: {
      fontSize: 48,
      lineHeight: 1,
      marginTop: 4,
      color: 'var(--color-bone)'
    }
  }, "Studio"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      maxWidth: 480,
      fontSize: 15,
      color: 'rgba(245,236,218,0.7)',
      lineHeight: 1.55
    }
  }, "Orgs ilimitadas, proyectos ilimitados, miembros ilimitados, white-label completo. Pr\xF3xima factura el ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "01 jun 2026"), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron"
  }, "Actualizar plan"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: 'transparent',
      color: 'var(--color-bone)',
      border: '1px solid rgba(245,236,218,0.2)',
      padding: '8px 16px',
      borderRadius: 6
    }
  }, "Portal Stripe \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 36,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color: 'var(--color-bone)',
      lineHeight: 1
    }
  }, "$49", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 400,
      color: 'rgba(245,236,218,0.6)'
    }
  }, "/mes")), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'rgba(245,236,218,0.55)',
      marginTop: 6,
      letterSpacing: '0.16em',
      textTransform: 'uppercase'
    }
  }, "Renueva 01\xB7jun\xB726")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "M\xE9todo de pago"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 32,
      borderRadius: 5,
      background: 'linear-gradient(135deg, #13110d 0%, #3a2c1f 100%)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-gold)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.06em'
    }
  }, "VISA"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 14,
      color: 'var(--text-primary)',
      letterSpacing: '0.04em'
    }
  }, "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4242"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "vence 09/29 \xB7 Pipe C\xE1rdenas")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: '6px 14px',
      fontSize: 12
    }
  }, "Cambiar"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Uso este mes"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(UsageRow, {
    label: "Proyectos",
    value: 12,
    max: 50
  }), /*#__PURE__*/React.createElement(UsageRow, {
    label: "Miembros",
    value: 38,
    max: 100
  }), /*#__PURE__*/React.createElement(UsageRow, {
    label: "Storage",
    value: "2.4 GB",
    max: "50 GB",
    pct: 5
  })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Historial"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: '6px 12px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "download",
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13
    }
  }), "Exportar todo")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: iStyles.head
  }, /*#__PURE__*/React.createElement("span", null, "Factura"), /*#__PURE__*/React.createElement("span", null, "Fecha"), /*#__PURE__*/React.createElement("span", null, "Monto"), /*#__PURE__*/React.createElement("span", null, "Estado"), /*#__PURE__*/React.createElement("span", null)), invoices.map((inv, idx) => /*#__PURE__*/React.createElement("div", {
    key: inv.id,
    style: {
      ...iStyles.row,
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, inv.id), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, inv.date), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, inv.amount), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      padding: '3px 10px',
      borderRadius: 999,
      background: 'rgba(111,147,98,0.16)',
      color: '#4f6f44',
      justifySelf: 'start'
    }
  }, "\u25CF ", inv.status), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      justifySelf: 'end',
      padding: '6px 10px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "download",
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13
    }
  })))))));
}
function UsageRow({
  label,
  value,
  max,
  pct
}) {
  const numericPct = pct ?? (typeof value === 'number' && typeof max === 'number' ? Math.round(value / max * 100) : 0);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600
    }
  }, value), " / ", max)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--surface-2)',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${Math.max(numericPct, 4)}%`,
      background: 'var(--color-iron)',
      borderRadius: 999
    }
  })));
}
const iStyles = {
  head: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1fr 1fr 32px',
    gap: 16,
    alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1fr 1fr 32px',
    gap: 16,
    alignItems: 'center',
    padding: '14px 22px'
  }
};
window.BillingScreen = BillingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/BillingScreen.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Login.jsx
try { (() => {
/* global React */
function Login({
  onSubmit
}) {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const [email, setEmail] = React.useState('pipec@iroko.dev');
  const [pw, setPw] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: l.page
  }, /*#__PURE__*/React.createElement("div", {
    style: l.formSide
  }, /*#__PURE__*/React.createElement("div", {
    style: l.formCard
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 32 32",
    width: "24",
    height: "24"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "32",
    height: "32",
    rx: "6",
    fill: "var(--color-ink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "10",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "3.5",
    fill: "var(--color-cobalt)"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, "Iroko")), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Sign in"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 10px',
      fontSize: 40,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Vuelve a tu tronco."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 28px',
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, "Contin\xFAa con la organizaci\xF3n donde estabas trabajando."), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit?.();
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    icon: "mail",
    value: email,
    onChange: setEmail,
    type: "email",
    placeholder: "tu@dominio.com"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Contrase\xF1a",
    icon: "lock",
    value: pw,
    onChange: setPw,
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    trailing: /*#__PURE__*/React.createElement("a", {
      style: {
        fontSize: 12,
        color: 'var(--color-iron)',
        fontWeight: 600
      }
    }, "Olvid\xE9 mi contrase\xF1a")
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "btn btn-iron",
    style: {
      height: 44,
      fontSize: 14,
      justifyContent: 'center',
      marginTop: 4
    }
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn-outline",
    style: {
      height: 44,
      fontSize: 14,
      justifyContent: 'center',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "wand-sparkles",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Enviarme un magic link"), /*#__PURE__*/React.createElement("div", {
    style: l.divider
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      fontSize: 9
    }
  }, "O contin\xFAa con")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: l.oauth
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 48 48",
    width: "14",
    height: "14"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#FFC107",
    d: "M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FF3D00",
    d: "M6.3 14.7l6.6 4.8C14.6 16 18.9 13.7 24 13.7c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.6 6.3 14.7z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#4CAF50",
    d: "M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 40.4 16.2 45 24 45z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#1976D2",
    d: "M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 36 45 30.5 45 24c0-1.2-.1-2.4-.4-3.5z"
  })), "Google"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: l.oauth
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 16 16",
    width: "14",
    height: "14"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M8 .2C3.6.2 0 3.8 0 8.2c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.6.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3.7 0 1.4.1 2 .3 1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.4v2c0 .2.1.5.5.4 3.2-1.1 5.5-4.1 5.5-7.6C16 3.8 12.4.2 8 .2z"
  })), "GitHub")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '20px 0 0',
      fontSize: 12,
      color: 'var(--text-tertiary)',
      textAlign: 'center'
    }
  }, "\xBFNo tienes cuenta? ", /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--color-iron)',
      fontWeight: 600
    }
  }, "Crear una"))))), /*#__PURE__*/React.createElement("aside", {
    style: l.brandSide
  }, /*#__PURE__*/React.createElement("div", {
    style: l.gridOverlay
  }), /*#__PURE__*/React.createElement("div", {
    style: l.glow
  }), /*#__PURE__*/React.createElement("div", {
    style: l.brandInner
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-gold)'
    }
  }, "Proverbio Akan"), /*#__PURE__*/React.createElement("blockquote", {
    className: "display-italic",
    style: l.quote
  }, "\"Antes de cortar el iroko, se le pide permiso al esp\xEDritu del \xE1rbol \u2014 porque sin tronco, no hay ramas.\""), /*#__PURE__*/React.createElement("hr", {
    className: "rule rule--gold",
    style: {
      width: 80,
      marginTop: 4,
      marginBottom: 4,
      borderColor: 'rgba(217,164,65,0.4)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: l.tree
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 200",
    width: "200",
    height: "200"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "hud",
    cx: "50%",
    cy: "50%",
    r: "50%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(255,58,58,0.35)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(255,58,58,0)"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "92",
    fill: "url(#hud)"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "rgba(230,232,235,0.12)",
    strokeWidth: "0.5",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "90"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "60"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "30"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "100",
    y1: "0",
    x2: "100",
    y2: "200"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "100",
    x2: "200",
    y2: "100"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "70",
    fill: "none",
    stroke: "#ff3a3a",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "40",
    fill: "none",
    stroke: "#4682bf",
    strokeWidth: "1.6",
    strokeDasharray: "3 4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "14",
    fill: "#0047ab"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "5",
    fill: "#ff3a3a"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "30",
    r: "4",
    fill: "#ff3a3a"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "170",
    cy: "100",
    r: "4",
    fill: "#4682bf"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "170",
    r: "4",
    fill: "#ff3a3a"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "30",
    cy: "100",
    r: "4",
    fill: "#4682bf"
  }))), /*#__PURE__*/React.createElement("div", {
    style: l.beats
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: l.beatVal
  }, "1.0"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      color: 'rgba(245,236,218,0.5)',
      fontSize: 9
    }
  }, "VERSION")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: l.beatVal
  }, "23"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      color: 'rgba(245,236,218,0.5)',
      fontSize: 9
    }
  }, "COMMITS")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: l.beatVal
  }, "\u221E"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      color: 'rgba(245,236,218,0.5)',
      fontSize: 9
    }
  }, "RAMAS"))))));
}
function Field({
  label,
  icon,
  value,
  onChange,
  type,
  placeholder,
  trailing
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, label), trailing), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      strokeWidth: 1.5,
      width: 15,
      height: 15,
      color: 'var(--text-tertiary)',
      position: 'absolute',
      left: 13,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    type: type,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value),
    style: {
      height: 44,
      width: '100%',
      padding: '0 14px 0 38px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      color: 'var(--text-primary)'
    }
  })));
}
const l = {
  page: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight: '100vh',
    background: 'var(--background)'
  },
  formSide: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48
  },
  formCard: {
    maxWidth: 420,
    width: '100%'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
    position: 'relative'
  },
  oauth: {
    height: 44,
    padding: '0 14px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)'
  },
  brandSide: {
    background: 'var(--color-night)',
    color: 'var(--color-bone)',
    position: 'relative',
    overflow: 'hidden'
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px),' + 'linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  },
  glow: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,81,58,0.18), transparent 60%)',
    pointerEvents: 'none'
  },
  brandInner: {
    position: 'relative',
    zIndex: 1,
    padding: '56px 64px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    maxWidth: 560,
    justifyContent: 'center'
  },
  quote: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.3,
    color: 'var(--color-bone)'
  },
  tree: {
    display: 'flex',
    justifyContent: 'flex-start',
    margin: '12px 0'
  },
  beats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, auto)',
    gap: 36,
    paddingTop: 24,
    borderTop: '1px solid rgba(245,236,218,0.14)'
  },
  beatVal: {
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    color: 'var(--color-bone)',
    lineHeight: 1,
    marginBottom: 4
  }
};
window.Login = Login;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Login.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/MembersScreen.jsx
try { (() => {
/* global React */
const MEMBERS_SEED = [{
  name: 'Pipe Cárdenas',
  email: 'pipec@iroko.dev',
  role: 'owner',
  status: 'active',
  last: 'hace 2 min',
  initial: 'PC',
  tone: 'iron'
}, {
  name: 'Sofía Reyes',
  email: 'sofia@maker.cl',
  role: 'admin',
  status: 'active',
  last: 'hace 18 min',
  initial: 'SR',
  tone: 'gold'
}, {
  name: 'Tomás Villalba',
  email: 'tomas@maker.cl',
  role: 'member',
  status: 'active',
  last: 'hace 3 h',
  initial: 'TV',
  tone: 'indigo'
}, {
  name: 'Camila Núñez',
  email: 'cami@external.dev',
  role: 'member',
  status: 'invited',
  last: '—',
  initial: 'CN',
  tone: 'night'
}, {
  name: 'Andrés Soto',
  email: 'andres@iroko.dev',
  role: 'member',
  status: 'active',
  last: 'ayer',
  initial: 'AS',
  tone: 'iron'
}, {
  name: 'Luna Pérez',
  email: 'luna@iroko.dev',
  role: 'member',
  status: 'invited',
  last: '—',
  initial: 'LP',
  tone: 'gold'
}];
function MembersScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const [q, setQ] = React.useState('');
  const filtered = MEMBERS_SEED.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Equipo"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 0',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Miembros de la organizaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, MEMBERS_SEED.filter(m => m.status === 'active').length, " activos \xB7 ", MEMBERS_SEED.filter(m => m.status === 'invited').length, " pendientes")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    style: {
      padding: '10px 18px',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "user-plus",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Invitar miembro")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14,
      color: 'var(--text-tertiary)',
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Buscar miembros\u2026",
    style: {
      height: 36,
      width: '100%',
      padding: '0 12px 0 34px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 13,
      outline: 'none'
    }
  })), /*#__PURE__*/React.createElement("select", {
    className: "mono",
    style: {
      height: 36,
      padding: '0 28px 0 12px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos los roles"), /*#__PURE__*/React.createElement("option", null, "Owner"), /*#__PURE__*/React.createElement("option", null, "Admin"), /*#__PURE__*/React.createElement("option", null, "Member")), /*#__PURE__*/React.createElement("select", {
    className: "mono",
    style: {
      height: 36,
      padding: '0 28px 0 12px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos los estados"), /*#__PURE__*/React.createElement("option", null, "Activos"), /*#__PURE__*/React.createElement("option", null, "Invitados"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: m.head
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "Miembro"), /*#__PURE__*/React.createElement("span", null, "Rol"), /*#__PURE__*/React.createElement("span", null, "Estado"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\xDAltimo acceso"), /*#__PURE__*/React.createElement("span", null)), filtered.map((row, idx) => /*#__PURE__*/React.createElement("div", {
    key: row.email,
    style: {
      ...m.row,
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...m.avatar,
      background: tone(row.tone)
    }
  }, row.initial), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, row.name), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, row.email)), /*#__PURE__*/React.createElement("span", {
    style: m.roleChip(row.role)
  }, row.role), /*#__PURE__*/React.createElement("span", {
    style: m.statusChip(row.status)
  }, /*#__PURE__*/React.createElement("span", {
    style: m.statusDot(row.status)
  }), row.status === 'active' ? 'ACTIVO' : 'INVITADO'), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      textAlign: 'right',
      letterSpacing: '0.02em'
    }
  }, row.last), /*#__PURE__*/React.createElement("button", {
    style: m.iconBtn,
    title: "M\xE1s opciones"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "more-horizontal",
    style: {
      strokeWidth: 1.5,
      width: 15,
      height: 15,
      color: 'var(--text-tertiary)'
    }
  }))))));
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
    gap: 16,
    alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 32px',
    gap: 16,
    alignItems: 'center',
    padding: '14px 22px'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    color: '#fff',
    fontWeight: 700,
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)'
  },
  roleChip: role => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 999,
    justifySelf: 'start',
    background: role === 'owner' ? 'var(--color-iron)' : role === 'admin' ? 'rgba(184,81,58,0.16)' : 'var(--surface-2)',
    color: role === 'owner' ? '#fff' : role === 'admin' ? 'var(--color-iron)' : 'var(--text-secondary)',
    border: role === 'member' ? '1px solid var(--border)' : '0'
  }),
  statusChip: s => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 999,
    justifySelf: 'start',
    background: s === 'active' ? 'rgba(111,147,98,0.16)' : 'rgba(217,164,65,0.18)',
    color: s === 'active' ? '#4f6f44' : '#a87a1f'
  }),
  statusDot: s => ({
    width: 5,
    height: 5,
    borderRadius: 999,
    background: s === 'active' ? '#6f9362' : '#d9a441'
  }),
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'transparent',
    border: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
window.MembersScreen = MembersScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/MembersScreen.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/OverviewScreen.jsx
try { (() => {
/* global React */
function OverviewScreen({
  user,
  org
}) {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, org.name, " \xB7 Overview"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 4px',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Hola, ", user.name.split(' ')[0], "."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 16,
      color: 'var(--text-secondary)'
    }
  }, "Tres ramas crecieron esta semana. Cuatro miembros pendientes de aceptar invitaci\xF3n.")), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    icon: "dollar-sign",
    label: "MRR",
    value: "$4,820",
    delta: "+12.4%",
    trend: "up",
    period: "vs mes"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "tree-pine",
    label: "Proyectos activos",
    value: "12",
    delta: "+3",
    trend: "up",
    period: "esta semana"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "users",
    label: "Miembros",
    value: "38",
    delta: "+5",
    trend: "up",
    period: "este mes"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "activity",
    label: "Uptime",
    value: "98.7%",
    delta: "-0.2%",
    trend: "down",
    period: "\xFAlt. 30 d"
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(RevenueCard, null), /*#__PURE__*/React.createElement(ActivityFeed, null)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Proyectos recientes"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: {
      margin: '4px 0 0',
      fontSize: 28,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Las ramas activas")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Nuevo proyecto")), /*#__PURE__*/React.createElement(ProjectsTable, null)));
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  delta,
  trend,
  period
}) {
  const isUp = trend === 'up';
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: '18px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow",
    style: {
      fontSize: 10
    }
  }, label), /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      strokeWidth: 1.25,
      width: 17,
      height: 17,
      color: 'var(--text-tertiary)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      background: isUp ? 'rgba(111,147,98,0.16)' : 'rgba(193,69,52,0.14)',
      color: isUp ? '#4f6f44' : 'var(--color-error)',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700
    }
  }, delta), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, period)));
}

// ─── Revenue Card with simple chart ──────────────────────────
function RevenueCard() {
  // Stylized bar chart, no library
  const data = [42, 48, 51, 46, 55, 58, 52, 60, 64, 68, 72, 78];
  const max = Math.max(...data);
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Ingresos \xB7 \xFAltimos 12 meses"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      marginTop: 8,
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, "$48,720"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 4,
      letterSpacing: '0.04em'
    }
  }, "+$5,420 vs per\xEDodo anterior")), /*#__PURE__*/React.createElement("select", {
    className: "mono",
    style: {
      padding: '5px 10px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 11,
      color: 'var(--text-secondary)',
      outline: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", null, "12 meses"), /*#__PURE__*/React.createElement("option", null, "30 d\xEDas"), /*#__PURE__*/React.createElement("option", null, "7 d\xEDas"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length}, 1fr)`,
      gap: 6,
      alignItems: 'end',
      height: 160
    }
  }, data.map((d, i) => {
    const isLast = i === data.length - 1;
    const stopA = 0.30 + i / data.length * 0.45; // poppy
    const stopB = 0.15 + i / data.length * 0.25; // cobalt
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: `${d / max * 100}%`,
        background: isLast ? 'var(--color-poppy)' : `linear-gradient(to top, rgba(217,33,33,${stopA}), rgba(0,71,171,${stopB}))`,
        borderRadius: '4px 4px 2px 2px'
      }
    });
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length}, 1fr)`,
      gap: 6,
      marginTop: 10
    }
  }, ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "mono",
    style: {
      fontSize: 9,
      color: 'var(--text-tertiary)',
      textAlign: 'center',
      letterSpacing: '0.05em'
    }
  }, m))));
}

// ─── Activity Feed ───────────────────────────────────────────
function ActivityFeed() {
  const items = [{
    who: 'Pipe',
    what: 'creó el proyecto',
    target: 'ace-jewelry · checkout-v2',
    when: 'hace 2 min',
    icon: 'plus'
  }, {
    who: 'Sofía',
    what: 'invitó a',
    target: 'tomas@maker.cl',
    when: 'hace 18 min',
    icon: 'user-plus'
  }, {
    who: 'Stripe',
    what: 'cobró',
    target: '$49 · Studio · ace',
    when: 'hace 1 h',
    icon: 'credit-card'
  }, {
    who: 'Tomás',
    what: 'desplegó',
    target: 'maker-lab · production',
    when: 'hace 3 h',
    icon: 'rocket'
  }, {
    who: 'System',
    what: 'rotó keys de',
    target: 'supabase service role',
    when: 'ayer',
    icon: 'key-round'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Actividad"), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '14px 0 0',
      display: 'flex',
      flexDirection: 'column'
    }
  }, items.map((it, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 0',
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 5,
      background: 'rgba(184,81,58,0.10)',
      color: 'var(--color-iron)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": it.icon,
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: 600
    }
  }, it.who), ' ', /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, it.what), ' ', /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: 'var(--text-secondary)',
      fontSize: 12
    }
  }, it.target)), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.06em',
      marginTop: 2
    }
  }, it.when))))));
}

// ─── Projects Table ──────────────────────────────────────────
function ProjectsTable() {
  const rows = [{
    name: 'ace-jewelry',
    env: 'prod',
    members: 4,
    status: 'active',
    lastDeploy: 'hace 2 min'
  }, {
    name: 'maker-lab-cl',
    env: 'prod',
    members: 7,
    status: 'active',
    lastDeploy: 'hace 3 h'
  }, {
    name: 'pipec.cl',
    env: 'prod',
    members: 1,
    status: 'active',
    lastDeploy: 'ayer'
  }, {
    name: 'iot-greenhouse',
    env: 'staging',
    members: 2,
    status: 'building',
    lastDeploy: 'ahora'
  }, {
    name: 'invoice-uv-prints',
    env: 'preview',
    members: 1,
    status: 'idle',
    lastDeploy: 'hace 6 d'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: tStyles.head
  }, /*#__PURE__*/React.createElement("span", null, "Proyecto"), /*#__PURE__*/React.createElement("span", null, "Entorno"), /*#__PURE__*/React.createElement("span", null, "Miembros"), /*#__PURE__*/React.createElement("span", null, "Estado"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\xDAltimo deploy")), rows.map((r, idx) => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    style: {
      ...tStyles.row,
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: tStyles.dot
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "folder",
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13,
      color: 'var(--color-iron)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, r.name)), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: tStyles.envChip(r.env)
  }, r.env), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, r.members), /*#__PURE__*/React.createElement("span", {
    style: tStyles.statusChip(r.status)
  }, /*#__PURE__*/React.createElement("span", {
    style: tStyles.statusDot(r.status)
  }), r.status), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      textAlign: 'right',
      letterSpacing: '0.02em'
    }
  }, r.lastDeploy))));
}
const tStyles = {
  head: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 16,
    alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 16,
    alignItems: 'center',
    padding: '14px 22px'
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 5,
    background: 'rgba(184,81,58,0.10)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  envChip: env => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 4,
    background: env === 'prod' ? 'rgba(111,147,98,0.16)' : env === 'staging' ? 'rgba(217,164,65,0.18)' : 'rgba(60,79,115,0.16)',
    color: env === 'prod' ? '#4f6f44' : env === 'staging' ? '#a87a1f' : '#2a3a5a',
    justifySelf: 'start'
  }),
  statusChip: status => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 999,
    background: status === 'active' ? 'rgba(111,147,98,0.16)' : status === 'building' ? 'rgba(217,164,65,0.18)' : 'var(--surface-2)',
    color: status === 'active' ? '#4f6f44' : status === 'building' ? '#a87a1f' : 'var(--text-tertiary)',
    justifySelf: 'start'
  }),
  statusDot: status => ({
    width: 5,
    height: 5,
    borderRadius: 999,
    background: status === 'active' ? '#6f9362' : status === 'building' ? '#d9a441' : 'var(--text-tertiary)'
  })
};
window.OverviewScreen = OverviewScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/OverviewScreen.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/ProjectsScreen.jsx
try { (() => {
/* global React */
function ProjectsScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Bosque"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 0',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Tus proyectos"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, "Cada proyecto es una rama que crece del mismo tronco Iroko.")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    style: {
      padding: '10px 18px',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Nuevo proyecto")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, [{
    name: 'ace-jewelry',
    env: 'prod',
    desc: 'Checkout v2 + analytics realtime',
    tone: 'iron'
  }, {
    name: 'maker-lab-cl',
    env: 'prod',
    desc: 'Plataforma de cursos + comunidad',
    tone: 'gold'
  }, {
    name: 'pipec.cl',
    env: 'prod',
    desc: 'Sitio personal + blog técnico',
    tone: 'indigo'
  }, {
    name: 'iot-greenhouse',
    env: 'staging',
    desc: 'Telemetría ESP32 + dashboards',
    tone: 'iron'
  }, {
    name: 'invoice-uv-prints',
    env: 'preview',
    desc: 'Cotizador + órdenes UV',
    tone: 'gold'
  }, {
    name: 'rituales-tarot',
    env: 'idea',
    desc: 'Experimento de UX místico',
    tone: 'indigo'
  }].map(p => /*#__PURE__*/React.createElement("article", {
    key: p.name,
    className: "card",
    style: {
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 6,
      background: tone2(p.tone),
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "folder",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 4,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: envBg(p.env),
      color: envFg(p.env)
    }
  }, p.env)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "users",
    style: {
      strokeWidth: 1.5,
      width: 11,
      height: 11,
      verticalAlign: 'middle',
      marginRight: 4
    }
  }), "4"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "git-branch",
    style: {
      strokeWidth: 1.5,
      width: 11,
      height: 11,
      verticalAlign: 'middle',
      marginRight: 4
    }
  }), "main"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginLeft: 'auto'
    }
  }, "hace 2 h"))))));
}
function tone2(t) {
  return t === 'iron' ? 'var(--color-iron)' : t === 'gold' ? 'var(--color-gold)' : 'var(--color-indigo)';
}
function envBg(e) {
  return e === 'prod' ? 'rgba(111,147,98,0.16)' : e === 'staging' ? 'rgba(217,164,65,0.18)' : e === 'preview' ? 'rgba(60,79,115,0.16)' : 'var(--surface-2)';
}
function envFg(e) {
  return e === 'prod' ? '#4f6f44' : e === 'staging' ? '#a87a1f' : e === 'preview' ? '#2a3a5a' : 'var(--text-tertiary)';
}
window.ProjectsScreen = ProjectsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/ProjectsScreen.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/SettingsScreen.jsx
try { (() => {
/* global React */
function SettingsScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const [tab, setTab] = React.useState('general');
  const tabs = [{
    id: 'general',
    label: 'General'
  }, {
    id: 'security',
    label: 'Seguridad'
  }, {
    id: 'integrations',
    label: 'Integraciones'
  }, {
    id: 'danger',
    label: 'Zona peligrosa'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Configuraci\xF3n"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 0',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Ajustes de la organizaci\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    style: {
      background: 'transparent',
      border: 0,
      padding: '10px 18px',
      fontSize: 13,
      fontWeight: tab === t.id ? 700 : 500,
      color: tab === t.id ? 'var(--color-iron)' : 'var(--text-secondary)',
      borderBottom: tab === t.id ? '2px solid var(--color-iron)' : '2px solid transparent',
      marginBottom: -1,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, t.label))), tab === 'general' && /*#__PURE__*/React.createElement(GeneralPanel, null), tab === 'security' && /*#__PURE__*/React.createElement(SecurityPanel, null), tab === 'integrations' && /*#__PURE__*/React.createElement(IntegrationsPanel, null), tab === 'danger' && /*#__PURE__*/React.createElement(DangerPanel, null));
}
function GeneralPanel() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Identidad",
    sub: "C\xF3mo se ve tu organizaci\xF3n en facturas, invitaciones y emails."
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Nombre",
    defaultValue: "Ace Jewelry"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Slug",
    defaultValue: "ace-jewelry",
    mono: true,
    hint: "usado en URLs \xB7 ace.iroko.dev"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email de facturaci\xF3n",
    defaultValue: "billing@ace-jewelry.com"
  })), /*#__PURE__*/React.createElement(Panel, {
    title: "Preferencias",
    sub: "C\xF3mo se comporta el panel para todos los miembros."
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Modo oscuro como default",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Notificaciones por email",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Webhooks de actividad a Slack"
  })));
}
function SecurityPanel() {
  return /*#__PURE__*/React.createElement(Panel, {
    title: "Autenticaci\xF3n",
    sub: "Asegura los accesos a esta organizaci\xF3n."
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Requerir MFA a todos los miembros",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Auto-cerrar sesi\xF3n tras 30 min"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Dominios permitidos",
    defaultValue: "iroko.dev, maker.cl",
    mono: true,
    hint: "separados por coma \xB7 solo emails de estos dominios pueden ser invitados"
  }));
}
function IntegrationsPanel() {
  const ints = [{
    name: 'Supabase',
    desc: 'Base de datos + auth + storage',
    icon: 'database',
    connected: true
  }, {
    name: 'Stripe',
    desc: 'Suscripciones + portal cliente',
    icon: 'credit-card',
    connected: true
  }, {
    name: 'Slack',
    desc: 'Notificaciones de actividad',
    icon: 'message-square',
    connected: false
  }, {
    name: 'GitHub',
    desc: 'Auto-deploy desde el repo',
    icon: 'github',
    connected: false
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, ints.map((it, idx) => /*#__PURE__*/React.createElement("div", {
    key: it.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '18px 22px',
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 6,
      background: 'var(--surface-2)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": it.icon,
    style: {
      strokeWidth: 1.25,
      width: 18,
      height: 18
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, it.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, it.desc)), it.connected ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      padding: '4px 10px',
      borderRadius: 999,
      background: 'rgba(111,147,98,0.16)',
      color: '#4f6f44'
    }
  }, "\u25CF CONECTADO") : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: '6px 14px',
      fontSize: 12
    }
  }, "Conectar"))));
}
function DangerPanel() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-elevated)',
      border: '1px solid rgba(193,69,52,0.32)',
      borderRadius: 10,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--color-error)'
    }
  }, "Transferir propiedad"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 12px',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "El nuevo owner debe aceptar desde su cuenta. T\xFA quedar\xE1s como admin."), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'rgba(193,69,52,0.10)',
      color: 'var(--color-error)',
      border: '1px solid rgba(193,69,52,0.32)',
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Transferir")), /*#__PURE__*/React.createElement("hr", {
    style: {
      border: 0,
      borderTop: '1px solid var(--border)',
      margin: 0
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--color-error)'
    }
  }, "Eliminar organizaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 12px',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "Esto elimina todos los proyectos, miembros y facturaci\xF3n. No se puede deshacer."), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'var(--color-error)',
      color: '#fff',
      border: 0,
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Eliminar organizaci\xF3n")));
}
function Panel({
  title,
  sub,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, children));
}
function Field({
  label,
  defaultValue,
  mono,
  hint
}) {
  const [val, setVal] = React.useState(defaultValue ?? '');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 24,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap'
    }
  }, label), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    value: val,
    onChange: e => setVal(e.target.value),
    style: {
      height: 36,
      width: '100%',
      padding: '0 12px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none'
    }
  }), hint && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-mono)'
    }
  }, hint)));
}
function Toggle({
  label,
  defaultOn
}) {
  const [on, setOn] = React.useState(!!defaultOn);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      flex: 1,
      minWidth: 0
    }
  }, label), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOn(!on),
    style: {
      flex: 'none',
      width: 36,
      height: 20,
      borderRadius: 999,
      background: on ? 'var(--color-iron)' : 'var(--surface-3)',
      border: 0,
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 180ms'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: on ? 18 : 2,
      width: 16,
      height: 16,
      borderRadius: 999,
      background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      transition: 'left 180ms'
    }
  })));
}
window.SettingsScreen = SettingsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Sidebar.jsx
try { (() => {
/* global React */
const NAV_ITEMS = [{
  id: 'overview',
  icon: 'layout-grid',
  label: 'Overview'
}, {
  id: 'projects',
  icon: 'folder-tree',
  label: 'Proyectos'
}, {
  id: 'members',
  icon: 'users',
  label: 'Miembros'
}, {
  id: 'billing',
  icon: 'credit-card',
  label: 'Billing'
}, {
  id: 'settings',
  icon: 'settings',
  label: 'Ajustes'
}];
const ORG_LIST = [{
  id: 'ace',
  name: 'Ace Jewelry',
  plan: 'Studio',
  initial: 'AJ',
  tone: 'iron'
}, {
  id: 'maker',
  name: 'Maker Lab CL',
  plan: 'Studio',
  initial: 'ML',
  tone: 'gold'
}, {
  id: 'pipec',
  name: 'Pipec personal',
  plan: 'Free',
  initial: 'PC',
  tone: 'night'
}];
function Sidebar({
  active,
  onNavigate,
  currentOrg = ORG_LIST[0],
  onSwitchOrg
}) {
  const [orgOpen, setOrgOpen] = React.useState(false);
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("aside", {
    style: s.aside
  }, /*#__PURE__*/React.createElement("div", {
    style: s.brandStrip
  }, /*#__PURE__*/React.createElement("span", {
    style: s.markBox
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 28 28",
    width: "20",
    height: "20"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "14",
    r: "8.5",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "14",
    r: "3",
    fill: "var(--color-cobalt)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "3",
    x2: "14",
    y2: "5.5",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "22.5",
    x2: "14",
    y2: "25",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: s.brand
  }, "Iroko")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOrgOpen(!orgOpen),
    style: s.orgBtn
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.orgAvatar,
      background: orgTone(currentOrg.tone)
    }
  }, currentOrg.initial), /*#__PURE__*/React.createElement("span", {
    style: s.orgInfo
  }, /*#__PURE__*/React.createElement("span", {
    style: s.orgName
  }, currentOrg.name), /*#__PURE__*/React.createElement("span", {
    style: s.orgPlan
  }, "Plan ", currentOrg.plan)), /*#__PURE__*/React.createElement("i", {
    "data-lucide": orgOpen ? 'chevron-up' : 'chevron-down',
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14,
      color: 'var(--text-tertiary)'
    }
  })), orgOpen && /*#__PURE__*/React.createElement("div", {
    style: s.orgList
  }, ORG_LIST.map(org => /*#__PURE__*/React.createElement("button", {
    key: org.id,
    onClick: () => {
      onSwitchOrg?.(org);
      setOrgOpen(false);
    },
    style: {
      ...s.orgListItem,
      background: org.id === currentOrg.id ? 'var(--surface-3)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.orgAvatar,
      background: orgTone(org.tone),
      width: 22,
      height: 22,
      fontSize: 10
    }
  }, org.initial), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      textAlign: 'left',
      flex: 1
    }
  }, org.name), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, org.plan))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border)',
      margin: '6px 0'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: s.orgListItem
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.orgAvatar,
      background: 'var(--surface-3)',
      color: 'var(--text-secondary)',
      width: 22,
      height: 22
    }
  }, "+"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, "Nueva organizaci\xF3n")))), /*#__PURE__*/React.createElement("nav", {
    style: s.nav
  }, NAV_ITEMS.map(it => {
    const isActive = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onNavigate?.(it.id),
      style: {
        ...s.item,
        background: isActive ? 'rgba(184,81,58,0.10)' : 'transparent',
        color: isActive ? 'var(--color-iron)' : 'var(--text-secondary)',
        fontWeight: isActive ? 700 : 500
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": it.icon,
      style: {
        strokeWidth: isActive ? 1.5 : 1.25,
        width: 17,
        height: 17
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, it.label), isActive && /*#__PURE__*/React.createElement("span", {
      style: s.activeDot
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: s.footer
  }, /*#__PURE__*/React.createElement("div", {
    style: s.engineCard
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      fontSize: 9,
      opacity: 0.6
    }
  }, "Build"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em'
    }
  }, "iroko \xB7 v1.0"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 9,
      color: 'var(--color-iron)',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "\u25CF stable")))));
}
function orgTone(tone) {
  if (tone === 'iron') return 'var(--color-iron)';
  if (tone === 'gold') return 'var(--color-gold)';
  return 'var(--color-night)';
}
const s = {
  aside: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    background: 'var(--surface-2)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column'
  },
  brandStrip: {
    height: 60,
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid var(--border)'
  },
  markBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'var(--color-night)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brand: {
    fontSize: 22,
    lineHeight: 1,
    color: 'var(--text-primary)'
  },
  orgBtn: {
    width: '100%',
    margin: '14px 0 8px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer'
  },
  orgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 6,
    color: '#fff',
    fontWeight: 700,
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    flex: 'none'
  },
  orgInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    textAlign: 'left',
    minWidth: 0
  },
  orgName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  orgPlan: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em'
  },
  orgList: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
    boxShadow: 'var(--shadow-md)'
  },
  orgListItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 4,
    border: 0,
    background: 'transparent',
    cursor: 'pointer'
  },
  nav: {
    flex: 1,
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    borderRadius: 6,
    border: 0,
    textAlign: 'left',
    transition: 'background 180ms, color 180ms',
    cursor: 'pointer',
    position: 'relative'
  },
  activeDot: {
    marginLeft: 'auto',
    width: 5,
    height: 5,
    borderRadius: 999,
    background: 'var(--color-iron)'
  },
  footer: {
    padding: 12
  },
  engineCard: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px'
  }
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Sidebar.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Topbar.jsx
try { (() => {
/* global React */
const ROUTE_LABELS = {
  overview: 'Overview',
  projects: 'Proyectos',
  members: 'Miembros',
  billing: 'Billing',
  settings: 'Ajustes'
};
function Topbar({
  user,
  org,
  route,
  onSignOut
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("header", {
    style: t.bar
  }, /*#__PURE__*/React.createElement("div", {
    style: t.crumbRow
  }, /*#__PURE__*/React.createElement("span", {
    style: t.crumbOrg
  }, org.name), /*#__PURE__*/React.createElement("span", {
    style: t.crumbSep
  }, "/"), /*#__PURE__*/React.createElement("span", {
    style: t.crumbPage
  }, ROUTE_LABELS[route] || route)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: t.searchWrap
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14,
      color: 'var(--text-tertiary)',
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar\u2026",
    style: t.search
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: t.kbd
  }, "\u2318 K")), /*#__PURE__*/React.createElement("button", {
    style: t.iconBtn,
    title: "Notificaciones"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "bell",
    style: {
      strokeWidth: 1.5,
      width: 17,
      height: 17,
      color: 'var(--text-secondary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: t.notiDot
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(!menuOpen),
    style: t.avatarBtn
  }, /*#__PURE__*/React.createElement("span", {
    style: t.avatar
  }, initials(user.name))), menuOpen && /*#__PURE__*/React.createElement("div", {
    style: t.menu
  }, /*#__PURE__*/React.createElement("div", {
    style: t.menuHeader
  }, /*#__PURE__*/React.createElement("span", {
    style: t.menuName
  }, user.name), /*#__PURE__*/React.createElement("span", {
    style: t.menuMail
  }, user.email)), /*#__PURE__*/React.createElement("div", {
    style: t.menuSep
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "user",
    label: "Perfil"
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "settings",
    label: "Preferencias"
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "keyboard",
    label: "Atajos",
    hint: "\u2318 /"
  }), /*#__PURE__*/React.createElement("div", {
    style: t.menuSep
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "moon",
    label: "Cambiar tema"
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "globe",
    label: "Idioma",
    hint: "ES"
  }), /*#__PURE__*/React.createElement("div", {
    style: t.menuSep
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "log-out",
    label: "Cerrar sesi\xF3n",
    tone: "error",
    onClick: onSignOut
  })))));
}
function MenuItem({
  icon,
  label,
  hint,
  tone,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...t.menuItem,
      color: tone === 'error' ? 'var(--color-error)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      strokeWidth: 1.25,
      width: 15,
      height: 15
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 500
    }
  }, label), hint && /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.08em'
    }
  }, hint));
}
function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
const t = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    height: 60,
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(245,236,218,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border)'
  },
  crumbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  crumbOrg: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap'
  },
  crumbSep: {
    color: 'var(--text-tertiary)',
    fontSize: 14,
    opacity: 0.5
  },
  crumbPage: {
    fontFamily: 'var(--font-sans)',
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--text-primary)'
  },
  searchWrap: {
    position: 'relative'
  },
  search: {
    height: 32,
    width: 240,
    padding: '0 56px 0 32px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    color: 'var(--text-primary)'
  },
  kbd: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 10,
    color: 'var(--text-tertiary)',
    background: 'var(--surface-2)',
    padding: '1px 6px',
    borderRadius: 3,
    border: '1px solid var(--border)'
  },
  iconBtn: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'transparent',
    border: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notiDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 999,
    background: 'var(--color-iron)',
    border: '2px solid var(--background)'
  },
  avatarBtn: {
    background: 'transparent',
    border: 0,
    padding: 0,
    cursor: 'pointer'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'var(--color-iron)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 8px)',
    width: 240,
    padding: 8,
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 30
  },
  menuHeader: {
    padding: '8px 10px 10px'
  },
  menuName: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  menuMail: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 2
  },
  menuSep: {
    height: 1,
    background: 'var(--border)',
    margin: '4px -2px'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '7px 10px',
    borderRadius: 4,
    background: 'transparent',
    border: 0,
    cursor: 'pointer',
    textAlign: 'left'
  }
};
window.Topbar = Topbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-dashboard/Topbar.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/CtaBlock.jsx
try { (() => {
/* global React */
function CtaBlock({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: ctaStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: ctaStyles.glow
  }), /*#__PURE__*/React.createElement("div", {
    style: ctaStyles.inner
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-gold)'
    }
  }, "Step \xB7 Final \xB7 Despliega"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: ctaStyles.h2
  }, "Tu pr\xF3ximo micro-SaaS", /*#__PURE__*/React.createElement("br", null), "empieza esta tarde."), /*#__PURE__*/React.createElement("p", {
    style: ctaStyles.lead
  }, "Clona el repo, ejecuta ", /*#__PURE__*/React.createElement("code", {
    style: ctaStyles.code
  }, "pnpm install"), ", pega tus keys de Supabase y Stripe, y rebrandea. Si tardas m\xE1s de una tarde, abrimos un issue juntos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    onClick: () => onNavigate?.('signup')
  }, "Empezar gratis \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: 'transparent',
      color: 'var(--color-bone)',
      border: '1px solid rgba(245,236,218,0.2)',
      padding: '13px 28px',
      borderRadius: 8
    }
  }, "Ver repo en GitHub"))))));
}
const ctaStyles = {
  card: {
    position: 'relative',
    background: 'var(--color-night)',
    color: 'var(--color-bone)',
    borderRadius: 18,
    padding: 64,
    overflow: 'hidden',
    textAlign: 'center',
    backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.04) 1px, transparent 1px),' + 'linear-gradient(to bottom, rgba(245,236,218,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px'
  },
  glow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(184,81,58,0.18), transparent 60%)',
    pointerEvents: 'none'
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    maxWidth: 640,
    margin: '0 auto',
    alignItems: 'center'
  },
  h2: {
    margin: 0,
    fontSize: 64,
    lineHeight: 1,
    color: 'var(--color-bone)'
  },
  lead: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.6,
    color: 'rgba(245,236,218,0.7)'
  },
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    background: 'rgba(245,236,218,0.10)',
    color: 'var(--color-bone)',
    padding: '2px 8px',
    borderRadius: 4
  }
};
window.CtaBlock = CtaBlock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/CtaBlock.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/FeatureGrid.jsx
try { (() => {
/* global React */
const FEATURES = [{
  icon: 'shield-check',
  title: 'Autenticación lista',
  body: 'Login con email + password, magic link, OAuth (Google, GitHub) y MFA con recovery codes — todo desde Supabase Auth.'
}, {
  icon: 'building-2',
  title: 'Orgs + permisos',
  body: 'Cada cuenta soporta múltiples organizaciones, invitaciones por email, y roles owner / admin / member listos para usar.'
}, {
  icon: 'credit-card',
  title: 'Billing con Stripe',
  body: 'Suscripciones, trials, upgrades y portal de cliente. Webhooks reciben y reconcilian — solo conectas tus keys.'
}, {
  icon: 'globe',
  title: 'Internacionalización',
  body: 'next-intl configurado con es/en de fábrica, mensajes tipados, y switcher de idioma respetando rutas.'
}, {
  icon: 'moon',
  title: 'Light + Dark',
  body: 'Theme provider con persistencia, tokens semánticos en CSS, y dark mode que respira la noche-tierra de Iroko.'
}, {
  icon: 'database',
  title: 'Esquema Supabase',
  body: 'Migraciones SQL para profiles, organizations, memberships, invitations, subscriptions — todo con RLS.'
}];
function FeatureGrid() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head section-head--centered"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Step \xB7 02 \xB7 Tronco"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: {
      fontSize: 56,
      lineHeight: 1,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Todo lo que reescrib\xEDas,", /*#__PURE__*/React.createElement("br", null), "ya est\xE1 aqu\xED."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 580,
      fontSize: 17,
      lineHeight: 1.6,
      color: 'var(--text-secondary)'
    }
  }, "Cada feature est\xE1 peleada por c\xF3digo de producci\xF3n real, no por un README. Si la usas en cliente, sabes que ya pas\xF3 por el siguiente proyecto.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, FEATURES.map(f => /*#__PURE__*/React.createElement("article", {
    key: f.title,
    style: featStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: featStyles.iconBox
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": f.icon,
    style: {
      strokeWidth: 1.25,
      width: 22,
      height: 22,
      color: 'var(--color-iron)'
    }
  })), /*#__PURE__*/React.createElement("h3", {
    style: featStyles.title
  }, f.title), /*#__PURE__*/React.createElement("p", {
    style: featStyles.body
  }, f.body))))));
}
const featStyles = {
  card: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    transition: 'border-color 200ms, transform 200ms'
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: 'rgba(184,81,58,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(184,81,58,0.18)'
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    color: 'var(--text-primary)'
  },
  body: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text-secondary)'
  }
};
window.FeatureGrid = FeatureGrid;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/FeatureGrid.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/Footer.jsx
try { (() => {
/* global React */
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: fStyles.footer
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: fStyles.grid
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: fStyles.brandRow
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 36 36",
    width: "22",
    height: "22"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "36",
    height: "36",
    rx: "6",
    fill: "var(--color-ink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "11",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "4",
    fill: "var(--color-cobalt)"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, "Iroko")), /*#__PURE__*/React.createElement("p", {
    style: fStyles.small
  }, "El template multi-tenant que reh\xFAsas reescribir."), /*#__PURE__*/React.createElement("p", {
    className: "mono",
    style: {
      ...fStyles.small,
      opacity: 0.55
    }
  }, "\xA9 2026 pipec \xB7 v1.0")), /*#__PURE__*/React.createElement("div", {
    style: fStyles.col
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Producto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Features"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Precios"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Changelog"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Roadmap")), /*#__PURE__*/React.createElement("div", {
    style: fStyles.col
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Recursos"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Documentaci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Gu\xEDa de inicio"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Migraci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Comunidad")), /*#__PURE__*/React.createElement("div", {
    style: fStyles.col
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Compa\xF1\xEDa"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Manifiesto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Contacto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "GitHub"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Twitter"))), /*#__PURE__*/React.createElement("hr", {
    className: "rule",
    style: {
      margin: '40px 32px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: fStyles.bottom
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    }
  }, "pipec \xB7 iroko \xB7 made in cl"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    }
  }, "\u223C aprende del pasado \xB7 construye el futuro \u223C")));
}
const fStyles = {
  footer: {
    marginTop: 96,
    paddingBottom: 32
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: 32,
    padding: '64px 32px 0'
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  small: {
    margin: '0 0 4px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    maxWidth: 320
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  bottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px 0'
  }
};
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/Footer.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/Hero.jsx
try { (() => {
/* global React */
function Hero({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: heroStyles.section,
    className: "iroko-grid"
  }, /*#__PURE__*/React.createElement("div", {
    style: heroStyles.glowL
  }), /*#__PURE__*/React.createElement("div", {
    style: heroStyles.glowR
  }), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: heroStyles.inner
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Step \xB7 01 \xB7 Origen"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: heroStyles.h1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, "Un tronco com\xFAn"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, "para tus ", /*#__PURE__*/React.createElement("span", {
    style: heroStyles.iron
  }, "micro-saas"), ".")), /*#__PURE__*/React.createElement("p", {
    style: heroStyles.lead
  }, "Iroko es el template que reh\xFAsas reescribir cada vez. Autenticaci\xF3n, organizaciones, billing, internacionalizaci\xF3n \u2014 todo cableado a Supabase y listo para que rebrandees y despliegues tu siguiente proyecto en una tarde."), /*#__PURE__*/React.createElement("div", {
    style: heroStyles.ctas
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    onClick: () => onNavigate?.('signup')
  }, "Empezar gratis \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    onClick: () => onNavigate?.('docs')
  }, "Ver documentaci\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: heroStyles.proof
  }, /*#__PURE__*/React.createElement(Beat, {
    label: "Auth + MFA"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "Stripe billing"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "Orgs + RBAC"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "i18n \xB7 es/en"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "Dark mode"
  }))));
}
function Beat({
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)',
      whiteSpace: 'nowrap',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: 999,
      background: 'var(--color-poppy)',
      opacity: 0.85
    }
  }), label);
}
function Sep() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: 999,
      background: 'var(--border-strong)'
    }
  });
}
const heroStyles = {
  section: {
    position: 'relative',
    paddingTop: 80,
    paddingBottom: 120,
    overflow: 'hidden'
  },
  glowL: {
    position: 'absolute',
    left: '-10%',
    top: -120,
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,81,58,0.10), transparent 65%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  glowR: {
    position: 'absolute',
    right: '-15%',
    top: 200,
    width: 700,
    height: 700,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(217,164,65,0.08), transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 28
  },
  h1: {
    margin: '8px 0 0',
    fontSize: 'clamp(48px, 5.5vw, 76px)',
    lineHeight: 1.02,
    fontWeight: 500,
    color: 'var(--text-primary)'
  },
  iron: {
    color: 'var(--color-iron)'
  },
  lead: {
    margin: 0,
    maxWidth: 640,
    fontSize: 18,
    lineHeight: 1.6,
    color: 'var(--text-secondary)'
  },
  ctas: {
    display: 'flex',
    gap: 12,
    marginTop: 8
  },
  proof: {
    marginTop: 16,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18
  }
};
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/Navbar.jsx
try { (() => {
/* global React */
const NAV_ROUTES = [{
  id: 'product',
  label: 'Producto'
}, {
  id: 'pricing',
  label: 'Precios'
}, {
  id: 'docs',
  label: 'Documentación'
}, {
  id: 'changelog',
  label: 'Changelog'
}];
function Navbar({
  route,
  onNavigate
}) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      ...navStyles.nav,
      borderBottomColor: scrolled ? 'var(--border)' : 'transparent',
      background: scrolled ? 'rgba(245,236,218,0.86)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: navStyles.inner
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate?.('home'),
    style: navStyles.brand
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 36 36",
    width: "26",
    height: "26",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    width: "36",
    height: "36",
    rx: "6",
    fill: "var(--color-ink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "11",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "4",
    fill: "var(--color-cobalt)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "3",
    x2: "18",
    y2: "6.5",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "29.5",
    x2: "18",
    y2: "33",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: navStyles.brandText
  }, "Iroko")), /*#__PURE__*/React.createElement("div", {
    style: navStyles.links
  }, NAV_ROUTES.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => onNavigate?.(r.id),
    style: {
      ...navStyles.link,
      color: route === r.id ? 'var(--text-primary)' : 'var(--text-secondary)'
    }
  }, r.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: navStyles.signIn,
    onClick: () => onNavigate?.('login')
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement("button", {
    style: navStyles.cta,
    onClick: () => onNavigate?.('signup')
  }, "Empezar gratis ", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, "\u2192")))));
}
const navStyles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid transparent',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    transition: 'all 200ms ease'
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px'
  },
  brand: {
    background: 'transparent',
    border: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  brandText: {
    fontSize: 26,
    lineHeight: 1,
    color: 'var(--text-primary)'
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  link: {
    background: 'transparent',
    border: 0,
    padding: '8px 14px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
  },
  signIn: {
    background: 'transparent',
    border: 0,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap'
  },
  cta: {
    background: 'var(--color-ink)',
    color: 'var(--color-paper)',
    border: 0,
    borderRadius: 6,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap'
  }
};
window.Navbar = Navbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/Navbar.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/PricingTiers.jsx
try { (() => {
/* global React */
const TIERS = [{
  name: 'Personal',
  price: '$0',
  period: '/mes',
  desc: 'Para tu proyecto en solitario. Sin tarjeta.',
  cta: 'Empezar',
  features: ['1 organización', '3 proyectos', 'Hasta 5 miembros', 'Comunidad Discord'],
  featured: false
}, {
  name: 'Studio',
  price: '$49',
  period: '/mes',
  desc: 'Tu agencia y todos tus micro-SaaS bajo un mismo paraguas.',
  cta: 'Empezar Studio',
  features: ['Orgs ilimitadas', 'Proyectos ilimitados', 'Miembros ilimitados', 'White-label completo', 'Soporte prioritario'],
  featured: true
}, {
  name: 'Custom',
  price: 'A medida',
  period: '',
  desc: 'On-prem, SLA dedicado, integración con tu infra existente.',
  cta: 'Hablemos',
  features: ['Self-hosted Supabase', 'SSO + SAML', 'SLA 99.9%', 'Account manager dedicado'],
  featured: false
}];
function PricingTiers() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    style: {
      background: 'var(--surface-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head section-head--centered"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Step \xB7 03 \xB7 Ramas"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: {
      fontSize: 56,
      lineHeight: 1,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Precios sin ramas extra."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 560,
      fontSize: 17,
      lineHeight: 1.6,
      color: 'var(--text-secondary)'
    }
  }, "Comienza gratis. Cuando tu proyecto pase de \"tronco\" a \"bosque\", escalamos juntos.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
      maxWidth: 1080,
      margin: '0 auto',
      alignItems: 'start'
    }
  }, TIERS.map(t => /*#__PURE__*/React.createElement("article", {
    key: t.name,
    style: {
      ...priceStyles.card,
      ...(t.featured ? priceStyles.featured : null)
    }
  }, t.featured && /*#__PURE__*/React.createElement("span", {
    style: priceStyles.ribbon
  }, "M\xE1s popular"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...priceStyles.tierName,
      color: t.featured ? 'var(--color-bone)' : 'var(--text-primary)'
    }
  }, t.name), /*#__PURE__*/React.createElement("div", {
    style: {
      ...priceStyles.tierDesc,
      color: t.featured ? 'rgba(245,236,218,0.7)' : 'var(--text-secondary)'
    }
  }, t.desc), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      ...priceStyles.price,
      color: t.featured ? 'var(--color-bone)' : 'var(--text-primary)'
    }
  }, t.price, t.period && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 400,
      color: t.featured ? 'rgba(245,236,218,0.6)' : 'var(--text-secondary)'
    }
  }, t.period)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...priceStyles.cta,
      background: t.featured ? 'var(--color-iron)' : 'var(--surface-elevated)',
      color: t.featured ? '#fff' : 'var(--text-primary)',
      border: t.featured ? '0' : '1px solid var(--border-strong)'
    }
  }, t.cta), /*#__PURE__*/React.createElement("ul", {
    style: priceStyles.list
  }, t.features.map(f => /*#__PURE__*/React.createElement("li", {
    key: f,
    style: {
      ...priceStyles.li,
      color: t.featured ? 'rgba(245,236,218,0.86)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.featured ? 'var(--color-gold)' : 'var(--color-iron)',
      fontWeight: 700
    }
  }, "\xB7"), f))))))));
}
const priceStyles = {
  card: {
    position: 'relative',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  featured: {
    background: 'var(--color-night)',
    border: '1px solid var(--color-night)',
    transform: 'translateY(-12px)',
    boxShadow: 'var(--shadow-xl)'
  },
  ribbon: {
    position: 'absolute',
    top: -11,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--color-gold)',
    color: 'var(--color-night)',
    padding: '4px 12px',
    borderRadius: 999,
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase'
  },
  tierName: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.015em'
  },
  tierDesc: {
    fontSize: 13,
    lineHeight: 1.55,
    minHeight: 40
  },
  price: {
    fontSize: 40,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    marginTop: 6
  },
  cta: {
    height: 44,
    borderRadius: 8,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 14,
    marginTop: 8,
    cursor: 'pointer'
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '12px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  li: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 13,
    lineHeight: 1.5
  }
};
window.PricingTiers = PricingTiers;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/PricingTiers.jsx", error: String((e && e.message) || e) }); }

// design_handoff_iroko/iroko/ui_kits/iroko-marketing/Quote.jsx
try { (() => {
/* global React */
function Quote() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section section--tight"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: 760,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-iron)'
    }
  }, "Proverbio Akan"), /*#__PURE__*/React.createElement("blockquote", {
    className: "display-italic",
    style: {
      margin: 0,
      fontSize: 36,
      lineHeight: 1.3,
      color: 'var(--text-primary)'
    }
  }, "\"Antes de cortar el iroko, se le pide permiso al esp\xEDritu del \xE1rbol \u2014 porque sin tronco, no hay ramas.\""), /*#__PURE__*/React.createElement("hr", {
    className: "rule rule--gold",
    style: {
      width: 120
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "mono",
    style: {
      margin: 0,
      fontSize: 11,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, "La filosof\xEDa detr\xE1s del template")));
}
window.Quote = Quote;
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_iroko/iroko/ui_kits/iroko-marketing/Quote.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/BillingScreen.jsx
try { (() => {
/* global React */
function BillingScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const invoices = [{
    id: 'INV-2026-018',
    date: '01 may 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-017',
    date: '01 abr 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-016',
    date: '01 mar 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-015',
    date: '01 feb 2026',
    amount: '$49.00',
    status: 'paid'
  }, {
    id: 'INV-2026-014',
    date: '01 ene 2026',
    amount: '$49.00',
    status: 'paid'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 28
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Facturaci\xF3n"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 4px',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Plan y facturaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, "Tu plan actual, pr\xF3ximos cargos, y facturas descargables.")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 28,
      background: 'var(--color-night)',
      color: 'var(--color-bone)',
      border: '0',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 24,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-gold)'
    }
  }, "Plan actual"), /*#__PURE__*/React.createElement("div", {
    className: "display-italic",
    style: {
      fontSize: 48,
      lineHeight: 1,
      marginTop: 4,
      color: 'var(--color-bone)'
    }
  }, "Studio"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '10px 0 0',
      maxWidth: 480,
      fontSize: 15,
      color: 'rgba(245,236,218,0.7)',
      lineHeight: 1.55
    }
  }, "Orgs ilimitadas, proyectos ilimitados, miembros ilimitados, white-label completo. Pr\xF3xima factura el ", /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, "01 jun 2026"), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron"
  }, "Actualizar plan"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: 'transparent',
      color: 'var(--color-bone)',
      border: '1px solid rgba(245,236,218,0.2)',
      padding: '8px 16px',
      borderRadius: 6
    }
  }, "Portal Stripe \u2192"))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 36,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color: 'var(--color-bone)',
      lineHeight: 1
    }
  }, "$49", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 400,
      color: 'rgba(245,236,218,0.6)'
    }
  }, "/mes")), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'rgba(245,236,218,0.55)',
      marginTop: 6,
      letterSpacing: '0.16em',
      textTransform: 'uppercase'
    }
  }, "Renueva 01\xB7jun\xB726")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "M\xE9todo de pago"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 48,
      height: 32,
      borderRadius: 5,
      background: 'linear-gradient(135deg, #13110d 0%, #3a2c1f 100%)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-gold)',
      fontFamily: 'var(--font-mono)',
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.06em'
    }
  }, "VISA"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 14,
      color: 'var(--text-primary)',
      letterSpacing: '0.04em'
    }
  }, "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 4242"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 2
    }
  }, "vence 09/29 \xB7 Pipe C\xE1rdenas")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: '6px 14px',
      fontSize: 12
    }
  }, "Cambiar"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Uso este mes"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(UsageRow, {
    label: "Proyectos",
    value: 12,
    max: 50
  }), /*#__PURE__*/React.createElement(UsageRow, {
    label: "Miembros",
    value: 38,
    max: 100
  }), /*#__PURE__*/React.createElement(UsageRow, {
    label: "Storage",
    value: "2.4 GB",
    max: "50 GB",
    pct: 5
  })))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Historial"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      padding: '6px 12px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "download",
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13
    }
  }), "Exportar todo")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: iStyles.head
  }, /*#__PURE__*/React.createElement("span", null, "Factura"), /*#__PURE__*/React.createElement("span", null, "Fecha"), /*#__PURE__*/React.createElement("span", null, "Monto"), /*#__PURE__*/React.createElement("span", null, "Estado"), /*#__PURE__*/React.createElement("span", null)), invoices.map((inv, idx) => /*#__PURE__*/React.createElement("div", {
    key: inv.id,
    style: {
      ...iStyles.row,
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, inv.id), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, inv.date), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, inv.amount), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      padding: '3px 10px',
      borderRadius: 999,
      background: 'rgba(111,147,98,0.16)',
      color: '#4f6f44',
      justifySelf: 'start'
    }
  }, "\u25CF ", inv.status), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      justifySelf: 'end',
      padding: '6px 10px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "download",
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13
    }
  })))))));
}
function UsageRow({
  label,
  value,
  max,
  pct
}) {
  const numericPct = pct ?? (typeof value === 'number' && typeof max === 'number' ? Math.round(value / max * 100) : 0);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-primary)',
      fontWeight: 600
    }
  }, value), " / ", max)), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: 'var(--surface-2)',
      borderRadius: 999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${Math.max(numericPct, 4)}%`,
      background: 'var(--color-iron)',
      borderRadius: 999
    }
  })));
}
const iStyles = {
  head: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1fr 1fr 32px',
    gap: 16,
    alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr 1fr 1fr 32px',
    gap: 16,
    alignItems: 'center',
    padding: '14px 22px'
  }
};
window.BillingScreen = BillingScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/BillingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/Login.jsx
try { (() => {
/* global React */
function Login({
  onSubmit
}) {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const [email, setEmail] = React.useState('pipec@iroko.dev');
  const [pw, setPw] = React.useState('');
  return /*#__PURE__*/React.createElement("div", {
    style: l.page
  }, /*#__PURE__*/React.createElement("div", {
    style: l.formSide
  }, /*#__PURE__*/React.createElement("div", {
    style: l.formCard
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 40
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 32 32",
    width: "24",
    height: "24"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "32",
    height: "32",
    rx: "6",
    fill: "var(--color-ink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "10",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "3.5",
    fill: "var(--color-cobalt)"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, "Iroko")), /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Sign in"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 10px',
      fontSize: 40,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Vuelve a tu tronco."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 28px',
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, "Contin\xFAa con la organizaci\xF3n donde estabas trabajando."), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit?.();
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Email",
    icon: "mail",
    value: email,
    onChange: setEmail,
    type: "email",
    placeholder: "tu@dominio.com"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Contrase\xF1a",
    icon: "lock",
    value: pw,
    onChange: setPw,
    type: "password",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    trailing: /*#__PURE__*/React.createElement("a", {
      style: {
        fontSize: 12,
        color: 'var(--color-iron)',
        fontWeight: 600
      }
    }, "Olvid\xE9 mi contrase\xF1a")
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "btn btn-iron",
    style: {
      height: 44,
      fontSize: 14,
      justifyContent: 'center',
      marginTop: 4
    }
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "btn btn-outline",
    style: {
      height: 44,
      fontSize: 14,
      justifyContent: 'center',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "wand-sparkles",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Enviarme un magic link"), /*#__PURE__*/React.createElement("div", {
    style: l.divider
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      fontSize: 9
    }
  }, "O contin\xFAa con")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: l.oauth
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 48 48",
    width: "14",
    height: "14"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#FFC107",
    d: "M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 7.7-11.3 7.7-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FF3D00",
    d: "M6.3 14.7l6.6 4.8C14.6 16 18.9 13.7 24 13.7c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.6 6.3 14.7z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#4CAF50",
    d: "M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.5 40.4 16.2 45 24 45z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#1976D2",
    d: "M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 36 45 30.5 45 24c0-1.2-.1-2.4-.4-3.5z"
  })), "Google"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: l.oauth
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 16 16",
    width: "14",
    height: "14"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "currentColor",
    d: "M8 .2C3.6.2 0 3.8 0 8.2c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.6.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3.7 0 1.4.1 2 .3 1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.5.8 1.2.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.4v2c0 .2.1.5.5.4 3.2-1.1 5.5-4.1 5.5-7.6C16 3.8 12.4.2 8 .2z"
  })), "GitHub")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '20px 0 0',
      fontSize: 12,
      color: 'var(--text-tertiary)',
      textAlign: 'center'
    }
  }, "\xBFNo tienes cuenta? ", /*#__PURE__*/React.createElement("a", {
    style: {
      color: 'var(--color-iron)',
      fontWeight: 600
    }
  }, "Crear una"))))), /*#__PURE__*/React.createElement("aside", {
    style: l.brandSide
  }, /*#__PURE__*/React.createElement("div", {
    style: l.gridOverlay
  }), /*#__PURE__*/React.createElement("div", {
    style: l.glow
  }), /*#__PURE__*/React.createElement("div", {
    style: l.brandInner
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-gold)'
    }
  }, "Proverbio Akan"), /*#__PURE__*/React.createElement("blockquote", {
    className: "display-italic",
    style: l.quote
  }, "\"Antes de cortar el iroko, se le pide permiso al esp\xEDritu del \xE1rbol \u2014 porque sin tronco, no hay ramas.\""), /*#__PURE__*/React.createElement("hr", {
    className: "rule rule--gold",
    style: {
      width: 80,
      marginTop: 4,
      marginBottom: 4,
      borderColor: 'rgba(217,164,65,0.4)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: l.tree
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 200 200",
    width: "200",
    height: "200"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: "hud",
    cx: "50%",
    cy: "50%",
    r: "50%"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(255,58,58,0.35)"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(255,58,58,0)"
  }))), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "92",
    fill: "url(#hud)"
  }), /*#__PURE__*/React.createElement("g", {
    stroke: "rgba(230,232,235,0.12)",
    strokeWidth: "0.5",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "90"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "60"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "30"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "100",
    y1: "0",
    x2: "100",
    y2: "200"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "0",
    y1: "100",
    x2: "200",
    y2: "100"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "70",
    fill: "none",
    stroke: "#ff3a3a",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "40",
    fill: "none",
    stroke: "#4682bf",
    strokeWidth: "1.6",
    strokeDasharray: "3 4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "14",
    fill: "#0047ab"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "100",
    r: "5",
    fill: "#ff3a3a"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "30",
    r: "4",
    fill: "#ff3a3a"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "170",
    cy: "100",
    r: "4",
    fill: "#4682bf"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "100",
    cy: "170",
    r: "4",
    fill: "#ff3a3a"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "30",
    cy: "100",
    r: "4",
    fill: "#4682bf"
  }))), /*#__PURE__*/React.createElement("div", {
    style: l.beats
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: l.beatVal
  }, "1.0"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      color: 'rgba(245,236,218,0.5)',
      fontSize: 9
    }
  }, "VERSION")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: l.beatVal
  }, "23"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      color: 'rgba(245,236,218,0.5)',
      fontSize: 9
    }
  }, "COMMITS")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: l.beatVal
  }, "\u221E"), /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      color: 'rgba(245,236,218,0.5)',
      fontSize: 9
    }
  }, "RAMAS"))))));
}
function Field({
  label,
  icon,
  value,
  onChange,
  type,
  placeholder,
  trailing
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, label), trailing), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      strokeWidth: 1.5,
      width: 15,
      height: 15,
      color: 'var(--text-tertiary)',
      position: 'absolute',
      left: 13,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: value,
    type: type,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value),
    style: {
      height: 44,
      width: '100%',
      padding: '0 14px 0 38px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border-strong)',
      borderRadius: 8,
      fontSize: 14,
      outline: 'none',
      color: 'var(--text-primary)'
    }
  })));
}
const l = {
  page: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight: '100vh',
    background: 'var(--background)'
  },
  formSide: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48
  },
  formCard: {
    maxWidth: 420,
    width: '100%'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
    position: 'relative'
  },
  oauth: {
    height: 44,
    padding: '0 14px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)'
  },
  brandSide: {
    background: 'var(--color-night)',
    color: 'var(--color-bone)',
    position: 'relative',
    overflow: 'hidden'
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.05) 1px, transparent 1px),' + 'linear-gradient(to bottom, rgba(245,236,218,0.05) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  },
  glow: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,81,58,0.18), transparent 60%)',
    pointerEvents: 'none'
  },
  brandInner: {
    position: 'relative',
    zIndex: 1,
    padding: '56px 64px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    maxWidth: 560,
    justifyContent: 'center'
  },
  quote: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.3,
    color: 'var(--color-bone)'
  },
  tree: {
    display: 'flex',
    justifyContent: 'flex-start',
    margin: '12px 0'
  },
  beats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, auto)',
    gap: 36,
    paddingTop: 24,
    borderTop: '1px solid rgba(245,236,218,0.14)'
  },
  beatVal: {
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    color: 'var(--color-bone)',
    lineHeight: 1,
    marginBottom: 4
  }
};
window.Login = Login;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/MembersScreen.jsx
try { (() => {
/* global React */
const MEMBERS_SEED = [{
  name: 'Pipe Cárdenas',
  email: 'pipec@iroko.dev',
  role: 'owner',
  status: 'active',
  last: 'hace 2 min',
  initial: 'PC',
  tone: 'iron'
}, {
  name: 'Sofía Reyes',
  email: 'sofia@maker.cl',
  role: 'admin',
  status: 'active',
  last: 'hace 18 min',
  initial: 'SR',
  tone: 'gold'
}, {
  name: 'Tomás Villalba',
  email: 'tomas@maker.cl',
  role: 'member',
  status: 'active',
  last: 'hace 3 h',
  initial: 'TV',
  tone: 'indigo'
}, {
  name: 'Camila Núñez',
  email: 'cami@external.dev',
  role: 'member',
  status: 'invited',
  last: '—',
  initial: 'CN',
  tone: 'night'
}, {
  name: 'Andrés Soto',
  email: 'andres@iroko.dev',
  role: 'member',
  status: 'active',
  last: 'ayer',
  initial: 'AS',
  tone: 'iron'
}, {
  name: 'Luna Pérez',
  email: 'luna@iroko.dev',
  role: 'member',
  status: 'invited',
  last: '—',
  initial: 'LP',
  tone: 'gold'
}];
function MembersScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const [q, setQ] = React.useState('');
  const filtered = MEMBERS_SEED.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Equipo"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 0',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Miembros de la organizaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, MEMBERS_SEED.filter(m => m.status === 'active').length, " activos \xB7 ", MEMBERS_SEED.filter(m => m.status === 'invited').length, " pendientes")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    style: {
      padding: '10px 18px',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "user-plus",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Invitar miembro")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      maxWidth: 360
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14,
      color: 'var(--text-tertiary)',
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Buscar miembros\u2026",
    style: {
      height: 36,
      width: '100%',
      padding: '0 12px 0 34px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 13,
      outline: 'none'
    }
  })), /*#__PURE__*/React.createElement("select", {
    className: "mono",
    style: {
      height: 36,
      padding: '0 28px 0 12px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos los roles"), /*#__PURE__*/React.createElement("option", null, "Owner"), /*#__PURE__*/React.createElement("option", null, "Admin"), /*#__PURE__*/React.createElement("option", null, "Member")), /*#__PURE__*/React.createElement("select", {
    className: "mono",
    style: {
      height: 36,
      padding: '0 28px 0 12px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos los estados"), /*#__PURE__*/React.createElement("option", null, "Activos"), /*#__PURE__*/React.createElement("option", null, "Invitados"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: m.head
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null, "Miembro"), /*#__PURE__*/React.createElement("span", null, "Rol"), /*#__PURE__*/React.createElement("span", null, "Estado"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\xDAltimo acceso"), /*#__PURE__*/React.createElement("span", null)), filtered.map((row, idx) => /*#__PURE__*/React.createElement("div", {
    key: row.email,
    style: {
      ...m.row,
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...m.avatar,
      background: tone(row.tone)
    }
  }, row.initial), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, row.name), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, row.email)), /*#__PURE__*/React.createElement("span", {
    style: m.roleChip(row.role)
  }, row.role), /*#__PURE__*/React.createElement("span", {
    style: m.statusChip(row.status)
  }, /*#__PURE__*/React.createElement("span", {
    style: m.statusDot(row.status)
  }), row.status === 'active' ? 'ACTIVO' : 'INVITADO'), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      textAlign: 'right',
      letterSpacing: '0.02em'
    }
  }, row.last), /*#__PURE__*/React.createElement("button", {
    style: m.iconBtn,
    title: "M\xE1s opciones"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "more-horizontal",
    style: {
      strokeWidth: 1.5,
      width: 15,
      height: 15,
      color: 'var(--text-tertiary)'
    }
  }))))));
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
    gap: 16,
    alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '32px 2fr 1fr 1fr 1fr 32px',
    gap: 16,
    alignItems: 'center',
    padding: '14px 22px'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    color: '#fff',
    fontWeight: 700,
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)'
  },
  roleChip: role => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 999,
    justifySelf: 'start',
    background: role === 'owner' ? 'var(--color-iron)' : role === 'admin' ? 'rgba(184,81,58,0.16)' : 'var(--surface-2)',
    color: role === 'owner' ? '#fff' : role === 'admin' ? 'var(--color-iron)' : 'var(--text-secondary)',
    border: role === 'member' ? '1px solid var(--border)' : '0'
  }),
  statusChip: s => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 999,
    justifySelf: 'start',
    background: s === 'active' ? 'rgba(111,147,98,0.16)' : 'rgba(217,164,65,0.18)',
    color: s === 'active' ? '#4f6f44' : '#a87a1f'
  }),
  statusDot: s => ({
    width: 5,
    height: 5,
    borderRadius: 999,
    background: s === 'active' ? '#6f9362' : '#d9a441'
  }),
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'transparent',
    border: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
};
window.MembersScreen = MembersScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/MembersScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/OverviewScreen.jsx
try { (() => {
/* global React */
function OverviewScreen({
  user,
  org
}) {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, org.name, " \xB7 Overview"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 4px',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Hola, ", user.name.split(' ')[0], "."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 16,
      color: 'var(--text-secondary)'
    }
  }, "Tres ramas crecieron esta semana. Cuatro miembros pendientes de aceptar invitaci\xF3n.")), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    icon: "dollar-sign",
    label: "MRR",
    value: "$4,820",
    delta: "+12.4%",
    trend: "up",
    period: "vs mes"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "tree-pine",
    label: "Proyectos activos",
    value: "12",
    delta: "+3",
    trend: "up",
    period: "esta semana"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "users",
    label: "Miembros",
    value: "38",
    delta: "+5",
    trend: "up",
    period: "este mes"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    icon: "activity",
    label: "Uptime",
    value: "98.7%",
    delta: "-0.2%",
    trend: "down",
    period: "\xFAlt. 30 d"
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(RevenueCard, null), /*#__PURE__*/React.createElement(ActivityFeed, null)), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Proyectos recientes"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: {
      margin: '4px 0 0',
      fontSize: 28,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Las ramas activas")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Nuevo proyecto")), /*#__PURE__*/React.createElement(ProjectsTable, null)));
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  delta,
  trend,
  period
}) {
  const isUp = trend === 'up';
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: '18px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow",
    style: {
      fontSize: 10
    }
  }, label), /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      strokeWidth: 1.25,
      width: 17,
      height: 17,
      color: 'var(--text-tertiary)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 30,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      background: isUp ? 'rgba(111,147,98,0.16)' : 'rgba(193,69,52,0.14)',
      color: isUp ? '#4f6f44' : 'var(--color-error)',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700
    }
  }, delta), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase'
    }
  }, period)));
}

// ─── Revenue Card with simple chart ──────────────────────────
function RevenueCard() {
  // Stylized bar chart, no library
  const data = [42, 48, 51, 46, 55, 58, 52, 60, 64, 68, 72, 78];
  const max = Math.max(...data);
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Ingresos \xB7 \xFAltimos 12 meses"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      marginTop: 8,
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.04em',
      color: 'var(--text-primary)',
      lineHeight: 1
    }
  }, "$48,720"), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginTop: 4,
      letterSpacing: '0.04em'
    }
  }, "+$5,420 vs per\xEDodo anterior")), /*#__PURE__*/React.createElement("select", {
    className: "mono",
    style: {
      padding: '5px 10px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontSize: 11,
      color: 'var(--text-secondary)',
      outline: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", null, "12 meses"), /*#__PURE__*/React.createElement("option", null, "30 d\xEDas"), /*#__PURE__*/React.createElement("option", null, "7 d\xEDas"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length}, 1fr)`,
      gap: 6,
      alignItems: 'end',
      height: 160
    }
  }, data.map((d, i) => {
    const isLast = i === data.length - 1;
    const stopA = 0.30 + i / data.length * 0.45; // poppy
    const stopB = 0.15 + i / data.length * 0.25; // cobalt
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: `${d / max * 100}%`,
        background: isLast ? 'var(--color-poppy)' : `linear-gradient(to top, rgba(217,33,33,${stopA}), rgba(0,71,171,${stopB}))`,
        borderRadius: '4px 4px 2px 2px'
      }
    });
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${data.length}, 1fr)`,
      gap: 6,
      marginTop: 10
    }
  }, ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "mono",
    style: {
      fontSize: 9,
      color: 'var(--text-tertiary)',
      textAlign: 'center',
      letterSpacing: '0.05em'
    }
  }, m))));
}

// ─── Activity Feed ───────────────────────────────────────────
function ActivityFeed() {
  const items = [{
    who: 'Pipe',
    what: 'creó el proyecto',
    target: 'ace-jewelry · checkout-v2',
    when: 'hace 2 min',
    icon: 'plus'
  }, {
    who: 'Sofía',
    what: 'invitó a',
    target: 'tomas@maker.cl',
    when: 'hace 18 min',
    icon: 'user-plus'
  }, {
    who: 'Stripe',
    what: 'cobró',
    target: '$49 · Studio · ace',
    when: 'hace 1 h',
    icon: 'credit-card'
  }, {
    who: 'Tomás',
    what: 'desplegó',
    target: 'maker-lab · production',
    when: 'hace 3 h',
    icon: 'rocket'
  }, {
    who: 'System',
    what: 'rotó keys de',
    target: 'supabase service role',
    when: 'ayer',
    icon: 'key-round'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 22
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow"
  }, "Actividad"), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: '14px 0 0',
      display: 'flex',
      flexDirection: 'column'
    }
  }, items.map((it, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 0',
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 5,
      background: 'rgba(184,81,58,0.10)',
      color: 'var(--color-iron)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": it.icon,
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      lineHeight: 1.4
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontWeight: 600
    }
  }, it.who), ' ', /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, it.what), ' ', /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      color: 'var(--text-secondary)',
      fontSize: 12
    }
  }, it.target)), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.06em',
      marginTop: 2
    }
  }, it.when))))));
}

// ─── Projects Table ──────────────────────────────────────────
function ProjectsTable() {
  const rows = [{
    name: 'ace-jewelry',
    env: 'prod',
    members: 4,
    status: 'active',
    lastDeploy: 'hace 2 min'
  }, {
    name: 'maker-lab-cl',
    env: 'prod',
    members: 7,
    status: 'active',
    lastDeploy: 'hace 3 h'
  }, {
    name: 'pipec.cl',
    env: 'prod',
    members: 1,
    status: 'active',
    lastDeploy: 'ayer'
  }, {
    name: 'iot-greenhouse',
    env: 'staging',
    members: 2,
    status: 'building',
    lastDeploy: 'ahora'
  }, {
    name: 'invoice-uv-prints',
    env: 'preview',
    members: 1,
    status: 'idle',
    lastDeploy: 'hace 6 d'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: tStyles.head
  }, /*#__PURE__*/React.createElement("span", null, "Proyecto"), /*#__PURE__*/React.createElement("span", null, "Entorno"), /*#__PURE__*/React.createElement("span", null, "Miembros"), /*#__PURE__*/React.createElement("span", null, "Estado"), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: 'right'
    }
  }, "\xDAltimo deploy")), rows.map((r, idx) => /*#__PURE__*/React.createElement("div", {
    key: r.name,
    style: {
      ...tStyles.row,
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: tStyles.dot
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "folder",
    style: {
      strokeWidth: 1.5,
      width: 13,
      height: 13,
      color: 'var(--color-iron)'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, r.name)), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: tStyles.envChip(r.env)
  }, r.env), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, r.members), /*#__PURE__*/React.createElement("span", {
    style: tStyles.statusChip(r.status)
  }, /*#__PURE__*/React.createElement("span", {
    style: tStyles.statusDot(r.status)
  }), r.status), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      textAlign: 'right',
      letterSpacing: '0.02em'
    }
  }, r.lastDeploy))));
}
const tStyles = {
  head: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 16,
    alignItems: 'center',
    padding: '12px 22px',
    background: 'var(--surface-2)',
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
    gap: 16,
    alignItems: 'center',
    padding: '14px 22px'
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 5,
    background: 'rgba(184,81,58,0.10)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  envChip: env => ({
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 4,
    background: env === 'prod' ? 'rgba(111,147,98,0.16)' : env === 'staging' ? 'rgba(217,164,65,0.18)' : 'rgba(60,79,115,0.16)',
    color: env === 'prod' ? '#4f6f44' : env === 'staging' ? '#a87a1f' : '#2a3a5a',
    justifySelf: 'start'
  }),
  statusChip: status => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    padding: '3px 10px',
    borderRadius: 999,
    background: status === 'active' ? 'rgba(111,147,98,0.16)' : status === 'building' ? 'rgba(217,164,65,0.18)' : 'var(--surface-2)',
    color: status === 'active' ? '#4f6f44' : status === 'building' ? '#a87a1f' : 'var(--text-tertiary)',
    justifySelf: 'start'
  }),
  statusDot: status => ({
    width: 5,
    height: 5,
    borderRadius: 999,
    background: status === 'active' ? '#6f9362' : status === 'building' ? '#d9a441' : 'var(--text-tertiary)'
  })
};
window.OverviewScreen = OverviewScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/OverviewScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/ProjectsScreen.jsx
try { (() => {
/* global React */
function ProjectsScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Bosque"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 0',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Tus proyectos"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 15,
      color: 'var(--text-secondary)'
    }
  }, "Cada proyecto es una rama que crece del mismo tronco Iroko.")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    style: {
      padding: '10px 18px',
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "plus",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  }), "Nuevo proyecto")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, [{
    name: 'ace-jewelry',
    env: 'prod',
    desc: 'Checkout v2 + analytics realtime',
    tone: 'iron'
  }, {
    name: 'maker-lab-cl',
    env: 'prod',
    desc: 'Plataforma de cursos + comunidad',
    tone: 'gold'
  }, {
    name: 'pipec.cl',
    env: 'prod',
    desc: 'Sitio personal + blog técnico',
    tone: 'indigo'
  }, {
    name: 'iot-greenhouse',
    env: 'staging',
    desc: 'Telemetría ESP32 + dashboards',
    tone: 'iron'
  }, {
    name: 'invoice-uv-prints',
    env: 'preview',
    desc: 'Cotizador + órdenes UV',
    tone: 'gold'
  }, {
    name: 'rituales-tarot',
    env: 'idea',
    desc: 'Experimento de UX místico',
    tone: 'indigo'
  }].map(p => /*#__PURE__*/React.createElement("article", {
    key: p.name,
    className: "card",
    style: {
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 6,
      background: tone2(p.tone),
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "folder",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: 4,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: envBg(p.env),
      color: envFg(p.env)
    }
  }, p.env)), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 13,
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      paddingTop: 12,
      borderTop: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "users",
    style: {
      strokeWidth: 1.5,
      width: 11,
      height: 11,
      verticalAlign: 'middle',
      marginRight: 4
    }
  }), "4"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "git-branch",
    style: {
      strokeWidth: 1.5,
      width: 11,
      height: 11,
      verticalAlign: 'middle',
      marginRight: 4
    }
  }), "main"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      marginLeft: 'auto'
    }
  }, "hace 2 h"))))));
}
function tone2(t) {
  return t === 'iron' ? 'var(--color-iron)' : t === 'gold' ? 'var(--color-gold)' : 'var(--color-indigo)';
}
function envBg(e) {
  return e === 'prod' ? 'rgba(111,147,98,0.16)' : e === 'staging' ? 'rgba(217,164,65,0.18)' : e === 'preview' ? 'rgba(60,79,115,0.16)' : 'var(--surface-2)';
}
function envFg(e) {
  return e === 'prod' ? '#4f6f44' : e === 'staging' ? '#a87a1f' : e === 'preview' ? '#2a3a5a' : 'var(--text-tertiary)';
}
window.ProjectsScreen = ProjectsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/ProjectsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/SettingsScreen.jsx
try { (() => {
/* global React */
function SettingsScreen() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  const [tab, setTab] = React.useState('general');
  const tabs = [{
    id: 'general',
    label: 'General'
  }, {
    id: 'security',
    label: 'Seguridad'
  }, {
    id: 'integrations',
    label: 'Integraciones'
  }, {
    id: 'danger',
    label: 'Zona peligrosa'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Configuraci\xF3n"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: {
      margin: '6px 0 0',
      fontSize: 44,
      lineHeight: 1,
      color: 'var(--text-primary)'
    }
  }, "Ajustes de la organizaci\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 0,
      borderBottom: '1px solid var(--border)',
      flexWrap: 'wrap'
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => setTab(t.id),
    style: {
      background: 'transparent',
      border: 0,
      padding: '10px 18px',
      fontSize: 13,
      fontWeight: tab === t.id ? 700 : 500,
      color: tab === t.id ? 'var(--color-iron)' : 'var(--text-secondary)',
      borderBottom: tab === t.id ? '2px solid var(--color-iron)' : '2px solid transparent',
      marginBottom: -1,
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap'
    }
  }, t.label))), tab === 'general' && /*#__PURE__*/React.createElement(GeneralPanel, null), tab === 'security' && /*#__PURE__*/React.createElement(SecurityPanel, null), tab === 'integrations' && /*#__PURE__*/React.createElement(IntegrationsPanel, null), tab === 'danger' && /*#__PURE__*/React.createElement(DangerPanel, null));
}
function GeneralPanel() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Panel, {
    title: "Identidad",
    sub: "C\xF3mo se ve tu organizaci\xF3n en facturas, invitaciones y emails."
  }, /*#__PURE__*/React.createElement(Field, {
    label: "Nombre",
    defaultValue: "Ace Jewelry"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Slug",
    defaultValue: "ace-jewelry",
    mono: true,
    hint: "usado en URLs \xB7 ace.iroko.dev"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Email de facturaci\xF3n",
    defaultValue: "billing@ace-jewelry.com"
  })), /*#__PURE__*/React.createElement(Panel, {
    title: "Preferencias",
    sub: "C\xF3mo se comporta el panel para todos los miembros."
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Modo oscuro como default",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Notificaciones por email",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Webhooks de actividad a Slack"
  })));
}
function SecurityPanel() {
  return /*#__PURE__*/React.createElement(Panel, {
    title: "Autenticaci\xF3n",
    sub: "Asegura los accesos a esta organizaci\xF3n."
  }, /*#__PURE__*/React.createElement(Toggle, {
    label: "Requerir MFA a todos los miembros",
    defaultOn: true
  }), /*#__PURE__*/React.createElement(Toggle, {
    label: "Auto-cerrar sesi\xF3n tras 30 min"
  }), /*#__PURE__*/React.createElement(Field, {
    label: "Dominios permitidos",
    defaultValue: "iroko.dev, maker.cl",
    mono: true,
    hint: "separados por coma \xB7 solo emails de estos dominios pueden ser invitados"
  }));
}
function IntegrationsPanel() {
  const ints = [{
    name: 'Supabase',
    desc: 'Base de datos + auth + storage',
    icon: 'database',
    connected: true
  }, {
    name: 'Stripe',
    desc: 'Suscripciones + portal cliente',
    icon: 'credit-card',
    connected: true
  }, {
    name: 'Slack',
    desc: 'Notificaciones de actividad',
    icon: 'message-square',
    connected: false
  }, {
    name: 'GitHub',
    desc: 'Auto-deploy desde el repo',
    icon: 'github',
    connected: false
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, ints.map((it, idx) => /*#__PURE__*/React.createElement("div", {
    key: it.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '18px 22px',
      borderTop: idx === 0 ? '0' : '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 6,
      background: 'var(--surface-2)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-primary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": it.icon,
    style: {
      strokeWidth: 1.25,
      width: 18,
      height: 18
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, it.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, it.desc)), it.connected ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      padding: '4px 10px',
      borderRadius: 999,
      background: 'rgba(111,147,98,0.16)',
      color: '#4f6f44'
    }
  }, "\u25CF CONECTADO") : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      padding: '6px 14px',
      fontSize: 12
    }
  }, "Conectar"))));
}
function DangerPanel() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-elevated)',
      border: '1px solid rgba(193,69,52,0.32)',
      borderRadius: 10,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--color-error)'
    }
  }, "Transferir propiedad"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 12px',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "El nuevo owner debe aceptar desde su cuenta. T\xFA quedar\xE1s como admin."), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'rgba(193,69,52,0.10)',
      color: 'var(--color-error)',
      border: '1px solid rgba(193,69,52,0.32)',
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Transferir")), /*#__PURE__*/React.createElement("hr", {
    style: {
      border: 0,
      borderTop: '1px solid var(--border)',
      margin: 0
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--color-error)'
    }
  }, "Eliminar organizaci\xF3n"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 12px',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, "Esto elimina todos los proyectos, miembros y facturaci\xF3n. No se puede deshacer."), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'var(--color-error)',
      color: '#fff',
      border: 0,
      borderRadius: 6,
      padding: '8px 16px',
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer'
    }
  }, "Eliminar organizaci\xF3n")));
}
function Panel({
  title,
  sub,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, title), sub && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '4px 0 0',
      fontSize: 13,
      color: 'var(--text-secondary)'
    }
  }, sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, children));
}
function Field({
  label,
  defaultValue,
  mono,
  hint
}) {
  const [val, setVal] = React.useState(defaultValue ?? '');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: 24,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-secondary)',
      whiteSpace: 'nowrap'
    }
  }, label), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    value: val,
    onChange: e => setVal(e.target.value),
    style: {
      height: 36,
      width: '100%',
      padding: '0 12px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: 13,
      color: 'var(--text-primary)',
      outline: 'none'
    }
  }), hint && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 0',
      fontSize: 11,
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-mono)'
    }
  }, hint)));
}
function Toggle({
  label,
  defaultOn
}) {
  const [on, setOn] = React.useState(!!defaultOn);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: 'var(--text-primary)',
      flex: 1,
      minWidth: 0
    }
  }, label), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOn(!on),
    style: {
      flex: 'none',
      width: 36,
      height: 20,
      borderRadius: 999,
      background: on ? 'var(--color-iron)' : 'var(--surface-3)',
      border: 0,
      position: 'relative',
      cursor: 'pointer',
      transition: 'background 180ms'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: on ? 18 : 2,
      width: 16,
      height: 16,
      borderRadius: 999,
      background: '#fff',
      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      transition: 'left 180ms'
    }
  })));
}
window.SettingsScreen = SettingsScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/Sidebar.jsx
try { (() => {
/* global React */
const NAV_ITEMS = [{
  id: 'overview',
  icon: 'layout-grid',
  label: 'Overview'
}, {
  id: 'projects',
  icon: 'folder-tree',
  label: 'Proyectos'
}, {
  id: 'members',
  icon: 'users',
  label: 'Miembros'
}, {
  id: 'billing',
  icon: 'credit-card',
  label: 'Billing'
}, {
  id: 'settings',
  icon: 'settings',
  label: 'Ajustes'
}];
const ORG_LIST = [{
  id: 'ace',
  name: 'Ace Jewelry',
  plan: 'Studio',
  initial: 'AJ',
  tone: 'iron'
}, {
  id: 'maker',
  name: 'Maker Lab CL',
  plan: 'Studio',
  initial: 'ML',
  tone: 'gold'
}, {
  id: 'pipec',
  name: 'Pipec personal',
  plan: 'Free',
  initial: 'PC',
  tone: 'night'
}];
function Sidebar({
  active,
  onNavigate,
  currentOrg = ORG_LIST[0],
  onSwitchOrg
}) {
  const [orgOpen, setOrgOpen] = React.useState(false);
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("aside", {
    style: s.aside
  }, /*#__PURE__*/React.createElement("div", {
    style: s.brandStrip
  }, /*#__PURE__*/React.createElement("span", {
    style: s.markBox
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 28 28",
    width: "20",
    height: "20"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "14",
    r: "8.5",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "14",
    cy: "14",
    r: "3",
    fill: "var(--color-cobalt)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "3",
    x2: "14",
    y2: "5.5",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "22.5",
    x2: "14",
    y2: "25",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: s.brand
  }, "Iroko")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOrgOpen(!orgOpen),
    style: s.orgBtn
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.orgAvatar,
      background: orgTone(currentOrg.tone)
    }
  }, currentOrg.initial), /*#__PURE__*/React.createElement("span", {
    style: s.orgInfo
  }, /*#__PURE__*/React.createElement("span", {
    style: s.orgName
  }, currentOrg.name), /*#__PURE__*/React.createElement("span", {
    style: s.orgPlan
  }, "Plan ", currentOrg.plan)), /*#__PURE__*/React.createElement("i", {
    "data-lucide": orgOpen ? 'chevron-up' : 'chevron-down',
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14,
      color: 'var(--text-tertiary)'
    }
  })), orgOpen && /*#__PURE__*/React.createElement("div", {
    style: s.orgList
  }, ORG_LIST.map(org => /*#__PURE__*/React.createElement("button", {
    key: org.id,
    onClick: () => {
      onSwitchOrg?.(org);
      setOrgOpen(false);
    },
    style: {
      ...s.orgListItem,
      background: org.id === currentOrg.id ? 'var(--surface-3)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.orgAvatar,
      background: orgTone(org.tone),
      width: 22,
      height: 22,
      fontSize: 10
    }
  }, org.initial), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-primary)',
      textAlign: 'left',
      flex: 1
    }
  }, org.name), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em'
    }
  }, org.plan))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: 'var(--border)',
      margin: '6px 0'
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: s.orgListItem
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...s.orgAvatar,
      background: 'var(--surface-3)',
      color: 'var(--text-secondary)',
      width: 22,
      height: 22
    }
  }, "+"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 500,
      color: 'var(--text-secondary)'
    }
  }, "Nueva organizaci\xF3n")))), /*#__PURE__*/React.createElement("nav", {
    style: s.nav
  }, NAV_ITEMS.map(it => {
    const isActive = it.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onNavigate?.(it.id),
      style: {
        ...s.item,
        background: isActive ? 'rgba(184,81,58,0.10)' : 'transparent',
        color: isActive ? 'var(--color-iron)' : 'var(--text-secondary)',
        fontWeight: isActive ? 700 : 500
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": it.icon,
      style: {
        strokeWidth: isActive ? 1.5 : 1.25,
        width: 17,
        height: 17
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13
      }
    }, it.label), isActive && /*#__PURE__*/React.createElement("span", {
      style: s.activeDot
    }));
  })), /*#__PURE__*/React.createElement("div", {
    style: s.footer
  }, /*#__PURE__*/React.createElement("div", {
    style: s.engineCard
  }, /*#__PURE__*/React.createElement("div", {
    className: "eyebrow-sm",
    style: {
      fontSize: 9,
      opacity: 0.6
    }
  }, "Build"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--text-primary)',
      letterSpacing: '-0.01em'
    }
  }, "iroko \xB7 v1.0"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 9,
      color: 'var(--color-iron)',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    }
  }, "\u25CF stable")))));
}
function orgTone(tone) {
  if (tone === 'iron') return 'var(--color-iron)';
  if (tone === 'gold') return 'var(--color-gold)';
  return 'var(--color-night)';
}
const s = {
  aside: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    background: 'var(--surface-2)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column'
  },
  brandStrip: {
    height: 60,
    padding: '0 18px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid var(--border)'
  },
  markBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'var(--color-night)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brand: {
    fontSize: 22,
    lineHeight: 1,
    color: 'var(--text-primary)'
  },
  orgBtn: {
    width: '100%',
    margin: '14px 0 8px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer'
  },
  orgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 6,
    color: '#fff',
    fontWeight: 700,
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    flex: 'none'
  },
  orgInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    textAlign: 'left',
    minWidth: 0
  },
  orgName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  orgPlan: {
    fontSize: 10,
    color: 'var(--text-tertiary)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em'
  },
  orgList: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
    boxShadow: 'var(--shadow-md)'
  },
  orgListItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 4,
    border: 0,
    background: 'transparent',
    cursor: 'pointer'
  },
  nav: {
    flex: 1,
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 12px',
    borderRadius: 6,
    border: 0,
    textAlign: 'left',
    transition: 'background 180ms, color 180ms',
    cursor: 'pointer',
    position: 'relative'
  },
  activeDot: {
    marginLeft: 'auto',
    width: 5,
    height: 5,
    borderRadius: 999,
    background: 'var(--color-iron)'
  },
  footer: {
    padding: 12
  },
  engineCard: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px'
  }
};
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/Topbar.jsx
try { (() => {
/* global React */
const ROUTE_LABELS = {
  overview: 'Overview',
  projects: 'Proyectos',
  members: 'Miembros',
  billing: 'Billing',
  settings: 'Ajustes'
};
function Topbar({
  user,
  org,
  route,
  onSignOut
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("header", {
    style: t.bar
  }, /*#__PURE__*/React.createElement("div", {
    style: t.crumbRow
  }, /*#__PURE__*/React.createElement("span", {
    style: t.crumbOrg
  }, org.name), /*#__PURE__*/React.createElement("span", {
    style: t.crumbSep
  }, "/"), /*#__PURE__*/React.createElement("span", {
    style: t.crumbPage
  }, ROUTE_LABELS[route] || route)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: t.searchWrap
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    style: {
      strokeWidth: 1.5,
      width: 14,
      height: 14,
      color: 'var(--text-tertiary)',
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar\u2026",
    style: t.search
  }), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: t.kbd
  }, "\u2318 K")), /*#__PURE__*/React.createElement("button", {
    style: t.iconBtn,
    title: "Notificaciones"
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "bell",
    style: {
      strokeWidth: 1.5,
      width: 17,
      height: 17,
      color: 'var(--text-secondary)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: t.notiDot
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(!menuOpen),
    style: t.avatarBtn
  }, /*#__PURE__*/React.createElement("span", {
    style: t.avatar
  }, initials(user.name))), menuOpen && /*#__PURE__*/React.createElement("div", {
    style: t.menu
  }, /*#__PURE__*/React.createElement("div", {
    style: t.menuHeader
  }, /*#__PURE__*/React.createElement("span", {
    style: t.menuName
  }, user.name), /*#__PURE__*/React.createElement("span", {
    style: t.menuMail
  }, user.email)), /*#__PURE__*/React.createElement("div", {
    style: t.menuSep
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "user",
    label: "Perfil"
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "settings",
    label: "Preferencias"
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "keyboard",
    label: "Atajos",
    hint: "\u2318 /"
  }), /*#__PURE__*/React.createElement("div", {
    style: t.menuSep
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "moon",
    label: "Cambiar tema"
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "globe",
    label: "Idioma",
    hint: "ES"
  }), /*#__PURE__*/React.createElement("div", {
    style: t.menuSep
  }), /*#__PURE__*/React.createElement(MenuItem, {
    icon: "log-out",
    label: "Cerrar sesi\xF3n",
    tone: "error",
    onClick: onSignOut
  })))));
}
function MenuItem({
  icon,
  label,
  hint,
  tone,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    style: {
      ...t.menuItem,
      color: tone === 'error' ? 'var(--color-error)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": icon,
    style: {
      strokeWidth: 1.25,
      width: 15,
      height: 15
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 500
    }
  }, label), hint && /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 10,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.08em'
    }
  }, hint));
}
function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}
const t = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    height: 60,
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(245,236,218,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border)'
  },
  crumbRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  crumbOrg: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap'
  },
  crumbSep: {
    color: 'var(--text-tertiary)',
    fontSize: 14,
    opacity: 0.5
  },
  crumbPage: {
    fontFamily: 'var(--font-sans)',
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--text-primary)'
  },
  searchWrap: {
    position: 'relative'
  },
  search: {
    height: 32,
    width: 240,
    padding: '0 56px 0 32px',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    color: 'var(--text-primary)'
  },
  kbd: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 10,
    color: 'var(--text-tertiary)',
    background: 'var(--surface-2)',
    padding: '1px 6px',
    borderRadius: 3,
    border: '1px solid var(--border)'
  },
  iconBtn: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'transparent',
    border: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  notiDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 999,
    background: 'var(--color-iron)',
    border: '2px solid var(--background)'
  },
  avatarBtn: {
    background: 'transparent',
    border: 0,
    padding: 0,
    cursor: 'pointer'
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: 'var(--color-iron)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 8px)',
    width: 240,
    padding: 8,
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    boxShadow: 'var(--shadow-lg)',
    zIndex: 30
  },
  menuHeader: {
    padding: '8px 10px 10px'
  },
  menuName: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)'
  },
  menuMail: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-tertiary)',
    marginTop: 2
  },
  menuSep: {
    height: 1,
    background: 'var(--border)',
    margin: '4px -2px'
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '7px 10px',
    borderRadius: 4,
    background: 'transparent',
    border: 0,
    cursor: 'pointer',
    textAlign: 'left'
  }
};
window.Topbar = Topbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/Topbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-dashboard/doc-page.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <doc-page> — paged-document shell for printable HTML.
 *
 * FIRST, decide how the document paginates — up front, before building:
 *
 * - FLOWING document (the default): write the whole document as one
 *   normal HTML flow inside <doc-page>; the browser's print engine
 *   splits it onto pages at export. Use for long-form documents with a
 *   single text flow: reports, memos, letters, essays.
 * - EXPLICIT pagination: a fixed set of pre-paginated pages, one
 *   <section class="page"> child per page. Use when the user asks for a
 *   specific page count, or the design implies one: a one-page resume, a
 *   two-sided flier, a poster, a certificate, a brochure — any richly
 *   laid-out document without a single text flow.
 * - If in doubt, ask the user as part of the build.
 *
 * PAGE SIZING — paper differs by country (letter vs A4), so the printed
 * sheet is not one fixed truth:
 * - FLOWING documents pin NO paper size: the print engine paginates
 *   onto the user's real paper, and the content reflows to it.
 * - EXPLICITLY PAGINATED documents print each page at a FIXED page box
 *   with overflow hidden — letter by default, size="a4" for a clearly
 *   metric user, the user's chosen paper when they export. Design each
 *   page to FILL that box, fitting letter and A4 alike without overlap.
 * - width/height pin an explicit fixed size, ONLY when the user gives
 *   one.
 * Never write your own @page rule or hard-code paper dimensions in the
 * content.
 *
 * Sizing modes (attributes):
 *   (none)                      — portrait: flowing docs use the user's
 *           paper; explicitly paginated pages use the named size box
 *           (letter unless size="a4")
 *   orientation="landscape"     — the same, landscape
 *   width / height              — explicit fixed size, ONLY when the user
 *           gives one (e.g. width="22in" height="30in" for a 22×30
 *           poster): the page IS the design's size, printed at true
 *           dimensions (or scaled onto the user's paper at print time).
 *           Any absolute CSS length: px/in/mm/cm/pt/pc.
 * The component announces the chosen mode to the host app at runtime (a
 * meta tag it injects), so the print path can inject the user's true
 * paper size.
 *
 * On screen the document renders on a desk background: a flowing
 * document as one tall scrolling sheet (Google Docs' pageless view);
 * explicitly paginated documents as one card per page.
 *
 * EXPLICIT pagination usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page>
 *     <section class="page" id="p1">…one page's design…</section>
 *     <section class="page" id="p2">…</section>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * How the page box works, concretely: each .page prints as ONE full-bleed
 * sheet at a FIXED physical size — letter by default (set size="a4" for
 * a clearly metric user), the user's chosen paper when they export —
 * with overflow hidden. Nothing scrolls and nothing reflows onto a next
 * sheet: content that misses the box is CLIPPED. Design each page to
 * FILL that page box, and to fit it — letter and A4 alike — without
 * overlap. Each page is a size container; don't size anything in
 * viewport units (they track the window, not the page), and never set
 * width or height on the .page section itself (the component sizes the
 * page box; an authored height like 100% is meaningless at print and is
 * overridden). The component owns the page box, the screen card chrome,
 * and the page breaks (never add your own break-before/after). Don't mix
 * .page sections with flowing content or header/footer slots in the same
 * document.
 *
 * FLOWING usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page margin="0.75in">
 *     <h1>Title</h1>
 *     <p>…body…</p>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * There is no manual page-splitting — the browser's print engine
 * paginates at export. Standard break-hygiene rules (`break-inside:
 * avoid` on figures, code blocks, images and table rows; `orphans/
 * widows: 3`) are applied so paragraphs and groups split cleanly. On
 * screen and at print, headings default to `text-wrap: balance` and
 * body text to `text-wrap: pretty`; the defaults have zero specificity,
 * so any text-wrap you declare wins.
 *
 * Other attributes:
 *   size    — letter | a4 | legal (default letter). Flowing documents:
 *           preview proportion only — it does NOT pin their printed
 *           paper (the print dialog's paper governs); leave it alone
 *           there. Explicitly paginated documents: it sets the page box
 *           the cards and the pinned @page share (the export dialog's
 *           choice overrides both at print) — set size="a4" for a
 *           clearly metric user. Scaled-fit: names the sheet the fit is
 *           computed against, same a4-for-metric-users advice.
 *   content-width / content-height — the design's own fixed dimensions
 *           (CSS lengths), for scaling a fixed-size design ONTO the
 *           named sheet: content lays out at exactly this size, and the
 *           component scales it to fit that sheet's printable area
 *           (centered horizontally, top-aligned; the export dialog
 *           re-fits to the user's actual paper choice where available).
 *           Both must be set; they do not change the page box. For pages
 *           WITHOUT running header/footer slots.
 *   margin  — printable inset on every page of a FLOWING document
 *           (default 0.75in); margin="0" makes pages full-bleed.
 *           Explicitly paginated pages are always full-bleed.
 *
 * Running header/footer (flowing documents only): give an element
 * `slot="header"` or `slot="footer"` and it repeats on every printed
 * page via `position: fixed`. To keep body text from sliding under it,
 * the component prints inside a single-cell table whose <thead>/<tfoot>
 * are spacers sized to the header/footer height — browsers repeat
 * thead/tfoot on every page, so each sheet's content starts below the
 * header and ends above the footer. On screen the header/footer render
 * once at the top/bottom of the sheet.
 *
 * At print the component injects `@page { margin: 0 }` (which leaves
 * Chrome no margin box to draw its date/URL/page-count header in) and
 * moves the visual margin onto the sheet's own padding. It also marks
 * the document as owning its print CSS (a
 * `meta[name="omelette-owns-print"]` it injects at runtime), so the
 * PDF export never injects page-geometry CSS of its own on top.
 *
 * Print best practices for the content you author:
 * - Multi-column text: use CSS columns (`column-count` +
 *   `column-gap`), never side-by-side flex/grid columns — only real
 *   CSS columns flow and break across pages. `column-span: all` lets
 *   a heading span the columns; `hyphens: auto` (needs `lang` on
 *   the html element) keeps narrow columns readable.
 * - Page breaks in flowing documents: `break-before: page` on an
 *   element that must start a new page (a chapter, an appendix). Add
 *   your own kept-together blocks (callouts, stat tiles, cards) to a
 *   `break-inside: avoid` rule, and keep each one shorter than a page.
 * - Extend `orphans: 3; widows: 3` to any custom text blocks you add
 *   (p and li are covered by default).
 * - Give long tables a <thead> — browsers repeat it on every printed
 *   page.
 * - No `position: fixed`/`sticky` and no viewport units in content:
 *   fixed elements stamp every printed page (running headers/footers go
 *   in the component's slots) and `100vh` mis-sizes at print.
 *
 * Author content as static HTML so the user can click-to-edit any text
 * directly. Do not set width/padding/background on the document body —
 * the component owns the sheet box.
 */
/* END USAGE */

(() => {
  const PAPER = {
    letter: ['8.5in', '11in'],
    a4: ['210mm', '297mm'],
    legal: ['8.5in', '14in']
  };
  const CSS_LENGTH = /^\d+(\.\d+)?(px|in|mm|cm|pt|pc)$/;
  // Unitless "0" is a valid CSS length and the natural way to write
  // margin="0"; normalise it to 0px so max()/calc() (which reject a bare
  // number) keep working.
  const safeLen = (v, fb) => {
    v = (v || '').trim();
    return v === '0' ? '0px' : CSS_LENGTH.test(v) ? v : fb;
  };
  // WebKit (Safari and every iOS browser shell) never repeats a table's
  // thead/tfoot on printed pages (WebKit bug 17205), so the spacer-borne
  // vertical margins of a FLOWING document reach only the first page
  // there. Engine check, not browser check: vendor is 'Apple Computer,
  // Inc.' exactly for WebKit and 'Google Inc.' for Blink.
  const WK_PRINT = /apple/i.test(navigator.vendor || '');
  // CSS length → px number (CSS absolute units are exact: 1in = 96px).
  // Returns NaN for anything safeLen would reject — callers gate on it.
  const PX_PER = {
    px: 1,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    pt: 96 / 72,
    pc: 16
  };
  const toPx = v => {
    const m = /^(\d+(?:\.\d+)?)(px|in|mm|cm|pt|pc)$/.exec((v || '').trim());
    return m ? parseFloat(m[1]) * PX_PER[m[2]] : NaN;
  };
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      /* When the viewport is narrower than the page, grow to wrap the
       * sheet (plus this padding) instead of staying viewport-width, so
       * the desk background and right margin reach the sheet's far edge
       * in the horizontal scroll. */
      min-width: max-content;
      min-height: 100vh;
      background: #f5f5f4;
      padding: 48px 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      --doc-page-w: 8.5in;
      --doc-page-h: 11in;
      --doc-page-margin: 0.75in;
      --doc-hdr-h: 0px;
      --doc-ftr-h: 0px;
      --doc-hdr-pad: 0px;
      --doc-ftr-pad: 0px;
    }
    .sheet {
      width: var(--doc-page-w);
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 10px rgba(20, 20, 19, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
      padding: var(--doc-page-margin);
    }
    .frame { width: 100%; border-collapse: collapse; }
    /* Scaled-fit mode (content-width/content-height): the inner .fit box
     * lays the content out at its authored fixed size and scales it onto
     * the printable area; .fit-box reserves the scaled footprint in flow
     * (transforms don't affect layout) and centers it. Without the mode,
     * both divs are unstyled block pass-throughs. */
    /* Explicit pagination: direct .page children are the pages. The sheet
     * becomes a transparent stack and each page carries the card look on
     * screen; at print each page is exactly one full-bleed sheet. The
     * ::slotted defaults are deliberately weak (document CSS wins), so
     * authored page styling can override any of this. */
    .sheet.paginated {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .paginated ::slotted(.page) {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--doc-page-ar);
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      break-inside: avoid;
    }
    .paginated ::slotted(.page:not(:first-child)) { margin-top: 1rem; }
    @media print {
      .sheet.paginated { padding: 0; }
      /* The flowing-document vertical inset lives on the repeating
       * thead/tfoot spacers, not the sheet padding — they must go too,
       * or each full-sheet .page is pushed ~margin down and spills onto
       * a second sheet. Paginated pages are full-bleed by definition
       * (content owns its insets). */
      .sheet.paginated .hdr-space,
      .sheet.paginated .ftr-space { height: 0; }
      .paginated ::slotted(.page) {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        /* Physical page-box sizing, no viewport units: Safari resolves
         * 100vh against the window, not the page box, so a vh-sized card
         * paginates wrong there. --doc-page-w/h are the named size by
         * default and are overridden to the user's chosen paper by the
         * export path, so every card is exactly one sheet either way.
         * Width + height (same source values as @page size) rather than
         * width + aspect-ratio: the ratio is a 6-decimal rounding of the
         * same division, and a few millionths of overflow would spill a
         * blank sheet after every page. The screen-only aspect-ratio
         * (preview proportions) must not leak into print. cqh typography
         * tracks the same box.
         *
         * Every declaration is !important: per CSS Scoping, unimportant
         * shadow ::slotted rules LOSE to the document context, so a page
         * section's authored inline style would silently beat this print
         * geometry. A model-authored height:100% did exactly that — the
         * percentage resolves as auto in the all-auto print ancestry, the
         * base rule's size containment turns auto into ZERO, and
         * overflow:hidden then paints nothing: a blank PDF with perfect
         * page boxes. At print the component's geometry is the design's
         * whole contract, so it must win over any authored sizing. */
        aspect-ratio: auto !important;
        width: var(--doc-page-w) !important;
        height: var(--doc-page-h) !important;
        overflow: hidden !important;
      }
      .paginated ::slotted(.page:not(:first-child)) {
        break-before: page !important;
        margin-top: 0 !important;
      }
    }
    .fit-mode .fit-box {
      width: calc(var(--doc-fit-w) * var(--doc-fit-scale));
      height: calc(var(--doc-fit-h) * var(--doc-fit-scale));
      margin: 0 auto;
      break-inside: avoid;
    }
    /* Monolithic at print: Blink slices a transform-scaled child at
     * fragmentainer boundaries mapped in UNSCALED layout coordinates
     * (transforms are paint-time), so the .fit box (authored size, e.g.
     * 1400x990) gets cut at the page's free block space and spills onto
     * a second sheet even though its SCALED footprint fits the page by
     * construction. overflow:hidden makes .fit-box a scroll container —
     * monolithic under fragmentation (css-break-3) — so the scaled
     * content prints atomically on one sheet. No clipping for content
     * within the authored box: .fit-box is calc-sized to exactly the
     * scaled footprint. (Content that bleeds past content-width/height
     * is clipped at the footprint — fit mode's contract; it previously
     * painted beyond it at print.) Print-only, so the screen rendering
     * keeps visible overflow for editor affordances.
     * The export path injects the same rule into frozen copies
     * (print-eval.ts om-print-fit-contain). The .fit-mode scope is
     * load-bearing: .fit-box wraps slotted content in EVERY mode, and an
     * unscoped overflow:hidden would make whole flowing documents
     * monolithic (one truncated sheet). overflow:hidden, never clip —
     * clip is not a scroll container, so not monolithic. */
    @media print {
      .fit-mode .fit-box { overflow: hidden; }
    }
    .fit-mode .fit {
      width: var(--doc-fit-w);
      height: var(--doc-fit-h);
      transform: scale(var(--doc-fit-scale));
      transform-origin: top left;
    }
    .frame td, .frame th { padding: 0; text-align: left; font-weight: inherit; }
    .hdr-space { height: var(--doc-hdr-h); }
    .ftr-space { height: var(--doc-ftr-h); }
    ::slotted([slot="header"]),
    ::slotted([slot="footer"]) { display: block; box-sizing: border-box; }
    @media print {
      :host { background: none; padding: 0; min-width: 0; min-height: 0; }
      .sheet {
        width: auto; margin: 0; box-shadow: none; border-radius: 0;
        padding: 0 var(--doc-page-margin);
      }
      /* The thead/tfoot spacers repeat on every page, so they carry the
       * vertical page margin (which the sheet's own padding cannot, since
       * that padding is consumed once on the first/last page). The running
       * header/footer are fixed inside that band. */
      /* The 0.35in is breathing room between a running header/footer and
       * the body; without one the spacer is exactly the page margin, so a
       * margin="0" full-bleed document gets truly full-bleed pages. */
      .hdr-space { height: max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))); }
      .ftr-space { height: max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))); }
      /* WebKit flowing documents: @page carries the vertical margin (see
       * _syncPrintPageRule), so the spacers keep only whatever a running
       * header/footer needs BEYOND it — page 1 would otherwise double its
       * top inset. Paginated sheets already zero their spacers above. */
      .sheet.wk-print:not(.paginated) .hdr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))) - var(--doc-page-margin))); }
      .sheet.wk-print:not(.paginated) .ftr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))) - var(--doc-page-margin))); }
      ::slotted([slot="header"]) {
        position: fixed; top: 0; left: 0; right: 0; margin: 0;
        padding: calc(var(--doc-page-margin) * 0.45) var(--doc-page-margin) 0;
      }
      ::slotted([slot="footer"]) {
        position: fixed; bottom: 0; left: 0; right: 0; margin: 0;
        padding: 0 var(--doc-page-margin) calc(var(--doc-page-margin) * 0.45);
      }
    }
  `;
  class DocPage extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'width', 'height', 'margin', 'orientation', 'content-width', 'content-height'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._mo = typeof MutationObserver === 'function' ? new MutationObserver(() => this._scheduleMeasure()) : null;
    }

    /** The named paper's [w, h], swapped when orientation="landscape".
     *  Only the named size swaps — explicit width/height are exact values
     *  the author already oriented. */
    _paperSize() {
      const named = PAPER[(this.getAttribute('size') || '').toLowerCase()] || PAPER.letter;
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? [named[1], named[0]] : named;
    }
    get pageWidth() {
      return safeLen(this.getAttribute('width'), this._paperSize()[0]);
    }
    get pageHeight() {
      return safeLen(this.getAttribute('height'), this._paperSize()[1]);
    }
    get pageMargin() {
      return safeLen(this.getAttribute('margin'), '0.75in');
    }

    /** Scaled-fit mode's content box [w, h] as CSS lengths, or null when
     *  the mode is off (either attribute missing/invalid/zero — a partial
     *  declaration falls back to normal flow rather than guessing). */
    _contentFit() {
      const w = safeLen(this.getAttribute('content-width'), null);
      const h = safeLen(this.getAttribute('content-height'), null);
      if (!w || !h) return null;
      const wPx = toPx(w),
        hPx = toPx(h);
      return wPx > 0 && hPx > 0 ? [w, h, wPx, hPx] : null;
    }
    connectedCallback() {
      if (!this._sheet) this._render();
      this._syncSize();
      this._syncPrintPageRule();
      this._ensureTextWrapDefaults();
      this._ensureOwnsPrintMeta();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      if (this._mo) this._mo.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      this._onResize = () => this._scheduleMeasure();
      window.addEventListener('resize', this._onResize);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._scheduleMeasure());
      }
      this._scheduleMeasure();
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      if (this._mo) this._mo.disconnect();
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      // Drop the head rules when the last doc-page leaves, so a deleted
      // document's @page geometry and text-wrap defaults can't apply to
      // whatever replaces it.
      const survivor = document.querySelector('doc-page');
      if (!survivor) {
        ['doc-page-print', 'doc-page-text-wrap', 'doc-page-owns-print', 'doc-page-fixed-size', 'doc-page-print-sizing'].forEach(id => {
          const tag = document.getElementById(id);
          if (tag) tag.remove();
        });
        // A live deck-stage deferred its own print-sizing meta to ours —
        // hand the page-global meta over so the deck isn't left unmarked.
        const deck = document.querySelector('deck-stage');
        if (deck && typeof deck._ensurePrintSizingMeta === 'function') {
          deck._ensurePrintSizingMeta();
        }
      } else {
        // A departed owner hands each page-global meta to whatever
        // doc-page remains (or it's removed).
        if (typeof survivor._syncFixedSizeMeta === 'function') {
          survivor._syncFixedSizeMeta();
        }
        if (typeof survivor._syncPrintSizingMeta === 'function') {
          survivor._syncPrintSizingMeta();
        }
      }
    }
    attributeChangedCallback() {
      if (!this._sheet) return;
      this._syncSize();
      this._syncPrintPageRule();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      this._scheduleMeasure();
    }
    _render() {
      this._root.innerHTML = `
        <style>${stylesheet}</style>
        <style id="vars"></style>
        <div class="sheet" data-screen-label="Document">
          <table class="frame" role="presentation">
            <thead><tr><th><div class="hdr-space"><slot name="header"></slot></div></th></tr></thead>
            <tbody><tr><td class="body"><div class="fit-box"><div class="fit"><slot></slot></div></div></td></tr></tbody>
            <tfoot><tr><td><div class="ftr-space"><slot name="footer"></slot></div></td></tr></tfoot>
          </table>
        </div>`;
      this._sheet = this._root.querySelector('.sheet');
      this._vars = this._root.getElementById('vars');
    }

    /** Runtime sizing lives in a shadow <style> :host rule, never on the
     *  light-DOM host element, so serialize-persist can't write it back. */
    _syncSize(hdrH, ftrH) {
      // Scaled-fit mode: content at its authored size, scaled onto the
      // printable area (page minus margins on both axes). The factor is a
      // plain number var so calc(length * number) stays valid; 4 decimals
      // keeps the shadow style stable across re-measures. Upscaling is
      // allowed — print transforms are vector, so text and CSS stay crisp
      // (raster images soften, which the catalog bullet warns about).
      const fit = this._contentFit();
      let fitVars = '';
      if (fit) {
        const marginPx = toPx(this.pageMargin) || 0;
        const availW = toPx(this.pageWidth) - 2 * marginPx;
        const availH = toPx(this.pageHeight) - 2 * marginPx;
        const scale = Math.min(availW / fit[2], availH / fit[3]);
        if (scale > 0 && Number.isFinite(scale)) {
          fitVars = '--doc-fit-w:' + fit[0] + ';' + '--doc-fit-h:' + fit[1] + ';' + '--doc-fit-scale:' + scale.toFixed(4) + ';';
        }
      }
      this._sheet.classList.toggle('fit-mode', !!fitVars);
      // Numeric w/h ratio for the paginated page cards' aspect-ratio —
      // aspect-ratio takes a number, not a length ratio, so compute it
      // here (CSS length division isn't portable). 6 decimals keeps the
      // shadow style stable across re-syncs.
      const arW = toPx(this.pageWidth);
      const arH = toPx(this.pageHeight);
      const ar = arW > 0 && arH > 0 ? (arW / arH).toFixed(6) : '0.772727';
      this._vars.textContent = ':host{' + fitVars + '--doc-page-ar:' + ar + ';' + '--doc-page-w:' + this.pageWidth + ';' + '--doc-page-h:' + this.pageHeight + ';' + '--doc-page-margin:' + this.pageMargin + ';' + '--doc-hdr-h:' + (hdrH || 0) + 'px;' + '--doc-ftr-h:' + (ftrH || 0) + 'px;' + '--doc-hdr-pad:' + (hdrH ? '0.35in' : '0px') + ';' + '--doc-ftr-pad:' + (ftrH ? '0.35in' : '0px') + '}';
    }

    /** @page is a no-op inside shadow DOM, so the rule lives in <head>.
     *  Re-appended on every sync so it stays last in source order — the
     *  @page cascade is source-order per descriptor, so this rule wins
     *  over any other @page rule in the document.
     *
     *  The @page SIZE is pinned where the page box IS part of the design:
     *  explicit-fixed-size mode (width + height authored), scaled-fit
     *  mode (the named sheet the fit targets), and explicit pagination
     *  (the named size the cards share — so card and sheet agree on
     *  every print path, and the export path's chosen paper overrides
     *  BOTH with one later rule). For FLOWING documents no paper size is
     *  emitted at all — the true size comes from the user's preference,
     *  injected by the export path or chosen in the print dialog — so a
     *  flowing document never fights the paper it lands on.
     *  margin: 0 is emitted in every mode: it leaves Chrome no margin box
     *  to draw its date/URL/page-count header in, and the visual margin
     *  lives on the sheet's own padding. */
    _syncPrintPageRule() {
      const id = 'doc-page-print';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      document.head.appendChild(tag);
      // Three print-geometry regimes:
      // - true-size: the page IS the design — pin its exact size.
      // - scaled-fit (content-width/height): the fit factor is computed
      //   against the NAMED paper's printable area, so that paper must
      //   stay pinned or the scaled content overflows a smaller sheet
      //   (the export path re-fits and re-pins at print time on top).
      // - default modes: no paper size — but landscape still needs the
      //   paper-agnostic 'size: landscape' keyword, because the size
      //   descriptor is what carries orientation; without it a landscape
      //   document prints portrait whenever nothing injects a size.
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      // Explicit pagination pins the page box to the SAME values that
      // size the cards (the named size by default, the export path's
      // chosen paper when its later rule overrides both) — card and
      // sheet agree on every print path, and a mismatched real paper
      // shrinks-to-fit in the dialog instead of clipping a Letter card
      // on A4. Declared before the paginated read below so both derive
      // from one check.
      const paginatedNow = this.querySelector(':scope > .page') !== null;
      const sizeDescriptor = this._trueSizePx() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : this._contentFit() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : paginatedNow ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : landscape ? 'size: landscape; ' : '';
      // WebKit never repeats the thead/tfoot spacers that carry a flowing
      // document's vertical page margins (see WK_PRINT above), so pages
      // after the first print edge-to-edge there. Carry the VERTICAL
      // margins on @page for WebKit instead, and the shadow print CSS
      // trims the first-page spacers by the same amount (.sheet.wk-print
      // rules). Horizontal inset stays on the sheet's own padding in
      // every engine. Blink keeps margin: 0 (a nonzero margin there
      // re-opens the box Chrome draws its header furniture in). One cost,
      // learned in testing: Safari's own date/URL headers are a USER
      // dialog setting ("Print headers and footers") that renders in the
      // margin area when room exists — margin: 0 only suppressed it by
      // leaving no room, and no CSS controls it. The export dialog's
      // Safari guide teaches turning the setting off for flowing
      // documents. Explicitly paginated and fixed-size documents keep
      // margin: 0 everywhere: their pages ARE the sheet.
      const wkFlowing = WK_PRINT && !paginatedNow && !this._trueSizePx() && !this._contentFit();
      const marginDescriptor = wkFlowing ? 'margin: ' + this.pageMargin + ' 0; ' : 'margin: 0; ';
      // Shadow-internal marker (never serialized), kept in lockstep with
      // the @page decision above: the print CSS trims the first-page
      // spacers ONLY while @page actually carries the margins — a
      // true-size or scaled-fit sheet keeps margin: 0 and must keep its
      // spacers too. Re-synced here so attribute changes and pagination
      // flips move both together.
      if (this._sheet) this._sheet.classList.toggle('wk-print', wkFlowing);
      tag.textContent = '@page { ' + sizeDescriptor + marginDescriptor + '} ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; height: auto !important; overflow: visible !important; } ' + 'h1,h2,h3,h4,h5,h6 { break-after: avoid; } ' + 'figure,pre,blockquote,img,svg,tr { break-inside: avoid; } ' + 'p,li { orphans: 3; widows: 3; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' + '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Typographic defaults for document text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins; document-level so the
     *  rules reach the slotted (light DOM) content — shadow styles can't.
     *  data-omelette-injected marks the tag for the host editor to strip
     *  at serialize, so it is never written back as authored source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('doc-page-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'doc-page-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }

    /** Declares that this document owns its print CSS. The instant-PDF
     *  export checks for the meta by NAME PRESENCE alone (content is
     *  ignored) and skips its automatic print-CSS injections, so the
     *  component's @page geometry is never overridden by a heuristic.
     *  data-omelette-injected keeps it out of serialized source. */
    _ensureOwnsPrintMeta() {
      if (document.getElementById('doc-page-owns-print')) return;
      const tag = document.createElement('meta');
      tag.id = 'doc-page-owns-print';
      tag.name = 'omelette-owns-print';
      tag.content = 'true';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** This page's valid true-size page box (explicit width AND height)
     *  as [w, h] px ints, or null when the mode is off. */
    _trueSizePx() {
      if (!safeLen(this.getAttribute('width'), null) || !safeLen(this.getAttribute('height'), null)) return null;
      const w = Math.round(toPx(this.pageWidth));
      const h = Math.round(toPx(this.pageHeight));
      return w > 0 && h > 0 ? [w, h] : null;
    }

    /** True-size pages (explicit width AND height) also declare the page
     *  box as the preview size: the in-app preview reads
     *  meta[name="omelette-fixed-size"] (content "W,H" in px ints) and
     *  scales the sheet into view — without it an 18in poster previews at
     *  true size with scrollbars. Never overrides an author-set meta
     *  (only the component's own id is managed). The meta is page-global
     *  while doc-page instances are not, so every sync recomputes the
     *  page-wide owner — the first connected true-size doc-page — and a
     *  non-true-size sibling's sync can never delete the owner's meta.
     *  Removed when no true-size page remains (the owner's disconnect
     *  re-syncs via any survivor) or when an author-set meta exists. */
    _syncFixedSizeMeta() {
      const id = 'doc-page-fixed-size';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-fixed-size"]:not([data-omelette-injected])');
      // The page-wide owner, not this instance: an upgraded true-size page
      // anywhere in the document keeps the meta alive and sized.
      let box = null;
      for (const el of document.querySelectorAll('doc-page')) {
        box = typeof el._trueSizePx === 'function' ? el._trueSizePx() : null;
        if (box) break;
      }
      if (!box || authored) {
        if (own) own.remove();
        return;
      }
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-fixed-size';
      tag.content = box[0] + ',' + box[1];
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }

    /** This page's print-sizing mode: 'fixed' when an explicit width AND
     *  height are authored (the page is the design's own size), else the
     *  default paper in the authored orientation. */
    _printSizingMode() {
      if (this._trueSizePx()) return 'fixed';
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? 'default-landscape' : 'default-portrait';
    }

    /** Announces the print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] with content 'default-portrait',
     *  'default-landscape', or 'fixed' (fixed pages also carry the
     *  omelette-fixed-size meta with the page box in px). The export path
     *  probes it to decide what true paper size to inject at print time —
     *  in the default modes the component emits no paper size of its own.
     *  Same page-global ownership rules as the fixed-size meta above:
     *  first connected doc-page owns it, an authored meta is never
     *  overridden, removed when no doc-page remains. */
    _syncPrintSizingMeta() {
      const id = 'doc-page-print-sizing';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-print-sizing"]:not([data-omelette-injected])');
      // A fixed page wins outright (mirroring the fixed-size loop above,
      // so the two metas can never contradict each other in a mixed
      // multi-page document); otherwise the first page's mode holds.
      let mode = null;
      for (const el of document.querySelectorAll('doc-page')) {
        if (typeof el._printSizingMode !== 'function') continue;
        const m = el._printSizingMode();
        if (m === 'fixed') {
          mode = m;
          break;
        }
        if (mode === null) mode = m;
      }
      if (!mode || authored) {
        if (own) own.remove();
        return;
      }
      // A deck-stage that connected first injected its own meta and
      // defers to any existing one — take it over, or the document ends
      // up with two conflicting injected metas (a doc-page page is the
      // document; the deck re-ensures its meta if every doc-page leaves).
      const deckMeta = document.getElementById('deck-stage-print-sizing');
      if (deckMeta) deckMeta.remove();
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-print-sizing';
      tag.content = mode;
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }
    _scheduleMeasure() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._measure();
      });
    }

    /** Slot heights feed the print spacers (--doc-hdr-h / --doc-ftr-h), so
     *  they re-measure on content mutation, resize, and font load. The
     *  same pass detects explicit pagination (direct .page children) and
     *  toggles the sheet between the flowing-document card and the
     *  page-per-card stack — content edits can add or remove pages at any
     *  time, so this tracks the same mutations the measurement does. */
    _measure() {
      const hdr = this.querySelector(':scope > [slot="header"]');
      const ftr = this.querySelector(':scope > [slot="footer"]');
      const wasPaginated = this._sheet.classList.contains('paginated');
      this._sheet.classList.toggle('paginated', this.querySelector(':scope > .page') !== null);
      // The WebKit @page margin is flowing-only, so a pagination flip
      // must re-emit the rule (content edits can add or remove .page
      // sections at any time).
      if (this._sheet.classList.contains('paginated') !== wasPaginated) {
        this._syncPrintPageRule();
      }
      this._syncSize(hdr ? hdr.offsetHeight : 0, ftr ? ftr.offsetHeight : 0);
    }
  }
  if (!customElements.get('doc-page')) {
    customElements.define('doc-page', DocPage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-dashboard/doc-page.js", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/CtaBlock.jsx
try { (() => {
/* global React */
function CtaBlock({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    style: ctaStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: ctaStyles.glow
  }), /*#__PURE__*/React.createElement("div", {
    style: ctaStyles.inner
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-gold)'
    }
  }, "Step \xB7 Final \xB7 Despliega"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: ctaStyles.h2
  }, "Tu pr\xF3ximo micro-SaaS", /*#__PURE__*/React.createElement("br", null), "empieza esta tarde."), /*#__PURE__*/React.createElement("p", {
    style: ctaStyles.lead
  }, "Clona el repo, ejecuta ", /*#__PURE__*/React.createElement("code", {
    style: ctaStyles.code
  }, "pnpm install"), ", pega tus keys de Supabase y Stripe, y rebrandea. Si tardas m\xE1s de una tarde, abrimos un issue juntos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    onClick: () => onNavigate?.('signup')
  }, "Empezar gratis \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: 'transparent',
      color: 'var(--color-bone)',
      border: '1px solid rgba(245,236,218,0.2)',
      padding: '13px 28px',
      borderRadius: 8
    }
  }, "Ver repo en GitHub"))))));
}
const ctaStyles = {
  card: {
    position: 'relative',
    background: 'var(--color-night)',
    color: 'var(--color-bone)',
    borderRadius: 18,
    padding: 64,
    overflow: 'hidden',
    textAlign: 'center',
    backgroundImage: 'linear-gradient(to right, rgba(245,236,218,0.04) 1px, transparent 1px),' + 'linear-gradient(to bottom, rgba(245,236,218,0.04) 1px, transparent 1px)',
    backgroundSize: '40px 40px'
  },
  glow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(184,81,58,0.18), transparent 60%)',
    pointerEvents: 'none'
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    maxWidth: 640,
    margin: '0 auto',
    alignItems: 'center'
  },
  h2: {
    margin: 0,
    fontSize: 64,
    lineHeight: 1,
    color: 'var(--color-bone)'
  },
  lead: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.6,
    color: 'rgba(245,236,218,0.7)'
  },
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    background: 'rgba(245,236,218,0.10)',
    color: 'var(--color-bone)',
    padding: '2px 8px',
    borderRadius: 4
  }
};
window.CtaBlock = CtaBlock;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/CtaBlock.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/FeatureGrid.jsx
try { (() => {
/* global React */
const FEATURES = [{
  icon: 'shield-check',
  title: 'Autenticación lista',
  body: 'Login con email + password, magic link, OAuth (Google, GitHub) y MFA con recovery codes — todo desde Supabase Auth.'
}, {
  icon: 'building-2',
  title: 'Orgs + permisos',
  body: 'Cada cuenta soporta múltiples organizaciones, invitaciones por email, y roles owner / admin / member listos para usar.'
}, {
  icon: 'credit-card',
  title: 'Billing con Stripe',
  body: 'Suscripciones, trials, upgrades y portal de cliente. Webhooks reciben y reconcilian — solo conectas tus keys.'
}, {
  icon: 'globe',
  title: 'Internacionalización',
  body: 'next-intl configurado con es/en de fábrica, mensajes tipados, y switcher de idioma respetando rutas.'
}, {
  icon: 'moon',
  title: 'Light + Dark',
  body: 'Theme provider con persistencia, tokens semánticos en CSS, y dark mode que respira la noche-tierra de Iroko.'
}, {
  icon: 'database',
  title: 'Esquema Supabase',
  body: 'Migraciones SQL para profiles, organizations, memberships, invitations, subscriptions — todo con RLS.'
}];
function FeatureGrid() {
  React.useEffect(() => {
    window.lucide?.createIcons();
  });
  return /*#__PURE__*/React.createElement("section", {
    className: "section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head section-head--centered"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Step \xB7 02 \xB7 Tronco"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: {
      fontSize: 56,
      lineHeight: 1,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Todo lo que reescrib\xEDas,", /*#__PURE__*/React.createElement("br", null), "ya est\xE1 aqu\xED."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 580,
      fontSize: 17,
      lineHeight: 1.6,
      color: 'var(--text-secondary)'
    }
  }, "Cada feature est\xE1 peleada por c\xF3digo de producci\xF3n real, no por un README. Si la usas en cliente, sabes que ya pas\xF3 por el siguiente proyecto.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, FEATURES.map(f => /*#__PURE__*/React.createElement("article", {
    key: f.title,
    style: featStyles.card
  }, /*#__PURE__*/React.createElement("div", {
    style: featStyles.iconBox
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": f.icon,
    style: {
      strokeWidth: 1.25,
      width: 22,
      height: 22,
      color: 'var(--color-iron)'
    }
  })), /*#__PURE__*/React.createElement("h3", {
    style: featStyles.title
  }, f.title), /*#__PURE__*/React.createElement("p", {
    style: featStyles.body
  }, f.body))))));
}
const featStyles = {
  card: {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    transition: 'border-color 200ms, transform 200ms'
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: 'rgba(184,81,58,0.10)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(184,81,58,0.18)'
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    color: 'var(--text-primary)'
  },
  body: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.6,
    color: 'var(--text-secondary)'
  }
};
window.FeatureGrid = FeatureGrid;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/FeatureGrid.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/Footer.jsx
try { (() => {
/* global React */
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: fStyles.footer
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: fStyles.grid
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: fStyles.brandRow
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 36 36",
    width: "22",
    height: "22"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "36",
    height: "36",
    rx: "6",
    fill: "var(--color-ink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "11",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "4",
    fill: "var(--color-cobalt)"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: {
      fontSize: 22,
      color: 'var(--text-primary)'
    }
  }, "Iroko")), /*#__PURE__*/React.createElement("p", {
    style: fStyles.small
  }, "El template multi-tenant que reh\xFAsas reescribir."), /*#__PURE__*/React.createElement("p", {
    className: "mono",
    style: {
      ...fStyles.small,
      opacity: 0.55
    }
  }, "\xA9 2026 pipec \xB7 v1.0")), /*#__PURE__*/React.createElement("div", {
    style: fStyles.col
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Producto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Features"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Precios"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Changelog"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Roadmap")), /*#__PURE__*/React.createElement("div", {
    style: fStyles.col
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Recursos"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Documentaci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Gu\xEDa de inicio"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Migraci\xF3n"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Comunidad")), /*#__PURE__*/React.createElement("div", {
    style: fStyles.col
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Compa\xF1\xEDa"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Manifiesto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Contacto"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "GitHub"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Twitter"))), /*#__PURE__*/React.createElement("hr", {
    className: "rule",
    style: {
      margin: '40px 32px 0'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: fStyles.bottom
  }, /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    }
  }, "pipec \xB7 iroko \xB7 made in cl"), /*#__PURE__*/React.createElement("span", {
    className: "mono",
    style: {
      fontSize: 11,
      color: 'var(--text-tertiary)',
      letterSpacing: '0.18em',
      textTransform: 'uppercase'
    }
  }, "\u223C aprende del pasado \xB7 construye el futuro \u223C")));
}
const fStyles = {
  footer: {
    marginTop: 96,
    paddingBottom: 32
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    gap: 32,
    padding: '64px 32px 0'
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  small: {
    margin: '0 0 4px',
    fontSize: 13,
    color: 'var(--text-secondary)',
    maxWidth: 320
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  bottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px 0'
  }
};
window.Footer = Footer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/Footer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/Hero.jsx
try { (() => {
/* global React */
function Hero({
  onNavigate
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: heroStyles.section,
    className: "iroko-grid"
  }, /*#__PURE__*/React.createElement("div", {
    style: heroStyles.glowL
  }), /*#__PURE__*/React.createElement("div", {
    style: heroStyles.glowR
  }), /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: heroStyles.inner
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Step \xB7 01 \xB7 Origen"), /*#__PURE__*/React.createElement("h1", {
    className: "display-italic",
    style: heroStyles.h1
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, "Un tronco com\xFAn"), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, "para tus ", /*#__PURE__*/React.createElement("span", {
    style: heroStyles.iron
  }, "micro-saas"), ".")), /*#__PURE__*/React.createElement("p", {
    style: heroStyles.lead
  }, "Iroko es el template que reh\xFAsas reescribir cada vez. Autenticaci\xF3n, organizaciones, billing, internacionalizaci\xF3n \u2014 todo cableado a Supabase y listo para que rebrandees y despliegues tu siguiente proyecto en una tarde."), /*#__PURE__*/React.createElement("div", {
    style: heroStyles.ctas
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-iron",
    onClick: () => onNavigate?.('signup')
  }, "Empezar gratis \u2192"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    onClick: () => onNavigate?.('docs')
  }, "Ver documentaci\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: heroStyles.proof
  }, /*#__PURE__*/React.createElement(Beat, {
    label: "Auth + MFA"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "Stripe billing"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "Orgs + RBAC"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "i18n \xB7 es/en"
  }), /*#__PURE__*/React.createElement(Sep, null), /*#__PURE__*/React.createElement(Beat, {
    label: "Dark mode"
  }))));
}
function Beat({
  label
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.06em',
      color: 'var(--text-tertiary)',
      whiteSpace: 'nowrap',
      flex: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 5,
      height: 5,
      borderRadius: 999,
      background: 'var(--color-poppy)',
      opacity: 0.85
    }
  }), label);
}
function Sep() {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: 4,
      height: 4,
      borderRadius: 999,
      background: 'var(--border-strong)'
    }
  });
}
const heroStyles = {
  section: {
    position: 'relative',
    paddingTop: 80,
    paddingBottom: 120,
    overflow: 'hidden'
  },
  glowL: {
    position: 'absolute',
    left: '-10%',
    top: -120,
    width: 600,
    height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(184,81,58,0.10), transparent 65%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  glowR: {
    position: 'absolute',
    right: '-15%',
    top: 200,
    width: 700,
    height: 700,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(217,164,65,0.08), transparent 60%)',
    pointerEvents: 'none',
    zIndex: 0
  },
  inner: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 28
  },
  h1: {
    margin: '8px 0 0',
    fontSize: 'clamp(48px, 5.5vw, 76px)',
    lineHeight: 1.02,
    fontWeight: 500,
    color: 'var(--text-primary)'
  },
  iron: {
    color: 'var(--color-iron)'
  },
  lead: {
    margin: 0,
    maxWidth: 640,
    fontSize: 18,
    lineHeight: 1.6,
    color: 'var(--text-secondary)'
  },
  ctas: {
    display: 'flex',
    gap: 12,
    marginTop: 8
  },
  proof: {
    marginTop: 16,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18
  }
};
window.Hero = Hero;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/Navbar.jsx
try { (() => {
/* global React */
const NAV_ROUTES = [{
  id: 'product',
  label: 'Producto'
}, {
  id: 'pricing',
  label: 'Precios'
}, {
  id: 'docs',
  label: 'Documentación'
}, {
  id: 'changelog',
  label: 'Changelog'
}];
function Navbar({
  route,
  onNavigate
}) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      ...navStyles.nav,
      borderBottomColor: scrolled ? 'var(--border)' : 'transparent',
      background: scrolled ? 'rgba(245,236,218,0.86)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: navStyles.inner
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate?.('home'),
    style: navStyles.brand
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 36 36",
    width: "26",
    height: "26",
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    width: "36",
    height: "36",
    rx: "6",
    fill: "var(--color-ink)"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "11",
    fill: "none",
    stroke: "var(--color-poppy)",
    strokeWidth: "2.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "4",
    fill: "var(--color-cobalt)"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "3",
    x2: "18",
    y2: "6.5",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "29.5",
    x2: "18",
    y2: "33",
    stroke: "var(--color-poppy)",
    strokeWidth: "1.4"
  })), /*#__PURE__*/React.createElement("span", {
    className: "wordmark",
    style: navStyles.brandText
  }, "Iroko")), /*#__PURE__*/React.createElement("div", {
    style: navStyles.links
  }, NAV_ROUTES.map(r => /*#__PURE__*/React.createElement("button", {
    key: r.id,
    onClick: () => onNavigate?.(r.id),
    style: {
      ...navStyles.link,
      color: route === r.id ? 'var(--text-primary)' : 'var(--text-secondary)'
    }
  }, r.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: navStyles.signIn,
    onClick: () => onNavigate?.('login')
  }, "Iniciar sesi\xF3n"), /*#__PURE__*/React.createElement("button", {
    style: navStyles.cta,
    onClick: () => onNavigate?.('signup')
  }, "Empezar gratis ", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, "\u2192")))));
}
const navStyles = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid transparent',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    transition: 'all 200ms ease'
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px'
  },
  brand: {
    background: 'transparent',
    border: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  brandText: {
    fontSize: 26,
    lineHeight: 1,
    color: 'var(--text-primary)'
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  link: {
    background: 'transparent',
    border: 0,
    padding: '8px 14px',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
  },
  signIn: {
    background: 'transparent',
    border: 0,
    padding: '8px 14px',
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap'
  },
  cta: {
    background: 'var(--color-ink)',
    color: 'var(--color-paper)',
    border: 0,
    borderRadius: 6,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap'
  }
};
window.Navbar = Navbar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/Navbar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/PricingTiers.jsx
try { (() => {
/* global React */
const TIERS = [{
  name: 'Personal',
  price: '$0',
  period: '/mes',
  desc: 'Para tu proyecto en solitario. Sin tarjeta.',
  cta: 'Empezar',
  features: ['1 organización', '3 proyectos', 'Hasta 5 miembros', 'Comunidad Discord'],
  featured: false
}, {
  name: 'Studio',
  price: '$49',
  period: '/mes',
  desc: 'Tu agencia y todos tus micro-SaaS bajo un mismo paraguas.',
  cta: 'Empezar Studio',
  features: ['Orgs ilimitadas', 'Proyectos ilimitados', 'Miembros ilimitados', 'White-label completo', 'Soporte prioritario'],
  featured: true
}, {
  name: 'Custom',
  price: 'A medida',
  period: '',
  desc: 'On-prem, SLA dedicado, integración con tu infra existente.',
  cta: 'Hablemos',
  features: ['Self-hosted Supabase', 'SSO + SAML', 'SLA 99.9%', 'Account manager dedicado'],
  featured: false
}];
function PricingTiers() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    style: {
      background: 'var(--surface-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "section-head section-head--centered"
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm"
  }, "Step \xB7 03 \xB7 Ramas"), /*#__PURE__*/React.createElement("h2", {
    className: "display-italic",
    style: {
      fontSize: 56,
      lineHeight: 1,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Precios sin ramas extra."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      maxWidth: 560,
      fontSize: 17,
      lineHeight: 1.6,
      color: 'var(--text-secondary)'
    }
  }, "Comienza gratis. Cuando tu proyecto pase de \"tronco\" a \"bosque\", escalamos juntos.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16,
      maxWidth: 1080,
      margin: '0 auto',
      alignItems: 'start'
    }
  }, TIERS.map(t => /*#__PURE__*/React.createElement("article", {
    key: t.name,
    style: {
      ...priceStyles.card,
      ...(t.featured ? priceStyles.featured : null)
    }
  }, t.featured && /*#__PURE__*/React.createElement("span", {
    style: priceStyles.ribbon
  }, "M\xE1s popular"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...priceStyles.tierName,
      color: t.featured ? 'var(--color-bone)' : 'var(--text-primary)'
    }
  }, t.name), /*#__PURE__*/React.createElement("div", {
    style: {
      ...priceStyles.tierDesc,
      color: t.featured ? 'rgba(245,236,218,0.7)' : 'var(--text-secondary)'
    }
  }, t.desc), /*#__PURE__*/React.createElement("div", {
    className: "mono",
    style: {
      ...priceStyles.price,
      color: t.featured ? 'var(--color-bone)' : 'var(--text-primary)'
    }
  }, t.price, t.period && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 14,
      fontWeight: 400,
      color: t.featured ? 'rgba(245,236,218,0.6)' : 'var(--text-secondary)'
    }
  }, t.period)), /*#__PURE__*/React.createElement("button", {
    style: {
      ...priceStyles.cta,
      background: t.featured ? 'var(--color-iron)' : 'var(--surface-elevated)',
      color: t.featured ? '#fff' : 'var(--text-primary)',
      border: t.featured ? '0' : '1px solid var(--border-strong)'
    }
  }, t.cta), /*#__PURE__*/React.createElement("ul", {
    style: priceStyles.list
  }, t.features.map(f => /*#__PURE__*/React.createElement("li", {
    key: f,
    style: {
      ...priceStyles.li,
      color: t.featured ? 'rgba(245,236,218,0.86)' : 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.featured ? 'var(--color-gold)' : 'var(--color-iron)',
      fontWeight: 700
    }
  }, "\xB7"), f))))))));
}
const priceStyles = {
  card: {
    position: 'relative',
    background: 'var(--surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  featured: {
    background: 'var(--color-night)',
    border: '1px solid var(--color-night)',
    transform: 'translateY(-12px)',
    boxShadow: 'var(--shadow-xl)'
  },
  ribbon: {
    position: 'absolute',
    top: -11,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--color-gold)',
    color: 'var(--color-night)',
    padding: '4px 12px',
    borderRadius: 999,
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textTransform: 'uppercase'
  },
  tierName: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.015em'
  },
  tierDesc: {
    fontSize: 13,
    lineHeight: 1.55,
    minHeight: 40
  },
  price: {
    fontSize: 40,
    fontWeight: 600,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    marginTop: 6
  },
  cta: {
    height: 44,
    borderRadius: 8,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: 14,
    marginTop: 8,
    cursor: 'pointer'
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '12px 0 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  li: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 13,
    lineHeight: 1.5
  }
};
window.PricingTiers = PricingTiers;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/PricingTiers.jsx", error: String((e && e.message) || e) }); }

// ui_kits/iroko-marketing/Quote.jsx
try { (() => {
/* global React */
function Quote() {
  return /*#__PURE__*/React.createElement("section", {
    className: "section section--tight"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container",
    style: {
      maxWidth: 760,
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "eyebrow-sm",
    style: {
      color: 'var(--color-iron)'
    }
  }, "Proverbio Akan"), /*#__PURE__*/React.createElement("blockquote", {
    className: "display-italic",
    style: {
      margin: 0,
      fontSize: 36,
      lineHeight: 1.3,
      color: 'var(--text-primary)'
    }
  }, "\"Antes de cortar el iroko, se le pide permiso al esp\xEDritu del \xE1rbol \u2014 porque sin tronco, no hay ramas.\""), /*#__PURE__*/React.createElement("hr", {
    className: "rule rule--gold",
    style: {
      width: 120
    }
  }), /*#__PURE__*/React.createElement("p", {
    className: "mono",
    style: {
      margin: 0,
      fontSize: 11,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)'
    }
  }, "La filosof\xEDa detr\xE1s del template")));
}
window.Quote = Quote;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/iroko-marketing/Quote.jsx", error: String((e && e.message) || e) }); }

})();
