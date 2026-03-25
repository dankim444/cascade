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

type LockHolder = {
  userId: string;
  fullName: string;
};

type PipelineStatus = {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'denied';
  byUserId?: string;
  byFullName?: string;
  message?: string;
};

type NodeUpdatePayload = {
  nodeId: string;
  node?: any;
  deleted?: boolean;
  timestamp: number;
};

type EdgeUpdatePayload = {
  edges: any[];
  timestamp: number;
};

type VisualizationChangedPayload = {
  projectId: string;
  action: 'created' | 'updated' | 'deleted';
  graphId?: string;
};

type ProjectPermissionChangedPayload = {
  projectId: string;
  changedUserId?: string;
  permission?: 'view' | 'edit' | 'admin';
};

type PresenceMessage =
  | { type: 'presence.snapshot'; payload: { users: PresenceUser[]; locks?: Record<string, LockHolder>; pipelineStatus?: PipelineStatus } }
  | { type: 'presence.join'; payload: { user: PresenceUser } }
  | { type: 'presence.leave'; payload: { userId: string } }
  | { type: 'presence.cursor'; payload: PresenceCursor }
  | { type: 'presence.tab'; payload: { userId: string; tab: string } }
  | { type: 'lock.granted'; payload: { nodeId: string; granted: boolean; holder?: LockHolder } }
  | { type: 'lock.released'; payload: { nodeId: string; releasedBy: string } }
  | { type: 'node.update'; payload: NodeUpdatePayload }
  | { type: 'edge.update'; payload: EdgeUpdatePayload }
  | { type: 'pipeline.status'; payload: PipelineStatus }
  | { type: 'visualization.changed'; payload: VisualizationChangedPayload }
  | { type: 'project.permission_changed'; payload: ProjectPermissionChangedPayload };

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

type UseProjectPresenceOptions = {
  activeTab?: string;
  onNodeUpdate?: (payload: NodeUpdatePayload) => void;
  onEdgeUpdate?: (payload: EdgeUpdatePayload) => void;
  onVisualizationChanged?: (payload: VisualizationChangedPayload) => void;
  onProjectPermissionChanged?: (payload: ProjectPermissionChangedPayload) => void;
};

export const useProjectPresence = (projectId: string | null, options?: UseProjectPresenceOptions) => {
  const { user } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, PresenceCursor>>({});
  const [userTabs, setUserTabs] = useState<Record<string, string>>({});
  const [locks, setLocks] = useState<Record<string, LockHolder>>({});
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({ status: 'idle' });
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const cursorTimeoutRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
  const nodeUpdateTimestampsRef = useRef<Record<string, number>>({});
  const edgeUpdateTimestampRef = useRef<number>(0);

  const userId = user?.id ?? null;
  const activeTab = options?.activeTab;

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
      setLocks({});
      setPipelineStatus({ status: 'idle' });
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
        if (message.payload.locks) {
          setLocks(message.payload.locks);
        }
        if (message.payload.pipelineStatus) {
          setPipelineStatus(message.payload.pipelineStatus);
        }
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
        setLocks((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((nodeId) => {
            if (next[nodeId]?.userId === message!.payload.userId) {
              delete next[nodeId];
            }
          });
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
      } else if (message.type === 'lock.granted') {
        if (message.payload.holder) {
          setLocks((prev) => ({
            ...prev,
            [message.payload.nodeId]: message.payload.holder!,
          }));
        }
      } else if (message.type === 'lock.released') {
        setLocks((prev) => {
          const next = { ...prev };
          delete next[message.payload.nodeId];
          return next;
        });
      } else if (message.type === 'node.update') {
        const payload = message.payload;
        const lastTimestamp = nodeUpdateTimestampsRef.current[payload.nodeId] || 0;
        if (payload.timestamp >= lastTimestamp) {
          nodeUpdateTimestampsRef.current[payload.nodeId] = payload.timestamp;
          options?.onNodeUpdate?.(payload);
        }
      } else if (message.type === 'edge.update') {
        const payload = message.payload;
        if (payload.timestamp >= edgeUpdateTimestampRef.current) {
          edgeUpdateTimestampRef.current = payload.timestamp;
          options?.onEdgeUpdate?.(payload);
        }
      } else if (message.type === 'pipeline.status') {
        setPipelineStatus(message.payload);
      } else if (message.type === 'visualization.changed') {
        options?.onVisualizationChanged?.(message.payload);
      } else if (message.type === 'project.permission_changed') {
        options?.onProjectPermissionChanged?.(message.payload);
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

  const requestLock = (nodeId: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'lock.request',
      payload: { nodeId },
    }));
  };

  const releaseLock = (nodeId: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'lock.release',
      payload: { nodeId },
    }));
  };

  const sendNodeUpdate = (payload: NodeUpdatePayload) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    nodeUpdateTimestampsRef.current[payload.nodeId] = payload.timestamp;
    socketRef.current.send(JSON.stringify({
      type: 'node.update',
      payload,
    }));
  };

  const sendEdgeUpdate = (payload: EdgeUpdatePayload) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    edgeUpdateTimestampRef.current = payload.timestamp;
    socketRef.current.send(JSON.stringify({
      type: 'edge.update',
      payload,
    }));
  };

  const sendPipelineExecute = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'pipeline.execute',
      payload: {},
    }));
  };

  const sendPipelineStatus = (status: PipelineStatus['status'], message?: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({
      type: 'pipeline.status',
      payload: { status, message },
    }));
  };

  return {
    onlineUsers,
    otherUsers,
    cursors,
    userTabs,
    locks,
    pipelineStatus,
    isConnected,
    userId,
    requestLock,
    releaseLock,
    sendNodeUpdate,
    sendEdgeUpdate,
    sendPipelineExecute,
    sendPipelineStatus,
  };
};
