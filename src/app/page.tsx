'use client';

import { useApp } from '../context/AppContext';
import { AppShell } from '../components/shell/AppShell';
import { MyWorkDashboard } from '../components/home/MyWorkDashboard';
import { BoardView } from '../components/board/BoardView';
import { TeamChatView } from '../components/chat/TeamChatView';

export default function HomePage() {
  const { activeView } = useApp();

  return (
    <AppShell>
      {activeView === 'home' && <MyWorkDashboard />}
      {activeView === 'board' && <BoardView />}
      {activeView === 'chat' && <TeamChatView />}
    </AppShell>
  );
}
