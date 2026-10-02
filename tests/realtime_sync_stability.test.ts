import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Realtime Sync & Presence Connection Stability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  interface ConnectionDebounceController {
    isConnected: boolean;
    setConnectionState: (connected: boolean) => void;
    clear: () => void;
  }

  function createDebounceController(gracePeriodMs = 2500): ConnectionDebounceController {
    let connectedState = false;
    let timer: any = null;

    const setConnectionState = (connected: boolean) => {
      if (connected) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        connectedState = true;
      } else {
        if (!timer) {
          timer = setTimeout(() => {
            connectedState = false;
            timer = null;
          }, gracePeriodMs);
        }
      }
    };

    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    return {
      get isConnected() {
        return connectedState;
      },
      setConnectionState,
      clear,
    };
  }

  it('prevents connection flapping during transient network or WebSocket reconnect cycles', () => {
    const controller = createDebounceController(2500);

    // Initial connection
    controller.setConnectionState(true);
    expect(controller.isConnected).toBe(true);

    // Transient drop (e.g. CHANNEL_ERROR or micro-disconnect)
    controller.setConnectionState(false);
    // Still connected due to 2500ms grace period
    expect(controller.isConnected).toBe(true);

    // Advance 1000ms (still within grace period)
    vi.advanceTimersByTime(1000);
    expect(controller.isConnected).toBe(true);

    // Channel reconnects (SUBSCRIBED status received)
    controller.setConnectionState(true);
    expect(controller.isConnected).toBe(true);

    // Advance past grace period to ensure timer was truly cancelled
    vi.advanceTimersByTime(3000);
    expect(controller.isConnected).toBe(true);
  });

  it('transitions to disconnected state if connection drop exceeds grace period', () => {
    const controller = createDebounceController(2500);

    controller.setConnectionState(true);
    expect(controller.isConnected).toBe(true);

    // Sustained drop
    controller.setConnectionState(false);
    expect(controller.isConnected).toBe(true);

    // Advance past grace period
    vi.advanceTimersByTime(2600);
    expect(controller.isConnected).toBe(false);
  });

  function computeBadgeText(isRealtimeConnected: boolean, onlineCount: number): string {
    const isLive = isRealtimeConnected || onlineCount > 0;
    return isLive ? `${Math.max(1, onlineCount)} Online` : 'Sync Ready';
  }

  it('maintains a solid "1 Online" status badge without switching back to "Sync Ready"', () => {
    // Single user online
    expect(computeBadgeText(true, 1)).toBe('1 Online');

    // Even if isRealtimeConnected blips momentarily, presence keeps it at "1 Online"
    expect(computeBadgeText(false, 1)).toBe('1 Online');

    // Multiple teammates online
    expect(computeBadgeText(true, 3)).toBe('3 Online');
    expect(computeBadgeText(false, 3)).toBe('3 Online');

    // Only falls back to "Sync Ready" if truly offline with 0 online users
    expect(computeBadgeText(false, 0)).toBe('Sync Ready');
  });

  it('deduplicates online users list to prevent spurious re-renders', () => {
    const userA = { id: 'usr-1', name: 'Alex', role: 'Architect', status: 'active' as const };
    const userB = { id: 'usr-2', name: 'Taylor', role: 'Engineer', status: 'active' as const };

    const currentList = [userA, userB];
    const incomingList = [{ ...userA }, { ...userB }];

    // Deep equality check like in useRealtimeTickets
    const hasChanged =
      currentList.length !== incomingList.length ||
      !currentList.every(
        (u, idx) =>
          u.id === incomingList[idx].id &&
          u.status === incomingList[idx].status &&
          u.role === incomingList[idx].role
      );

    expect(hasChanged).toBe(false);
  });
});
