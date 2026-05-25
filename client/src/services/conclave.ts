/**
 * MIT License
 *
 * Copyright (c) 2026 Vincent Hiribarren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { RoomState, SocketMessage, ServerMessage } from "conclave-shared";

export type { RoomState, SocketMessage, ServerMessage };

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface ConclaveActions {
  userVote: (vote: string | null) => void;
  adminReveal: () => void;
  adminReset: () => void;
  adminAddTask: (name: string) => void;
  adminRenameTask: (taskId: string, name: string) => void;
  adminSetTask: (taskId: string | null) => void;
  adminSetDeck: (deck: string[], mode: 'preset' | 'custom') => void;
  adminSetTimer: (durationMs: number | null) => void;
  adminPauseTimer: () => void;
  adminResumeTimer: () => void;
  adminDeleteTask: (taskId: string) => void;
  adminReorderTasks: (taskIds: string[]) => void;
  adminTransferAdmin: (targetUserId: string) => void;
  userUpdateProfile: (name: string, mood: string) => void;
  adminRenameRoom: (name: string) => void;
  adminSetAnonymousVoting: (enabled: boolean) => void;
  adminSetTimerDuration: (durationMs: number) => void;
  userDisconnect: () => void;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];

export class ConclaveSocket {
  static connect(
    roomId: string,
    userId: string,
    name: string,
    mood: string,
    onJoined: (publicId: string) => void,
    onStateUpdate: (state: RoomState) => void,
    onError: (error: string) => void,
    onConnectionStatus?: (status: ConnectionStatus) => void
  ): ConclaveActions {

    const wsUrl = `/api/rooms/${roomId}/ws`;

    let ws: WebSocket | null = null;
    let connected = false;
    let initialErrorDispatched = false;
    let intentionalClose = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const send = (message: SocketMessage) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    const handleInitialError = (msg: string) => {
      if (!connected && !initialErrorDispatched) {
        initialErrorDispatched = true;
        console.log(msg);
        onError(msg);
      }
    };

    const scheduleReconnect = () => {
      if (destroyed || intentionalClose) return;
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)];
      reconnectAttempt++;
      onConnectionStatus?.('reconnecting');
      console.log(`[ConclaveSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
      reconnectTimer = setTimeout(() => {
        if (!destroyed && !intentionalClose) {
          createSocket();
        }
      }, delay);
    };

    const createSocket = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        connected = true;
        reconnectAttempt = 0;
        onConnectionStatus?.('connected');
        send({ type: 'USER_JOIN', userId, name, mood });
      };

      ws.onerror = (event) => {
        console.error('WebSocket error', event);
        handleInitialError('Room does not exist or connection failed');
      };

      ws.onclose = () => {
        if (!connected) {
          handleInitialError('Room does not exist or connection failed');
          return;
        }
        // Connection was established before — attempt reconnection
        if (!intentionalClose && !destroyed) {
          onConnectionStatus?.('disconnected');
          scheduleReconnect();
        }
      };

      ws.onmessage = (event) => {
        const data: ServerMessage = JSON.parse(event.data);
        if (data.type === 'JOINED') {
          onJoined(data.publicId);
        } else if (data.type === 'STATE') {
          // Adjust timerEndAt from server clock to client clock
          const payload = data.payload;
          if (payload.timerEndAt !== null) {
            const serverTimeOffset = data.serverTime - Date.now();
            payload.timerEndAt = payload.timerEndAt - serverTimeOffset;
          }
          onStateUpdate(payload);
        }
      };
    };

    // Reconnect immediately when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && connected && !intentionalClose && !destroyed) {
        if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
          // Clear any pending reconnect timer and try immediately
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          reconnectAttempt = 0;
          onConnectionStatus?.('reconnecting');
          createSocket();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the initial connection
    createSocket();

    return {
      userVote: (vote) => send({ type: 'USER_VOTE', vote }),
      adminReveal: () => send({ type: 'ADMIN_REVEAL' }),
      adminReset: () => send({ type: 'ADMIN_RESET' }),
      adminAddTask: (name) => send({ type: 'ADMIN_ADD_TASK', name }),
      adminRenameTask: (taskId, name) => send({ type: 'ADMIN_RENAME_TASK', taskId, name }),
      adminSetTask: (taskId) => send({ type: 'ADMIN_SET_TASK', taskId }),
      adminSetDeck: (deck, mode) => send({ type: 'ADMIN_SET_DECK', deck, mode }),
      adminSetTimer: (durationMs) => send({ type: 'ADMIN_SET_TIMER', durationMs }),
      adminPauseTimer: () => send({ type: 'ADMIN_PAUSE_TIMER' }),
      adminResumeTimer: () => send({ type: 'ADMIN_RESUME_TIMER' }),
      adminDeleteTask: (taskId) => send({ type: 'ADMIN_DELETE_TASK', taskId }),
      adminReorderTasks: (taskIds) => send({ type: 'ADMIN_REORDER_TASKS', taskIds }),
      adminTransferAdmin: (targetUserId) => send({ type: 'ADMIN_TRANSFER_ADMIN', targetUserId }),
      userUpdateProfile: (name, mood) => send({ type: 'USER_UPDATE_PROFILE', name, mood }),
      adminRenameRoom: (name) => send({ type: 'ADMIN_RENAME_ROOM', name }),
      adminSetAnonymousVoting: (enabled) => send({ type: 'ADMIN_SET_ANONYMOUS_VOTING', enabled }),
      adminSetTimerDuration: (durationMs) => send({ type: 'ADMIN_SET_TIMER_DURATION', durationMs }),
      userDisconnect: () => {
        intentionalClose = true;
        destroyed = true;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        if (ws) {
          ws.close();
        }
      },
    };
  }
}
