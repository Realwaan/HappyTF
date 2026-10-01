import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getServerBoard, getServerBoards, registerServerBoard } from '@/lib/serverBoardsStore';
import { BoardSummary } from '@/types';

const CreateBoardSchema = z.object({
  id: z.string().min(1),
  workspace_id: z.string().min(1),
  name: z.string().min(1).max(100),
  icon_emoji: z.string().optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  folder_id: z.string().optional(),
  template_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('board_id');
    const workspaceId = searchParams.get('workspace_id');

    if (boardId) {
      // 1. Check Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('boards')
            .select('*')
            .eq('id', boardId)
            .maybeSingle();

          if (!error && data) {
            const summary: BoardSummary = {
              id: data.id,
              workspace_id: data.workspace_id,
              name: data.name,
              icon_emoji: data.icon_emoji || '📋',
              color: data.color || '#3ecf8e',
              description: data.description || '',
              item_count: 0,
              updated_at: data.updated_at || new Date().toISOString(),
            };
            return NextResponse.json({ data: summary, source: 'database' });
          }
        } catch (err) {
          console.warn('[API Boards GET Supabase fallback]', err);
        }
      }

      // 2. Check server store
      const board = getServerBoard(boardId);
      if (board) {
        return NextResponse.json({ data: board, source: 'server-store' });
      }

      return NextResponse.json({ data: null, error: 'Board not found' }, { status: 404 });
    }

    const boards = getServerBoards(workspaceId || undefined);
    return NextResponse.json({ data: boards, source: 'server-store' });
  } catch (error) {
    console.error('[API Boards GET error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateBoardSchema.parse(body);

    const summary: BoardSummary = {
      id: validated.id,
      workspace_id: validated.workspace_id,
      name: validated.name,
      icon_emoji: validated.icon_emoji || '📋',
      color: validated.color || '#3ecf8e',
      description: validated.description || '',
      folder_id: validated.folder_id,
      template_id: validated.template_id,
      item_count: 0,
      updated_at: new Date().toISOString(),
      member_avatars: [],
    };

    // Save in server store
    registerServerBoard(summary);

    // Save to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        await supabase.from('boards').upsert([{
          id: summary.id,
          workspace_id: summary.workspace_id,
          name: summary.name,
          icon_emoji: summary.icon_emoji,
          description: summary.description,
        }]);
      } catch (err) {
        console.warn('[API Boards POST Supabase fallback]', err);
      }
    }

    return NextResponse.json({ data: summary, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('[API Boards POST error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
