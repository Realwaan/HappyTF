'use client';

import React, { useState, useEffect } from 'react';
import { BoardItem, BoardGroup, WorkspaceMember } from '../../types';
import {
  generateSprintSummary,
  analyzeSprintRisks,
  generateSmartTicketsFromPrompt,
  rebalanceWorkload,
  SmartGeneratedTicket,
} from '../../lib/ai/sprintCopilot';
import { playClickSound, playTransitionSound, playCompleteSound } from '../../lib/soundFx';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardName: string;
  boardGroups: BoardGroup[];
  boardItems: BoardItem[];
  workspaceMembers: WorkspaceMember[];
  onAddTickets: (tickets: SmartGeneratedTicket[]) => void;
}

type CopilotTab = 'generator' | 'health' | 'retro' | 'workload';

const PROMPT_PRESETS = [
  'Google OAuth authentication flow with refresh tokens',
  'Stripe subscription billing & usage metering webhook',
  'Dark mode contrast polish & WCAG 2.2 accessibility',
  'WebAssembly columnar data aggregation engine',
];

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  boardName,
  boardGroups,
  boardItems,
  workspaceMembers,
  onAddTickets,
}) => {
  const [activeTab, setActiveTab] = useState<CopilotTab>('generator');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTickets, setGeneratedTickets] = useState<SmartGeneratedTicket[]>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = generateSprintSummary(boardName || 'Active Sprint', boardItems);
  const risks = analyzeSprintRisks(boardItems);
  const rebalance = rebalanceWorkload(boardItems, workspaceMembers);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    playClickSound();

    setTimeout(() => {
      const plan = generateSmartTicketsFromPrompt(prompt, boardGroups);
      setGeneratedTickets(plan.tickets);
      setIsGenerating(false);
      playTransitionSound();
    }, 350);
  };

  const handleAddAll = () => {
    if (generatedTickets.length === 0) return;
    onAddTickets(generatedTickets);
    playCompleteSound();
    setGeneratedTickets([]);
    setPrompt('');
    onClose();
  };

  const handleAddSingle = (ticket: SmartGeneratedTicket, index: number) => {
    onAddTickets([ticket]);
    playClickSound();
    setGeneratedTickets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCopyRetro = () => {
    navigator.clipboard.writeText(summary.summaryMarkdown);
    setCopyFeedback(true);
    playClickSound();
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="copilot-backdrop" onClick={onClose} id="ai-copilot-modal">
      <div className="copilot-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="copilot-header">
          <div className="header-left">
            <div className="copilot-badge">
              <span className="sparkle-icon">✨</span>
              <span className="badge-text">AI Sprint Copilot</span>
            </div>
            <span className="model-chip">mondayAI Heuristic Engine</span>
            <span className="active-board-pill">{boardName || 'Active Board'}</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="copilot-tabs" role="tablist">
          <button
            className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('generator');
              playClickSound();
            }}
            role="tab"
            aria-selected={activeTab === 'generator'}
          >
            <span className="tab-icon">⚡</span>
            Smart Generator
          </button>
          <button
            className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('health');
              playClickSound();
            }}
            role="tab"
            aria-selected={activeTab === 'health'}
          >
            <span className="tab-icon">🩺</span>
            Health & Risks
            {risks.urgentStuckTickets.length > 0 && (
              <span className="alert-count-pill">{risks.urgentStuckTickets.length}</span>
            )}
          </button>
          <button
            className={`tab-btn ${activeTab === 'retro' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('retro');
              playClickSound();
            }}
            role="tab"
            aria-selected={activeTab === 'retro'}
          >
            <span className="tab-icon">📊</span>
            Retro & Velocity
          </button>
          <button
            className={`tab-btn ${activeTab === 'workload' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('workload');
              playClickSound();
            }}
            role="tab"
            aria-selected={activeTab === 'workload'}
          >
            <span className="tab-icon">⚖️</span>
            Workload Balance
          </button>
        </div>

        {/* Modal Body */}
        <div className="copilot-content">
          {/* TAB 1: SMART TICKET GENERATOR */}
          {activeTab === 'generator' && (
            <div className="tab-pane">
              <div className="generator-intro">
                <h3>Autonomous Feature Decomposition & Spec Expander</h3>
                <p>
                  Describe a feature, user story, or defect in natural language. Copilot will decompose it into structured tickets with acceptance criteria, priority, and story points.
                </p>
              </div>

              {/* Prompt Input Box */}
              <div className="prompt-container">
                <textarea
                  className="prompt-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask Copilot or describe a feature (e.g. Implement Google OAuth with session refresh & error boundary)..."
                  rows={3}
                />
                <div className="prompt-actions">
                  <div className="presets-list">
                    <span className="preset-label">Quick Prompts:</span>
                    {PROMPT_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        className="preset-chip"
                        onClick={() => {
                          setPrompt(p);
                          playClickSound();
                        }}
                      >
                        {p.split(' ')[0]} {p.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                  <button
                    className="generate-btn"
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner"></span> Decomposing...
                      </>
                    ) : (
                      <>
                        <span>✨</span> Decompose & Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Generated Tickets Section */}
              {generatedTickets.length > 0 && (
                <div className="generated-section">
                  <div className="generated-header">
                    <h4>
                      Proposed Sprint Tickets ({generatedTickets.length})
                    </h4>
                    <button className="add-all-btn" onClick={handleAddAll}>
                      <span>📥</span> Add All to Active Board
                    </button>
                  </div>

                  <div className="tickets-grid">
                    {generatedTickets.map((t, idx) => (
                      <div key={idx} className="ticket-plan-card">
                        <div className="plan-card-top">
                          <span className={`priority-pill priority-${t.priority}`}>
                            {t.priority}
                          </span>
                          <span className="points-pill">{t.estimate_points} pts</span>
                          <span className="group-hint">
                            Target: {boardGroups.find((g) => g.id === t.group_id)?.name || boardGroups.find((g) => g.id === t.group_id)?.title || 'Backlog'}
                          </span>
                        </div>
                        <h5 className="plan-card-title">{t.title}</h5>
                        <pre className="plan-card-desc">{t.description}</pre>
                        <div className="plan-card-tags">
                          {t.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="plan-tag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <button
                          className="add-single-btn"
                          onClick={() => handleAddSingle(t, idx)}
                        >
                          + Add to Board
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HEALTH & RISKS */}
          {activeTab === 'health' && (
            <div className="tab-pane">
              <div className="risk-overview-card">
                <div className="risk-score-badge">
                  <span className="risk-title">Sprint Risk Assessment</span>
                  <span className={`risk-pill risk-${risks.overallRisk}`}>
                    {risks.overallRisk.toUpperCase()} RISK ({risks.riskScore}/100)
                  </span>
                </div>
                <div className="risk-bar-track">
                  <div
                    className={`risk-bar-fill risk-bar-${risks.overallRisk}`}
                    style={{ width: `${risks.riskScore}%` }}
                  />
                </div>
                <p className="risk-desc">
                  Calculated based on {risks.urgentStuckTickets.length} stuck items,{' '}
                  {risks.unassignedTickets.length} unassigned tasks, and{' '}
                  {risks.missingEstimatesCount} unestimated backlog items.
                </p>
              </div>

              {/* Stuck Items Alert */}
              {risks.urgentStuckTickets.length > 0 && (
                <div className="health-section">
                  <h4 className="section-title text-danger">
                    🚨 Urgent Blocked Tickets Requiring Immediate Action
                  </h4>
                  <div className="alerts-list">
                    {risks.urgentStuckTickets.map((t) => (
                      <div key={t.id} className="alert-item-card">
                        <div className="alert-item-header">
                          <span className="ticket-id">{t.id}</span>
                          <span className="ticket-title">{t.title}</span>
                          <span className="priority-pill priority-urgent">urgent</span>
                        </div>
                        <div className="alert-item-meta">
                          <span>Assignee: {typeof t.assignee === 'object' ? t.assignee.name : (t.assignee || 'Unassigned')}</span>
                          <span>Points: {t.estimate_points ?? t.numbers_value ?? '—'}</span>
                          <span className="status-pill status-stuck">Stuck</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="health-section">
                <h4 className="section-title">✨ AI Mitigation Recommendations</h4>
                <div className="recommendations-list">
                  {risks.recommendations.map((rec, idx) => (
                    <div key={idx} className="recommendation-item">
                      <p>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RETRO & VELOCITY */}
          {activeTab === 'retro' && (
            <div className="tab-pane">
              {/* Velocity Highlights */}
              <div className="metrics-row">
                <div className="metric-box">
                  <span className="metric-value">{summary.completionPercentage}%</span>
                  <span className="metric-label">Completion Rate</span>
                </div>
                <div className="metric-box">
                  <span className="metric-value">
                    {summary.completedPoints} / {summary.totalPoints}
                  </span>
                  <span className="metric-label">Story Points</span>
                </div>
                <div className="metric-box">
                  <span className="metric-value">{summary.velocityScore}</span>
                  <span className="metric-label">Velocity Index</span>
                </div>
                <div className="metric-box">
                  <span className="metric-value">{summary.completedTickets}</span>
                  <span className="metric-label">Tickets Delivered</span>
                </div>
              </div>

              {/* Retro Breakdown Columns */}
              <div className="retro-grid">
                <div className="retro-col well-col">
                  <h5>🌟 What Went Well</h5>
                  <ul>
                    {summary.retroHighlights.whatWentWell.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>

                <div className="retro-col blockers-col">
                  <h5>🛑 Roadblocks & Friction</h5>
                  <ul>
                    {summary.retroHighlights.blockers.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="retro-col actions-col">
                  <h5>🎯 Action Items for Next Sprint</h5>
                  <ul>
                    {summary.retroHighlights.actionItems.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Export Button */}
              <div className="retro-footer">
                <button className="copy-retro-btn" onClick={handleCopyRetro}>
                  {copyFeedback ? '✓ Copied to Clipboard!' : '📋 Copy Markdown Retro'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: WORKLOAD REBALANCE */}
          {activeTab === 'workload' && (
            <div className="tab-pane">
              <div className="workload-intro">
                <h4>Team Workload Distribution & Burnout Prevention</h4>
                <p>
                  Target average: <strong>{rebalance.averagePointsPerMember} points/member</strong>. AI monitors capacity to ensure even allocation.
                </p>
              </div>

              {/* Member Capacity Cards */}
              <div className="workload-grid">
                {rebalance.memberLoads.map((m) => (
                  <div key={m.userId} className="member-workload-card">
                    <div className="member-card-header">
                      <span className="member-name">{m.name}</span>
                      <span className={`capacity-pill capacity-${m.capacityStatus}`}>
                        {m.capacityStatus}
                      </span>
                    </div>
                    <div className="member-points-bar">
                      <div
                        className={`points-fill points-${m.capacityStatus}`}
                        style={{ width: `${Math.min(100, (m.points / 15) * 100)}%` }}
                      />
                    </div>
                    <div className="member-card-footer">
                      <span>{m.points} Story Points</span>
                      <span>{m.ticketCount} Active Tickets</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommended Shifts */}
              {rebalance.recommendedShifts.length > 0 && (
                <div className="shifts-section">
                  <h5 className="shifts-title">⚖️ AI Recommended Ticket Reassignments</h5>
                  <div className="shifts-list">
                    {rebalance.recommendedShifts.map((s, idx) => (
                      <div key={idx} className="shift-card">
                        <div className="shift-header">
                          <span className="shift-ticket">{s.ticketId}: {s.ticketTitle}</span>
                          <span className="shift-points">{s.points} pts</span>
                        </div>
                        <p className="shift-route">
                          Reassign from <strong>{s.fromMemberName}</strong> &rarr; <strong>{s.toMemberName}</strong>
                        </p>
                        <p className="shift-reason">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .copilot-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(10, 12, 18, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .copilot-dialog {
          background: var(--bg-surface, #181c2b);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.12));
          border-radius: 16px;
          width: 900px;
          max-width: 96vw;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(62, 207, 142, 0.15);
          overflow: hidden;
        }

        .copilot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
          background: var(--bg-subtle, #12151f);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .copilot-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.3);
          border-radius: 20px;
          padding: 4px 12px;
          color: var(--primary, #3ecf8e);
          font-weight: 600;
          font-size: 14px;
        }

        .model-chip {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          background: rgba(255, 255, 255, 0.05);
          padding: 3px 8px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
        }

        .active-board-pill {
          font-size: 11px;
          color: var(--text-secondary, #cbd5e1);
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          padding: 3px 8px;
          border-radius: 4px;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          font-size: 18px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary, #fff);
        }

        .copilot-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
          background: var(--bg-surface, #181c2b);
          padding: 0 16px;
          gap: 8px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          font-size: 13px;
          font-weight: 500;
          padding: 12px 14px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
        }

        .tab-btn:hover {
          color: var(--text-primary, #fff);
        }

        .tab-btn.active {
          color: var(--primary, #3ecf8e);
          border-bottom-color: var(--primary, #3ecf8e);
        }

        .alert-count-pill {
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 700;
        }

        .copilot-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .tab-pane {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .generator-intro h3 {
          margin: 0 0 6px 0;
          font-size: 16px;
          color: var(--text-primary, #fff);
        }

        .generator-intro p {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted, #94a3b8);
          line-height: 1.5;
        }

        .prompt-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          padding: 14px;
        }

        .prompt-textarea {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-primary, #fff);
          font-size: 14px;
          resize: none;
          outline: none;
          font-family: inherit;
        }

        .prompt-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }

        .presets-list {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .preset-label {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }

        .preset-chip {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary, #cbd5e1);
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .preset-chip:hover {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary, #fff);
        }

        .generate-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--primary, #3ecf8e);
          color: var(--on-primary, #0a0c10);
          border: none;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .generate-btn:hover:not(:disabled) {
          background: var(--primary-hover, #24b47e);
        }

        .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .generated-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .generated-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .generated-header h4 {
          margin: 0;
          font-size: 14px;
          color: var(--text-primary, #fff);
        }

        .add-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(62, 207, 142, 0.15);
          border: 1px solid rgba(62, 207, 142, 0.35);
          color: var(--primary, #3ecf8e);
          font-size: 12px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .add-all-btn:hover {
          background: rgba(62, 207, 142, 0.25);
        }

        .tickets-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ticket-plan-card {
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .plan-card-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .priority-pill {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .priority-urgent {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .priority-high {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .priority-medium {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .priority-low {
          background: rgba(148, 163, 184, 0.2);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .points-pill {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary, #fff);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
        }

        .group-hint {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          margin-left: auto;
        }

        .plan-card-title {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .plan-card-desc {
          margin: 0;
          font-size: 11px;
          color: var(--text-secondary, #cbd5e1);
          background: rgba(0, 0, 0, 0.25);
          padding: 8px 10px;
          border-radius: 6px;
          white-space: pre-wrap;
          font-family: inherit;
        }

        .plan-card-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .plan-tag {
          font-size: 10px;
          color: var(--primary, #3ecf8e);
          background: rgba(62, 207, 142, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .add-single-btn {
          align-self: flex-start;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-primary, #fff);
          font-size: 11px;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .add-single-btn:hover {
          border-color: var(--primary, #3ecf8e);
          color: var(--primary, #3ecf8e);
        }

        /* Health Tab */
        .risk-overview-card {
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .risk-score-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .risk-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .risk-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .risk-critical {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid #ef4444;
        }

        .risk-high {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid #f59e0b;
        }

        .risk-moderate {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border: 1px solid #818cf8;
        }

        .risk-low {
          background: rgba(62, 207, 142, 0.2);
          color: #3ecf8e;
          border: 1px solid #3ecf8e;
        }

        .risk-bar-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          overflow: hidden;
        }

        .risk-bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .risk-bar-critical {
          background: #ef4444;
        }

        .risk-bar-high {
          background: #f59e0b;
        }

        .risk-bar-moderate {
          background: #818cf8;
        }

        .risk-bar-low {
          background: #3ecf8e;
        }

        .risk-desc {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }

        .section-title {
          margin: 0 0 10px 0;
          font-size: 13px;
          color: var(--text-primary, #fff);
        }

        .text-danger {
          color: #ef4444;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-item-card {
          background: var(--bg-subtle, #12151f);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .alert-item-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ticket-id {
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          color: var(--primary, #3ecf8e);
          font-size: 12px;
        }

        .ticket-title {
          color: var(--text-primary, #fff);
          font-size: 13px;
          font-weight: 500;
          flex: 1;
        }

        .alert-item-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }

        .status-stuck {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          padding: 1px 6px;
          border-radius: 4px;
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .recommendation-item {
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: 8px;
          padding: 10px 14px;
        }

        .recommendation-item p {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary, #cbd5e1);
          line-height: 1.5;
        }

        /* Retro Tab */
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .metric-box {
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .metric-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary, #3ecf8e);
        }

        .metric-label {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }

        .retro-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .retro-col {
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: 10px;
          padding: 14px;
        }

        .retro-col h5 {
          margin: 0 0 10px 0;
          font-size: 13px;
          color: var(--text-primary, #fff);
        }

        .retro-col ul {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .retro-col li {
          font-size: 12px;
          color: var(--text-secondary, #cbd5e1);
          line-height: 1.4;
        }

        .retro-footer {
          display: flex;
          justify-content: flex-end;
        }

        .copy-retro-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--text-primary, #fff);
          font-size: 12px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .copy-retro-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        /* Workload Tab */
        .workload-intro h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: var(--text-primary, #fff);
        }

        .workload-intro p {
          margin: 0;
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }

        .workload-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }

        .member-workload-card {
          background: var(--bg-subtle, #12151f);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .member-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .member-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .capacity-pill {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .capacity-optimal {
          background: rgba(62, 207, 142, 0.15);
          color: #3ecf8e;
        }

        .capacity-available {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .capacity-underloaded {
          background: rgba(148, 163, 184, 0.15);
          color: #94a3b8;
        }

        .capacity-heavy {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .capacity-overloaded {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .member-points-bar {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          overflow: hidden;
        }

        .points-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .points-optimal {
          background: #3ecf8e;
        }

        .points-available {
          background: #60a5fa;
        }

        .points-underloaded {
          background: #94a3b8;
        }

        .points-heavy {
          background: #f59e0b;
        }

        .points-overloaded {
          background: #ef4444;
        }

        .member-card-footer {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }

        .shifts-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .shifts-title {
          margin: 0;
          font-size: 13px;
          color: var(--text-primary, #fff);
        }

        .shifts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shift-card {
          background: var(--bg-subtle, #12151f);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .shift-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .shift-ticket {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .shift-points {
          font-size: 11px;
          font-family: var(--font-mono, monospace);
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .shift-route {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary, #cbd5e1);
        }

        .shift-reason {
          margin: 0;
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
      `}</style>
    </div>
  );
};
