-- ==============================================================================
-- Migration: Fix RLS Infinite Recursion in workspace_members & tickets
-- Timestamp: 2026-09-26 00:00:01
-- Description:
--   Resolves PostgreSQL error "infinite recursion detected in policy for relation
--   workspace_members" by using a SECURITY DEFINER helper function and direct
--   non-recursive user_id checks.
-- ==============================================================================

-- 1. Helper function to check workspace membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_workspace_member(
    lookup_workspace_id UUID, 
    lookup_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = lookup_workspace_id
          AND user_id = lookup_user_id
    );
$$;

-- 2. Helper function to check workspace admin/owner role
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_owner(
    lookup_workspace_id UUID,
    lookup_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = lookup_workspace_id
          AND user_id = lookup_user_id
          AND role IN ('owner', 'admin')
    );
$$;

-- 3. Drop recursive policies on workspace_members
DROP POLICY IF EXISTS "Users can view members of workspaces they are part of" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins and owners can add or manage members" ON public.workspace_members;

-- 4. Re-create workspace_members policies without self-recursion
-- A user can always view their own membership rows directly (base case)
-- or members of workspaces they belong to (evaluated via SECURITY DEFINER)
CREATE POLICY "Users can view members of workspaces they are part of"
    ON public.workspace_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.is_workspace_member(workspace_id, auth.uid())
    );

CREATE POLICY "Admins and owners can add or manage members"
    ON public.workspace_members FOR ALL
    USING (
        public.is_workspace_admin_or_owner(workspace_id, auth.uid())
    )
    WITH CHECK (
        public.is_workspace_admin_or_owner(workspace_id, auth.uid())
    );

-- 5. Optimize Workspaces Policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
CREATE POLICY "Users can view workspaces they are members of"
    ON public.workspaces FOR SELECT
    USING (
        created_by = auth.uid()
        OR public.is_workspace_member(id, auth.uid())
    );

DROP POLICY IF EXISTS "Workspace owners and admins can update workspaces" ON public.workspaces;
CREATE POLICY "Workspace owners and admins can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (
        created_by = auth.uid()
        OR public.is_workspace_admin_or_owner(id, auth.uid())
    );

-- 6. Optimize Boards Policies
DROP POLICY IF EXISTS "Users can view boards of their workspaces" ON public.boards;
CREATE POLICY "Users can view boards of their workspaces"
    ON public.boards FOR SELECT
    USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

DROP POLICY IF EXISTS "Members can insert boards into their workspaces" ON public.boards;
CREATE POLICY "Members can insert boards into their workspaces"
    ON public.boards FOR INSERT
    WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins and owners can update boards" ON public.boards;
CREATE POLICY "Admins and owners can update boards"
    ON public.boards FOR UPDATE
    USING (
        public.is_workspace_admin_or_owner(workspace_id, auth.uid())
    );

-- 7. Optimize Tickets Policies
DROP POLICY IF EXISTS "Members can view tickets in their workspace" ON public.tickets;
CREATE POLICY "Members can view tickets in their workspace"
    ON public.tickets FOR SELECT
    USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

DROP POLICY IF EXISTS "Members can create tickets in their workspace" ON public.tickets;
CREATE POLICY "Members can create tickets in their workspace"
    ON public.tickets FOR INSERT
    WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid())
    );

DROP POLICY IF EXISTS "Members can update tickets in their workspace" ON public.tickets;
CREATE POLICY "Members can update tickets in their workspace"
    ON public.tickets FOR UPDATE
    USING (
        public.is_workspace_member(workspace_id, auth.uid())
    );

DROP POLICY IF EXISTS "Admins and creators can delete tickets" ON public.tickets;
CREATE POLICY "Admins and creators can delete tickets"
    ON public.tickets FOR DELETE
    USING (
        creator_id = auth.uid()
        OR public.is_workspace_admin_or_owner(workspace_id, auth.uid())
    );

-- 8. Optimize Comments & Activities Policies
DROP POLICY IF EXISTS "Members can view ticket comments" ON public.ticket_comments;
CREATE POLICY "Members can view ticket comments"
    ON public.ticket_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_comments.ticket_id
              AND public.is_workspace_member(tickets.workspace_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "Members can add ticket comments" ON public.ticket_comments;
CREATE POLICY "Members can add ticket comments"
    ON public.ticket_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_comments.ticket_id
              AND public.is_workspace_member(tickets.workspace_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "Members can view ticket activities" ON public.ticket_activities;
CREATE POLICY "Members can view ticket activities"
    ON public.ticket_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_activities.ticket_id
              AND public.is_workspace_member(tickets.workspace_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "Members can insert ticket activities" ON public.ticket_activities;
CREATE POLICY "Members can insert ticket activities"
    ON public.ticket_activities FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tickets
            WHERE tickets.id = ticket_activities.ticket_id
              AND public.is_workspace_member(tickets.workspace_id, auth.uid())
        )
    );
