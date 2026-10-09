'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  MessageSquare, 
  Send, 
  User, 
  Tag 
} from 'lucide-react';
import { SanitizedClientTicket } from '../../../lib/intake/intakeEngine';
import { playClickSound, playCompleteSound } from '../../../lib/soundFx';

export default function TicketTrackPage() {
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<SanitizedClientTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/intake?id=${encodeURIComponent(ticketId)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Ticket not found');
      }

      setTicket(data.ticket);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to locate ticket. Please verify your reference number.');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    setIsSubmittingComment(true);
    playClickSound();

    setTimeout(() => {
      const newEntry = {
        id: `pub-c-${Date.now()}`,
        author: 'You (Requester)',
        message: newComment.trim(),
        timestamp: 'Just now',
      };

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              publicUpdates: [...prev.publicUpdates, newEntry],
            }
          : prev
      );

      setNewComment('');
      setIsSubmittingComment(false);
      playCompleteSound();
    }, 400);
  };

  const steps = [
    { title: 'Received', key: 'received', percent: 20 },
    { title: 'Triaged', key: 'triaged', percent: 40 },
    { title: 'In Development', key: 'in_dev', percent: 65 },
    { title: 'QA & Review', key: 'review', percent: 85 },
    { title: 'Resolved', key: 'resolved', percent: 100 },
  ];

  return (
    <div className="track-page-canvas">
      {/* Top Header */}
      <header className="track-header">
        <Link href="/intake" className="back-link">
          <ArrowLeft size={16} />
          <span>Intake Portal</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-refresh font-mono"
            onClick={() => {
              playClickSound();
              fetchTicket();
            }}
            title="Refresh status"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </header>

      <main className="track-container">
        {isLoading ? (
          <div className="loading-card glass-panel animate-pulse">
            <div className="loading-spinner" />
            <span className="text-sm text-slate-400 font-mono">
              Loading real-time ticket telemetry...
            </span>
          </div>
        ) : errorMsg || !ticket ? (
          <div className="error-card glass-panel animate-fade-in">
            <AlertCircle size={44} className="text-red-400 mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Ticket Not Found</h2>
            <p className="text-sm text-slate-400 max-w-sm mb-6">
              {errorMsg || `Could not find any active work ticket with reference "${ticketId}".`}
            </p>
            <Link href="/intake" className="btn-primary font-mono text-xs">
              Return to Intake Portal
            </Link>
          </div>
        ) : (
          <div className="ticket-detail-card glass-panel animate-fade-in">
            {/* Top Status Banner */}
            <div className="card-top-bar">
              <div className="ticket-id-tag font-mono">
                {ticket.ticketNumber}
              </div>
              <span className={`status-pill status-${ticket.isResolved ? 'done' : 'progress'}`}>
                {ticket.milestone}
              </span>
            </div>

            {/* Ticket Subject */}
            <h1 className="ticket-title">{ticket.title}</h1>

            {/* Visual Progress Stepper */}
            <div className="stepper-box">
              <div className="stepper-bar-bg">
                <div 
                  className="stepper-bar-fill" 
                  style={{ width: `${ticket.progressPercentage}%` }} 
                />
              </div>

              <div className="stepper-nodes-row">
                {steps.map((s) => {
                  const isDone = ticket.progressPercentage >= s.percent;
                  const isCurrent =
                    ticket.progressPercentage >= s.percent - 20 &&
                    ticket.progressPercentage < s.percent;

                  return (
                    <div 
                      key={s.key} 
                      className={`stepper-node ${isDone ? 'node-done' : ''} ${isCurrent ? 'node-active' : ''}`}
                    >
                      <div className="node-dot">
                        {isDone && <CheckCircle2 size={12} />}
                      </div>
                      <span className="node-title font-mono">{s.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Meta Properties Row */}
            <div className="meta-chips-row">
              <span className="meta-chip font-mono">
                <Tag size={12} className="text-emerald-400" />
                Category: {ticket.category}
              </span>

              <span className="meta-chip font-mono">
                <Clock size={12} className="text-amber-400" />
                Priority: {ticket.priority.toUpperCase()}
              </span>

              {ticket.assigneeName && (
                <span className="meta-chip font-mono">
                  <User size={12} className="text-indigo-400" />
                  Assigned: {ticket.assigneeName}
                </span>
              )}
            </div>

            {/* Description Box */}
            <div className="description-card">
              <h3 className="section-title">Submitted Request</h3>
              <p className="description-text">{ticket.description}</p>
            </div>

            {/* Timeline Updates & Conversation */}
            <div className="updates-section">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-emerald-400" />
                <h3 className="section-title mb-0">Progress Updates &amp; Comments</h3>
              </div>

              <div className="updates-stream">
                {ticket.publicUpdates.length === 0 ? (
                  <div className="empty-stream text-xs text-slate-500 font-mono">
                    No public updates posted yet. Our engineering team is currently assessing your request.
                  </div>
                ) : (
                  ticket.publicUpdates.map((up) => (
                    <div key={up.id} className="update-entry">
                      <div className="update-header">
                        <span className="update-author">{up.author}</span>
                        <span className="update-time font-mono">{up.timestamp}</span>
                      </div>
                      <p className="update-msg">{up.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Follow-up Form */}
              <form onSubmit={handleAddComment} className="comment-form mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="comment-input"
                    placeholder="Add a follow-up note or additional information..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn-send font-mono"
                    disabled={!newComment.trim() || isSubmittingComment}
                  >
                    <Send size={13} />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .track-page-canvas {
          min-height: 100vh;
          background: #07090e;
          background-image: radial-gradient(circle at 50% 0%, rgba(62, 207, 142, 0.08) 0%, transparent 60%);
          color: #f1f5f9;
          display: flex;
          flex-direction: column;
          font-family: var(--font-sans, system-ui, sans-serif);
        }

        .track-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 15, 25, 0.8);
          backdrop-filter: blur(12px);
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .back-link:hover {
          color: #ffffff;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 11px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          cursor: pointer;
        }

        .track-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .loading-card,
        .error-card {
          width: 100%;
          max-width: 520px;
          padding: 48px;
          text-align: center;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(18, 22, 34, 0.85);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3ecf8e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .btn-primary {
          padding: 8px 18px;
          border-radius: 6px;
          background: #3ecf8e;
          color: #07090e;
          font-weight: 700;
          text-decoration: none;
        }

        .ticket-detail-card {
          width: 100%;
          max-width: 680px;
          background: rgba(18, 22, 34, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 32px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
        }

        .card-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .ticket-id-tag {
          font-size: 12px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.4);
          color: #a5b4fc;
        }

        .status-pill {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .status-progress {
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fbbf24;
        }

        .status-done {
          background: rgba(16, 185, 129, 0.18);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .ticket-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #ffffff;
          margin-bottom: 24px;
        }

        /* Stepper */
        .stepper-box {
          position: relative;
          margin-bottom: 24px;
        }

        .stepper-bar-bg {
          position: absolute;
          top: 10px;
          left: 5%;
          right: 5%;
          height: 3px;
          background: rgba(255, 255, 255, 0.1);
          z-index: 1;
        }

        .stepper-bar-fill {
          height: 100%;
          background: #3ecf8e;
          transition: width 0.3s ease;
        }

        .stepper-nodes-row {
          position: relative;
          display: flex;
          justify-content: space-between;
          z-index: 2;
        }

        .stepper-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .node-dot {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          color: transparent;
        }

        .stepper-node.node-done .node-dot {
          background: #3ecf8e;
          border-color: #3ecf8e;
          color: #07090e;
        }

        .stepper-node.node-active .node-dot {
          border-color: #3ecf8e;
          box-shadow: 0 0 10px rgba(62, 207, 142, 0.6);
        }

        .node-title {
          font-size: 10px;
          color: #64748b;
        }

        .stepper-node.node-done .node-title,
        .stepper-node.node-active .node-title {
          color: #e2e8f0;
          font-weight: 600;
        }

        .meta-chips-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }

        .description-card {
          padding: 16px;
          border-radius: 10px;
          background: rgba(11, 15, 25, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .description-text {
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* Updates */
        .updates-section {
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .updates-stream {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .update-entry {
          padding: 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .update-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .update-author {
          font-size: 12px;
          font-weight: 600;
          color: #3ecf8e;
        }

        .update-time {
          font-size: 10px;
          color: #64748b;
        }

        .update-msg {
          font-size: 12px;
          color: #cbd5e1;
        }

        .comment-input {
          flex: 1;
          padding: 9px 12px;
          border-radius: 8px;
          background: rgba(11, 15, 25, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 12px;
          outline: none;
        }

        .comment-input:focus {
          border-color: #3ecf8e;
        }

        .btn-send {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 8px;
          background: #3ecf8e;
          border: none;
          color: #07090e;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
