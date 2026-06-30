-- Límite de 10 MB por documento. Justificación: documentos de texto plano
-- raramente superan 1 MB; 10 MB da margen razonable sin riesgo de DoS.
-- Para documentos más grandes usar Supabase Storage y almacenar solo metadata.

ALTER TABLE public.documents
  ADD CONSTRAINT documents_content_max_size
    CHECK (octet_length(content) <= 10485760);

COMMENT ON CONSTRAINT documents_content_max_size ON public.documents IS
  'Máximo 10 MB de contenido por documento. Para archivos mayores usar storage.';
