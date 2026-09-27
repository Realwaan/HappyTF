import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cacheGet, cacheSet } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { GitHubCommit } from '@/types';

const COMMITS_CACHE_KEY = 'github:recent_commits';

function extractLinkedTicket(message: string): string | undefined {
  const match = message.match(/(?:#)?(TK-\d+)/i);
  return match ? match[1].toUpperCase() : undefined;
}

export async function GET() {
  const cached = await cacheGet<GitHubCommit[]>(COMMITS_CACHE_KEY);
  return NextResponse.json({
    data: cached || [],
    source: cached ? 'cache' : 'empty',
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const payload = JSON.parse(rawBody || '{}');
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // 1. Simulation support strictly disabled in production
    if (payload.simulate) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Simulation is disabled in production environments' }, { status: 403 });
      }
    } else if (secret) {
      // In production or when secret configured, enforce HMAC validation
      if (!signature) {
        return NextResponse.json({ error: 'Missing HMAC signature' }, { status: 401 });
      }
      const hmac = crypto.createHmac('sha256', secret);
      const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
      if (signature !== digest) {
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'GitHub webhook secret not configured' }, { status: 500 });
    }

    // 2. Local simulation handler for dev/test
    if (payload.simulate) {
      const simCommit: GitHubCommit = payload.commit || {
        id: Math.random().toString(16).slice(2, 9),
        repo: payload.repo || 'happytf/work-os-core',
        branch: payload.branch || 'main',
        message: payload.message || 'feat(core): real-time team workflow update #TK-1042',
        url: 'https://github.com/happytf/work-os-core/commit/' + Math.random().toString(16).slice(2, 9),
        timestamp: 'Just now',
        author: payload.author || {
          name: 'Alex Rivera',
          username: 'alexrivera',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        },
        linked_ticket_number: extractLinkedTicket(payload.message || '#TK-1042'),
      };

      const existing = (await cacheGet<GitHubCommit[]>(COMMITS_CACHE_KEY)) || [];
      const updated = [simCommit, ...existing].slice(0, 50);
      await cacheSet(COMMITS_CACHE_KEY, updated, 86400);

      // If Supabase is configured and linked to a ticket, record activity
      if (simCommit.linked_ticket_number && isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.from('ticket_activities').insert([
            {
              ticket_id: simCommit.linked_ticket_number,
              actor_name: `${simCommit.author.name} (GitHub)`,
              action: `Pushed commit ${simCommit.id}: "${simCommit.message}"`,
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (e) {
          console.warn('[GitHub Webhook] Could not insert activity:', e);
        }
      }

      return NextResponse.json({
        ok: true,
        type: 'simulated_push',
        commit: simCommit,
      });
    }

    // 2. Standard GitHub Push Event
    if (payload.commits && Array.isArray(payload.commits)) {
      const repoName = payload.repository?.name || 'repository';
      const branchName = (payload.ref || 'refs/heads/main').replace('refs/heads/', '');
      const parsedCommits: GitHubCommit[] = payload.commits.map((c: any) => ({
        id: String(c.id || '').slice(0, 7),
        full_sha: c.id,
        repo: repoName,
        branch: branchName,
        message: c.message,
        url: c.url,
        timestamp: 'Just now',
        author: {
          name: c.author?.name || 'GitHub Contributor',
          username: c.author?.username || c.author?.name || 'developer',
          avatar: `https://github.com/${c.author?.username || 'ghost'}.png`,
        },
        linked_ticket_number: extractLinkedTicket(c.message),
      }));

      const existing = (await cacheGet<GitHubCommit[]>(COMMITS_CACHE_KEY)) || [];
      const updated = [...parsedCommits, ...existing].slice(0, 50);
      await cacheSet(COMMITS_CACHE_KEY, updated, 86400);

      return NextResponse.json({
        ok: true,
        received_commits: parsedCommits.length,
        commits: parsedCommits,
      });
    }

    // Ping event handshake
    if (payload.zen) {
      return NextResponse.json({ ok: true, notice: 'GitHub webhook ping acknowledged: ' + payload.zen });
    }

    return NextResponse.json({ ok: true, notice: 'Webhook received without commits' });
  } catch (err: any) {
    console.error('[GitHub Webhook Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
