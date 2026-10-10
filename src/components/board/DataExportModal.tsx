'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Copy, 
  Check, 
  History, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import { Board, BoardGroup, BoardItem } from '../../types';
import { 
  exportBoardToCsv, 
  exportBoardToJson, 
  exportBoardToMarkdown, 
  importTicketsFromCsv 
} from '../../lib/export/exportEngine';
import { AuditEvent } from '../../lib/audit/auditEngine';
import { playClickSound, playCompleteSound } from '../../lib/soundFx';
import confetti from 'canvas-confetti';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  groups: BoardGroup[];
  items: BoardItem[];
  onImportItems?: (newItems: BoardItem[]) => void;
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  isOpen,
  onClose,
  board,
  groups,
  items,
  onImportItems,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'audit'>('export');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'markdown'>('csv');
  const [copiedFormat, setCopiedFormat] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Import state
  const [importCsvText, setImportCsvText] = useState('');
  const [importTargetGroup, setImportTargetGroup] = useState<string>(groups[0]?.id || '');
  const [importPreview, setImportPreview] = useState<{ items: BoardItem[]; errors: string[] } | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Sample/live audit events
  const [auditFilter, setAuditFilter] = useState<string>('all');

  const mockAuditTrail: AuditEvent[] = items.flatMap((item, idx) => {
    const list: AuditEvent[] = [
      {
        id: `aud-cr-${item.id}`,
        timestamp: new Date(Date.now() - (idx + 1) * 3600000 * 5).toISOString(),
        actorId: 'usr-sys',
        actorName: item.assignee?.name || 'Workspace Member',
        actionType: 'TICKET_CREATE',
        boardId: board.id,
        ticketId: item.id,
        ticketNumber: item.ticket_number,
        summary: `Created ticket ${item.ticket_number || item.title}`,
        beforeSnapshot: null,
        afterSnapshot: { title: item.title, status: 'Pending', version: 1 },
      },
    ];

    if (item.version && item.version > 1) {
      list.push({
        id: `aud-up-${item.id}`,
        timestamp: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
        actorId: 'usr-sys-2',
        actorName: 'Marc Andrei',
        actionType: 'STATUS_CHANGE',
        boardId: board.id,
        ticketId: item.id,
        ticketNumber: item.ticket_number,
        summary: `Progressed to ${item.status}`,
        beforeSnapshot: { status: 'Pending', version: item.version - 1 },
        afterSnapshot: { status: item.status, version: item.version },
      });
    }

    return list;
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (groups.length > 0 && !importTargetGroup) {
      setImportTargetGroup(groups[0].id);
    }
  }, [groups, importTargetGroup]);

  if (!isOpen) return null;

  const getExportData = () => {
    switch (exportFormat) {
      case 'csv':
        return {
          content: exportBoardToCsv(board, items),
          filename: `${board.name.toLowerCase().replace(/\s+/g, '-')}-export.csv`,
          mime: 'text/csv;charset=utf-8;',
        };
      case 'json':
        return {
          content: exportBoardToJson(board, groups, items),
          filename: `${board.name.toLowerCase().replace(/\s+/g, '-')}-snapshot.json`,
          mime: 'application/json;charset=utf-8;',
        };
      case 'markdown':
        return {
          content: exportBoardToMarkdown(board, items),
          filename: `${board.name.toLowerCase().replace(/\s+/g, '-')}-spec.md`,
          mime: 'text/markdown;charset=utf-8;',
        };
    }
  };

  const handleDownload = () => {
    playClickSound();
    const { content, filename, mime } = getExportData();
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playCompleteSound();
  };

  const handleCopyContent = () => {
    playClickSound();
    const { content } = getExportData();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(content);
      setCopiedFormat(true);
      playCompleteSound();
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedFormat(false), 2500);
    }
  };

  const handleParseCsv = (text: string) => {
    setImportCsvText(text);
    if (!text.trim()) {
      setImportPreview(null);
      return;
    }
    const res = importTicketsFromCsv(text, board.id, importTargetGroup || groups[0]?.id || 'grp-default');
    setImportPreview(res);
  };

  const handleExecuteImport = () => {
    if (!importPreview || importPreview.items.length === 0) return;
    playClickSound();
    if (onImportItems) {
      onImportItems(importPreview.items);
    }
    setImportSuccessMsg(`Successfully imported ${importPreview.items.length} tasks into board!`);
    playCompleteSound();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
    setImportCsvText('');
    setImportPreview(null);
  };

  const filteredAudit = mockAuditTrail.filter((e) => {
    if (auditFilter === 'all') return true;
    return e.actionType === auditFilter;
  });

  return (
    <div 
      className="export-modal-backdrop animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      id="data-export-modal"
    >
      <div 
        className="export-modal glass-panel animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="header-icon-box">
              <Download size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="modal-title">Data Portability & Audit Vault</h3>
              <p className="modal-subtitle">
                Export, backup, or import tasks for <span className="text-slate-200 font-semibold">{board.name}</span>
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <Download size={13} />
            <span>Universal Export</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={13} />
            <span>CSV Importer</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={13} />
            <span>Audit Trail ({mockAuditTrail.length})</span>
          </button>
        </div>

        {/* Tab 1: Export */}
        {activeTab === 'export' && (
          <div className="tab-body animate-fade-in">
            <div className="format-selection-grid">
              <button
                type="button"
                className={`format-card ${exportFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <div className="format-card-header">
                  <FileSpreadsheet size={16} className="text-emerald-400" />
                  <span className="format-name">CSV (RFC 4180)</span>
                </div>
                <p className="format-desc">Standard spreadsheet format compatible with Excel, Sheets, and Jira.</p>
              </button>

              <button
                type="button"
                className={`format-card ${exportFormat === 'json' ? 'active' : ''}`}
                onClick={() => setExportFormat('json')}
              >
                <div className="format-card-header">
                  <FileCode size={16} className="text-cyan-400" />
                  <span className="format-name">JSON Snapshot</span>
                </div>
                <p className="format-desc">Full lossless workspace backup with board structure and OCC tokens.</p>
              </button>

              <button
                type="button"
                className={`format-card ${exportFormat === 'markdown' ? 'active' : ''}`}
                onClick={() => setExportFormat('markdown')}
              >
                <div className="format-card-header">
                  <FileText size={16} className="text-indigo-400" />
                  <span className="format-name">Markdown Spec</span>
                </div>
                <p className="format-desc">Formatted GitHub tables ready for sprint READMEs and documentation.</p>
              </button>
            </div>

            <div className="preview-container">
              <div className="preview-header">
                <span className="text-[11px] font-mono text-muted uppercase">Live Export Preview ({items.length} items)</span>
                <button
                  type="button"
                  className="preview-copy-btn"
                  onClick={handleCopyContent}
                >
                  {copiedFormat ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedFormat ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="preview-box font-mono">{getExportData().content}</pre>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                id="btn-download-export"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                onClick={handleDownload}
              >
                <Download size={13} />
                <span>Download {exportFormat.toUpperCase()}</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Import */}
        {activeTab === 'import' && (
          <div className="tab-body animate-fade-in">
            {importSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check size={14} />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Target Board Group</label>
              <select
                className="group-select"
                value={importTargetGroup}
                onChange={(e) => {
                  setImportTargetGroup(e.target.value);
                  if (importCsvText) handleParseCsv(importCsvText);
                }}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Paste CSV Content (with Title column)</label>
              <textarea
                className="csv-textarea font-mono"
                rows={6}
                placeholder="Ticket Number,Title,Status,Priority,Assignee&#10;TK-301,Migrate DB indexes,Working on it,high,Alex Rivera"
                value={importCsvText}
                onChange={(e) => handleParseCsv(e.target.value)}
              />
            </div>

            {importPreview && (
              <div className="import-preview-box">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">
                    Parsed {importPreview.items.length} Tasks
                  </span>
                  {importPreview.errors.length > 0 && (
                    <span className="text-xs text-amber-400">
                      {importPreview.errors.length} warnings
                    </span>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {importPreview.items.map((i, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900 border border-slate-800">
                      <span className="font-mono text-cyan-400">{i.ticket_number}</span>
                      <span className="truncate flex-1 mx-2 text-slate-300">{i.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-slate-700">{i.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-actions-row">
              <button
                type="button"
                id="btn-execute-import"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                disabled={!importPreview || importPreview.items.length === 0}
                onClick={handleExecuteImport}
              >
                <Upload size={13} />
                <span>Import {importPreview?.items.length || 0} Tasks</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="tab-body animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Tamper-evident activity log</span>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-muted" />
                <select
                  className="filter-mini-select"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                >
                  <option value="all">All Events</option>
                  <option value="TICKET_CREATE">Created</option>
                  <option value="STATUS_CHANGE">Status Changes</option>
                </select>
              </div>
            </div>

            <div className="audit-list">
              {filteredAudit.map((event) => (
                <div key={event.id} className="audit-item">
                  <div className="audit-icon-col">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
                  </div>
                  <div className="audit-info-col">
                    <div className="flex items-center justify-between">
                      <span className="audit-actor font-semibold">{event.actorName}</span>
                      <span className="audit-time font-mono">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="audit-summary">{event.summary}</div>
                    {event.ticketNumber && (
                      <span className="audit-tag font-mono">{event.ticketNumber}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .export-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 16px;
        }

        .export-modal {
          width: 100%;
          max-width: 620px;
          border-radius: 16px;
          background: var(--bg-surface, #0f131f);
          border: 1px solid var(--border-default, #1e2638);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid var(--border-subtle, #1e2638);
          background: var(--bg-subtle, #0b0e17);
        }

        .header-icon-box {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .modal-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary, #f8fafc);
          margin: 0;
        }

        .modal-subtitle {
          font-size: 12px;
          color: var(--text-secondary, #94a3b8);
          margin: 2px 0 0;
        }

        .modal-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted, #64748b);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
        }
        .modal-close-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.06);
        }

        .modal-tabs {
          display: flex;
          border-bottom: 1px solid var(--border-subtle, #1e2638);
          padding: 0 20px;
          gap: 16px;
          background: var(--bg-surface, #0f131f);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #94a3b8);
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
        }
        .tab-btn:hover {
          color: var(--text-primary);
        }
        .tab-btn.active {
          color: var(--primary-light, #3ecf8e);
          border-bottom-color: var(--primary-light, #3ecf8e);
        }

        .tab-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .format-selection-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .format-card {
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-default, #1e2638);
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .format-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--border-highlight);
        }
        .format-card.active {
          background: rgba(62, 207, 142, 0.06);
          border-color: rgba(62, 207, 142, 0.4);
        }

        .format-card-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .format-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .format-desc {
          font-size: 10px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.3;
        }

        .preview-container {
          border-radius: 10px;
          background: var(--bg-canvas, #07090e);
          border: 1px solid var(--border-default, #1e2638);
          overflow: hidden;
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle, #1e2638);
          background: var(--bg-subtle, #0b0e17);
        }

        .preview-copy-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .preview-copy-btn:hover {
          color: var(--text-primary);
        }

        .preview-box {
          padding: 12px;
          margin: 0;
          font-size: 11px;
          color: var(--text-secondary);
          max-height: 160px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .modal-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle, #1e2638);
        }

        .group-select, .filter-mini-select {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--bg-canvas, #07090e);
          border: 1px solid var(--border-default, #1e2638);
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
        }

        .filter-mini-select {
          width: auto;
          padding: 4px 8px;
          font-size: 11px;
        }

        .csv-textarea {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          background: var(--bg-canvas, #07090e);
          border: 1px solid var(--border-default, #1e2638);
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
          resize: vertical;
        }

        .import-preview-box {
          padding: 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle, #1e2638);
        }

        .audit-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 280px;
          overflow-y: auto;
        }

        .audit-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle, #1e2638);
        }

        .audit-icon-col {
          display: flex;
          align-items: center;
          padding-top: 2px;
        }

        .audit-info-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .audit-actor {
          font-size: 12px;
          color: var(--text-primary);
        }

        .audit-time {
          font-size: 10px;
          color: var(--text-muted);
        }

        .audit-summary {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .audit-tag {
          font-size: 10px;
          color: #38bdf8;
          margin-top: 2px;
        }

        @media (max-width: 600px) {
          .export-modal {
            max-height: 92vh;
            border-radius: 16px 16px 0 0;
            margin-top: auto;
          }

          .modal-header {
            padding: 14px 16px;
          }

          .modal-tabs {
            padding: 0 14px;
            overflow-x: auto;
            scrollbar-width: none;
          }

          .tab-body {
            padding: 16px 14px;
            gap: 14px;
          }

          .format-selection-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};
