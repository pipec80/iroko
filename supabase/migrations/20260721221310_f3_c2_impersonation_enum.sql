-- F3-C2: nuevos valores de audit.action_type para impersonation. Va en su
-- propia migración porque ALTER TYPE ... ADD VALUE no puede compartir
-- transacción con código que lo use.
ALTER TYPE audit.action_type ADD VALUE 'impersonate_start';
ALTER TYPE audit.action_type ADD VALUE 'impersonate_end';
