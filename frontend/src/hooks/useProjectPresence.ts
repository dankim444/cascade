import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

type PresenceUser = {
  userId: string;
  fullName: string;
  initial: string;
  color: string;
};

type PresenceCursor = {
  userId: string;
  fullName: string;
  color: string;
  x: number;
  y: number;
  tab?: string;
};

type PresenceMessage =
  | { type: 'presence.snapshot'; payload: { users: PresenceUser[] } }
  | { type: 'presence.join'; payload: { user: PresenceUser } }
  | { type: 'presence.leave'; payload: { userId: string } }
  | { type: 'presence.cursor'; payload: PresenceCursor }
  | { type: 'presence.tab'; payload: { userId: string; tab: string } };

const WS_BASE_URL = (import.meta as any).env?.VITE_WS_BASE_URL || 'ws://localhost:8000';

const getToken = (): string | null => {
  try {
    const stored = localStorage.getItem('cascade-auth-storage');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.token || null;
  } catch (e) {
    return null;
  }
};

export const useProjectPresence = (projectId: string | null, activeTab?: string) => {
  const { user } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, PresenceCursor>>({});
  const [userTabs, setUserTabs] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const cursorTimeoutRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!projectId || !userId) {
      setOnlineUsers([]);
      setCursors({});
      return;
    }

    const token = getToken();
    if (!token) return;

    const wsUrl = `${WS_BASE_URL}/ws/presence?project_id=${encodeURIComponent(projectId)}&token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setOnlineUsers([]);
      setCursors({});
    };

    socket.onmessage = (event) => {
      let message: PresenceMessage | null = null;
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (!message) return;

      if (message.type === 'presence.snapshot') {
        setOnlineUsers(message.payload.users);
      } else if (message.type === 'presence.join') {
        setOnlineUsers((prev) => {
          const exists = prev.some((u) => u.userId === message!.payload.user.userId);
          if (exists) return prev;
          return [...prev, message!.payload.user];
        });
      } else if (message.type === 'presence.leave') {
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== message!.payload.userId));
        setCursors((prev) => {
          const next = { ...prev };
          delete next[message!.payload.userId];
          return next;
        });
        setUserTabs((prev) => {
          const next = { ...prev };
          delete next[message!.payload.userId];
          return next;
        });
      } else if (message.type === 'presence.cursor') {
        if (message.payload.userId === userId) return;
        setCursors((prev) => ({
          ...prev,
          [message.payload.userId]: message.payload,
        }));
        if (message.payload.tab) {
          setUserTabs((prev) => ({
            ...prev,
            [message.payload.userId]: message.payload.tab as string,
          }));
        }
      } else if (message.type === 'presence.tab') {
        if (message.payload.userId === userId) return;
        setUserTabs((prev) => ({
          ...prev,
          [message.payload.userId]: message.payload.tab,
        }));
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [projectId, userId]);

  useEffect(() => {
    if (!isConnected || !socketRef.current) return;

    const handleMove = (event: MouseEvent) => {
      pendingCursorRef.current = { x: event.clientX, y: event.clientY };
      if (cursorTimeoutRef.current !== null) return;
      cursorTimeoutRef.current = window.setTimeout(() => {
        const pending = pendingCursorRef.current;
        if (pending && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'presence.cursor',
            payload: {
              x: pending.x,
              y: pending.y,
              tab: activeTab,
            },
          }));
        }
        cursorTimeoutRef.current = null;
      }, 50);
    };

    window.addEventListener('mousemove', handleMove);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (cursorTimeoutRef.current !== null) {
        window.clearTimeout(cursorTimeoutRef.current);
        cursorTimeoutRef.current = null;
      }
    };
  }, [isConnected, activeTab]);

  useEffect(() => {
    if (!isConnected || !socketRef.current || !activeTab) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'presence.tab',
      payload: { tab: activeTab },
    }));
  }, [activeTab, isConnected]);

  const otherUsers = useMemo(
    () => onlineUsers.filter((u) => u.userId !== userId),
    [onlineUsers, userId]
  );

  return {
    onlineUsers,
    otherUsers,
    cursors,
    userTabs,
    isConnected,
  };
};
