import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cacheGet, cacheSet } from '@/lib/redis';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { isDeployed } from '@/lib/environment';
import { GitHubCommit, DiscordWorkspaceConfig } from '@/types';
import { sendDiscordMessage, getDiscordConfig } from '@/lib/integrations/discord';

const COMMITS_CACHE_KEY = 'github:recent_commits';
const PR_CACHE_KEY = 'github:recent_pull_requests';

function extractLinkedTicket(message: string): string | undefined {
  if (!message) return undefined;
  const match = message.match(/(?:#)?(TK-\d+)/i);
  return match ? match[1].toUpperCase() : undefined;
}

export async function GET() {
  const cachedCommits = await cacheGet<GitHubCommit[]>(COMMITS_CACHE_KEY);
  const cachedPRs = await cacheGet<any[]>(PR_CACHE_KEY);
  return NextResponse.json({
    commits: cachedCommits || [],
    pull_requests: cachedPRs || [],
    source: cachedCommits ? 'cache' : 'empty',
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const githubEvent = request.headers.get('x-github-event') || 'push';
    const payload = JSON.parse(rawBody || '{}');
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    // 1. Simulation support strictly disabled in production
    if (payload.simulate) {
      if (isDeployed() || process.env.NODE_ENV === 'production') {
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

    // 2. Pull Request Event Processing (Simulation or Real Webhook)
    const isPrEvent = payload.event === 'pull_request' || githubEvent === 'pull_request' || Boolean(payload.pull_request);

    if (isPrEvent) {
      const pr = payload.pull_request || payload.pr || {};
      const action = payload.action || 'opened';
      const prTitle = pr.title || '';
      const prBody = pr.body || '';
      const headBranch = pr.head?.ref || payload.branch || '';
      const prNumber = pr.number || payload.pr_number || 1;
      const prUrl = pr.html_url || pr.url || `https://github.com/happytf/work-os/pull/${prNumber}`;
      const sender = payload.sender?.login || pr.user?.login || 'developer';

      // Extract ticket key from PR title, branch, or body
      const linkedTicketKey =
        extractLinkedTicket(prTitle) ||
        extractLinkedTicket(headBranch) ||
        extractLinkedTicket(prBody);

      let transitionResult: { action: string; newStatus?: string; ticketKey?: string } = {
        action,
        ticketKey: linkedTicketKey,
      };

      if (linkedTicketKey) {
        const isMerged = action === 'closed' && (pr.merged === true || payload.merged === true);

        if (isMerged) {
          // PR Merged -> Advance ticket to "Done"
          transitionResult.newStatus = 'Done';

          if (isSupabaseConfigured()) {
            try {
              const supabase = createClient();
              await supabase
                .from('tickets')
                .update({
                  status: 'Done',
                  status_color: '#00c875',
                  qa_reviewed_at: new Date().toISOString(),
                  qa_reviewed_by: `${sender} (PR #${prNumber})`,
                  updated_at: new Date().toISOString(),
                })
                .or(`ticket_number.eq.${linkedTicketKey},id.eq.${linkedTicketKey}`);

              await supabase.from('ticket_activities').insert([
                {
                  ticket_id: linkedTicketKey,
                  actor_name: `${sender} (GitHub PR)`,
                  action: `PR #${prNumber} merged into main: Auto-transitioned to "Done"`,
                  created_at: new Date().toISOString(),
                },
              ]);
            } catch (err) {
              console.warn('[GitHub Webhook] Supabase PR transition failed:', err);
            }
          }

          // Dispatch CapStoneFlow Discord celebration alert
          try {
            const discordConfig = await getDiscordConfig('ws-default');
            if (discordConfig && discordConfig.is_active && discordConfig.bot_token) {
              const targetChannel = discordConfig.tickets_channel_id || discordConfig.reminders_channel_id;
              if (targetChannel) {
                await sendDiscordMessage(
                  discordConfig.bot_token,
                  targetChannel,
                  `🎉 **[GITHUB PR MERGED]** PR #${prNumber} merged by **${sender}**!\nTicket \`${linkedTicketKey}\` has been automatically marked as **Done** 🚀\n🔗 ${prUrl}`
                );
              }
            }
          } catch (e) {
            console.warn('[GitHub Webhook] Discord alert error:', e);
          }
        } else if (action === 'opened' || action === 'reopened') {
          // PR Opened / Reopened -> Advance ticket to "In Review"
          transitionResult.newStatus = 'In Review';

          if (isSupabaseConfigured()) {
            try {
              const supabase = createClient();
              await supabase
                .from('tickets')
                .update({
                  status: 'In Review',
                  status_color: '#a25ddc',
                  updated_at: new Date().toISOString(),
                })
                .or(`ticket_number.eq.${linkedTicketKey},id.eq.${linkedTicketKey}`);

              await supabase.from('ticket_activities').insert([
                {
                  ticket_id: linkedTicketKey,
                  actor_name: `${sender} (GitHub PR)`,
                  action: `PR #${prNumber} opened: Auto-transitioned to "In Review" for QA`,
                  created_at: new Date().toISOString(),
                },
              ]);
            } catch (err) {
              console.warn('[GitHub Webhook] Supabase PR transition failed:', err);
            }
          }

          // Dispatch CapStoneFlow Discord QA notification
          try {
            const discordConfig = await getDiscordConfig('ws-default');
            if (discordConfig && discordConfig.is_active && discordConfig.bot_token) {
              const targetChannel = discordConfig.tickets_channel_id || discordConfig.reminders_channel_id;
              if (targetChannel) {
                await sendDiscordMessage(
                  discordConfig.bot_token,
                  targetChannel,
                  `🔍 **[GITHUB PR OPENED]** PR #${prNumber} opened: "${prTitle}"\nTicket \`${linkedTicketKey}\` moved to **In Review** for QA inspection.\n🔗 ${prUrl}`
                );
              }
            }
          } catch (e) {
            console.warn('[GitHub Webhook] Discord alert error:', e);
          }
        }
      }

      // Record PR event in cache
      const prRecord = {
        pr_number: prNumber,
        title: prTitle,
        action,
        merged: Boolean(pr.merged || payload.merged),
        url: prUrl,
        author: sender,
        linked_ticket: linkedTicketKey,
        timestamp: new Date().toISOString(),
      };
      const existingPRs = (await cacheGet<any[]>(PR_CACHE_KEY)) || [];
      await cacheSet(PR_CACHE_KEY, [prRecord, ...existingPRs].slice(0, 50), 86400);

      return NextResponse.json({
        ok: true,
        type: 'pull_request',
        action,
        linked_ticket: linkedTicketKey,
        transition: transitionResult,
      });
    }

    // 3. Local simulation handler for push commits
    if (payload.simulate) {
      const simCommit: GitHubCommit = payload.commit || {
        id: Math.random().toString(16).slice(2, 9),
        repo: payload.repo || 'happytf/work-os-core',
        branch: payload.branch || 'main',
        message: payload.message || 'feat(core): real-time team workflow update #TK-1042',
        url: 'https://github.com/happytf/work-os-core/commit/' + Math.random().toString(16).slice(2, 9),
        timestamp: new Date().toISOString(),
        author: payload.author || {
          name: 'Committer',
          username: 'committer',
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

    // 4. Standard GitHub Push Event
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
        timestamp: c.timestamp ? new Date(c.timestamp).toISOString() : new Date().toISOString(),
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

    return NextResponse.json({ ok: true, notice: 'Webhook received without commits or pull requests' });
  } catch (err: any) {
    console.error('[GitHub Webhook Error]', err);
    return NextResponse.json({ error: err.message || 'Internal Error' }, { status: 500 });
  }
}
