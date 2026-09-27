import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cacheDelete, checkRateLimit } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

const ClaimPayloadSchema = z.object({
  user: z.object({
    id: z.string().min(1, 'User ID is required'),
    name: z.string().min(1, 'User name is required'),
    avatar: z.string().optional(),
  }),
  if_version: z.number().int().optional(),
  board_id: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 });
  }

  // 1. Rate limiting on claim endpoint
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  const rateLimit = await checkRateLimit(`ratelimit:ticket_claim:${ip}`, 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many claim attempts. Please wait.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = ClaimPayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid claim payload', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let { user, if_version, board_id } = parseResult.data;

    // 2. Server-side session verification if Authorization header present
    const authHeader = request.headers.get('authorization');
    if (isSupabaseConfigured() && authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const supabase = createClient();
        const { data: { user: sessionUser } } = await supabase.auth.getUser(token);
        if (sessionUser) {
          user = {
            id: sessionUser.id,
            name: sessionUser.user_metadata?.full_name || sessionUser.email || user.name,
            avatar: sessionUser.user_metadata?.avatar_url || user.avatar,
          };
        }
      } catch (authErr) {
        console.warn('[Claim Auth Session Verify Failed]', authErr);
      }
    }

    if (isSupabaseConfigured()) {
      const supabase = createClient();

      // 1. Fetch current ticket to verify claim eligibility & version
      const { data: existing, error: fetchErr } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      }

      // Check if another teammate already claimed this ticket
      if (existing.assignee_id && existing.assignee_id !== user.id) {
        return NextResponse.json(
          {
            error: `Conflict: This ticket was already claimed by another team member.`,
            current_assignee_id: existing.assignee_id,
          },
          { status: 409 }
        );
      }

      // Optimistic concurrency check
      if (if_version !== undefined && existing.version !== if_version) {
        return NextResponse.json(
          {
            error: 'Conflict: This ticket was modified by another session.',
            current_version: existing.version,
            expected_version: if_version,
          },
          { status: 409 }
        );
      }

      const nextVersion = (existing.version || 1) + 1;
      const nextUpdatedAt = new Date().toISOString();

      // Update assignee and status
      const { data: updated, error: updateErr } = await supabase
        .from('tickets')
        .update({
          assignee_id: user.id,
          status: 'working_on_it',
          version: nextVersion,
          updated_at: nextUpdatedAt,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      // Invalidate board cache
      const effectiveBoardId = board_id || existing.board_id;
      if (effectiveBoardId) {
        await cacheDelete(`tickets:board:${effectiveBoardId}`);
      }

      // Record activity
      await supabase.from('ticket_activities').insert([
        {
          ticket_id: id,
          actor_name: user.name,
          action: `Claimed ticket (${existing.ticket_number || id}) and set status to Working on it`,
          created_at: nextUpdatedAt,
        },
      ]);

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Ticket successfully claimed by ${user.name}`,
      });
    }

    // In local / demo mode fallback
    return NextResponse.json({
      success: true,
      data: {
        id,
        assignee: { id: user.id, name: user.name, avatar: user.avatar || '' },
        status: 'Working on it',
        claimed_by: user.name,
        claimed_at: new Date().toISOString(),
      },
      message: `Ticket claimed in local session by ${user.name}`,
    });
  } catch (err: any) {
    console.error('[Ticket Claim Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
