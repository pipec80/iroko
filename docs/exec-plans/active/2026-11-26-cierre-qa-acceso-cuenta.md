# Cierre de hallazgos del QA humano de acceso y cuenta

Ejecución local iniciada sobre `main` base `ac1cd4b`. La revisión Cloud
`1390d89` es histórica. La bitácora registra los resultados de esta pasada
y las verificaciones que siguen pendientes.

[Bitácora](../../quality/manual-qa-register.md) ·
[Seguimiento FIX-01 a FIX-12](../../quality/iroko-qa-corrections-tracker.md) ·
[Plan de organización e invitaciones](2026-11-20-organizacion-inicial-e-invitaciones.md) ·
[ADR 0006](../../adr/0006-auth-recovery-and-invitation-entry.md) ·
[Planilla maestra](https://docs.google.com/spreadsheets/d/16_eHqYwc3Ugp9SNLop35Id1Rt_LC4KXXiEK0cW8St-Q/edit)

## 1. Textos y estados de acceso

- En `mfa-setup.tsx` y los mensajes de acceso, explicar el retiro del
  autenticador antes de confirmar un código. Al volver a Seguridad, mostrar
  el estado actualizado sin recarga manual y guiar el nuevo enrolamiento y
  la regeneración. Mostrar el contador cuando haya un factor activo. Preservar
  el contrato actual de recuperación, incluido el consumo de un solo código.
- En la plantilla de enlace mágico retirar el bloque OTP si se confirma que
  la interfaz ofrecida admite sólo enlace. Traducir `otp_disabled` con un
  mensaje genérico que no confirme la existencia de cuentas. Mantener el aviso
  de espera. QA-12 pasó al primer clic en una repetición limpia.
- Validar los cuatro idiomas, persistencia del estado MFA, regeneración,
  rechazo de código usado y revocación de la sesión anterior. Reusar
  `mfa-recovery.spec.ts` y las pruebas de acciones de Auth.

## 2. Invitación directa · FIX-07 a FIX-09

- En la acción de invitación, seleccionar el destino del botón en servidor
  con una comprobación interna de la identidad Auth del destinatario.
  Mantener la respuesta al invitador uniforme y conservar la continuación
  hasta completar login, alta, confirmación o MFA. Aplicar el mismo criterio
  a reenvíos. Preservar la validación de identidad y token del RPC existente,
  así como el tratamiento de invitaciones antiguas ya emitidas.
- Con dos sesiones, probar que cada correo nuevo abre directamente el
  formulario esperado, que la cuenta queda en el equipo con el rol correcto
  y que reabrir el enlace deja una sola membresía. Cubrir duplicados, sesión
  equivocada, vencimiento y revocación. Mantener el Owner abierto para
  observar la notificación causada por la aceptación, antes y después de
  recargar. La notificación sintética en vivo ya pasó.

## 3. Credenciales y Ajustes · FIX-01 y FIX-11

- Mover el correo de acceso a Seguridad. Proponer el enlace secundario
  «No recuerdo mi contraseña actual» dentro de Cambiar contraseña. Mantener
  la recuperación pública en Login. Verificar estados claro/oscuro y revisar
  un aviso legible de guardado de datos de organización.
- Política propuesta de correo: confirmar desde el nuevo buzón, notificar
  al anterior al completar y exigir reautenticación antes de iniciar el
  cambio. Mantener la doble confirmación vigente hasta aprobar ese contrato
  y verificar su aplicación efectiva en servidor con Auth local. La doble
  confirmación ya pasó en local y falta un login limpio con la nueva dirección.
- Política propuesta de contraseña: conservar la sesión actual y revocar
  las otras tras un cambio autenticado. Pedir nuevo login tras recuperación
  pública. El flujo actual ya envió el aviso y quedó con sesión activa en la
  recuperación pública. Validar contrato antes de cambiarlo.
- Verificar nueva contraseña, rechazo de la anterior y efecto sobre una
  segunda sesión. En correo, comprobar pendiente, completado, notificación
  y acceso con la dirección vigente. Confirmar Ajustes tras recargar.

## 4. Evidencia y salida

- Primero reutilizar cuentas locales para exportación, revocar otra sesión
  y los pendientes de organización inicial y navegación antigua. Dejar el
  reset al final para FIX-02. Mantener las cookies del usuario de prueba,
  parar Next, resetear sólo el Supabase local aprobado, volver a levantar
  Next y abrir la ruta protegida con el mismo navegador. Esperar login.
- La bitácora conserva evidencia técnica de Storage, Auth, Postgres y
  Realtime en los recorridos observados. Marcar en la planilla por entorno
  y variante. El paso Cloud queda [NO VERIFICADO], con dominio fijo, revisión
  comprobada, dos identidades con correo accesible y autorización aplicable.
  La evidencia de uso de clave API, límites de Storage, roles completos,
  presencia, exportación y superadministración se cierra con sus casos.
- Miembros y roles amplían la matriz en el frente RBAC. Actividad y auditoría
  de importaciones, Documentos/Markdown, texto de Robot y el visor opcional
  React Email mantienen sus observaciones en la bitácora. Facturación y
  cobro real quedan en 011/011f. Edge Functions requieren evidencia propia
  cuando corresponda. Esta pasada no certifica el conjunto de servicios.

## Reglas de implementación

Antes de declarar cerrada la matriz, revisar los 12 FIX en la misma hoja.
FIX-03 tiene confirmación de alta sin OTP observada. FIX-04/05 requieren cerrar
la organización inicial y el redirect histórico. FIX-06 conserva su control de
cupos y frontera con fixtures. FIX-10 conserva el aislamiento de facturación
simulada y permisos por cuenta, con pago real en 011f. FIX-12 tiene revocación
en UI y persistencia en SQL local, con uso antes y rechazo después pendientes
de observar en esta pasada. El registro histórico conserva las pruebas técnicas.

- Aplicar `typescript-nextjs.md`, `code-quality.md`,
  `software-principles.md` y `jsdoc-documentation.md` en TypeScript,
  JavaScript y React/Next. Tipos estrictos, operaciones privilegiadas en
  servidor, mensajes existentes y navegación tipada. Leer la documentación
  de Next instalada antes de tocar código. Mantener `src/proxy.ts`.
- Aplicar `supabase-setup.md` para SQL y permisos. Si hace falta una
  migración, prevalece AGENTS.md en Windows: migración manual y espejo de
  esquema, validación local y tipos regenerados si cambia el contrato expuesto.
  Conservar la privacidad del canal según `supabase-realtime.md`. El plan
  reutiliza la entrega existente y sólo cambia Realtime si una prueba lo exige.
- Aplicar `testing-standards.md`, TESTING-PLAN.md y `git-workflow.md`.
  Reusar pruebas focales, ejecutarlas secuencialmente y registrar comando,
  revisión, resultado y limitaciones. Añadir cobertura enfocada para la
  regresión de destinos de correo. Preservar cambios pendientes.
