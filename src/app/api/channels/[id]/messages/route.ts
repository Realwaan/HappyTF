import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerMessages, addServerMessage } from '@/lib/serverChannelsStore';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { ChannelMessage } from '@/types';
import { getSafeAvatar } from '@/lib/avatarHelper';
import { checkRateLimit } from '@/lib/redis';

const MessagePayloadSchema = z.object({
  workspace_id: z.string().optional(),
  user_id: z.string().optional(),
  user_name: z.string().max(100).optional(),
  user_avatar: z.string().optional(),
  content: z.string().min(1, 'Message content cannot be empty').max(10000),
  parent_id: z.string().nullable().optional(),
  linked_ticket_number: z.string().nullable().optional(),
  is_system: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id'); // null or string

  try {
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        let query = supabase
          .from('channel_messages')
          .select('*')
          .eq('channel_id', channelId);

        if (parentId) {
          query = query.eq('parent_id', parentId);
        } else if (searchParams.has('root_only')) {
          query = query.is('parent_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, messages: data });
        }
      } catch (err) {
        console.warn('[Messages API] Supabase query fallback to local store', err);
      }
    }

    const messages = getServerMessages(channelId, parentId);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    console.error('[Messages API GET]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  // 1. Rate limiting on message posting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
  const rateLimit = await checkRateLimit(`ratelimit:channel_msg:${ip}`, 60, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many messages sent. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = MessagePayloadSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid message payload', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      workspace_id,
      user_id,
      user_name,
      user_avatar,
      content,
      parent_id,
      linked_ticket_number,
      is_system,
    } = parseResult.data;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    // Auto-detect ticket mention like #TK-2839 or TK-2839 in content if not explicitly provided
    let detectedTicket = linked_ticket_number;
    if (!detectedTicket) {
      const match = content.match(/#?(TK-\d{3,5})/i);
      if (match) {
        detectedTicket = match[1].toUpperCase();
      }
    }

    const safeAvatar = getSafeAvatar(user_avatar, user_name || 'Teammate');
    const wsId = workspace_id || 'ws-demo-01';

    const newMessage: ChannelMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      channel_id: channelId,
      workspace_id: wsId,
      user_id: user_id || 'usr-demo-001',
      user_name: user_name || 'Alex Rivera',
      user_avatar: safeAvatar,
      content: content.trim(),
      parent_id: parent_id || null,
      linked_ticket_number: detectedTicket || null,
      reactions: [],
      reply_count: 0,
      is_system: Boolean(is_system),
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('channel_messages')
          .insert({
            channel_id: channelId,
            workspace_id: wsId,
            user_id: user_id || null,
            user_name: user_name || 'Alex Rivera',
            user_avatar: safeAvatar,
            content: content.trim(),
            parent_id: parent_id || null,
            linked_ticket_number: detectedTicket || null,
            reactions: [],
            reply_count: 0,
          })
          .select()
          .single();

        if (!error && data) {
          addServerMessage(data);
          return NextResponse.json({ success: true, message: data });
        }
      } catch (err) {
        console.warn('[Messages API] Supabase insert fallback', err);
      }
    }

    const saved = addServerMessage(newMessage);
    return NextResponse.json({ success: true, message: saved });
  } catch (err: any) {
    console.error('[Messages API POST]', err);
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}
