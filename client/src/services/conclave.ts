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
import type { RoomState, SocketMessage } from "conclave-shared";

export type { RoomState, SocketMessage };

export interface ConclaveActions {
  userVote: (vote: string | null) => void;
  adminReveal: () => void;
  adminReset: () => void;
  adminAddTask: (name: string) => void;
  adminSetTask: (taskId: string | null) => void;
  adminSetDeck: (deck: string[], mode: 'preset' | 'custom') => void;
  adminSetTimer: (durationMs: number | null) => void;
  adminPauseTimer: () => void;
  adminResumeTimer: () => void;
  adminDeleteTask: (taskId: string) => void;
  adminTransferAdmin: (targetUserId: string) => void;
  userUpdateProfile: (name: string, mood: string) => void;
  adminRenameRoom: (name: string) => void;
  userDisconnect: () => void;
}


export class ConclaveSocket {
  static connect(
    roomId: string,
    userId: string,
    name: string,
    mood: string,
    onStateUpdate: (state: RoomState) => void,
    onError: (error: string) => void
  ): ConclaveActions {

    const wsUrl = `/api/ws?roomId=${roomId}`;

    const ws = new WebSocket(wsUrl);

    const send = (message: SocketMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    let connected = false;
    let errorDispatched = false;

    const handleError = (msg: string) => {
      if (!connected && !errorDispatched) {
        errorDispatched = true;
        console.log(msg)
        onError(msg);
      }
    };

    ws.onopen = () => {
      connected = true;
      send({ type: 'USER_JOIN', userId, name, mood });
    };

    ws.onerror = (event) => {
      console.error('WebSocket error', event);
      handleError('Room does not exist or connection failed');
    };

    ws.onclose = () => {
      handleError('Room does not exist or connection failed');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'STATE') {
        onStateUpdate(data.payload);
      }
    };

    return {
      userVote: (vote) => send({ type: 'USER_VOTE', vote }),
      adminReveal: () => send({ type: 'ADMIN_REVEAL' }),
      adminReset: () => send({ type: 'ADMIN_RESET' }),
      adminAddTask: (name) => send({ type: 'ADMIN_ADD_TASK', name }),
      adminSetTask: (taskId) => send({ type: 'ADMIN_SET_TASK', taskId }),
      adminSetDeck: (deck, mode) => send({ type: 'ADMIN_SET_DECK', deck, mode }),
      adminSetTimer: (durationMs) => send({ type: 'ADMIN_SET_TIMER', durationMs }),
      adminPauseTimer: () => send({ type: 'ADMIN_PAUSE_TIMER' }),
      adminResumeTimer: () => send({ type: 'ADMIN_RESUME_TIMER' }),
      adminDeleteTask: (taskId) => send({ type: 'ADMIN_DELETE_TASK', taskId }),
      adminTransferAdmin: (targetUserId) => send({ type: 'ADMIN_TRANSFER_ADMIN', targetUserId }),
      userUpdateProfile: (name, mood) => send({ type: 'USER_UPDATE_PROFILE', name, mood }),
      adminRenameRoom: (name) => send({ type: 'ADMIN_RENAME_ROOM', name }),
      userDisconnect: () => ws.close(),
    };
  }
}
