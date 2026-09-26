import { NextRequest, NextResponse } from 'next/server';
import { toggleServerMessageReaction } from '@/lib/serverChannelsStore';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: messageId } = await params;
  if (!messageId) {
    return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { emoji, user_name } = body;

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    const userName = user_name || 'Alex Rivera';

    const updatedMessage = toggleServerMessageReaction(messageId, emoji, userName);

    if (isSupabaseConfigured() && updatedMessage) {
      try {
        const supabase = createClient();
        await supabase
          .from('channel_messages')
          .update({
            reactions: updatedMessage.reactions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', messageId);
      } catch (err) {
        console.warn('[Reactions API] Supabase update fallback', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (err: any) {
    console.error('[Reactions API POST]', err);
    return NextResponse.json({ error: err.message || 'Failed to toggle reaction' }, { status: 500 });
  }
}
