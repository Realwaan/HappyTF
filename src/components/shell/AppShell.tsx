'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { AuthModal } from '../auth/AuthModal';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';
import { CreateWorkspaceModal } from '../workspace/CreateWorkspaceModal';
import { WorkspaceSettingsModal } from '../workspace/WorkspaceSettingsModal';
import { ItemDetailPanel } from '../board/ItemDetailPanel';
import { CreateBoardModal } from '../board/CreateBoardModal';
import { QuickCreateTaskModal } from '../board/QuickCreateTaskModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { WorkspaceContextModal } from './WorkspaceContextModal';
import { DiscordIntegrationModal } from '../workspace/DiscordIntegrationModal';
import { WorkflowAutomationModal } from '../automation/WorkflowAutomationModal';
import { ColumnarAnalyticsModal } from '../analytics/ColumnarAnalyticsModal';
import { AiCopilotModal } from '../ai/AiCopilotModal';
import { MobileBottomNav } from './MobileBottomNav';
import { SmartGeneratedTicket } from '../../lib/ai/sprintCopilot';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { 
    currentUser, 
    isCreateBoardOpen, 
    setCreateBoardOpen, 
    isQuickTaskOpen, 
    setQuickTaskOpen,
    isContextModalOpen,
    setContextModalOpen,
    isDiscordModalOpen,
    setDiscordModalOpen,
    isAutomationModalOpen,
    setAutomationModalOpen,
    isColumnarModalOpen,
    setColumnarModalOpen,
    isAiCopilotOpen,
    setAiCopilotOpen,
    activeBoard,
    boardGroups,
    boardItems,
    members,
    addBoardItem,
    navigateToBoard,
    joinBoard,
  } = useApp();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Auto-join board if visited via an invite/join link (?join_board=xxx)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const joinBoardId = params.get('join_board');
    if (joinBoardId) {
      const role = params.get('role') || undefined;
      const inviter = params.get('inviter') || undefined;
      const boardName = params.get('board_name') || undefined;
      const wsName = params.get('ws_name') || undefined;
      const wsId = params.get('ws_id') || undefined;

      joinBoard(joinBoardId, {
        role,
        inviter,
        boardName,
        workspaceName: wsName,
        workspaceId: wsId,
      });
    }
  }, [joinBoard]);

  // Global Cmd+J / Ctrl+J shortcut to open AI Sprint Copilot
  React.useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setAiCopilotOpen(!isAiCopilotOpen);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isAiCopilotOpen, setAiCopilotOpen]);

  const handleAddCopilotTickets = (tickets: SmartGeneratedTicket[]) => {
    for (const t of tickets) {
      addBoardItem(t.group_id, t.title, {
        description: t.description,
        priority: t.priority,
        estimate_points: t.estimate_points,
        tags: t.tags,
      });
    }
  };

  return (
    <div className="app-shell-root" id="app-shell-container">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="app-main-column" id="app-main-column">
        <Topbar onOpenAuth={() => setIsAuthModalOpen(true)} />
        <main className="app-viewport" id="app-viewport">
          {children}
        </main>
      </div>

      {/* Slide-over Item Detail Panel (520px) */}
      <ItemDetailPanel />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <KeyboardShortcutsModal />

      {/* Modals & Dialogs */}
      <CommandPalette />
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <OnboardingWizard />
      <CreateWorkspaceModal />
      <WorkspaceSettingsModal />
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
      />
      <QuickCreateTaskModal
        isOpen={isQuickTaskOpen}
        onClose={() => setQuickTaskOpen(false)}
      />
      <WorkspaceContextModal
        isOpen={isContextModalOpen}
        onClose={() => setContextModalOpen(false)}
      />
      <DiscordIntegrationModal
        isOpen={isDiscordModalOpen}
        onClose={() => setDiscordModalOpen(false)}
      />
      <WorkflowAutomationModal
        isOpen={isAutomationModalOpen}
        onClose={() => setAutomationModalOpen(false)}
      />
      <ColumnarAnalyticsModal
        isOpen={isColumnarModalOpen}
        onClose={() => setColumnarModalOpen(false)}
      />
      <AiCopilotModal
        isOpen={isAiCopilotOpen}
        onClose={() => setAiCopilotOpen(false)}
        boardName={activeBoard?.name || 'Active Board'}
        boardGroups={boardGroups}
        boardItems={boardItems}
        workspaceMembers={members}
        onAddTickets={handleAddCopilotTickets}
      />

      {/* Persistent Mobile Bottom Navigation Bar (Screens <= 768px) */}
      <MobileBottomNav />

      <style jsx>{`
        .app-shell-root {
          display: flex;
          height: 100vh;
          height: 100dvh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-canvas);
          color: var(--text-primary);
          position: fixed;
          inset: 0;
        }

        .app-main-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
        }

        .app-viewport {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.04) 0%, transparent 70%);
        }

        @media (max-width: 768px) {
          .app-viewport {
            padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
};
