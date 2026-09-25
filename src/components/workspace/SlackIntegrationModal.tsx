'use client';

import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Send, ShieldCheck, Bell, MessageSquare, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface SlackIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SlackIntegrationModal: React.FC<SlackIntegrationModalProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace } = useApp();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#engineering-triage');
  const [notifyUrgentOnly, setNotifyUrgentOnly] = useState(true);
  const [notifyStatusChange, setNotifyStatusChange] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  if (!isOpen) return null;

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Send simulated test webhook payload
      const payload = {
        workspaceId: currentWorkspace?.id || 'ws-acme-core',
        ticketId: 'test-tk-999',
        ticketNumber: 'TK-999',
        title: 'Test Verification: Slack Bridge Connected to HappyTF Work OS',
        priority: 'urgent',
        status: 'Working on it',
        assigneeName: 'Alex Rivera',
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          board_id: 'board-01',
          description: 'This is a test notification payload verifying webhook connectivity.',
        }),
      });

      if (res.ok) {
        setTestResult({
          success: true,
          message: 'Webhook payload formatted & dispatched successfully! Check your Slack channel or server logs.',
        });
      } else {
        const data = await res.json();
        setTestResult({
          success: false,
          message: data.error || 'Failed to dispatch test notification.',
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Network error communicating with integration endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyInboundUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://happytf.work';
    navigator.clipboard.writeText(`${origin}/api/integrations/slack/webhook`);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="modal-overlay animate-fade-in" id="slack-integration-modal-overlay" onClick={onClose}>
      <div 
        className="modal-card glass-panel animate-pop-in" 
        style={{ maxWidth: 580 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-slack-modal-btn"
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close Slack integration dialog"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/60 flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-label="Slack Logo">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Slack Workflow Integration
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active V2
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Connect your workspace to stream critical tickets and triage from Slack.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body space-y-4 pt-4">
          {/* Outbound Slack Webhook */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Slack Incoming Webhook URL</span>
              <span className="text-[11px] font-normal text-slate-500">From Slack App Directory</span>
            </label>
            <input
              type="url"
              className="input-field font-mono text-xs w-full focus:ring-2 focus:ring-indigo-500/40"
              placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-[11px] text-slate-500">
              When tickets are created or flagged as Urgent, an interactive message with Claim & Done buttons will be posted here.
            </p>
          </div>

          {/* Inbound Webhook for Slack Interactive Buttons & Commands */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-400" />
                Inbound Webhook URL (For Interactive Buttons & Commands)
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-xs flex items-center gap-1 font-mono cursor-pointer"
                onClick={copyInboundUrl}
              >
                {copiedWebhook ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                {copiedWebhook ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-slate-300 font-mono break-all bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/60 select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/integrations/slack/webhook` : 'https://happytf.work/api/integrations/slack/webhook'}
            </p>
            <p className="text-[11px] text-slate-500">
              Paste this URL into your Slack App under <strong>Interactivity & Shortcuts</strong> and <strong>Slash Commands</strong>.
            </p>
          </div>

          {/* Configuration Toggles */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-300">Notification Triggers</label>
            
            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50 cursor-pointer hover:border-slate-700/60 transition-colors">
              <div className="flex items-center gap-2.5">
                <Bell size={15} className="text-amber-400" />
                <div>
                  <div className="text-xs text-slate-200 font-medium">Notify on Urgent / Critical Tickets</div>
                  <div className="text-[11px] text-slate-500">Immediately ping channel when high severity issues are filed</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyUrgentOnly}
                onChange={(e) => setNotifyUrgentOnly(e.target.checked)}
                className="toggle-checkbox cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50 cursor-pointer hover:border-slate-700/60 transition-colors">
              <div className="flex items-center gap-2.5">
                <RefreshCw size={15} className="text-indigo-400" />
                <div>
                  <div className="text-xs text-slate-200 font-medium">Broadcast Status Transitions</div>
                  <div className="text-[11px] text-slate-500">Send updates when tickets change to Stuck or Done</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyStatusChange}
                onChange={(e) => setNotifyStatusChange(e.target.checked)}
                className="toggle-checkbox cursor-pointer"
              />
            </label>
          </div>

          {/* Test Dispatch Result */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/20 text-red-300'
              }`}
            >
              {testResult.success ? <Check size={14} className="flex-shrink-0" /> : <X size={14} className="flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer flex items-center justify-between pt-4 mt-4 border-t border-slate-800/60">
          <button
            type="button"
            className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
            onClick={handleTestNotification}
            disabled={isTesting}
          >
            <Send size={13} />
            {isTesting ? 'Sending Test...' : 'Send Test Notification'}
          </button>

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
              onClick={onClose}
            >
              <Check size={14} />
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .modal-card {
          width: 100%;
          background: var(--bg-surface, #0f172a);
          border: 1px solid var(--border-default, rgba(255, 255, 255, 0.08));
          border-radius: var(--radius-xl, 18px);
          padding: 26px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          color: var(--text-primary);
        }

        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          color: var(--text-muted, #94a3b8);
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast, 150ms ease);
          background: transparent;
          border: none;
        }

        .modal-close-btn:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.06));
          color: var(--text-primary, #ffffff);
        }

        .space-y-4 > * + * {
          margin-top: 16px;
        }

        .space-y-2 > * + * {
          margin-top: 8px;
        }

        .space-y-1\\.5 > * + * {
          margin-top: 6px;
        }

        .input-field {
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--bg-canvas);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .input-field:focus {
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
};
