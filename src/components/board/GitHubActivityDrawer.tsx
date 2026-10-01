'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GitHubCommit } from '../../types';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { 
  GitBranch, 
  GitCommit, 
  X, 
  Sparkles, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  Send,
  Ticket,
  Clock,
  Radio,
  Github
} from 'lucide-react';
import { isDeployed } from '@/lib/environment';
import { formatRelativeTime, formatFullDateTime } from '../../lib/timeAgo';

export const GitHubActivityDrawer: React.FC = () => {
  const { 
    isGitHubFeedOpen, 
    setGitHubFeedOpen, 
    gitHubCommits, 
    addGitHubCommit,
    openItemDetail,
    boardItems,
    currentUser
  } = useApp();

  const [activeTab, setActiveTab] = useState<'feed' | 'setup'>('feed');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Custom simulation message
  const [customMsg, setCustomMsg] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');

  if (!isGitHubFeedOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulatePush = async () => {
    setIsSimulating(true);

    const availableTickets = boardItems.map((i) => i.ticket_number).filter(Boolean);
    const randomTicket = availableTickets[Math.floor(Math.random() * availableTickets.length)] || 'TK-1042';

    const sampleMessages = [
      `feat(workflow): implement real-time task claiming & OCC #${randomTicket}`,
      `fix(api): prevent duplicate webhook ingest with Redis idempotency #${randomTicket}`,
      `perf(board): optimize React 19 rendering on 500+ items board #${randomTicket}`,
      `refactor(db): add partial indices for ticket lookups #${randomTicket}`,
    ];

    const messageToUse = customMsg.trim() || sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
    const shortSha = Math.random().toString(16).slice(2, 9);

    const committerName = currentUser?.full_name || 'Committer';
    const committerUsername = currentUser?.email ? currentUser.email.split('@')[0] : 'committer';
    const committerAvatar = currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

    const simPayload = {
      simulate: true,
      repo: 'happytf/work-os-core',
      branch: selectedBranch,
      message: messageToUse,
      author: {
        name: committerName,
        username: committerUsername,
        avatar: committerAvatar,
      },
      commit: {
        id: shortSha,
        full_sha: shortSha + '92b34a58c09a87612f094e21a89bf1112',
        repo: 'happytf/work-os-core',
        branch: selectedBranch,
        message: messageToUse,
        url: `https://github.com/happytf/work-os-core/commit/${shortSha}`,
        timestamp: new Date().toISOString(),
        author: {
          name: committerName,
          username: committerUsername,
          avatar: committerAvatar,
        },
        linked_ticket_number: messageToUse.match(/(?:#)?(TK-\d+)/i)?.[1]?.toUpperCase(),
      },
    };

    try {
      // Call local webhook API
      const res = await fetch('/api/webhooks/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simPayload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.commit) {
          addGitHubCommit(data.commit);
          setCustomMsg('');
        }
      }
    } catch {
      // Direct context fallback if offline
      addGitHubCommit(simPayload.commit as GitHubCommit);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleTicketClick = (ticketNumber: string) => {
    const found = boardItems.find(
      (i) => (i.ticket_number || '').toUpperCase() === ticketNumber.toUpperCase()
    );
    if (found) {
      openItemDetail(found);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0e131f] border-l border-white/10 shadow-2xl flex flex-col h-full animate-slide-left text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Github size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Live GitHub Commits</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Radio size={9} className="animate-pulse" /> Live Stream
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">happytf/work-os-core</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setGitHubFeedOpen(false)}
            className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close drawer (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 px-5 bg-white/[0.01]">
          <button
            type="button"
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('feed')}
          >
            Activity Stream ({gitHubCommits.length})
          </button>
          <button
            type="button"
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'setup'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('setup')}
          >
            Webhook Setup
          </button>
        </div>

        {/* Drawer Content */}
        {activeTab === 'feed' ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Quick Simulate Trigger Bar (Only shown in dev mode) */}
            {!isDeployed() && (
              <div className="p-4 mx-5 my-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-amber-400" /> Simulate Team Push
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                    <GitBranch size={11} className="text-emerald-400" />
                    <select 
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="bg-transparent border-0 text-slate-300 focus:outline-none cursor-pointer text-xs"
                    >
                      <option value="main" className="bg-[#0e131f]">main</option>
                      <option value="feat/occ-claiming" className="bg-[#0e131f]">feat/occ-claiming</option>
                      <option value="fix/gateway-timeout" className="bg-[#0e131f]">fix/gateway-timeout</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Custom commit message or leave empty..."
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSimulatePush()}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={handleSimulatePush}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send size={12} />
                    <span>{isSimulating ? 'Pushing...' : 'Push'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Commits Stream */}
            <div className="px-5 py-2 flex-1 space-y-3">
              {gitHubCommits.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
                  <GitCommit size={32} className="text-slate-600 mb-2.5" />
                  <p className="text-xs font-medium text-slate-300 mb-1">No commits received yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mb-3">
                    Connect your GitHub repository in the Webhook Setup tab to stream live commits to this board.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('setup')}
                    className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    Configure Webhook
                  </button>
                </div>
              ) : (
                gitHubCommits.map((commit, idx) => (
                <div 
                  key={`${commit.id}-${idx}`}
                  className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2 group"
                >
                  {/* Author & Timestamp */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img 
                        src={getSafeAvatar(commit.author.avatar, commit.author.name)} 
                        alt={commit.author.name} 
                        className="w-5 h-5 rounded-full object-cover border border-white/15" 
                      />
                      <span className="font-medium text-slate-200">{commit.author.name}</span>
                      <span className="text-slate-500 text-[11px] font-mono">@{commit.author.username}</span>
                    </div>

                    <div 
                      className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono cursor-default"
                      title={formatFullDateTime(commit.timestamp, commit.id)}
                    >
                      <Clock size={11} />
                      <span>{formatRelativeTime(commit.timestamp, commit.id)}</span>
                    </div>
                  </div>

                  {/* Commit Message */}
                  <p className="text-xs text-slate-300 leading-relaxed font-sans font-normal">
                    {commit.message}
                  </p>

                  {/* Badges / Links footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                        <GitBranch size={10} />
                        {commit.branch}
                      </span>

                      {commit.linked_ticket_number && (
                        <button
                          type="button"
                          onClick={() => handleTicketClick(commit.linked_ticket_number!)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-medium cursor-pointer transition-colors"
                          title="Open associated ticket"
                        >
                          <Ticket size={10} />
                          <span>#{commit.linked_ticket_number}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(commit.id, `sha-${commit.id}`)}
                        className="text-slate-400 hover:text-slate-200 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
                        title="Copy commit hash"
                      >
                        <GitCommit size={11} className="text-slate-400" />
                        <span>{commit.id}</span>
                        {copiedKey === `sha-${commit.id}` ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>

                      <a 
                        href={commit.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-white/5"
                        title="View on GitHub"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </div>
        ) : (
          /* Webhook Configuration Guide */
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal size={15} className="text-emerald-400" /> Connect GitHub Repository
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Connect your team’s GitHub repository to HappyTF so all pushes and pull requests appear live on this board.
              </p>

              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono text-slate-300 font-semibold">1. Webhook Payload URL</span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] text-emerald-400">
                  <span className="flex-1 truncate">https://your-domain.com/api/webhooks/github</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy('https://your-domain.com/api/webhooks/github', 'url')}
                    className="p-1 hover:bg-white/10 rounded text-slate-300 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedKey === 'url' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-300 font-semibold">2. Content Type</span>
                <div className="p-2 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] text-slate-300">
                  application/json
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-300 font-semibold">3. Secret Token (.env)</span>
                <div className="p-2 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] text-slate-300">
                  GITHUB_WEBHOOK_SECRET=your_secret_passphrase
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono text-slate-300 font-semibold">4. Trigger Events</span>
                <p className="text-slate-400">Select: <strong>Just the push event</strong> (or Pushes + Pull requests).</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1c1c1c] border border-white/10 text-slate-300 space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Ticket size={13} className="text-emerald-400" /> Auto-linking Tickets to Commits
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Include any ticket number in your commit message like:
                <br />
                <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded font-mono text-[11px] inline-block mt-1">
                  git commit -m &quot;fix(db): resolve timeout #TK-1042&quot;
                </code>
              </p>
              <p className="text-slate-400 text-[11px]">
                HappyTF automatically parses the ID and links the commit to that ticket’s activity feed!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
