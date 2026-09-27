'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  validateEmail, 
  validatePassword, 
  isSpamSubmission, 
  createSubmissionThrottle 
} from '../../lib/validation';
import { 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  KeyRound,
  Github,
  X
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  defaultMode?: 'login' | 'signup' | 'magic' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { login, signup, loginWithOAuth, loginWithMagicLink } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'magic' | 'reset'>(defaultMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [honeypot, setHoneypot] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const throttleRef = useRef(createSubmissionThrottle(1500));

  if (!isOpen) return null;

  const pwdAudit = validatePassword(password);
  const strengthScore = pwdAudit.score;
  const strengthLabel = pwdAudit.label;
  const strengthColor = pwdAudit.color;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Anti-spam honeypot detection
    if (isSpamSubmission(honeypot)) {
      setStatusMessage({ type: 'success', text: 'Authentication processed.' });
      return;
    }

    // 2. Click spam / rate limit throttle
    const throttleCheck = throttleRef.current();
    if (!throttleCheck.allowed) {
      setStatusMessage({
        type: 'error',
        text: `Please wait ${Math.ceil(throttleCheck.waitTimeMs / 1000)}s before submitting again.`,
      });
      return;
    }

    // 3. Client email validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setStatusMessage({ type: 'error', text: emailCheck.error || 'Invalid email address.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (mode === 'login') {
        await login(email);
        setStatusMessage({ type: 'success', text: 'Successfully authenticated!' });
        setTimeout(() => onClose?.(), 400);
      } else if (mode === 'signup') {
        if (!fullName.trim() || fullName.trim().length < 2) {
          setStatusMessage({ type: 'error', text: 'Please enter your full name (at least 2 characters).' });
          setIsSubmitting(false);
          return;
        }
        if (!pwdAudit.isValid) {
          setStatusMessage({ type: 'error', text: pwdAudit.error || 'Password does not meet security criteria.' });
          setIsSubmitting(false);
          return;
        }
        await signup(fullName, email);
        setStatusMessage({ type: 'success', text: 'Account created! Starting onboarding...' });
        setTimeout(() => onClose?.(), 500);
      } else if (mode === 'magic') {
        await loginWithMagicLink(email);
        setStatusMessage({ 
          type: 'success', 
          text: `Magic link dispatched to ${email}! Valid for 10 minutes.` 
        });
      } else if (mode === 'reset') {
        setStatusMessage({ 
          type: 'success', 
          text: `Password reset instructions sent to ${email} (Expiring token).` 
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Authentication failed. Please check credentials.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" id="auth-modal-overlay">
      <div className="auth-card glass-panel animate-pop-in" id="auth-card">
        {onClose && (
          <button 
            id="auth-close-btn"
            className="auth-close-btn"
            onClick={onClose} 
            aria-label="Close auth dialog"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Header */}
        <div className="auth-header">
          <div className="auth-badge">
            <Sparkles size={16} className="text-primary" />
            <span>Work Operating System</span>
          </div>
          <h2 id="auth-heading">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'magic' && 'Passwordless Sign In'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="auth-subtext">
            {mode === 'login' && 'Enter your credentials to access your workspaces.'}
            {mode === 'signup' && 'Join high-velocity teams running on HappyTF.'}
            {mode === 'magic' && 'We’ll email you an instant, secure sign-in link.'}
            {mode === 'reset' && 'Enter your account email to receive a recovery token.'}
          </p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div 
            className={`auth-alert ${statusMessage.type === 'success' ? 'auth-alert-success' : 'auth-alert-error'}`}
            id="auth-status-alert"
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        {(mode === 'login' || mode === 'signup') && (
          <div className="oauth-row">
            <button
              id="oauth-google-btn"
              type="button"
              className="oauth-btn"
              onClick={() => {
                loginWithOAuth('google');
                onClose?.();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.4 1.9 7.8l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z" />
              </svg>
              <span>Google</span>
            </button>
            <button
              id="oauth-github-btn"
              type="button"
              className="oauth-btn"
              onClick={() => {
                loginWithOAuth('github');
                onClose?.();
              }}
            >
              <Github size={18} />
              <span>GitHub</span>
            </button>
          </div>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <div className="auth-divider">
            <span>or with email</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" id="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="auth-full-name">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  id="auth-full-name"
                  type="text"
                  placeholder="Your full name"
                  className="input-field with-icon"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="auth-email"
                type="email"
                placeholder="name@company.com"
                className="input-field with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="auth-password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="auth-link text-xs"
                    onClick={() => setMode('reset')}
                    id="link-forgot-password"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••••••"
                  className="input-field with-icon"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Password Strength Meter for Signup */}
              {mode === 'signup' && password.length > 0 && (
                <div className="strength-meter" id="password-strength-container">
                  <div className="strength-bar-bg">
                    <div 
                      className="strength-bar-fill" 
                      style={{ width: `${strengthScore}%`, backgroundColor: strengthColor }}
                    />
                  </div>
                  <div className="strength-labels">
                    <span className="text-xs text-muted">Strength:</span>
                    <span className="text-xs font-semibold" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Anti-spam Honeypot Trap for Automated Bots */}
          <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
            <label htmlFor="b_company_verification">Do not fill this field</label>
            <input
              id="b_company_verification"
              type="text"
              name="b_company_verification"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <div className="terms-disclaimer">
            <span>By proceeding, you agree to our </span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="legal-anchor">
              Terms of Service
            </a>
            <span> and </span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="legal-anchor">
              Privacy Policy
            </a>
            .
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={isSubmitting}
          >
            <span>
              {mode === 'login' && 'Sign In to Workspace'}
              {mode === 'signup' && 'Create Free Account'}
              {mode === 'magic' && 'Send Magic Link'}
              {mode === 'reset' && 'Send Reset Token'}
            </span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Mode switchers */}
        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button 
                type="button" 
                className="auth-link font-semibold" 
                onClick={() => setMode('signup')}
                id="switch-to-signup-btn"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button 
                type="button" 
                className="auth-link font-semibold" 
                onClick={() => setMode('login')}
                id="switch-to-login-btn"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        .auth-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 12, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 18px;
          padding: 32px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .auth-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }
        .auth-close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 9999px;
          background: var(--primary-glow);
          color: var(--primary-light);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .auth-header h2 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .auth-subtext {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .auth-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 18px;
        }
        .auth-alert-success {
          background: var(--success-bg);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--success);
        }
        .auth-alert-error {
          background: var(--danger-bg);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--danger);
        }

        .oauth-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 18px;
        }

        .oauth-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 10px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          transition: all var(--transition-fast);
        }
        .oauth-btn:hover {
          background: var(--bg-elevated);
          border-color: var(--border-highlight);
        }

        .auth-divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 18px 0;
          color: var(--text-muted);
          font-size: 12px;
        }
        .auth-divider::before, .auth-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-subtle);
        }
        .auth-divider span {
          padding: 0 10px;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .form-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .strength-meter {
          margin-top: 6px;
        }
        .strength-bar-bg {
          height: 4px;
          background: var(--border-default);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;
        }
        .strength-bar-fill {
          height: 100%;
          transition: all var(--transition-normal);
        }
        .strength-labels {
          display: flex;
          justify-content: space-between;
        }

        .remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .auth-link {
          color: var(--primary-light);
          transition: color var(--transition-fast);
        }
        .auth-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .w-full {
          width: 100%;
        }

        .terms-disclaimer {
          font-size: 11px;
          line-height: 1.45;
          color: var(--text-muted);
          text-align: center;
          margin-top: 4px;
        }

        .legal-anchor {
          color: var(--primary-light);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-anchor:hover {
          color: #ffffff;
        }

        .auth-footer {
          margin-top: 22px;
          text-align: center;
          font-size: 13px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
