# ADR 0006 — Recuperación MFA y entrada por invitación

- Estado: Accepted
- Fecha: 2026-11-26, America/Santiago
- Decisor: propietario, durante el QA humano local.

## Contexto

Iroko usa Supabase Auth self-hosted como referencia para TOTP. Los códigos de
recuperación son una función de Iroko. En QA, el contador de códigos y un estado
visual anterior sobrevivieron al restablecimiento. En invitaciones, la
membresía funcionó pero el correo presentó una elección innecesaria.

## Decisiones

- Conservar la recuperación estricta para pérdida o robo. El código de un
  solo uso restablece el factor, revoca sesiones según el contrato existente
  y requiere volver a iniciar sesión. Guiar al usuario para enrolar el nuevo
  autenticador y renovar sus respaldos. El acceso puntual mediante códigos
  como segundo factor alternativo queda diferido.
- Resolver en servidor el destino de la invitación antes de enviar el correo.
  El botón «Aceptar invitación» abre el login para una cuenta existente o el
  registro para una nueva. Conservar la continuación y la comprobación de
  correo, vigencia y rol al aceptar. La existencia de una identidad se usa
  internamente y permanece privada frente al invitador.

## Consecuencias

La aceptación requiere evidencia de ambos destinatarios y de recuperación en
una sesión nueva. La confirmación de cambio de correo y la política de
sesiones tras cambiar contraseña conservan propuestas en el plan de ejecución.
La decisión de alcance del [ADR 0005](0005-replicable-saas-mvp-and-bounded-acceptance.md)
y el circuito Mercado Pago siguen vigentes.

[Plan de ejecución](../exec-plans/active/2026-11-26-cierre-qa-acceso-cuenta.md)
