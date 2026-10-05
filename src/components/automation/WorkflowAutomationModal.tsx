'use client';

import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Sliders, 
  Play, 
  Bot, 
  Activity, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertTriangle, 
  GitPullRequest, 
  Clock, 
  Shield, 
  Sparkles, 
  Terminal, 
  ArrowRight,
  Search,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { CAPSTONEFLOW_COMMANDS } from '@/lib/integrations/capstoneflow';
import { AutomationRule, AutomationEvent } from '@/lib/automation/engine';

interface WorkflowAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowAutomationModal: React.FC<WorkflowAutomationModalProps> = ({ isOpen, onClose }) => {
  const { 
    automationRules, 
    toggleAutomationRule, 
    automationLogs, 
    simulateAutomation,
    allWorkspaceItems,
    activeBoard
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rules' | 'simulator' | 'discord' | 'logs'>('rules');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    triggeredRules: string[];
    actionsTaken: string[];
    ticketLabel: string;
  } | null>(null);

  // Discord command filters
  const [commandSearch, setCommandSearch] = useState('');
  const [commandRoleFilter, setCommandRoleFilter] = useState<'all' | 'Developer' | 'QA' | 'PM'>('all');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Initialize selected ticket
  React.useEffect(() => {
    if (allWorkspaceItems && allWorkspaceItems.length > 0 && !selectedTicketId) {
      setSelectedTicketId(allWorkspaceItems[0].id);
    }
  }, [allWorkspaceItems, selectedTicketId]);

  if (!isOpen) return null;

  const currentTicket = allWorkspaceItems.find((i) => i.id === selectedTicketId) || allWorkspaceItems[0];

  const handleRunSimulation = async (event: AutomationEvent) => {
    if (!currentTicket) return;
    setIsSimulating(true);
    try {
      const res = await simulateAutomation(currentTicket.id, event);
      if (res) {
        setSimulationResult({
          triggeredRules: res.triggeredRules,
          actionsTaken: res.actionsTaken,
          ticketLabel: currentTicket.ticket_number || currentTicket.title,
        });
      }
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyCommand = (cmdText: string) => {
    navigator.clipboard.writeText(cmdText);
    setCopiedCommand(cmdText);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const filteredCommands = CAPSTONEFLOW_COMMANDS.filter((cmd) => {
    const matchesSearch = 
      cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) || 
      cmd.description.toLowerCase().includes(commandSearch.toLowerCase());
    const matchesRole = commandRoleFilter === 'all' || cmd.roleRequirement === commandRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" id="workflow-automation-modal-overlay">
      <div 
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[#181b24] border border-white/10 shadow-2xl overflow-hidden animate-pop-in"
        id="workflow-automation-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#1e222e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Automations & Discord Bridge</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {automationRules.filter((r) => r.enabled).length} Active Rules
                </span>
              </div>
              <p className="text-xs text-white/50">
                IFTTT workflow engine, GitHub PR auto-transitions & CapStoneFlow Discord bot
              </p>
            </div>
          </div>
          <button
            id="close-automation-modal-btn"
            type="button"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-white/10 flex gap-2 bg-[#1b1f2b]">
          <button
            id="automation-tab-rules-btn"
            type="button"
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'rules'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
            onClick={() => setActiveTab('rules')}
          >
            <Sliders size={14} />
            <span>Workflow Rules ({automationRules.length})</span>
          </button>

          <button
            id="automation-tab-simulator-btn"
            type="button"
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'simulator'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
            onClick={() => setActiveTab('simulator')}
          >
            <Play size={14} />
            <span>Live Simulator</span>
          </button>

          <button
            id="automation-tab-discord-btn"
            type="button"
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'discord'
                ? 'border-[#5865F2] text-[#8ea1e1] bg-[#5865F2]/5'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
            onClick={() => setActiveTab('discord')}
          >
            <Bot size={14} className="text-[#5865F2]" />
            <span>Discord Bot (24 Commands)</span>
          </button>

          <button
            id="automation-tab-logs-btn"
            type="button"
            className={`px-4 py-2 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'logs'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
            onClick={() => setActiveTab('logs')}
          >
            <Activity size={14} />
            <span>Audit Log ({automationLogs.length})</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4" id="automation-rules-list">
              <div className="flex items-center justify-between text-xs text-white/60 pb-1">
                <span>Active IFTTT workflow triggers on board <strong>{activeBoard?.name || 'Current Board'}</strong></span>
                <span className="font-mono text-[11px] text-white/40">Real-time execution</span>
              </div>

              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rule.enabled 
                      ? 'bg-[#1e222e] border-white/10 hover:border-amber-500/30' 
                      : 'bg-[#151821] border-white/5 opacity-60'
                  }`}
                  id={`rule-card-${rule.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-white/20'}`} />
                        <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-white/5 text-white/60 border border-white/10">
                          {rule.triggerType}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-1">{rule.description}</p>
                    </div>

                    <button
                      type="button"
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.enabled ? 'bg-amber-500' : 'bg-white/10'
                      }`}
                      onClick={() => toggleAutomationRule(rule.id)}
                      id={`toggle-rule-${rule.id}`}
                      aria-label={`Toggle rule ${rule.name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-white/80 border border-white/5">
                      <span className="text-amber-400 font-bold uppercase text-[10px]">WHEN:</span>
                      <span className="font-mono text-[11px]">
                        {rule.triggerCondition?.priority && `priority == '${rule.triggerCondition.priority}'`}
                        {rule.triggerCondition?.status && `status == '${rule.triggerCondition.status}'`}
                        {!rule.triggerCondition && rule.triggerType}
                      </span>
                    </div>

                    <ArrowRight size={12} className="text-white/30" />

                    {rule.actions.map((act, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-white/80 border border-white/5">
                        <span className="text-emerald-400 font-bold uppercase text-[10px]">THEN:</span>
                        <span className="font-mono text-[11px]">
                          {act.type === 'set_sla_hours' && `Set SLA to ${act.hours}h`}
                          {act.type === 'transition_status' && `Transition to '${act.status}'`}
                          {act.type === 'send_discord_alert' && 'Dispatch Discord ping'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: LIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-6" id="automation-simulator-pane">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
                <Sparkles size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">Interactive Workflow Testing Canvas:</strong> Test live triggers against any ticket on your board. Clicking a simulator trigger evaluates rules, executes state transitions with OCC version monotonicity, plays sound feedback, and writes to the audit log.
                </div>
              </div>

              {/* Target Ticket Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Target Board Ticket:
                </label>
                <select
                  id="simulator-ticket-selector"
                  className="w-full px-3 py-2 rounded-lg bg-[#141720] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                >
                  {allWorkspaceItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.ticket_number || '#TK-TASK'} — {item.title} ({item.status} · {item.priority || 'medium'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Simulator Action Grid */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Trigger Event Simulation:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="sim-trigger-urgent-btn"
                    type="button"
                    className="p-3 rounded-xl bg-[#1e222e] border border-white/10 hover:border-red-500/40 text-left transition-all hover:bg-red-500/5 group"
                    onClick={() => handleRunSimulation({
                      type: 'priority_changed',
                      previousValue: currentTicket?.priority || 'medium',
                      newValue: 'urgent',
                      actor: 'Simulated User',
                    })}
                    disabled={isSimulating}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                      <AlertTriangle size={14} />
                      <span>Priority ➔ Urgent</span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Sets 2h SLA deadline, plays alert chime, logs Discord alert
                    </p>
                  </button>

                  <button
                    id="sim-trigger-stuck-btn"
                    type="button"
                    className="p-3 rounded-xl bg-[#1e222e] border border-white/10 hover:border-red-500/40 text-left transition-all hover:bg-red-500/5 group"
                    onClick={() => handleRunSimulation({
                      type: 'status_changed',
                      previousValue: currentTicket?.status || 'Working on it',
                      newValue: 'Stuck',
                      actor: 'Simulated User',
                    })}
                    disabled={isSimulating}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                      <AlertTriangle size={14} />
                      <span>Status ➔ Stuck</span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Triggers blocker ping & Discord team escalation
                    </p>
                  </button>

                  <button
                    id="sim-trigger-pr-open-btn"
                    type="button"
                    className="p-3 rounded-xl bg-[#1e222e] border border-white/10 hover:border-purple-500/40 text-left transition-all hover:bg-purple-500/5 group"
                    onClick={() => handleRunSimulation({
                      type: 'pr_opened',
                      metadata: { pr_number: 104, branch: 'feat/discord-slash-engine' },
                    })}
                    disabled={isSimulating}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                      <GitPullRequest size={14} />
                      <span>GitHub PR Opened</span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Auto-transitions ticket status to <strong>In Review</strong>
                    </p>
                  </button>

                  <button
                    id="sim-trigger-pr-merge-btn"
                    type="button"
                    className="p-3 rounded-xl bg-[#1e222e] border border-white/10 hover:border-emerald-500/40 text-left transition-all hover:bg-emerald-500/5 group"
                    onClick={() => handleRunSimulation({
                      type: 'pr_merged',
                      metadata: { pr_number: 104, merged_by: 'octocat' },
                    })}
                    disabled={isSimulating}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={14} />
                      <span>GitHub PR Merged</span>
                    </div>
                    <p className="text-[11px] text-white/50 mt-1">
                      Auto-transitions ticket to <strong>Done</strong> & plays fanfare
                    </p>
                  </button>
                </div>
              </div>

              {/* Simulation Output Card */}
              {simulationResult && (
                <div className="p-4 rounded-xl bg-[#141720] border border-emerald-500/30 space-y-2 animate-fade-in" id="simulation-output-card">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 size={15} />
                    <span>Automation Trigger Executed Successfully for {simulationResult.ticketLabel}</span>
                  </div>
                  <div className="text-xs text-white/70 space-y-1">
                    <div>
                      <strong className="text-white">Triggered Rules:</strong>{' '}
                      <span className="font-mono text-amber-300">{simulationResult.triggeredRules.join(', ') || 'None'}</span>
                    </div>
                    <div>
                      <strong className="text-white">Actions Taken:</strong>
                      <ul className="list-disc list-inside mt-1 font-mono text-[11px] text-white/60">
                        {simulationResult.actionsTaken.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISCORD BOT (24 COMMANDS) */}
          {activeTab === 'discord' && (
            <div className="space-y-4" id="discord-bot-commands-pane">
              {/* Search & Role Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-2.5 text-white/40" />
                  <input
                    type="text"
                    id="discord-command-search-input"
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#141720] border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#5865F2]"
                    placeholder="Search 24 CapStoneFlow commands..."
                    value={commandSearch}
                    onChange={(e) => setCommandSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {(['all', 'Developer', 'QA', 'PM'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        commandRoleFilter === role
                          ? 'bg-[#5865F2] text-white'
                          : 'bg-white/5 text-white/60 hover:text-white'
                      }`}
                      onClick={() => setCommandRoleFilter(role)}
                    >
                      {role === 'all' ? 'All Roles' : role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commands Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="discord-commands-grid">
                {filteredCommands.map((cmd) => {
                  const roleBadgeColor = 
                    cmd.roleRequirement === 'Developer'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : cmd.roleRequirement === 'QA'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                  const sampleCmd = `/${cmd.name}`;

                  return (
                    <div
                      key={cmd.name}
                      className="p-3.5 rounded-xl bg-[#1e222e] border border-white/10 hover:border-[#5865F2]/40 transition-colors flex flex-col justify-between"
                      id={`command-card-${cmd.name}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white tracking-wide">
                              /{cmd.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${roleBadgeColor}`}>
                              {cmd.roleRequirement}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-white/40">
                              {cmd.usageScope}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                          {cmd.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-white/40 truncate max-w-[200px]" title={cmd.example}>
                          {cmd.example || `/${cmd.name}`}
                        </span>
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                          onClick={() => handleCopyCommand(cmd.example || sampleCmd)}
                          title="Copy command syntax"
                        >
                          {copiedCommand === sampleCmd ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-3" id="automation-audit-logs-pane">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Recent execution events (tracked in-memory & dispatched via webhooks)</span>
                <span className="font-mono text-[11px]">{automationLogs.length} events logged</span>
              </div>

              <div className="space-y-2">
                {automationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#1e222e] border border-white/5 hover:border-white/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    id={`log-entry-${log.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{log.ruleName}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/5 text-amber-400 border border-amber-500/20">
                          {log.triggerType}
                        </span>
                        <span className="font-mono text-[11px] text-white/40">
                          on <strong>{log.ticketLabel}</strong>
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 font-mono">
                        {log.actionsTaken.join(' · ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:text-right flex-shrink-0">
                      <span className="text-[10px] font-mono text-white/40">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SUCCESS
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#1e222e] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white/50">
            <Shield size={14} className="text-emerald-400" />
            <span>OCC v2 Monotonic Version Integrity Enforced</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
