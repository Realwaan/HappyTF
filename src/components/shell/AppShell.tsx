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
import { SlackIntegrationModal } from '../workspace/SlackIntegrationModal';

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
    isSlackModalOpen,
    setSlackModalOpen,
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
      <SlackIntegrationModal
        isOpen={isSlackModalOpen}
        onClose={() => setSlackModalOpen(false)}
      />

      <style jsx>{`
        .app-shell-root {
          display: flex;
          height: 100vh;
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
          overflow: hidden;
        }

        .app-viewport {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.04) 0%, transparent 70%);
        }
      `}</style>
    </div>
  );
};
