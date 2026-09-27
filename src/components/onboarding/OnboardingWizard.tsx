'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { 
  Sparkles, 
  Check, 
  ArrowRight, 
  User, 
  Briefcase, 
  Plus, 
  Trash2, 
  Layers, 
  Users, 
  CheckCircle2,
  Kanban,
  Target,
  Megaphone,
  UserCheck
} from 'lucide-react';
import { AVAILABLE_ICONS, IconBadge } from '../common/IconBadge';
import { isDeployed } from '@/lib/environment';

export const OnboardingWizard: React.FC = () => {
  const { isOnboardingOpen, currentUser, completeOnboarding } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Profile
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [jobRole, setJobRole] = useState(currentUser?.job_role || 'Engineering Lead');
  const [avatarUrl, setAvatarUrl] = useState(
    currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  // Step 2: Purpose
  const [purpose, setPurpose] = useState<string>('sprints');

  // Step 3: Workspace Setup & Invites
  const [workspaceName, setWorkspaceName] = useState(isDeployed() ? '' : 'Acme Product Lab');
  const [iconEmoji, setIconEmoji] = useState('zap');
  const [brandColor, setBrandColor] = useState('#3ecf8e');
  const [inviteInput, setInviteInput] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>(
    isDeployed() ? [] : ['sarah.jenkins@happytf.dev', 'marcus.vance@happytf.dev']
  );

  if (!isOnboardingOpen) return null;

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  ];

  const purposeOptions = [
    {
      id: 'sprints',
      title: 'Sprints & Engineering',
      desc: 'Agile backlogs, bug tracking, releases, and developer roadmaps.',
      icon: <Kanban size={22} className="text-primary" />,
      badge: 'Recommended for Tech',
    },
    {
      id: 'crm',
      title: 'CRM & Client Pipeline',
      desc: 'Deal stages, account health, enterprise onboarding, and renewals.',
      icon: <Target size={22} style={{ color: '#10b981' }} />,
      badge: 'Sales & Revenue',
    },
    {
      id: 'content',
      title: 'Content & Marketing',
      desc: 'Editorial calendars, campaigns, asset pipelines, and PR launches.',
      icon: <Megaphone size={22} style={{ color: '#f59e0b' }} />,
      badge: 'Growth Teams',
    },
    {
      id: 'personal',
      title: 'Personal & Operations',
      desc: 'Daily task management, OKRs, habit tracking, and internal ops.',
      icon: <UserCheck size={22} style={{ color: '#a855f7' }} />,
      badge: 'Fast & Simple',
    },
  ];

  const colors = ['#3ecf8e', '#24b47e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#64748b'];

  const handleAddEmail = () => {
    if (inviteInput.trim() && inviteInput.includes('@')) {
      if (!invitedEmails.includes(inviteInput.trim())) {
        setInvitedEmails([...invitedEmails, inviteInput.trim()]);
      }
      setInviteInput('');
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setInvitedEmails(invitedEmails.filter((e) => e !== emailToRemove));
  };

  const handleFinish = () => {
    completeOnboarding({
      fullName,
      jobRole,
      avatarUrl,
      purpose,
      workspaceName,
      iconEmoji,
      brandColor,
      invitedEmails,
    });
  };

  return (
    <div className="wizard-overlay" id="onboarding-wizard-overlay">
      <div className="wizard-modal glass-panel animate-pop-in" id="onboarding-wizard-modal">
        {/* Step progress header */}
        <div className="wizard-progress-header">
          <div className="wizard-brand">
            <Sparkles size={18} className="text-primary" />
            <span>Workspace Setup Wizard</span>
          </div>
          <div className="step-tracker">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`step-bubble ${step === s ? 'active' : step > s ? 'done' : ''}`}
                id={`wizard-step-bubble-${s}`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: Profile */}
        {step === 1 && (
          <div className="wizard-body animate-fade-in" id="wizard-step-1">
            <h2 className="wizard-title">Let’s configure your profile</h2>
            <p className="wizard-desc">How would you like your teammates to recognize you?</p>

            <div className="avatar-selection-section">
              <div className="avatar-preview">
                <img src={getSafeAvatar(avatarUrl, fullName)} alt="Avatar preview" id="wizard-avatar-preview" />
              </div>
              <div className="avatar-options">
                <label className="text-xs text-muted">Choose your persona avatar</label>
                <div className="avatar-grid">
                  {sampleAvatars.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`avatar-choice ${avatarUrl === url ? 'selected' : ''}`}
                      onClick={() => setAvatarUrl(url)}
                      id={`avatar-choice-${i}`}
                    >
                      <img src={getSafeAvatar(url)} alt={`Option ${i}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="wizard-full-name">Your Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="wizard-full-name"
                  type="text"
                  className="input-field with-icon"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="wizard-job-role">Your Role / Title</label>
              <div className="input-wrapper">
                <Briefcase size={16} className="input-icon" />
                <input
                  id="wizard-job-role"
                  type="text"
                  className="input-field with-icon"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="e.g. Engineering Lead, Product Manager"
                />
              </div>
            </div>

            <div className="wizard-footer">
              <div />
              <button
                id="wizard-step1-next-btn"
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Purpose */}
        {step === 2 && (
          <div className="wizard-body animate-fade-in" id="wizard-step-2">
            <h2 className="wizard-title">What will you use HappyTF for?</h2>
            <p className="wizard-desc">We’ll customize your starter boards and column templates accordingly.</p>

            <div className="purpose-grid">
              {purposeOptions.map((opt) => (
                <div
                  key={opt.id}
                  id={`purpose-card-${opt.id}`}
                  className={`purpose-card ${purpose === opt.id ? 'selected' : ''}`}
                  onClick={() => setPurpose(opt.id)}
                >
                  <div className="purpose-header">
                    <div className="purpose-icon-box">{opt.icon}</div>
                    <span className="purpose-badge">{opt.badge}</span>
                  </div>
                  <h4 className="purpose-name">{opt.title}</h4>
                  <p className="purpose-detail">{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="wizard-footer">
              <button
                id="wizard-step2-back-btn"
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                id="wizard-step2-next-btn"
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(3)}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Workspace Setup & Invites */}
        {step === 3 && (
          <div className="wizard-body animate-fade-in" id="wizard-step-3">
            <h2 className="wizard-title">Set up your primary workspace</h2>
            <p className="wizard-desc">Name your team workspace and invite collaborators.</p>

            <div className="form-group">
              <label htmlFor="wizard-ws-name">Workspace Name</label>
              <div className="ws-name-row">
                <div className="emoji-badge" id="wizard-selected-emoji" style={{ color: brandColor }}>
                  <IconBadge nameOrEmoji={iconEmoji} size={18} color={brandColor} />
                </div>
                <input
                  id="wizard-ws-name"
                  type="text"
                  className="input-field"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder={isDeployed() ? "Workspace name" : "e.g. Acme Product Lab"}
                />
              </div>
            </div>

            {/* Icon and Color selectors */}
            <div className="styling-row">
              <div className="style-col">
                <label className="text-xs text-muted">Select Icon</label>
                <div className="icon-picker-row">
                  {AVAILABLE_ICONS.map((ic) => (
                    <button
                      key={ic.id}
                      type="button"
                      className={`icon-choice-btn ${iconEmoji === ic.id ? 'selected' : ''}`}
                      onClick={() => setIconEmoji(ic.id)}
                      id={`icon-btn-${ic.id}`}
                      title={ic.label}
                    >
                      <IconBadge nameOrEmoji={ic.id} size={14} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="style-col">
                <label className="text-xs text-muted">Brand Color</label>
                <div className="color-picker-row">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-btn ${brandColor === c ? 'selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setBrandColor(c)}
                      id={`color-btn-${c.replace('#', '')}`}
                    >
                      {brandColor === c && <Check size={12} color="#ffffff" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Teammate Invites */}
            <div className="form-group">
              <label htmlFor="wizard-invite-input">Invite Teammates (Optional)</label>
              <div className="invite-input-row">
                <input
                  id="wizard-invite-input"
                  type="email"
                  className="input-field"
                  placeholder="colleague@company.com"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <button
                  id="wizard-add-invite-btn"
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddEmail}
                >
                  <Plus size={16} />
                  <span>Add</span>
                </button>
              </div>

              {/* Email Chips */}
              {invitedEmails.length > 0 && (
                <div className="email-chips-container" id="wizard-email-chips">
                  {invitedEmails.map((email) => (
                    <div key={email} className="email-chip">
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="chip-remove-btn"
                        aria-label={`Remove ${email}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wizard-footer">
              <button
                id="wizard-step3-back-btn"
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
              >
                Back
              </button>
              <button
                id="wizard-finish-btn"
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleFinish}
              >
                <Sparkles size={16} />
                <span>Launch My Workspace</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .wizard-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 24px;
        }

        .wizard-modal {
          width: 100%;
          max-width: 580px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
        }

        .wizard-progress-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 24px;
        }

        .wizard-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-light);
        }

        .step-tracker {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .step-bubble {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          color: var(--text-muted);
          transition: all var(--transition-normal);
        }
        .step-bubble.active {
          background: var(--primary);
          border-color: var(--primary-light);
          color: #ffffff;
          box-shadow: 0 0 12px var(--primary-glow);
        }
        .step-bubble.done {
          background: var(--success);
          border-color: var(--success);
          color: #ffffff;
        }

        .wizard-title {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .wizard-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .avatar-selection-section {
          display: flex;
          align-items: center;
          gap: 20px;
          background: var(--bg-subtle);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid var(--border-subtle);
        }

        .avatar-preview img {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--primary);
        }

        .avatar-grid {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }

        .avatar-choice {
          padding: 2px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: all var(--transition-fast);
        }
        .avatar-choice.selected {
          border-color: var(--primary-light);
          transform: scale(1.08);
        }
        .avatar-choice img {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: block;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        :global(.input-icon) {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .with-icon {
          padding-left: 38px;
        }

        .purpose-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 24px;
        }

        .purpose-card {
          padding: 16px;
          border-radius: 14px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .purpose-card:hover {
          background: var(--bg-elevated);
          border-color: var(--border-highlight);
        }
        .purpose-card.selected {
          background: var(--bg-elevated);
          border-color: var(--primary);
          box-shadow: 0 0 16px var(--primary-glow);
        }

        .purpose-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .purpose-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          font-weight: 500;
        }

        .purpose-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .purpose-detail {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .ws-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .emoji-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .styling-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .style-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .icon-picker-row, .color-picker-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .icon-choice-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .icon-choice-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-highlight);
          background: var(--bg-elevated);
        }
        .icon-choice-btn.selected {
          border-color: var(--primary);
          background: rgba(62, 207, 142, 0.18);
          color: var(--primary);
        }

        .color-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast);
        }
        .color-btn.selected {
          transform: scale(1.15);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
        }

        .invite-input-row {
          display: flex;
          gap: 8px;
        }

        .email-chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }

        .email-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 20px;
          font-size: 12px;
          color: var(--text-primary);
        }

        .chip-remove-btn {
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }
        .chip-remove-btn:hover {
          color: var(--danger);
        }

        .wizard-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }
      `}</style>
    </div>
  );
};
