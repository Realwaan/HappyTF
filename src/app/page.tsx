'use client';

import { AppShell } from '../components/shell/AppShell';
import { MyWorkDashboard } from '../components/home/MyWorkDashboard';

export default function HomePage() {
  return (
    <AppShell>
      <MyWorkDashboard />
    </AppShell>
  );
}
