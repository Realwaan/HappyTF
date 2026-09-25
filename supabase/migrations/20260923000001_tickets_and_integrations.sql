-- Month 2: Ticketing Engine, SLAs, Activity Audit & Integrations (Slack / Monday.com)
-- Production PostgreSQL schema with Row-Level Security (RLS) & Supabase Realtime

-- 1. Custom Types
DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('triage', 'backlog', 'working_on_it', 'in_review', 'stuck', 'done', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('urgent', 'high', 'medium', 'low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_severity AS ENUM ('critical', 'major', 'minor', 'cosmetic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_provider AS ENUM ('slack', 'monday', 'custom_webhook');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Boards Table
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon_emoji TEXT NOT NULL DEFAULT '📋',
    description TEXT DEFAULT '',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Board Groups (Workflow stages / Swimlanes)
CREATE TABLE IF NOT EXISTS public.board_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    position INT NOT NULL DEFAULT 0,
    collapsed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. Ticket Sequence Table (Per-workspace human readable ticket counters e.g. TK-101)
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1001;

-- 5. Tickets Table (Core entity with OCC versioning)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL DEFAULT ('TK-' || nextval('public.ticket_number_seq')::text),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.board_groups(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status ticket_status NOT NULL DEFAULT 'triage',
    priority ticket_priority NOT NULL DEFAULT 'medium',
    severity ticket_severity NOT NULL DEFAULT 'minor',
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sla_due_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    subtasks JSONB DEFAULT '[]'::jsonb,
    external_source TEXT DEFAULT 'web',
    slack_channel_id TEXT,
    slack_thread_ts TEXT,
    monday_item_id TEXT,
    version INT NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    resolved_at TIMESTAMPTZ
);

-- 6. Ticket Comments (Internal and synced Slack replies)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    content TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'web',
    reactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. Ticket Activity Trail (Granular audit log)
CREATE TABLE IF NOT EXISTS public.ticket_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. Workspace Integrations (Slack / Monday.com credentials & settings)
CREATE TABLE IF NOT EXISTS public.workspace_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    provider integration_provider NOT NULL,
    webhook_url TEXT,
    bot_token TEXT,
    default_channel_id TEXT,
    notify_on_urgent BOOLEAN NOT NULL DEFAULT true,
    notify_on_status_change BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(workspace_id, provider)
);

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON public.boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_board_groups_board ON public.board_groups(board_id);
CREATE INDEX IF NOT EXISTS idx_tickets_workspace ON public.tickets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tickets_board ON public.tickets(board_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON public.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activities_ticket ON public.ticket_activities(ticket_id);
CREATE INDEX IF NOT EXISTS idx_integrations_workspace ON public.workspace_integrations(workspace_id);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_integrations ENABLE ROW LEVEL SECURITY;

-- 11. Security Policies (Workspace Scoped)

-- Boards
CREATE POLICY "Users can view boards of their workspaces"
    ON public.boards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = boards.workspace_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert boards into their workspaces"
    ON public.boards FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = boards.workspace_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and owners can update boards"
    ON public.boards FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = boards.workspace_id
              AND workspace_members.user_id = auth.uid()
              AND workspace_members.role IN ('owner', 'admin')
        )
    );

-- Tickets
CREATE POLICY "Members can view tickets in their workspace"
    ON public.tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = tickets.workspace_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can create tickets in their workspace"
    ON public.tickets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = tickets.workspace_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update tickets in their workspace"
    ON public.tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = tickets.workspace_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and creators can delete tickets"
    ON public.tickets FOR DELETE
    USING (
        creator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = tickets.workspace_id
              AND workspace_members.user_id = auth.uid()
              AND workspace_members.role IN ('owner', 'admin')
        )
    );

-- Ticket Comments
CREATE POLICY "Members can view ticket comments"
    ON public.ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            JOIN public.workspace_members ON workspace_members.workspace_id = tickets.workspace_id
            WHERE tickets.id = ticket_comments.ticket_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can post ticket comments"
    ON public.ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets
            JOIN public.workspace_members ON workspace_members.workspace_id = tickets.workspace_id
            WHERE tickets.id = ticket_comments.ticket_id
              AND workspace_members.user_id = auth.uid()
        )
    );

-- Workspace Integrations
CREATE POLICY "Members can view integrations status"
    ON public.workspace_integrations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = workspace_integrations.workspace_id
              AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins and owners can manage integrations"
    ON public.workspace_integrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = workspace_integrations.workspace_id
              AND workspace_members.user_id = auth.uid()
              AND workspace_members.role IN ('owner', 'admin')
        )
    );

-- 12. Enable Realtime Publications on tickets and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
