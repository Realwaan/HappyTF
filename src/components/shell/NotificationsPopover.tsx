'use client';

import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  CheckCheck, 
  CheckCircle2, 
  MessageSquare, 
  UserPlus, 
  ShieldAlert, 
  Clock 
} from 'lucide-react';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAllNotificationsAsRead, markNotificationRead } = useApp();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <CheckCircle2 size={16} className="text-primary" />;
      case 'mention':
        return <MessageSquare size={16} style={{ color: '#0ea5e9' }} />;
      case 'invite':
        return <UserPlus size={16} style={{ color: '#10b981' }} />;
      case 'system':
      default:
        return <ShieldAlert size={16} style={{ color: '#f59e0b' }} />;
    }
  };

  return (
    <div className="popover-wrapper glass-panel animate-pop-in" ref={popoverRef} id="notifications-popover">
      <div className="popover-header">
        <div className="header-title">
          <Bell size={16} />
          <h4>Notifications</h4>
          {unreadCount > 0 && <span className="unread-pill">{unreadCount} new</span>}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-btn"
            onClick={markAllNotificationsAsRead}
            id="mark-all-notifications-read-btn"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-notifications">
            <Bell size={24} className="text-muted" />
            <p>All caught up! No unread notifications.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`notification-item ${n.unread ? 'unread' : ''}`}
              onClick={() => markNotificationRead(n.id)}
              id={`notification-item-${n.id}`}
            >
              <div className="item-icon-col">{getIcon(n.type)}</div>
              <div className="item-content-col">
                <div className="item-top-row">
                  <span className="item-title">{n.title}</span>
                  <span className="item-time">
                    <Clock size={11} />
                    {n.timestamp}
                  </span>
                </div>
                <p className="item-desc">{n.description}</p>
              </div>
              {n.unread && <div className="unread-dot" />}
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .popover-wrapper {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: 380px;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
          z-index: 1000;
          overflow: hidden;
        }

        .popover-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
        }

        .unread-pill {
          background: var(--primary);
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 10px;
        }

        .mark-all-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--primary-light);
          transition: color var(--transition-fast);
        }
        .mark-all-btn:hover {
          color: #ffffff;
        }

        .notifications-list {
          max-height: 380px;
          overflow-y: auto;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background var(--transition-fast);
          position: relative;
        }
        .notification-item:hover {
          background: var(--bg-hover);
        }
        .notification-item.unread {
          background: rgba(99, 102, 241, 0.07);
        }

        .item-icon-col {
          margin-top: 2px;
        }

        .item-content-col {
          flex: 1;
        }

        .item-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .item-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .item-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .unread-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--primary);
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
        }

        .empty-notifications {
          padding: 36px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};
