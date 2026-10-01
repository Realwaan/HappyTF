'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  Sparkles, 
  Search, 
  RefreshCw, 
  Bot, 
  Hash, 
  Lock, 
  Key, 
  Clock, 
  Zap, 
  Award,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CAPSTONEFLOW_COMMANDS } from '@/lib/integrations/capstoneflow';

interface DiscordIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscordIntegrationModal: React.FC<DiscordIntegrationModalProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace } = useApp();

  const [activeTab, setActiveTab] = useState<'config' | 'commands' | 'roles'>('config');
  const [botToken, setBotToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [guildId, setGuildId] = useState('');
  const [ticketsChannelId, setTicketsChannelId] = useState('');
  const [remindersChannelId, setRemindersChannelId] = useState('');
  const [showToken, setShowToken] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [commandRoleFilter, setCommandRoleFilter] = useState<'all' | 'Developer' | 'QA' | 'PM'>('all');

  // Load configuration from API or localStorage
  useEffect(() => {
    if (!isOpen || !currentWorkspace) return;
    const wsId = currentWorkspace.id;

    try {
      const local = localStorage.getItem(`happytf_discord_config_${wsId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.clientId) setClientId(parsed.clientId);
        if (parsed.publicKey) setPublicKey(parsed.publicKey);
        if (parsed.guildId) setGuildId(parsed.guildId);
        if (parsed.ticketsChannelId) setTicketsChannelId(parsed.ticketsChannelId);
        if (parsed.remindersChannelId) setRemindersChannelId(parsed.remindersChannelId);
      }
    } catch {}

    fetch(`/api/integrations/discord?workspaceId=${wsId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.config) {
          if (data.config.client_id) setClientId(data.config.client_id);
          if (data.config.public_key) setPublicKey(data.config.public_key);
          if (data.config.guild_id) setGuildId(data.config.guild_id);
          if (data.config.tickets_channel_id) setTicketsChannelId(data.config.tickets_channel_id);
          if (data.config.reminders_channel_id) setRemindersChannelId(data.config.reminders_channel_id);
          if (data.config.bot_token) setBotToken(data.config.bot_token);
        }
      })
      .catch((err) => console.warn('Could not load remote discord config:', err));
  }, [isOpen, currentWorkspace]);

  if (!isOpen) return null;

  const endpointUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/integrations/discord/interactions`
    : 'https://happytf.work/api/integrations/discord/interactions';

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleSaveConfig = async () => {
    if (!currentWorkspace) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const wsId = currentWorkspace.id;
      const payload = {
        workspace_id: wsId,
        bot_token: botToken.trim(),
        client_id: clientId.trim(),
        public_key: publicKey.trim(),
        guild_id: guildId.trim(),
        tickets_channel_id: ticketsChannelId.trim(),
        reminders_channel_id: remindersChannelId.trim(),
        is_active: true,
      };

      localStorage.setItem(`happytf_discord_config_${wsId}`, JSON.stringify(payload));

      const res = await fetch('/api/integrations/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save configuration.');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Save error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncCommands = async () => {
    if (!currentWorkspace) return;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/integrations/discord/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: currentWorkspace.id }),
      });
      const data = await res.json();

      if (data.ok) {
        setSyncResult({ success: true, message: data.message });
      } else {
        setSyncResult({ success: false, message: data.error || 'Sync failed.' });
      }
    } catch (err: unknown) {
      setSyncResult({ success: false, message: err instanceof Error ? err.message : 'Sync request failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredCommands = CAPSTONEFLOW_COMMANDS.filter((cmd) => {
    const matchesSearch = cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) ||
      cmd.description.toLowerCase().includes(commandSearch.toLowerCase());
    const matchesRole = commandRoleFilter === 'all' || cmd.roleRequirement === commandRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="modal-overlay animate-fade-in" id="discord-modal-overlay" onClick={onClose}>
      <div 
        className="discord-modal-card glass-panel animate-pop-in" 
        id="discord-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="discord-modal-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="discord-logo-box">
                <Bot size={20} className="text-[#5865F2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-100 m-0">CapStoneFlow Discord Bot</h3>
                  <span className="badge-bot-tag font-mono">TICKET ENGINE</span>
                </div>
                <p className="text-xs text-muted m-0">
                  Automate ticket lifecycle, claims, QA review, and leaderboards inside Discord.
                </p>
              </div>
            </div>
            <button type="button" className="close-btn" onClick={onClose} id="close-discord-modal-btn">
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="discord-tab-bar mt-4">
            <button
              type="button"
              className={`discord-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <Key size={13} />
              <span>Bot Credentials & Channels</span>
            </button>
            <button
              type="button"
              className={`discord-tab-btn ${activeTab === 'commands' ? 'active' : ''}`}
              onClick={() => setActiveTab('commands')}
            >
              <Terminal size={13} />
              <span>CapStoneFlow Commands ({CAPSTONEFLOW_COMMANDS.length})</span>
            </button>
            <button
              type="button"
              className={`discord-tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              <ShieldCheck size={13} />
              <span>Lifecycle & Roles</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Configuration */}
        {activeTab === 'config' && (
          <div className="discord-tab-content animate-fade-in">
            {/* Interaction URL Box */}
            <div className="endpoint-box">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#5865F2]" /> Interactions Endpoint URL
                </span>
                <span className="text-[10px] font-mono text-muted">Paste into Discord Developer Portal</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={endpointUrl}
                  className="input-field font-mono text-xs text-slate-300 select-all"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm shrink-0 flex items-center gap-1"
                  onClick={handleCopyEndpoint}
                >
                  {copiedEndpoint ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="form-grid mt-4">
              <div className="form-group col-span-2">
                <label className="field-label flex items-center justify-between">
                  <span>Discord Bot Token</span>
                  <button
                    type="button"
                    className="text-[10px] text-muted hover:text-slate-200"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? 'Hide' : 'Reveal'}
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    className="input-field font-mono text-xs"
                    placeholder="OTk4..."
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="field-label">Application / Client ID</label>
                <input
                  type="text"
                  className="input-field font-mono text-xs"
                  placeholder="123456789012345678"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Public Key (Ed25519)</label>
                <input
                  type="text"
                  className="input-field font-mono text-xs"
                  placeholder="Optional for signature verification"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Guild (Server) ID</label>
                <input
                  type="text"
                  className="input-field font-mono text-xs"
                  placeholder="For instant slash command sync"
                  value={guildId}
                  onChange={(e) => setGuildId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="field-label">Tickets Channel ID</label>
                <input
                  type="text"
                  className="input-field font-mono text-xs"
                  placeholder="Target channel for threads"
                  value={ticketsChannelId}
                  onChange={(e) => setTicketsChannelId(e.target.value)}
                />
              </div>

              <div className="form-group col-span-2">
                <label className="field-label flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-400" />
                  <span>Daily 8:00 AM PHT Reminders Channel ID</span>
                </label>
                <input
                  type="text"
                  className="input-field font-mono text-xs"
                  placeholder="Channel ID to receive daily morning summaries"
                  value={remindersChannelId}
                  onChange={(e) => setRemindersChannelId(e.target.value)}
                />
              </div>
            </div>

            {/* Sync Feedback Message */}
            {syncResult && (
              <div className={`p-2.5 mt-3 rounded-lg border text-xs flex items-center gap-2 ${
                syncResult.success 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {syncResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{syncResult.message}</span>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-800">
              <button
                type="button"
                className="btn btn-secondary btn-sm flex items-center gap-1.5"
                onClick={handleSyncCommands}
                disabled={isSyncing || !botToken.trim() || !clientId.trim()}
                title="Registers all 24 CapStoneFlow slash commands with Discord"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Slash Commands'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                >
                  {saveSuccess ? <Check size={14} /> : <Zap size={14} />}
                  <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Commands Directory */}
        {activeTab === 'commands' && (
          <div className="discord-tab-content animate-fade-in">
            {/* Search and Filters */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-muted" />
                <input
                  type="text"
                  className="input-field pl-9 text-xs"
                  placeholder="Search CapStoneFlow commands (e.g. claim, resolved, review, leaderboard)..."
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 shrink-0">
                {(['all', 'Developer', 'QA', 'PM'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                      commandRoleFilter === r 
                        ? 'bg-[#5865F2] text-white font-semibold' 
                        : 'text-muted hover:text-slate-200'
                    }`}
                    onClick={() => setCommandRoleFilter(r)}
                  >
                    {r === 'all' ? 'All' : r}
                  </button>
                ))}
              </div>
            </div>

            {/* Commands List */}
            <div className="commands-list-scroll">
              {filteredCommands.map((cmd) => (
                <div key={cmd.name} className="command-card glass-panel">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="command-name font-mono">/{cmd.name}</span>
                      {cmd.roleRequirement && cmd.roleRequirement !== 'Team' && (
                        <span className={`role-pill role-${cmd.roleRequirement.toLowerCase()}`}>
                          {cmd.roleRequirement} Only
                        </span>
                      )}
                      <span className="scope-pill font-mono">{cmd.usageScope}</span>
                    </div>
                    {cmd.example && (
                      <button
                        type="button"
                        className="copy-cmd-btn text-[11px] text-muted hover:text-[#5865F2] flex items-center gap-1 font-mono"
                        onClick={() => navigator.clipboard.writeText(cmd.example || `/${cmd.name}`)}
                        title="Copy command syntax"
                      >
                        <Copy size={11} />
                        <span>Copy</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 m-0">{cmd.description}</p>
                  {cmd.example && (
                    <div className="mt-1.5 text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800/80 inline-block">
                      {cmd.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Roles & Architecture */}
        {activeTab === 'roles' && (
          <div className="discord-tab-content animate-fade-in">
            <div className="role-cards-grid">
              <div className="role-info-card border-blue-500/30 bg-blue-500/[0.04]">
                <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1.5 mb-2">
                  <Terminal size={15} /> 1. Developer Role
                </h4>
                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                  <li><strong>/claim</strong>: Take ownership of an OPEN ticket thread.</li>
                  <li><strong>/unclaim</strong>: Return ticket back to pool if blocked.</li>
                  <li><strong>/resolved</strong>: Provide staging PR link & submit for QA audit.</li>
                  <li><strong>/unresolve</strong>: Revert if regression found during branch merge.</li>
                </ul>
              </div>

              <div className="role-info-card border-purple-500/30 bg-purple-500/[0.04]">
                <h4 className="text-sm font-bold text-purple-400 flex items-center gap-1.5 mb-2">
                  <ShieldCheck size={15} /> 2. QA Tester Role
                </h4>
                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                  <li><strong>/reviewed</strong>: Verify acceptance criteria and cross-device testing.</li>
                  <li><strong>/unreview</strong>: Send back if edge-case defect reproduced.</li>
                  <li>Strict separation: Developers cannot verify their own tickets.</li>
                </ul>
              </div>

              <div className="role-info-card border-emerald-500/30 bg-emerald-500/[0.04] col-span-2">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                  <Award size={15} /> 3. Project Manager (PM) Role
                </h4>
                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                  <li><strong>/closed</strong>: Final sign-off after production deployment.</li>
                  <li><strong>/reset-ticket</strong>: Reopen and clear assignment state.</li>
                  <li><strong>/sync-commands</strong>: Publish updated command models to Discord server.</li>
                  <li><strong>/scan-repo & /scan-project</strong>: Ingest GitHub and codebases into HappyTF tickets.</li>
                  <li><strong>/setreminderschannel</strong>: Route 8:00 AM PHT standup summaries.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(4, 6, 12, 0.8);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 16px;
          }

          .discord-modal-card {
            width: 100%;
            max-width: 680px;
            background: var(--bg-surface, #1e222d);
            border: 1px solid var(--border-default, rgba(255,255,255,0.08));
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
            max-height: 90vh;
            display: flex;
            flex-direction: column;
          }

          .discord-modal-header {
            border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.06));
            padding-bottom: 14px;
          }

          .discord-logo-box {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(88, 101, 242, 0.15);
            border: 1px solid rgba(88, 101, 242, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .badge-bot-tag {
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 4px;
            background: rgba(88, 101, 242, 0.2);
            color: #5865F2;
            border: 1px solid rgba(88, 101, 242, 0.4);
            font-weight: 700;
          }

          .close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
          }
          .close-btn:hover {
            color: var(--text-primary);
            background: var(--bg-hover);
          }

          .discord-tab-bar {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            padding-bottom: 2px;
          }

          .discord-tab-btn {
            background: transparent;
            border: none;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            border-radius: 8px;
            transition: all 0.15s ease;
          }
          .discord-tab-btn:hover {
            color: var(--text-primary);
            background: rgba(255,255,255,0.04);
          }
          .discord-tab-btn.active {
            color: #ffffff;
            background: rgba(88, 101, 242, 0.2);
            border: 1px solid rgba(88, 101, 242, 0.4);
          }

          .discord-tab-content {
            padding-top: 16px;
            overflow-y: auto;
          }

          .endpoint-box {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(88, 101, 242, 0.25);
            border-radius: 10px;
            padding: 12px;
          }

          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .field-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 4px;
            display: block;
          }

          .commands-list-scroll {
            max-height: 380px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-right: 4px;
          }

          .command-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 10px 12px;
            transition: border-color 0.15s;
          }
          .command-card:hover {
            border-color: rgba(88, 101, 242, 0.4);
          }

          .command-name {
            font-size: 12px;
            font-weight: 700;
            color: #5865F2;
          }

          .role-pill {
            font-size: 9px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 4px;
            font-family: monospace;
          }
          .role-pill.role-developer {
            background: rgba(59, 130, 246, 0.15);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.3);
          }
          .role-pill.role-qa {
            background: rgba(139, 92, 246, 0.15);
            color: #c084fc;
            border: 1px solid rgba(139, 92, 246, 0.3);
          }
          .role-pill.role-pm {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
          }

          .scope-pill {
            font-size: 9px;
            padding: 1px 5px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-muted);
          }

          .role-cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .role-info-card {
            border-radius: 12px;
            border-width: 1px;
            padding: 14px;
          }
        `}</style>
      </div>
    </div>
  );
};
