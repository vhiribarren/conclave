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
import type { RoomState, SocketMessage } from "@conclave/shared";

export type { RoomState, SocketMessage };

export interface ConclaveActions {
  vote: (vote: string | null) => void;
  reveal: () => void;
  reset: () => void;
  setTask: (task: string) => void;
  disconnect: () => void;
}


export class ConclaveSocket {
  static connect(
    roomId: string,
    name: string,
    onStateUpdate: (state: RoomState) => void
  ): ConclaveActions {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = import.meta.env.VITE_WS_PORT || window.location.port;

    const portSuffix = port ? `:${port}` : '';
    const wsUrl = import.meta.env.PROD
      ? `${protocol}//${host}/ws?roomId=${roomId}`
      : `${protocol}//${host}${portSuffix}?roomId=${roomId}`;

    const ws = new WebSocket(wsUrl);

    const send = (message: SocketMessage) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    ws.onopen = () => {
      send({ type: 'JOIN', name });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'STATE') {
        onStateUpdate(data.payload);
      }
    };

    return {
      vote: (vote) => send({ type: 'VOTE', vote }),
      reveal: () => send({ type: 'REVEAL' }),
      reset: () => send({ type: 'RESET' }),
      setTask: (task) => send({ type: 'SET_TASK', task }),
      disconnect: () => ws.close(),
    };
  }
}
