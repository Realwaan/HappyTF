'use client';

import { useApp } from '../context/AppContext';
import { AppShell } from '../components/shell/AppShell';
import { MyWorkDashboard } from '../components/home/MyWorkDashboard';
import { BoardView } from '../components/board/BoardView';

export default function HomePage() {
  const { activeView } = useApp();

  return (
    <AppShell>
      {activeView === 'home' ? <MyWorkDashboard /> : <BoardView />}
    </AppShell>
  );
}
