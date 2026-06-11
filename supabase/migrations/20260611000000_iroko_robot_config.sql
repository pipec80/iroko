-- ============================================================================
-- IROKO ROBOT CONFIG TABLES
-- ============================================================================

-- Create a storage bucket for the robot config excels (raw uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('robot_configs', 'robot_configs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for robot_configs bucket
CREATE POLICY "Accounts can read their own robot configs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'robot_configs' AND
    (private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IS NOT NULL)
  );

CREATE POLICY "Accounts can insert their own robot configs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'robot_configs' AND
    (private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IS NOT NULL)
  );

CREATE POLICY "Accounts can delete their own robot configs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'robot_configs' AND
    (private.get_user_role(split_part(name, '/', 1)::uuid, (SELECT auth.uid())) IS NOT NULL)
  );

-- ----------------------------------------------------------------------------
-- 1. Robot Routines
-- ----------------------------------------------------------------------------
CREATE TABLE public.robot_routines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    time TIME NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_robot_routines_account_id ON public.robot_routines(account_id);

COMMENT ON TABLE public.robot_routines IS 'Stores the daily routines and medical reminders for the robot to announce.';
COMMENT ON COLUMN public.robot_routines.time IS 'The exact time of day the routine triggers.';
COMMENT ON COLUMN public.robot_routines.activity_type IS 'Type of activity (e.g., Medicina, Ejercicio, Comida).';
COMMENT ON COLUMN public.robot_routines.message IS 'The exact TTS message the robot should speak.';

ALTER TABLE public.robot_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read routines of their accounts"
    ON public.robot_routines FOR SELECT
    USING (private.user_is_member(account_id, (SELECT auth.uid())));

CREATE POLICY "Users can insert routines to their accounts"
    ON public.robot_routines FOR INSERT
    WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

CREATE POLICY "Users can update routines of their accounts"
    ON public.robot_routines FOR UPDATE
    USING (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

CREATE POLICY "Users can delete routines of their accounts"
    ON public.robot_routines FOR DELETE
    USING (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

-- Trigger for updated_at
SELECT private.apply_updated_at_trigger('public.robot_routines');

-- ----------------------------------------------------------------------------
-- 2. Robot Contacts
-- ----------------------------------------------------------------------------
CREATE TABLE public.robot_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relationship TEXT,
    phone TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_robot_contacts_account_id ON public.robot_contacts(account_id);
CREATE INDEX idx_robot_contacts_priority ON public.robot_contacts(priority);

COMMENT ON TABLE public.robot_contacts IS 'Stores emergency and family contacts for the robot to call or reference.';
COMMENT ON COLUMN public.robot_contacts.priority IS 'Priority level for calling (1 = Highest, call first in emergency).';

ALTER TABLE public.robot_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read contacts of their accounts"
    ON public.robot_contacts FOR SELECT
    USING (private.user_is_member(account_id, (SELECT auth.uid())));

CREATE POLICY "Users can insert contacts to their accounts"
    ON public.robot_contacts FOR INSERT
    WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

CREATE POLICY "Users can update contacts of their accounts"
    ON public.robot_contacts FOR UPDATE
    USING (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

CREATE POLICY "Users can delete contacts of their accounts"
    ON public.robot_contacts FOR DELETE
    USING (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

-- Trigger for updated_at
SELECT private.apply_updated_at_trigger('public.robot_contacts');

-- ----------------------------------------------------------------------------
-- 3. Robot Memories (RAG Context)
-- ----------------------------------------------------------------------------
CREATE TABLE public.robot_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    entity TEXT NOT NULL,
    name TEXT NOT NULL,
    key_fact TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_robot_memories_account_id ON public.robot_memories(account_id);
CREATE INDEX idx_robot_memories_entity ON public.robot_memories(entity);

COMMENT ON TABLE public.robot_memories IS 'Stores biographical memory facts to be injected into the robot LLM context (RAG).';
COMMENT ON COLUMN public.robot_memories.entity IS 'The type of entity this fact is about (e.g., Nieto, Mascota, Hobby).';
COMMENT ON COLUMN public.robot_memories.key_fact IS 'The detailed fact to provide context to the LLM.';

ALTER TABLE public.robot_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read memories of their accounts"
    ON public.robot_memories FOR SELECT
    USING (private.user_is_member(account_id, (SELECT auth.uid())));

CREATE POLICY "Users can insert memories to their accounts"
    ON public.robot_memories FOR INSERT
    WITH CHECK (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

CREATE POLICY "Users can update memories of their accounts"
    ON public.robot_memories FOR UPDATE
    USING (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

CREATE POLICY "Users can delete memories of their accounts"
    ON public.robot_memories FOR DELETE
    USING (private.get_user_role(account_id, (SELECT auth.uid())) IS NOT NULL);

-- Trigger for updated_at
SELECT private.apply_updated_at_trigger('public.robot_memories');
