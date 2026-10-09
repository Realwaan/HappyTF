'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Bug, 
  Lightbulb, 
  HelpCircle, 
  Settings, 
  Send, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playCompleteSound, playClickSound } from '../../lib/soundFx';

type CategoryType = 'bug' | 'feature' | 'support' | 'operations';
type PriorityType = 'urgent' | 'high' | 'medium' | 'low';

export default function IntakePage() {
  const [category, setCategory] = useState<CategoryType>('bug');
  const [priority, setPriority] = useState<PriorityType>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    trackingNumber: string;
    trackingUrl: string;
    title: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (title.trim().length < 3) {
      setErrorMsg('Title must be at least 3 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setErrorMsg('Please provide at least 10 characters of description.');
      return;
    }
    if (!requesterEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    playClickSound();

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          priority,
          description: description.trim(),
          requesterName: requesterName.trim() || 'Guest Requester',
          requesterEmail: requesterEmail.trim(),
          workspaceId: 'ws-acme-core',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      setSubmittedTicket({
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        title: title.trim(),
      });

      playCompleteSound();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!submittedTicket) return;
    const url = `${window.location.origin}${submittedTicket.trackingUrl}`;
    navigator.clipboard.writeText(url);
    setHasCopied(true);
    playClickSound();
    setTimeout(() => setHasCopied(false), 2500);
  };

  return (
    <div className="intake-page-canvas">
      {/* Top Banner Navigation */}
      <header className="intake-header">
        <Link href="/" className="intake-brand-link">
          <div className="brand-logo-icon">⚡</div>
          <span className="brand-title">HappyTF Work OS</span>
        </Link>
        <div className="header-badge-row">
          <span className="sla-guarantee-pill font-mono">
            <Clock size={12} className="text-emerald-400" />
            Avg. SLA Response: &lt; 2h
          </span>
          <span className="sla-guarantee-pill font-mono">
            <ShieldCheck size={12} className="text-indigo-400" />
            Verified Request Portal
          </span>
        </div>
      </header>

      <main className="intake-container">
        {submittedTicket ? (
          /* ================= SUCCESS CONFIRMATION VIEW ================= */
          <div className="success-card glass-panel animate-pop-in">
            <div className="success-icon-wrap">
              <CheckCircle2 size={48} className="text-emerald-400" />
            </div>

            <h1 className="success-title">Request Successfully Logged!</h1>
            <p className="success-subtitle">
              Your ticket has been dispatched to our engineering triage queue with Optimistic Concurrency Control v2.
            </p>

            <div className="tracking-number-box">
              <span className="tracking-label">Official Tracking Reference</span>
              <span className="tracking-code font-mono">{submittedTicket.trackingNumber}</span>
              <span className="tracking-title truncate">&ldquo;{submittedTicket.title}&rdquo;</span>
            </div>

            <div className="success-actions-row">
              <Link 
                href={submittedTicket.trackingUrl}
                className="btn-track-primary font-mono"
              >
                <span>Track Progress Live</span>
                <ArrowRight size={14} />
              </Link>

              <button
                type="button"
                className="btn-copy-link font-mono"
                onClick={handleCopyLink}
              >
                {hasCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{hasCopied ? 'Copied Link!' : 'Copy Direct Link'}</span>
              </button>
            </div>

            <div className="reset-submission-link">
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-white transition-colors"
                onClick={() => {
                  setSubmittedTicket(null);
                  setTitle('');
                  setDescription('');
                }}
              >
                Submit another request &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* ================= INTAKE SUBMISSION FORM ================= */
          <div className="form-card glass-panel animate-fade-in">
            <div className="form-heading-block">
              <span className="category-kicker font-mono">PUBLIC CLIENT &amp; TEAM INTAKE</span>
              <h1 className="form-main-title">Submit a Work Request</h1>
              <p className="form-description">
                Directly submit bugs, feature proposals, and support inquiries into HappyTF. You will receive a permanent live tracking link.
              </p>
            </div>

            {errorMsg && (
              <div className="error-alert-banner animate-shake">
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="intake-form">
              {/* Category Picker */}
              <div className="form-group">
                <label className="form-label">Request Category</label>
                <div className="category-grid">
                  {[
                    { id: 'bug' as const, label: 'Bug Report', icon: <Bug size={14} />, desc: 'Defect or error' },
                    { id: 'feature' as const, label: 'Feature Request', icon: <Lightbulb size={14} />, desc: 'New proposal' },
                    { id: 'support' as const, label: 'Support Inquiry', icon: <HelpCircle size={14} />, desc: 'Assistance' },
                    { id: 'operations' as const, label: 'Operations & IT', icon: <Settings size={14} />, desc: 'Infra / access' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-card-btn ${category === cat.id ? 'active' : ''}`}
                      onClick={() => {
                        setCategory(cat.id);
                        playClickSound();
                      }}
                    >
                      <div className="cat-icon-row">
                        <span className="cat-icon">{cat.icon}</span>
                        <span className="cat-title">{cat.label}</span>
                      </div>
                      <span className="cat-desc">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="form-group">
                <div className="label-with-count">
                  <label htmlFor="intake-title" className="form-label">Subject / Title</label>
                  <span className="char-count font-mono">{title.length}/120</span>
                </div>
                <input
                  id="intake-title"
                  type="text"
                  maxLength={120}
                  className="intake-input font-sans"
                  placeholder="e.g. 504 Gateway Timeout on bulk ticket export"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Urgency & Priority Selector */}
              <div className="form-group">
                <label className="form-label">Urgency &amp; Impact</label>
                <div className="priority-chips-row">
                  {[
                    { id: 'urgent' as const, label: 'Urgent (P0 - 2h SLA)', color: '#ef4444' },
                    { id: 'high' as const, label: 'High (P1 - 24h SLA)', color: '#f59e0b' },
                    { id: 'medium' as const, label: 'Medium (P2 - 48h SLA)', color: '#3b82f6' },
                    { id: 'low' as const, label: 'Low (P3 - Backlog)', color: '#64748b' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`priority-chip ${priority === p.id ? 'active' : ''}`}
                      onClick={() => setPriority(p.id)}
                      style={{
                        borderColor: priority === p.id ? p.color : undefined,
                        backgroundColor: priority === p.id ? `${p.color}1f` : undefined,
                        color: priority === p.id ? p.color : undefined,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Textarea */}
              <div className="form-group">
                <div className="label-with-count">
                  <label htmlFor="intake-desc" className="form-label">Detailed Description</label>
                  <span className="char-count font-mono">{description.length} chars</span>
                </div>
                <textarea
                  id="intake-desc"
                  rows={4}
                  className="intake-textarea"
                  placeholder="Provide steps to reproduce, expected behavior, error messages, or business justification..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              {/* Requester Contact Info */}
              <div className="contact-grid-row">
                <div className="form-group">
                  <label htmlFor="intake-name" className="form-label">Your Name</label>
                  <input
                    id="intake-name"
                    type="text"
                    className="intake-input"
                    placeholder="e.g. Alex Rivera"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="intake-email" className="form-label">Email for Status Notifications</label>
                  <input
                    id="intake-email"
                    type="email"
                    className="intake-input font-mono"
                    placeholder="name@company.com"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="submit-intake-form-btn"
                className="btn-submit-intake"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Dispatching to HappyTF...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send size={15} />
                    <span>Submit Work Request</span>
                  </span>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      <style jsx>{`
        .intake-page-canvas {
          min-height: 100vh;
          background: #07090e;
          background-image: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.12) 0%, transparent 60%);
          color: #f1f5f9;
          display: flex;
          flex-direction: column;
          font-family: var(--font-sans, system-ui, sans-serif);
        }

        .intake-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(11, 15, 25, 0.75);
          backdrop-filter: blur(12px);
        }

        .intake-brand-link {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #ffffff;
        }

        .brand-logo-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6366f1, #3ecf8e);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
        }

        .brand-title {
          font-weight: 700;
          font-size: 16px;
          letter-spacing: -0.02em;
        }

        .header-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sla-guarantee-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
        }

        .intake-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .form-card {
          width: 100%;
          max-width: 640px;
          background: rgba(18, 22, 34, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          padding: 36px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
        }

        .category-kicker {
          font-size: 11px;
          font-weight: 600;
          color: #3ecf8e;
          letter-spacing: 0.08em;
        }

        .form-main-title {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 6px 0 8px 0;
          color: #ffffff;
        }

        .form-description {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .error-alert-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid #ef4444;
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 18px;
        }

        .intake-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .label-with-count {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .char-count {
          font-size: 10px;
          color: #64748b;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .category-card-btn {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }

        .category-card-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .category-card-btn.active {
          background: rgba(99, 102, 241, 0.18);
          border-color: #6366f1;
          color: #ffffff;
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.25);
        }

        .cat-icon-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cat-title {
          font-size: 12px;
          font-weight: 600;
        }

        .cat-desc {
          font-size: 11px;
          color: #64748b;
        }

        .category-card-btn.active .cat-desc {
          color: #a5b4fc;
        }

        .priority-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .priority-chip {
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .priority-chip:hover {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .intake-input,
        .intake-textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(11, 15, 25, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #ffffff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .intake-input:focus,
        .intake-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        }

        .contact-grid-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .btn-submit-intake {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 13px;
          border-radius: 9px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
        }

        .btn-submit-intake:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        .btn-submit-intake:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Success Card */
        .success-card {
          width: 100%;
          max-width: 540px;
          text-align: center;
          background: rgba(18, 22, 34, 0.9);
          border: 1px solid rgba(62, 207, 142, 0.3);
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(62, 207, 142, 0.12);
        }

        .success-icon-wrap {
          margin-bottom: 16px;
        }

        .success-title {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 8px;
          color: #ffffff;
        }

        .success-subtitle {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .tracking-number-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(11, 15, 25, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
        }

        .tracking-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tracking-code {
          font-size: 22px;
          font-weight: 800;
          color: #3ecf8e;
          letter-spacing: 0.04em;
        }

        .tracking-title {
          font-size: 12px;
          color: #cbd5e1;
          font-style: italic;
        }

        .success-actions-row {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .btn-track-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          background: #3ecf8e;
          color: #07090e;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: filter 0.15s ease;
        }

        .btn-track-primary:hover {
          filter: brightness(1.15);
        }

        .btn-copy-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-copy-link:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 600px) {
          .category-grid,
          .contact-grid-row {
            grid-template-columns: 1fr;
          }
          .form-card {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}
