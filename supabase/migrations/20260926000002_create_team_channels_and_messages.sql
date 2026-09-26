-- ==============================================================================
-- Migration: Native Workspace Channels & Team Chat (Slack-like Flow)
-- Timestamp: 2026-09-26 00:00:02
-- Description:
--   Creates internal team chat tables (channels, channel_members, channel_messages)
--   with Row Level Security (RLS) and Supabase Realtime broadcast enabled.
-- ==============================================================================

-- 1. Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    topic TEXT DEFAULT '',
    is_private BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, name)
);

-- 2. Channel Members Table
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(channel_id, user_id)
);

-- 3. Channel Messages Table (Supports root messages, thread replies, ticket mentions & reactions)
CREATE TABLE IF NOT EXISTS public.channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'Teammate',
    user_avatar TEXT DEFAULT '',
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.channel_messages(id) ON DELETE CASCADE,
    linked_ticket_number TEXT,
    reactions JSONB DEFAULT '[]'::jsonb,
    reply_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning-fast message queries and thread retrieval
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON public.channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_parent_id ON public.channel_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON public.channel_messages(created_at ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- 5. Channels Policies
DROP POLICY IF EXISTS "Members can view channels in their workspace" ON public.channels;
CREATE POLICY "Members can view channels in their workspace"
    ON public.channels FOR SELECT
    USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can create channels in their workspace" ON public.channels;
CREATE POLICY "Members can create channels in their workspace"
    ON public.channels FOR INSERT
    WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

-- 6. Channel Messages Policies
DROP POLICY IF EXISTS "Members can view messages in their workspace channels" ON public.channel_messages;
CREATE POLICY "Members can view messages in their workspace channels"
    ON public.channel_messages FOR SELECT
    USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can post messages in their workspace channels" ON public.channel_messages;
CREATE POLICY "Members can post messages in their workspace channels"
    ON public.channel_messages FOR INSERT
    WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Authors can update their own messages or reactions" ON public.channel_messages;
CREATE POLICY "Authors can update their own messages or reactions"
    ON public.channel_messages FOR UPDATE
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- 7. Enable Supabase Realtime Publication for live message streaming
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
