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
