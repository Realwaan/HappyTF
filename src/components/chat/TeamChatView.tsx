'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTeamChat } from '../../context/TeamChatContext';
import { useApp } from '../../context/AppContext';
import { 
  Hash, 
  Send, 
  Smile, 
  MessageSquare, 
  Plus, 
  X, 
  Search, 
  Lock, 
  Users, 
  Bot, 
  Sparkles,
  Ticket,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { ChannelMessage, TeamChannel } from '../../types';
import { getSafeAvatar } from '../../lib/avatarHelper';
import { playClickSound } from '../../lib/soundFx';

const QUICK_EMOJIS = ['🚀', '🎉', '👍', '❤️', '👀', '🔥'];

export const TeamChatView: React.FC = () => {
  const {
    channels,
    activeChannelId,
    activeChannel,
    messages,
    activeThreadMessage,
    threadMessages,
    typingUsers,
    broadcastTyping,
    sendMessage,
    createChannel,
    toggleReaction,
    openThread,
    closeThread,
    setActiveChannelId,
  } = useTeamChat();

  const { boardItems, openItemDetail, currentUser } = useApp();

  const [messageInput, setMessageInput] = useState('');
  const [threadInput, setThreadInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChanName, setNewChanName] = useState('');
  const [newChanTopic, setNewChanTopic] = useState('');
  const [newChanPrivate, setNewChanPrivate] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    // Detect if message references a ticket e.g. #TK-123 or TK-123
    const ticketMatch = messageInput.match(/#?TK-\d+/i);
    const linkedTicket = ticketMatch ? ticketMatch[0].replace('#', '').toUpperCase() : null;

    const content = messageInput;
    setMessageInput('');
    await sendMessage(content, null, linkedTicket);
  };

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadInput.trim() || !activeThreadMessage) return;

    const content = threadInput;
    setThreadInput('');
    await sendMessage(content, activeThreadMessage.id);
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;
    await createChannel(newChanName, newChanTopic, newChanPrivate);
    setNewChanName('');
    setNewChanTopic('');
    setNewChanPrivate(false);
    setIsCreateChannelOpen(false);
  };

  // Find board item if message links to a ticket
  const findLinkedTicket = (ticketNum?: string | null) => {
    if (!ticketNum) return null;
    const cleanNum = ticketNum.replace('#', '').toUpperCase();
    return boardItems.find((item) => {
      const itemNum = (item.ticket_number || `#TK-${item.id.replace('item-', '').padStart(3, '0')}`).replace('#', '').toUpperCase();
      return itemNum === cleanNum || item.id === cleanNum;
    });
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.content.toLowerCase().includes(q) ||
      m.user_name.toLowerCase().includes(q) ||
      (m.linked_ticket_number && m.linked_ticket_number.toLowerCase().includes(q))
    );
  });

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="team-chat-root animate-fade-in" id="team-chat-view">
      {/* 1. Header Bar */}
      <div className="chat-header glass-panel">
        <div className="header-left">
          <div className="channel-title-wrap">
            <span className="channel-hash">
              {activeChannel?.is_private ? <Lock size={16} /> : <Hash size={18} />}
            </span>
            <h2 className="channel-title">{activeChannel?.name || 'select-channel'}</h2>
            <span className="member-pill font-mono">
              <Users size={12} />
              <span>{activeChannel?.member_count || 3} members</span>
            </span>
          </div>
          {activeChannel?.topic && (
            <p className="channel-topic truncate">{activeChannel.topic}</p>
          )}
        </div>

        <div className="header-right">
          <div className="chat-search-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search messages or #TK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="chat-search-input"
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={() => setIsCreateChannelOpen(true)}
            title="Create new team channel"
          >
            <Plus size={14} />
            <span>New Channel</span>
          </button>
        </div>
      </div>

      {/* 2. Main Chat Canvas & Thread Split View */}
      <div className="chat-body-split">
        {/* Messages Stream Column */}
        <div className="chat-stream-column">
          <div className="messages-scroll-area">
            {/* Channel Intro Banner */}
            <div className="channel-welcome-banner">
              <div className="welcome-hash-circle">
                <Hash size={24} />
              </div>
              <h3 className="welcome-title">Welcome to #{activeChannel?.name}!</h3>
              <p className="welcome-desc">
                This is the start of the #{activeChannel?.name} channel. Send messages, link tickets with #TK-xxxx, and coordinate work in real time.
              </p>
            </div>

            {/* Message List */}
            {filteredMessages.map((msg) => {
              const linkedTicket = findLinkedTicket(msg.linked_ticket_number);
              const isCurrentUser = msg.user_id === currentUser?.id;

              return (
                <div 
                  key={msg.id} 
                  className={`chat-message-row ${msg.is_system ? 'system-msg' : ''}`}
                  id={`msg-row-${msg.id}`}
                >
                  <img
                    src={getSafeAvatar(msg.user_avatar, msg.user_name)}
                    alt={msg.user_name}
                    className="msg-avatar"
                  />

                  <div className="msg-content-block">
                    <div className="msg-header">
                      <span className="msg-user-name">
                        {msg.user_name}
                        {msg.is_system && (
                          <span className="bot-pill font-mono">
                            <Bot size={10} /> BOT
                          </span>
                        )}
                      </span>
                      <span className="msg-time font-mono">{formatMessageTime(msg.created_at)}</span>
                    </div>

                    <div className="msg-text">
                      {msg.content}
                    </div>

                    {/* Linked Ticket Interactive Card */}
                    {msg.linked_ticket_number && (
                      <div className="linked-ticket-card">
                        <div className="ticket-card-left">
                          <Ticket size={13} className="text-emerald-400" />
                          <span className="ticket-card-key font-mono">{msg.linked_ticket_number}</span>
                          <span className="ticket-card-title truncate">
                            {linkedTicket?.title || 'Referenced Sprint Ticket'}
                          </span>
                        </div>
                        {linkedTicket && (
                          <button
                            type="button"
                            className="view-ticket-btn"
                            onClick={() => {
                              playClickSound();
                              openItemDetail(linkedTicket);
                            }}
                          >
                            <span>Inspect</span>
                            <ChevronRight size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Emoji Reactions Bar */}
                    <div className="msg-footer-bar">
                      <div className="reactions-wrap">
                        {msg.reactions?.map((r) => {
                          const userReacted = r.users.includes(currentUser?.full_name || '');
                          return (
                            <button
                              key={r.emoji}
                              type="button"
                              className={`reaction-chip ${userReacted ? 'active' : ''}`}
                              onClick={() => toggleReaction(msg.id, r.emoji)}
                              title={`${r.users.join(', ')} reacted with ${r.emoji}`}
                            >
                              <span>{r.emoji}</span>
                              <span className="reaction-count font-mono">{r.count}</span>
                            </button>
                          );
                        })}

                        {/* Quick Reaction Adder Dropdown */}
                        <div className="quick-emoji-row">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="quick-emoji-btn"
                              onClick={() => toggleReaction(msg.id, emoji)}
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reply in Thread Button */}
                      <button
                        type="button"
                        className={`thread-reply-btn ${activeThreadMessage?.id === msg.id ? 'active' : ''}`}
                        onClick={() => openThread(msg)}
                      >
                        <MessageSquare size={13} />
                        <span>
                          {msg.reply_count && msg.reply_count > 0
                            ? `${msg.reply_count} ${msg.reply_count === 1 ? 'reply' : 'replies'}`
                            : 'Reply'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Live Collaborator Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="chat-typing-indicator animate-fade-in" id="chat-typing-indicator">
              <div className="typing-dots">
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="typing-label">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}

          {/* Message Input Box */}
          <form className="chat-input-bar glass-panel" onSubmit={handleSendMessage}>
            <div className="input-toolbar-top">
              <span className="input-hint font-mono">
                Tip: Type <strong>#TK-xxxx</strong> to auto-link a ticket
              </span>
            </div>
            <div className="input-row">
              <input
                type="text"
                id="channel-message-input"
                className="message-input-field"
                placeholder={`Message #${activeChannel?.name || 'channel'}... (Press Enter)`}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  broadcastTyping();
                }}
              />
              <button
                type="submit"
                id="send-channel-msg-btn"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
                disabled={!messageInput.trim()}
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>

        {/* 3. Side Thread Drawer (when open) */}
        {activeThreadMessage && (
          <div className="chat-thread-drawer glass-panel animate-pop-in">
            <div className="thread-drawer-header">
              <div className="thread-header-title">
                <MessageSquare size={15} className="text-primary" />
                <h3>Thread</h3>
                <span className="thread-channel-badge font-mono">#{activeChannel?.name}</span>
              </div>
              <button type="button" className="close-thread-btn" onClick={closeThread}>
                <X size={16} />
              </button>
            </div>

            <div className="thread-drawer-scroll">
              {/* Parent Message Card */}
              <div className="thread-parent-card">
                <div className="msg-header">
                  <img
                    src={getSafeAvatar(activeThreadMessage.user_avatar, activeThreadMessage.user_name)}
                    alt={activeThreadMessage.user_name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="msg-user-name">{activeThreadMessage.user_name}</span>
                  <span className="msg-time font-mono">{formatMessageTime(activeThreadMessage.created_at)}</span>
                </div>
                <div className="thread-parent-text">{activeThreadMessage.content}</div>
              </div>

              <div className="thread-replies-divider font-mono">
                <span>{threadMessages.length} {threadMessages.length === 1 ? 'REPLY' : 'REPLIES'}</span>
              </div>

              {/* Thread Replies List */}
              {threadMessages.map((reply) => (
                <div key={reply.id} className="thread-reply-row">
                  <img
                    src={getSafeAvatar(reply.user_avatar, reply.user_name)}
                    alt={reply.user_name}
                    className="reply-avatar"
                  />
                  <div className="reply-content">
                    <div className="msg-header">
                      <span className="msg-user-name">{reply.user_name}</span>
                      <span className="msg-time font-mono">{formatMessageTime(reply.created_at)}</span>
                    </div>
                    <div className="reply-text">{reply.content}</div>
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            {/* Thread Input Bar */}
            <form className="thread-input-bar" onSubmit={handleSendThreadReply}>
              <input
                type="text"
                className="thread-input-field"
                placeholder="Reply in thread..."
                value={threadInput}
                onChange={(e) => setThreadInput(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!threadInput.trim()}
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. Create Channel Modal */}
      {isCreateChannelOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateChannelOpen(false)}>
          <div className="modal-card glass-panel animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Hash size={18} className="text-primary" />
                <h3>Create Team Channel</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateChannelOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateChannelSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Channel Name</label>
                <div className="channel-input-prefix">
                  <span className="prefix-hash">#</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. mobile-sprint-25"
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="form-input with-prefix"
                  />
                </div>
                <span className="form-help">Lowercase letters, numbers, and hyphens only.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Topic / Purpose (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly mobile engineering check-in"
                  value={newChanTopic}
                  onChange={(e) => setNewChanTopic(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newChanPrivate}
                    onChange={(e) => setNewChanPrivate(e.target.checked)}
                  />
                  <span>Make channel private</span>
                </label>
                <span className="form-help">Only invited members can view private channels.</span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCreateChannelOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                  disabled={!newChanName.trim()}
                >
                  <Plus size={14} />
                  <span>Create Channel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .team-chat-root {
          display: flex;
          flex-direction: column;
          height: calc(100vh - var(--topbar-height, 60px));
          background: var(--bg-canvas);
          color: var(--text-primary);
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border-default);
          background: var(--bg-surface);
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .channel-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .channel-hash {
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .channel-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .member-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-elevated);
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
        }

        .channel-topic {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
          max-width: 500px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
        }

        .chat-search-input {
          padding: 6px 28px 6px 30px;
          font-size: 12px;
          border-radius: 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          outline: none;
          width: 200px;
          transition: width var(--transition-fast), border-color var(--transition-fast);
        }
        .chat-search-input:focus {
          width: 260px;
          border-color: var(--primary);
        }

        .clear-search-btn {
          position: absolute;
          right: 8px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .chat-body-split {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .chat-stream-column {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          height: 100%;
        }

        .messages-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .channel-welcome-banner {
          padding: 32px 20px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-subtle);
          margin-bottom: 12px;
        }

        .welcome-hash-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--primary-glow);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .welcome-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0 0 6px;
        }

        .welcome-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .chat-message-row {
          display: flex;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 10px;
          transition: background var(--transition-fast);
        }
        .chat-message-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .chat-message-row.system-msg {
          background: rgba(88, 101, 242, 0.06);
          border-left: 3px solid #5865F2;
        }

        .msg-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 1.5px solid var(--border-subtle);
        }

        .msg-content-block {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .msg-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .msg-user-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .bot-pill {
          font-size: 9px;
          font-weight: 700;
          background: #5865F2;
          color: white;
          padding: 1px 5px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .msg-time {
          font-size: 11px;
          color: var(--text-muted);
        }

        .msg-text {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
          word-break: break-word;
        }

        .linked-ticket-card {
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          border-radius: 8px;
          background: rgba(62, 207, 142, 0.08);
          border: 1px solid rgba(62, 207, 142, 0.25);
          max-width: 440px;
        }

        .ticket-card-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .ticket-card-key {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary);
        }

        .ticket-card-title {
          font-size: 12px;
          color: var(--text-primary);
        }

        .view-ticket-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--primary);
          background: transparent;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
        }

        .msg-footer-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .reactions-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .reaction-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 9999px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          font-size: 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .reaction-chip:hover {
          border-color: var(--border-highlight);
        }
        .reaction-chip.active {
          background: rgba(62, 207, 142, 0.15);
          border-color: var(--primary);
        }

        .reaction-count {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .quick-emoji-row {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .chat-message-row:hover .quick-emoji-row {
          opacity: 1;
        }

        .quick-emoji-btn {
          font-size: 13px;
          padding: 2px 4px;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 4px;
          transition: transform var(--transition-fast);
        }
        .quick-emoji-btn:hover {
          transform: scale(1.2);
        }

        .thread-reply-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 3px 8px;
          border-radius: 6px;
          transition: all var(--transition-fast);
        }
        .thread-reply-btn:hover, .thread-reply-btn.active {
          color: var(--text-primary);
          background: var(--bg-elevated);
        }

        .chat-typing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 20px;
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid var(--border-subtle);
        }

        .typing-dots {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .typing-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--primary);
          animation: bounce 1.2s infinite ease-in-out;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        .chat-input-bar {
          padding: 12px 20px;
          border-top: 1px solid var(--border-default);
          background: var(--bg-surface);
        }

        .input-toolbar-top {
          margin-bottom: 6px;
        }

        .input-hint {
          font-size: 11px;
          color: var(--text-muted);
        }

        .input-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .message-input-field {
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .message-input-field:focus {
          border-color: var(--primary);
        }

        /* Thread Drawer */
        .chat-thread-drawer {
          width: 380px;
          border-left: 1px solid var(--border-default);
          background: var(--bg-surface);
          display: flex;
          flex-direction: column;
          height: 100%;
          flex-shrink: 0;
        }

        .thread-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .thread-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .thread-header-title h3 {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
        }

        .thread-channel-badge {
          font-size: 11px;
          color: var(--text-muted);
        }

        .close-thread-btn {
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .thread-drawer-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .thread-parent-card {
          padding: 12px;
          border-radius: 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
        }

        .thread-parent-text {
          font-size: 12px;
          color: var(--text-primary);
          margin-top: 6px;
          line-height: 1.4;
        }

        .thread-replies-divider {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 6px;
        }

        .thread-reply-row {
          display: flex;
          gap: 10px;
        }

        .reply-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .reply-content {
          flex: 1;
          min-width: 0;
        }

        .reply-text {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-top: 2px;
        }

        .thread-input-bar {
          padding: 12px 16px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          gap: 8px;
        }

        .thread-input-field {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
        }

        /* Modal Styles */
        .modal-overlay {
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

        .modal-card {
          width: 100%;
          max-width: 460px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          padding: 24px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-close-btn {
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .channel-input-prefix {
          display: flex;
          align-items: center;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 0 10px;
        }

        .prefix-hash {
          color: var(--text-muted);
          font-weight: 700;
        }

        .form-input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .form-input.with-prefix {
          border: none;
          background: transparent;
        }

        .form-help {
          font-size: 11px;
          color: var(--text-muted);
        }

        .checkbox-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
};
