'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { compileWorkspaceMemory, MemoryDocument } from '../../lib/workspaceMemory';
import { 
  Database, 
  X, 
  User, 
  Layers, 
  Users, 
  Sliders, 
  Copy, 
  Check, 
  FileCode2,
  ShieldCheck
} from 'lucide-react';

interface WorkspaceContextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceContextModal: React.FC<WorkspaceContextModalProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace, currentUser, recentBoards, allWorkspaceItems, members, theme } = useApp();
  const [activeTab, setActiveTab] = useState<'profile' | 'areas' | 'people' | 'preferences'>('profile');
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const memory = compileWorkspaceMemory(
    currentWorkspace,
    currentUser,
    recentBoards,
    allWorkspaceItems,
    members,
    theme
  );

  const getCurrentDoc = (): MemoryDocument => {
    switch (activeTab) {
      case 'profile':
        return memory.profile;
      case 'areas':
        return memory.areas[selectedAreaIndex] || memory.areas[0] || memory.profile;
      case 'people':
        return memory.people[selectedPersonIndex] || memory.people[0] || memory.profile;
      case 'preferences':
        return memory.preferences;
    }
  };

  const currentDoc = getCurrentDoc();

  const handleCopyMarkdown = () => {
    const markdown = [
      `---`,
      `name: ${currentDoc.name}`,
      `description: ${currentDoc.description}`,
      `sources: [${currentDoc.sources.join(', ')}]`,
      currentDoc.aliases ? `aliases: [${currentDoc.aliases.join(', ')}]` : null,
      `---`,
      ``,
      ...currentDoc.content,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = () => {
    const allDocs = [
      memory.profile,
      ...memory.areas,
      ...memory.people,
      memory.preferences
    ];
    const fullText = allDocs.map((doc) => [
      `=== FILE: ${doc.path} ===`,
      `---`,
      `name: ${doc.name}`,
      `description: ${doc.description}`,
      `sources: [${doc.sources.join(', ')}]`,
      doc.aliases ? `aliases: [${doc.aliases.join(', ')}]` : null,
      `---`,
      ``,
      ...doc.content,
      ``,
    ].filter(Boolean).join('\n')).join('\n\n');

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="memory-modal-overlay" onClick={onClose}>
      <div 
        className="memory-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="memory-header">
          <div className="memory-title-box">
            <div className="memory-icon-badge">
              <Database size={18} />
            </div>
            <div>
              <h2 id="context-modal-title" className="memory-title">
                Workspace Memory Taxonomy
                <span className="grounded-badge">Grounded State</span>
              </h2>
              <p className="memory-subtitle">
                Hierarchical context structure for agentic reasoning and workspace observability
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="close-button"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User size={14} />
            <span>/profile.md</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('areas')}
            className={`tab-btn ${activeTab === 'areas' ? 'active' : ''}`}
          >
            <Layers size={14} />
            <span>/areas/ ({memory.areas.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`tab-btn ${activeTab === 'people' ? 'active' : ''}`}
          >
            <Users size={14} />
            <span>/people/ ({memory.people.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          >
            <Sliders size={14} />
            <span>/preferences.md</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="memory-body">
          {/* Sub-selector for multi-file folders */}
          {activeTab === 'areas' && memory.areas.length > 1 && (
            <div className="sub-file-selector">
              {memory.areas.map((a, idx) => (
                <button
                  key={a.path}
                  onClick={() => setSelectedAreaIndex(idx)}
                  className={`sub-pill ${selectedAreaIndex === idx ? 'active' : ''}`}
                >
                  {a.name}.md
                </button>
              ))}
            </div>
          )}

          {activeTab === 'people' && memory.people.length > 1 && (
            <div className="sub-file-selector">
              {memory.people.map((p, idx) => (
                <button
                  key={p.path}
                  onClick={() => setSelectedPersonIndex(idx)}
                  className={`sub-pill ${selectedPersonIndex === idx ? 'active' : ''}`}
                >
                  {p.name}.md
                </button>
              ))}
            </div>
          )}

          {/* Frontmatter & File details */}
          <div className="file-preview-card">
            <div className="file-header">
              <div className="file-path">
                <FileCode2 size={14} />
                <span>{currentDoc.path}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="copy-btn"
              >
                {copied ? <Check size={12} className="copy-check" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy File'}</span>
              </button>
            </div>

            <p className="file-desc">
              <strong>Description:</strong> {currentDoc.description}
            </p>

            {/* Markdown content preview */}
            <div className="markdown-code-block">
              <div className="code-dim">---</div>
              <div><span className="code-key">name:</span> {currentDoc.name}</div>
              <div><span className="code-key">description:</span> {currentDoc.description}</div>
              <div><span className="code-key">sources:</span> [{currentDoc.sources.join(', ')}]</div>
              {currentDoc.aliases && (
                <div><span className="code-key">aliases:</span> [{currentDoc.aliases.join(', ')}]</div>
              )}
              <div className="code-dim">---</div>
              <div className="code-body-lines">
                {currentDoc.content.map((line, i) => (
                  <div key={i} className={line.startsWith('#') ? 'code-heading' : 'code-line'}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grounded-notice">
            <ShieldCheck size={16} className="notice-icon" />
            <span>
              This structured memory partition eliminates AI hallucinations by organizing work data into durable, bounded Markdown slices.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="memory-footer">
          <span className="engine-version">
            HappyTF Grounded Workspace Memory Engine v1.0
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleCopyAll}
              className="copy-all-btn"
            >
              {copiedAll ? <Check size={13} className="copy-check" /> : <Copy size={13} />}
              <span>{copiedAll ? 'All Files Copied!' : 'Copy Full Context'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="footer-close-btn"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .memory-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.15s ease-out;
        }

        .memory-modal-card {
          width: 100%;
          max-width: 760px;
          max-height: 85vh;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--text-primary);
          animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .memory-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-subtle);
        }

        .memory-title-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .memory-icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          color: var(--primary);
        }

        .memory-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .grounded-badge {
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 2px 7px;
          border-radius: var(--radius-full);
          background: rgba(62, 207, 142, 0.12);
          color: var(--primary);
          border: 1px solid rgba(62, 207, 142, 0.3);
        }

        .memory-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          margin: 2px 0 0 0;
        }

        .close-button {
          padding: 6px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color var(--transition-fast), background var(--transition-fast);
        }

        .close-button:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .tab-bar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 16px;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-subtle);
          overflow-x: auto;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px;
          font-size: 12px;
          font-family: var(--font-mono);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: var(--text-primary);
        }

        .tab-btn.active {
          color: var(--primary);
          border-bottom-color: var(--primary);
          font-weight: 600;
        }

        .memory-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sub-file-selector {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .sub-pill {
          padding: 4px 10px;
          font-size: 11px;
          font-family: var(--font-mono);
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sub-pill:hover {
          color: var(--text-primary);
          border-color: var(--border-default);
        }

        .sub-pill.active {
          background: rgba(62, 207, 142, 0.15);
          border-color: rgba(62, 207, 142, 0.4);
          color: var(--primary);
          font-weight: 600;
        }

        .file-preview-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .file-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .file-path {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--primary);
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          font-size: 11px;
          border-radius: var(--radius-sm);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .copy-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .copy-check {
          color: var(--primary);
        }

        .file-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.4;
        }

        .file-desc strong {
          color: var(--text-muted);
        }

        .markdown-code-block {
          background: var(--bg-canvas);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.6;
          overflow-x: auto;
        }

        .code-dim {
          color: var(--text-muted);
          opacity: 0.6;
        }

        .code-key {
          color: var(--primary);
          opacity: 0.85;
        }

        .code-body-lines {
          padding-top: 6px;
        }

        .code-heading {
          color: var(--text-primary);
          font-weight: 700;
          padding-top: 4px;
        }

        .code-line {
          color: var(--text-secondary);
        }

        .grounded-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: rgba(62, 207, 142, 0.08);
          border: 1px solid rgba(62, 207, 142, 0.2);
          font-size: 11px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .notice-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .memory-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: var(--bg-subtle);
          border-top: 1px solid var(--border-subtle);
        }

        .engine-version {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .copy-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 11px;
          font-family: var(--font-mono);
          border-radius: var(--radius-sm);
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.3);
          color: var(--primary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .copy-all-btn:hover {
          background: rgba(62, 207, 142, 0.2);
          border-color: rgba(62, 207, 142, 0.5);
        }

        .footer-close-btn {
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          border-radius: var(--radius-sm);
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .footer-close-btn:hover {
          background: var(--bg-hover);
        }
      `}</style>
    </div>
  );
};
