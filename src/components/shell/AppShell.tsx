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

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isSidebarCollapsed, currentUser } = useApp();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

      {/* Modals & Dialogs */}
      <CommandPalette />
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <OnboardingWizard />
      <CreateWorkspaceModal />
      <WorkspaceSettingsModal />

      <style jsx>{`
        .app-shell-root {
          display: flex;
          min-height: 100vh;
          background: var(--bg-canvas);
          color: var(--text-primary);
          position: relative;
        }

        .app-main-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow-x: hidden;
        }

        .app-viewport {
          flex: 1;
          background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.04) 0%, transparent 70%);
          min-height: calc(100vh - var(--topbar-height));
        }
      `}</style>
    </div>
  );
};
