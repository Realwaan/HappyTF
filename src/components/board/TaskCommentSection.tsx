'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BoardItem, ItemComment, ItemActivity, GitHubCommit, WorkspaceMember } from '../../types';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { formatRelativeTime, formatFullDateTime } from '../../lib/timeAgo';
import { 
  MessageSquare, 
  Send, 
  Bold, 
  Italic, 
  Code, 
  List, 
  CheckSquare, 
  AtSign, 
  Smile, 
  Trash2, 
  Copy, 
  Check, 
  CornerDownRight, 
  Sparkles,
  GitCommit,
  History,
  Layers,
  ChevronDown
} from 'lucide-react';

interface TaskCommentSectionProps {
  item: BoardItem;
  linkedCommits: GitHubCommit[];
}

export const TaskCommentSection: React.FC<TaskCommentSectionProps> = ({ item, linkedCommits }) => {
  const { 
    currentUser, 
    members, 
    currentWorkspace, 
    addItemComment, 
    deleteItemComment, 
    toggleCommentReaction 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'discussion' | 'all' | 'history' | 'github'>('discussion');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [activeEmojiPickerCommentId, setActiveEmojiPickerCommentId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  // Live timer tick to update relative timestamps every 30s
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Handle outside click for emoji picker & mention dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(e.target as Node)) {
        setShowMentionMenu(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-picker-popover') && !target.closest('.reaction-add-btn')) {
        setActiveEmojiPickerCommentId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Workspace team members for mention lookup
  const teamMembers: WorkspaceMember[] = members || [];

  const filteredMembers = teamMembers.filter((m: WorkspaceMember) => {
    const fullName = m.profile?.full_name || '';
    const email = m.profile?.email || '';
    return (fullName || email).toLowerCase().includes(mentionQuery.toLowerCase());
  });

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentText(val);

    // Detect @ trigger for mention menu
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1 && (lastAtPos === 0 || /\s/.test(textBeforeCursor[lastAtPos - 1]))) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      if (!query.includes(' ')) {
        setMentionQuery(query);
        setShowMentionMenu(true);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  const insertMention = (memberName: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = commentText.slice(0, cursor);
    const textAfterCursor = commentText.slice(cursor);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const newText = textBeforeCursor.slice(0, lastAtPos) + `@${memberName} ` + textAfterCursor;
      setCommentText(newText);
      setShowMentionMenu(false);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = lastAtPos + memberName.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 20);
    }
  };

  const applyFormatting = (prefix: string, suffix: string = prefix, placeholder: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = commentText.slice(start, end) || placeholder;

    const newText = commentText.slice(0, start) + prefix + selection + suffix + commentText.slice(end);
    setCommentText(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + prefix.length + selection.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 20);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmitComment();
    }
    if (e.key === 'Escape' && showMentionMenu) {
      setShowMentionMenu(false);
    }
  };

  const handleSubmitComment = () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    addItemComment(item.id, commentText.trim());
    setCommentText('');
    setShowMentionMenu(false);
    setIsSubmitting(false);
  };

  const handleCopyComment = (commId: string, content: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedCommentId(commId);
      setTimeout(() => setCopiedCommentId(null), 2000);
    }
  };

  const handleQuoteComment = (authorName: string, content: string) => {
    const quoted = `> @${authorName}: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}\n\n`;
    setCommentText((prev) => quoted + prev);
    textareaRef.current?.focus();
  };

  // Quick canned template insertion
  const insertQuickTemplate = (templateType: 'investigating' | 'repro' | 'fixed' | 'approved') => {
    const templates = {
      investigating: "🔍 **Investigation Update**: Root cause identified in request pipeline. Preparing test harness.",
      repro: "⚠️ **Reproduction Steps Needed**: Could you confirm environment OS, browser version, and console error stack trace?",
      fixed: "✅ **Fixed on Staging**: Verified fix in staging environment. Ready for QA sign-off.",
      approved: "🚀 **Approved for Deployment**: SLA requirements and acceptance checklist verified.",
    };
    setCommentText((prev) => (prev ? prev + '\n\n' + templates[templateType] : templates[templateType]));
    textareaRef.current?.focus();
  };

  // Render stylized text with bold, code, mentions, and links
  const renderCommentContent = (content: string) => {
    const lines = content.split('\n');

    return lines.map((line, lineIdx) => {
      // Handle blockquote
      if (line.startsWith('>')) {
        return (
          <div key={lineIdx} className="comment-quote-block">
            {line.replace(/^>\s*/, '')}
          </div>
        );
      }

      // Tokenize for bold, inline code, and mentions
      const parts = line.split(/(@[\w\s.-]+|\*\*[^*]+\*\*|`[^`]+`)/g);

      return (
        <p key={lineIdx} className="comment-line">
          {parts.map((part, pIdx) => {
            if (part.startsWith('@')) {
              return (
                <span key={pIdx} className="mention-pill">
                  {part}
                </span>
              );
            }
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
              return <code key={pIdx} className="inline-code">{part.slice(1, -1)}</code>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  const currentUserName = currentUser?.full_name || 'Team Member';
  const comments = item.comments || [];
  const activities = item.activities || [];

  return (
    <div className="task-comment-hub" id="task-comment-hub">
      {/* 1. Feed Segment Tabs */}
      <div className="comment-tabs-row">
        <button
          type="button"
          className={`comment-tab ${activeTab === 'discussion' ? 'active' : ''}`}
          onClick={() => setActiveTab('discussion')}
        >
          <MessageSquare size={13} />
          <span>Discussion</span>
          <span className="tab-count font-mono">{comments.length}</span>
        </button>

        <button
          type="button"
          className={`comment-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={13} />
          <span>Activity</span>
          <span className="tab-count font-mono">{activities.length}</span>
        </button>

        {linkedCommits.length > 0 && (
          <button
            type="button"
            className={`comment-tab ${activeTab === 'github' ? 'active' : ''}`}
            onClick={() => setActiveTab('github')}
          >
            <GitCommit size={13} />
            <span>GitHub</span>
            <span className="tab-count font-mono">{linkedCommits.length}</span>
          </button>
        )}

        <button
          type="button"
          className={`comment-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Layers size={13} />
          <span>All</span>
          <span className="tab-count font-mono">{comments.length + activities.length + linkedCommits.length}</span>
        </button>
      </div>

      {/* 2. Modern Rich Comment Composer */}
      <div className="composer-container glass-panel">
        {/* Formatting Toolbar */}
        <div className="composer-toolbar">
          <div className="toolbar-group">
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormatting('**', '**', 'bold text')}
              title="Bold (Cmd+B)"
            >
              <Bold size={13} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormatting('*', '*', 'italic text')}
              title="Italic (Cmd+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormatting('`', '`', 'code')}
              title="Inline Code"
            >
              <Code size={13} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormatting('• ', '', 'list item')}
              title="Bullet List"
            >
              <List size={13} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => applyFormatting('- [ ] ', '', 'task item')}
              title="Checklist"
            >
              <CheckSquare size={13} />
            </button>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => {
                setCommentText((prev) => prev + '@');
                textareaRef.current?.focus();
              }}
              title="Mention Teammate (@)"
            >
              <AtSign size={13} />
            </button>
          </div>

          {/* Quick Canned Template Accelerator */}
          <div className="template-pills flex items-center gap-1 ml-auto">
            <button
              type="button"
              className="canned-pill"
              onClick={() => insertQuickTemplate('investigating')}
              title="Insert Investigation Note"
            >
              + Investigating
            </button>
            <button
              type="button"
              className="canned-pill"
              onClick={() => insertQuickTemplate('fixed')}
              title="Insert Fixed in Staging"
            >
              + Fixed
            </button>
          </div>
        </div>

        {/* Textarea Input with @Mention Anchor */}
        <div className="textarea-wrapper relative">
          <textarea
            ref={textareaRef}
            id="task-comment-composer"
            rows={3}
            className="composer-textarea"
            placeholder="Write an update, @mention a teammate, or paste error logs..."
            value={commentText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
          />

          {/* Mention Autocomplete Dropdown */}
          {showMentionMenu && (
            <div ref={mentionMenuRef} className="mention-dropdown glass-panel animate-pop-in">
              <div className="mention-header">
                <span>Select teammate to mention:</span>
              </div>
              <div className="mention-list">
                {filteredMembers.length === 0 ? (
                  <div className="mention-empty">No matching team members</div>
                ) : (
                  filteredMembers.map((m) => {
                    const memberName = m.profile?.full_name || m.profile?.email || 'Teammate';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className="mention-option"
                        onClick={() => insertMention(memberName)}
                      >
                        <img 
                          src={getSafeAvatar(m.profile?.avatar_url, memberName)} 
                          alt={memberName} 
                          className="mention-avatar" 
                        />
                        <div className="mention-info">
                          <span className="mention-name">{memberName}</span>
                          <span className="mention-role font-mono text-[10px]">{m.role}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Composer Bottom Bar */}
        <div className="composer-footer">
          <div className="composer-hint">
            <span className="kbd-shortcut font-mono">⌘ + Enter</span>
            <span>to post</span>
          </div>

          <button
            id="task-comment-post-btn"
            type="button"
            className="btn btn-primary btn-sm composer-submit"
            onClick={handleSubmitComment}
            disabled={!commentText.trim() || isSubmitting}
          >
            <Send size={13} />
            <span>Send Update</span>
          </button>
        </div>
      </div>

      {/* 3. Feed List (Discussion / Activity / GitHub) */}
      <div className="comment-feed-list" id="comment-feed-list">
        {/* DISCUSSION TAB OR ALL TAB */}
        {(activeTab === 'discussion' || activeTab === 'all') && (
          <>
            {comments.length === 0 && activeTab === 'discussion' && (
              <div className="empty-discussion-state">
                <div className="empty-icon-circle">
                  <MessageSquare size={20} className="text-primary" />
                </div>
                <h4>Start the Conversation</h4>
                <p>Collaborate in real time. Tag team members with <strong>@</strong>, post reproduction notes, or paste terminal outputs.</p>
              </div>
            )}

            {comments.map((comm) => {
              const isCurrentUser = currentUser && (
                comm.author_name.toLowerCase() === currentUserName.toLowerCase() ||
                (currentUser.avatar_url && comm.author_avatar === currentUser.avatar_url)
              );
              const isAssignee = item.assignee && comm.author_name.toLowerCase() === item.assignee.name.toLowerCase();

              return (
                <div key={comm.id} className="rich-comment-card glass-panel" id={`comment-${comm.id}`}>
                  {/* Card Header */}
                  <div className="comment-card-header">
                    <img 
                      src={getSafeAvatar(comm.author_avatar, comm.author_name)} 
                      alt={comm.author_name} 
                      className="author-avatar"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getSafeAvatar(null, comm.author_name);
                      }}
                    />

                    <div className="author-meta">
                      <span className="author-title">{comm.author_name}</span>
                      {isCurrentUser && <span className="you-badge font-mono">You</span>}
                      {isAssignee && <span className="assignee-badge font-mono">Assignee</span>}
                      <span 
                        className="comment-timestamp font-mono" 
                        title={formatFullDateTime(comm.created_at || comm.timestamp, comm.id)}
                      >
                        {formatRelativeTime(comm.created_at || comm.timestamp, comm.id)}
                      </span>
                    </div>

                    {/* Action Bar (Copy / Quote / Delete) */}
                    <div className="comment-actions-bar">
                      <button
                        type="button"
                        className="comment-action-btn"
                        onClick={() => handleCopyComment(comm.id, comm.content)}
                        title="Copy comment text"
                      >
                        {copiedCommentId === comm.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>

                      <button
                        type="button"
                        className="comment-action-btn"
                        onClick={() => handleQuoteComment(comm.author_name, comm.content)}
                        title="Quote reply"
                      >
                        <CornerDownRight size={12} />
                      </button>

                      {(isCurrentUser || currentUser?.job_role?.toLowerCase().includes('lead') || currentUser?.job_role?.toLowerCase().includes('admin')) && (
                        <button
                          type="button"
                          className="comment-action-btn delete-btn"
                          onClick={() => deleteItemComment(item.id, comm.id)}
                          title="Delete comment"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="comment-card-body">
                    {renderCommentContent(comm.content)}
                  </div>

                  {/* Emoji Reactions Tray */}
                  <div className="reactions-tray">
                    {comm.reactions.map((r) => {
                      const userReacted = r.users.includes(currentUserName);
                      const userListStr = r.users.join(', ');

                      return (
                        <button
                          key={r.emoji}
                          type="button"
                          className={`reaction-pill ${userReacted ? 'active' : ''}`}
                          onClick={() => toggleCommentReaction(item.id, comm.id, r.emoji)}
                          title={`${userListStr} reacted with ${r.emoji}`}
                        >
                          <span className="emoji-char">{r.emoji}</span>
                          <span className="reaction-count font-mono">{r.count}</span>
                        </button>
                      );
                    })}

                    {/* Fast Reaction Palette */}
                    <div className="fast-emojis">
                      {['👍', '❤️', '🚀', '👀', '🎉', '🔥'].map((em) => (
                        <button
                          key={em}
                          type="button"
                          className="fast-emoji-btn"
                          onClick={() => toggleCommentReaction(item.id, comm.id, em)}
                          title={`React with ${em}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* GITHUB COMMITS (SHOWN ON GITHUB TAB OR ALL TAB) */}
        {(activeTab === 'github' || activeTab === 'all') && linkedCommits.length > 0 && (
          <div className="github-feed-block">
            <h5 className="feed-subheading">Linked GitHub Commits</h5>
            {linkedCommits.map((commit) => (
              <div key={commit.id} className="github-commit-card glass-panel">
                <div className="commit-header">
                  <span className="commit-sha font-mono">
                    <GitCommit size={13} className="text-emerald-400" />
                    {commit.id}
                  </span>
                  <span 
                    className="commit-timestamp font-mono text-[10px]" 
                    title={formatFullDateTime(commit.timestamp, commit.id)}
                  >
                    {formatRelativeTime(commit.timestamp, commit.id)}
                  </span>
                </div>
                <p className="commit-msg">{commit.message}</p>
                <div className="commit-footer font-mono">
                  <span>by {commit.author.name} on {commit.branch}</span>
                  <a href={commit.url} target="_blank" rel="noreferrer" className="commit-link">
                    View on GitHub &rarr;
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AUDIT TIMELINE (SHOWN ON HISTORY TAB OR ALL TAB) */}
        {(activeTab === 'history' || activeTab === 'all') && activities.length > 0 && (
          <div className="audit-timeline-block">
            <h5 className="feed-subheading">Audit Trail & History</h5>
            <div className="audit-timeline">
              {activities.map((act) => (
                <div key={act.id} className="audit-item">
                  <div className="audit-dot" />
                  <div className="audit-content">
                    <span className="audit-author font-semibold">{act.author_name}</span>
                    <span className="audit-action">{act.action}</span>
                    <span 
                      className="audit-time font-mono" 
                      title={formatFullDateTime(act.created_at || act.timestamp, act.id)}
                    >
                      {formatRelativeTime(act.created_at || act.timestamp, act.id)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .task-comment-hub {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* 1. Feed Segment Tabs */
        .comment-tabs-row {
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
          padding-bottom: 8px;
        }

        .comment-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary, #94a3b8);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .comment-tab:hover {
          color: var(--text-primary, #f8fafc);
          background: rgba(255, 255, 255, 0.04);
        }

        .comment-tab.active {
          color: #3ecf8e;
          background: rgba(62, 207, 142, 0.1);
          border-color: rgba(62, 207, 142, 0.25);
        }

        .tab-count {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-muted, #64748b);
        }

        .comment-tab.active .tab-count {
          background: rgba(62, 207, 142, 0.2);
          color: #3ecf8e;
        }

        /* 2. Composer */
        .composer-container {
          background: var(--bg-surface, #1e222d);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
          transition: border-color 0.15s ease;
        }

        .composer-container:focus-within {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
        }

        .composer-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.06));
          background: rgba(0, 0, 0, 0.15);
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .toolbar-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          color: var(--text-muted, #94a3b8);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .toolbar-btn:hover {
          color: var(--text-primary, #f8fafc);
          background: rgba(255, 255, 255, 0.08);
        }

        .canned-pill {
          font-size: 11px;
          font-family: inherit;
          padding: 3px 8px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.1);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.2);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .canned-pill:hover {
          background: rgba(99, 102, 241, 0.2);
          color: #fff;
        }

        .textarea-wrapper {
          padding: 10px 12px 6px;
        }

        .composer-textarea {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary, #f8fafc);
          font-size: 13px;
          line-height: 1.5;
          resize: vertical;
          min-height: 56px;
        }

        .composer-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.1);
          border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.04));
        }

        .composer-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted, #64748b);
        }

        .kbd-shortcut {
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 10px;
        }

        /* Mention dropdown */
        .mention-dropdown {
          position: absolute;
          bottom: calc(100% + 4px);
          left: 12px;
          width: 240px;
          background: var(--bg-surface, #1e222d);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
          border-radius: 10px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
          z-index: 100;
          overflow: hidden;
        }

        .mention-header {
          padding: 6px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted, #94a3b8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .mention-list {
          max-height: 160px;
          overflow-y: auto;
        }

        .mention-option {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: transparent;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .mention-option:hover {
          background: rgba(99, 102, 241, 0.15);
        }

        .mention-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          object-cover: cover;
        }

        .mention-info {
          display: flex;
          flex-direction: column;
        }

        .mention-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-primary, #f8fafc);
        }

        .mention-role {
          color: var(--text-muted, #94a3b8);
        }

        .mention-empty {
          padding: 10px;
          font-size: 11px;
          color: var(--text-muted, #64748b);
          text-align: center;
        }

        /* 3. Comment Cards */
        .comment-feed-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rich-comment-card {
          background: var(--bg-surface, #1e222d);
          border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.07));
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.15s ease;
        }

        .rich-comment-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
        }

        .comment-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .author-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .author-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          flex: 1;
        }

        .author-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary, #f8fafc);
        }

        .you-badge {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(62, 207, 142, 0.15);
          color: #3ecf8e;
          border: 1px solid rgba(62, 207, 142, 0.3);
        }

        .assignee-badge {
          font-size: 10px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .comment-timestamp {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          margin-left: auto;
          cursor: default;
        }

        .comment-actions-bar {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .rich-comment-card:hover .comment-actions-bar {
          opacity: 1;
        }

        .comment-action-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: transparent;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .comment-action-btn:hover {
          color: var(--text-primary, #f8fafc);
          background: rgba(255, 255, 255, 0.08);
        }

        .comment-action-btn.delete-btn:hover {
          color: #f87171;
          background: rgba(239, 68, 68, 0.15);
        }

        .comment-card-body {
          font-size: 13px;
          color: var(--text-secondary, #cbd5e1);
          line-height: 1.55;
          word-break: break-word;
        }

        .comment-line {
          margin: 0 0 4px;
        }

        .comment-line:last-child {
          margin-bottom: 0;
        }

        .comment-quote-block {
          padding: 6px 10px;
          border-left: 3px solid #6366f1;
          background: rgba(99, 102, 241, 0.08);
          border-radius: 0 6px 6px 0;
          font-size: 12px;
          color: #c7d2fe;
          margin-bottom: 6px;
        }

        .mention-pill {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(62, 207, 142, 0.15);
          color: #3ecf8e;
          font-weight: 500;
          font-size: 12px;
          margin: 0 2px;
          border: 1px solid rgba(62, 207, 142, 0.3);
        }

        .inline-code {
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px;
          color: #f1f5f9;
        }

        /* Reactions Tray */
        .reactions-tray {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .reaction-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          color: var(--text-primary, #f8fafc);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .reaction-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .reaction-pill.active {
          background: rgba(62, 207, 142, 0.15);
          border-color: rgba(62, 207, 142, 0.4);
          color: #3ecf8e;
        }

        .fast-emojis {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0.6;
          transition: opacity 0.15s ease;
        }

        .rich-comment-card:hover .fast-emojis {
          opacity: 1;
        }

        .fast-emoji-btn {
          font-size: 12px;
          padding: 2px 4px;
          border-radius: 4px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .fast-emoji-btn:hover {
          transform: scale(1.25);
          background: rgba(255, 255, 255, 0.08);
        }

        /* Empty state */
        .empty-discussion-state {
          padding: 32px 16px;
          text-align: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-subtle, rgba(255, 255, 255, 0.08));
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .empty-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(62, 207, 142, 0.12);
          border: 1px solid rgba(62, 207, 142, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-discussion-state h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #f8fafc);
          margin: 0;
        }

        .empty-discussion-state p {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          max-width: 380px;
          margin: 0;
          line-height: 1.5;
        }

        /* GitHub Commit block */
        .github-feed-block, .audit-timeline-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .feed-subheading {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted, #94a3b8);
          margin: 0 0 2px;
        }

        .github-commit-card {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.04);
          border: 1px solid rgba(16, 185, 129, 0.18);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .commit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .commit-sha {
          font-size: 12px;
          font-weight: 600;
          color: #3ecf8e;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .commit-timestamp {
          color: var(--text-muted, #94a3b8);
        }

        .commit-msg {
          font-size: 12px;
          color: var(--text-secondary, #cbd5e1);
          margin: 0;
        }

        .commit-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          padding-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .commit-link {
          color: #3ecf8e;
          text-decoration: none;
        }

        .commit-link:hover {
          text-decoration: underline;
        }

        /* Audit Timeline */
        .audit-timeline {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-left: 2px solid rgba(255, 255, 255, 0.08);
          margin-left: 8px;
          padding-left: 14px;
        }

        .audit-item {
          display: flex;
          align-items: flex-start;
          position: relative;
        }

        .audit-dot {
          position: absolute;
          left: -19px;
          top: 4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6366f1;
          box-shadow: 0 0 6px rgba(99, 102, 241, 0.6);
        }

        .audit-content {
          display: flex;
          align-items: baseline;
          gap: 6px;
          flex-wrap: wrap;
          font-size: 12px;
        }

        .audit-author {
          font-weight: 600;
          color: var(--text-primary, #f8fafc);
        }

        .audit-action {
          color: var(--text-secondary, #94a3b8);
        }

        .audit-time {
          color: var(--text-muted, #64748b);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
};
