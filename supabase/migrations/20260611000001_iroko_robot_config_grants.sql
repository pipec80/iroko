-- Grant PostgREST Data API access to the authenticated role for the new tables

GRANT SELECT, INSERT, UPDATE, DELETE ON public.robot_routines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.robot_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.robot_memories TO authenticated;
